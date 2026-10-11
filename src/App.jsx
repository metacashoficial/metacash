import { useCallback, useEffect, useState } from 'react'
import Icon, { Logo, Wordmark } from './components/Icon'
import TransactionForm from './components/TransactionForm'
import { Button, IconButton, Modal } from './components/ui'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { FeedbackProvider, useFeedback } from './context/Feedback'
import { isConfigured } from './lib/supabase'
import { useReminderScheduler } from './lib/reminders'
import AuthScreen, { ResetPassword, SetupScreen } from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Finance from './pages/Finance'
import Goals from './pages/Goals'
import History from './pages/History'
import Planner from './pages/Planner'
import Reminders from './pages/Reminders'
import Schedule from './pages/Schedule'
import Settings from './pages/Settings'

const NAV = [
  { id: 'inicio', label: 'Inicio', icon: 'home', group: 'main' },
  { id: 'movimientos', label: 'Ganancias y gastos', short: 'Dinero', icon: 'arrows', group: 'main' },
  { id: 'metas', label: 'Metas de ahorro', short: 'Metas', icon: 'target', group: 'main' },
  { id: 'planificador', label: 'Planificador', icon: 'calculator', group: 'main' },
  { id: 'horario', label: 'Horario de trabajo', short: 'Horario', icon: 'clock', group: 'work' },
  { id: 'recordatorios', label: 'Recordatorios', icon: 'bell', group: 'work' },
  { id: 'historial', label: 'Historial', icon: 'history', group: 'work' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings', group: 'work' },
]
const MOBILE_TABS = ['inicio', 'movimientos', 'metas']

/* ------------------------------- Tema ------------------------------- */

function resolveTheme(pref) {
  if (pref === 'dark' || pref === 'light') return pref
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function useTheme() {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('metacash-theme') || 'system'
    } catch {
      return 'system'
    }
  })
  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme)
      document.documentElement.dataset.theme = resolved
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0E0F10' : '#F5F5F2')
    }
    apply()
    try {
      localStorage.setItem('metacash-theme', theme)
    } catch {
      /* sin almacenamiento */
    }
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  return [theme, setThemeState]
}

/* ------------------------------ Rutas ------------------------------ */

function readPage() {
  const h = window.location.hash.replace(/^#\/?/, '')
  return NAV.some((n) => n.id === h) ? h : 'inicio'
}

function usePage() {
  const [page, setPage] = useState(readPage)
  useEffect(() => {
    const on = () => setPage(readPage())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const go = useCallback((id) => {
    if (window.location.hash !== '#/' + id) window.location.hash = '/' + id
    setPage(id)
    window.scrollTo({ top: 0 })
  }, [])
  return [page, go]
}

/* ------------------------------ App ------------------------------ */

export default function App() {
  const [theme, setTheme] = useTheme()
  if (!isConfigured) return <SetupScreen />
  return (
    <FeedbackProvider>
      <AuthProvider>
        <Root theme={theme} setTheme={setTheme} />
      </AuthProvider>
    </FeedbackProvider>
  )
}

function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo">
        <Logo size={52} />
      </div>
    </div>
  )
}

function Root({ theme, setTheme }) {
  const { session, loading, recovery, hold } = useAuth()
  if (loading) return <Splash />
  if (hold) return <AuthScreen />
  if (recovery && session) return <ResetPassword />
  if (!session) return <AuthScreen />
  return (
    <DataProvider user={session.user}>
      <Shell theme={theme} setTheme={setTheme} />
    </DataProvider>
  )
}

function Shell({ theme, setTheme }) {
  const { loading, error, prefs, reminders, schedules, deleteTransaction, reloadAll, savePrefs, user } = useData()
  const { signOut, notice, clearNotice } = useAuth()
  const { toast, confirm } = useFeedback()
  const [page, go] = usePage()
  const [txForm, setTxForm] = useState({ open: false })
  const [moreOpen, setMoreOpen] = useState(false)

  // Aplica el tema guardado en la cuenta (sincronizado entre dispositivos)
  useEffect(() => {
    if (prefs?.theme && prefs.updated_at) setTheme(prefs.theme)
  }, [prefs?.theme, prefs?.updated_at, setTheme])

  useEffect(() => {
    if (notice) {
      toast(notice)
      clearNotice()
    }
  }, [notice, toast, clearNotice])

  useReminderScheduler({
    reminders,
    schedules,
    onFire: (r, kind) => toast(kind.body, { tone: 'reminder', title: r.title, duration: 9000 }),
  })

  const openAdd = useCallback((type = 'expense') => setTxForm({ open: true, type }), [])
  const onEdit = useCallback((t) => setTxForm({ open: true, initial: t }), [])
  const onDelete = useCallback(
    async (t) => {
      const ok = await confirm({
        title: 'Eliminar movimiento',
        message: `Se eliminará ${t.type === 'income' ? 'el ingreso' : 'el gasto'} «${t.category}». Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        danger: true,
      })
      if (!ok) return
      try {
        await deleteTransaction(t.id)
        toast('Movimiento eliminado.')
      } catch (e) {
        toast(e.message, { tone: 'error' })
      }
    },
    [confirm, deleteTransaction, toast]
  )

  const resolved = resolveTheme(theme)
  const toggleTheme = () => {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
    savePrefs({ theme: next }).catch(() => {})
  }
  const current = NAV.find((n) => n.id === page)
  const props = { go, openAdd, onEdit, onDelete }

  let content
  if (loading) content = <PageSkeleton />
  else if (error)
    content = (
      <div className="page">
        <div className="card error-card">
          <Icon name="alert" size={22} />
          <div>
            <h2>No pudimos cargar tus datos</h2>
            <p>
              {/relation|does not exist|schema cache/i.test(error.message)
                ? 'Parece que falta crear las tablas. Ejecuta el archivo supabase/schema.sql en el SQL Editor de tu proyecto.'
                : error.message}
            </p>
          </div>
          <Button variant="secondary" icon="sync" onClick={reloadAll}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  else
    content = {
      inicio: <Dashboard {...props} />,
      movimientos: <Finance {...props} />,
      metas: <Goals {...props} />,
      planificador: <Planner {...props} />,
      horario: <Schedule {...props} />,
      recordatorios: <Reminders {...props} />,
      historial: <History {...props} />,
      ajustes: <Settings theme={theme} setTheme={setTheme} />,
    }[page]

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Wordmark size={30} />
        </div>
        <Button className="sidebar-add" icon="plus" block onClick={() => openAdd('expense')}>
          Registrar movimiento
        </Button>
        <nav className="side-nav" aria-label="Principal">
          <span className="nav-group">Finanzas</span>
          {NAV.filter((n) => n.group === 'main').map((n) => (
            <NavItem key={n.id} item={n} active={page === n.id} onClick={() => go(n.id)} />
          ))}
          <span className="nav-group">Organización</span>
          {NAV.filter((n) => n.group === 'work').map((n) => (
            <NavItem key={n.id} item={n} active={page === n.id} onClick={() => go(n.id)} />
          ))}
        </nav>
        <div className="sidebar-foot">
          <button type="button" className="user-chip" onClick={() => go('ajustes')}>
            <span className="avatar sm">{(prefs.display_name || user.email).charAt(0).toUpperCase()}</span>
            <span className="user-text">
              <strong>{prefs.display_name || 'Mi cuenta'}</strong>
              <em>{user.email}</em>
            </span>
          </button>
          <div className="sidebar-tools">
            <IconButton icon={resolved === 'dark' ? 'sun' : 'moon'} label={resolved === 'dark' ? 'Modo claro' : 'Modo oscuro'} onClick={toggleTheme} />
            <IconButton icon="logout" label="Cerrar sesión" onClick={() => signOut('local')} />
          </div>
        </div>
      </aside>

      <header className="topbar">
        <button type="button" className="topbar-brand" onClick={() => go('inicio')} aria-label="Inicio">
          <Logo size={30} />
          <span>{page === 'inicio' ? 'MetaCash' : current?.short || current?.label}</span>
        </button>
        <div className="topbar-tools">
          <IconButton icon={resolved === 'dark' ? 'sun' : 'moon'} label="Cambiar tema" onClick={toggleTheme} />
          <IconButton icon="settings" label="Ajustes" onClick={() => go('ajustes')} />
        </div>
      </header>

      <main className="main" key={page}>
        {content}
      </main>

      <nav className="bottom-nav" aria-label="Navegación">
        {MOBILE_TABS.slice(0, 2).map((id) => {
          const n = NAV.find((x) => x.id === id)
          return <TabItem key={id} item={n} active={page === id} onClick={() => go(id)} />
        })}
        <button type="button" className="fab" onClick={() => openAdd('expense')} aria-label="Registrar movimiento">
          <Icon name="plus" size={24} strokeWidth={2} />
        </button>
        <TabItem item={NAV.find((x) => x.id === 'metas')} active={page === 'metas'} onClick={() => go('metas')} />
        <TabItem item={{ id: 'mas', label: 'Más', icon: 'grid' }} active={!MOBILE_TABS.includes(page)} onClick={() => setMoreOpen(true)} />
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="Más opciones" size="sm">
        <div className="more-grid">
          {NAV.filter((n) => !MOBILE_TABS.includes(n.id)).map((n) => (
            <button
              key={n.id}
              type="button"
              className={`more-item ${page === n.id ? 'active' : ''}`}
              onClick={() => {
                setMoreOpen(false)
                go(n.id)
              }}
            >
              <span>
                <Icon name={n.icon} size={20} />
              </span>
              {n.label}
            </button>
          ))}
        </div>
      </Modal>

      <TransactionForm open={txForm.open} initial={txForm.initial} defaultType={txForm.type} onClose={() => setTxForm({ open: false })} />
    </div>
  )
}

function NavItem({ item, active, onClick }) {
  return (
    <button type="button" className={`nav-item ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <Icon name={item.icon} size={19} />
      <span>{item.label}</span>
    </button>
  )
}

function TabItem({ item, active, onClick }) {
  return (
    <button type="button" className={`tab-item ${active ? 'active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      <Icon name={item.icon} size={22} />
      <span>{item.short || item.label}</span>
    </button>
  )
}

function PageSkeleton() {
  return (
    <div className="page">
      <div className="skeleton" style={{ height: 34, width: 260, borderRadius: 10 }} />
      <div className="stats-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
    </div>
  )
}
