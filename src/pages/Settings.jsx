import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Button, Card, Input, MoneyInput, PageHeader, Segmented, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { CURRENCIES } from '../lib/constants'
import { exportTransactions } from '../lib/csv'
import { formatDate, parseAmount, todayISO } from '../lib/format'
import { authErrorMessage } from '../lib/supabase'

export default function Settings({ theme, setTheme }) {
  const { user, signOut, updatePassword } = useAuth()
  const { prefs, savePrefs, transactions, syncing, reloadAll } = useData()
  const { toast, confirm } = useFeedback()
  const [name, setName] = useState(prefs.display_name || '')
  const [goal, setGoal] = useState(prefs.daily_goal ? String(prefs.daily_goal) : '')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [pwdErr, setPwdErr] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    setName(prefs.display_name || '')
    setGoal(prefs.daily_goal ? String(prefs.daily_goal) : '')
  }, [prefs.display_name, prefs.daily_goal])

  const save = async (patch, msg = 'Guardado.') => {
    try {
      await savePrefs(patch)
      toast(msg)
    } catch (e) {
      toast(e.message, { tone: 'error', title: 'No se pudo guardar' })
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (pwd.length < 8) return setPwdErr('Usa al menos 8 caracteres.')
    if (pwd !== pwd2) return setPwdErr('Las contraseñas no coinciden.')
    setPwdErr(null)
    setBusy('pwd')
    try {
      await updatePassword(pwd)
      setPwd('')
      setPwd2('')
      toast('Contraseña actualizada.')
    } catch (err) {
      setPwdErr(authErrorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const logoutAll = async () => {
    const ok = await confirm({ title: 'Cerrar sesión en todos lados', message: 'Se cerrará tu sesión en este y en todos tus otros dispositivos.', confirmText: 'Cerrar sesiones', danger: true })
    if (ok) signOut('global')
  }

  return (
    <div className="page">
      <PageHeader title="Ajustes" subtitle="Tu cuenta, apariencia y preferencias." />

      <div className="settings-grid">
        <Card title="Cuenta">
          <div className="account">
            <span className="avatar">{(prefs.display_name || user.email).charAt(0).toUpperCase()}</span>
            <div>
              <strong>{prefs.display_name || 'Sin nombre'}</strong>
              <span className="muted">{user.email}</span>
              <span className="muted small">Miembro desde {formatDate(user.created_at?.slice(0, 10))}</span>
            </div>
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault()
              save({ display_name: name.trim().slice(0, 60) || null }, 'Nombre actualizado.')
            }}
          >
            <Input label="¿Cómo te llamamos?" value={name} maxLength={60} placeholder="Tu nombre" onChange={(e) => setName(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={name === (prefs.display_name || '')}>
              Guardar
            </Button>
          </form>
        </Card>

        <Card title="Apariencia">
          <Segmented
            className="seg-full"
            value={theme}
            onChange={(v) => {
              setTheme(v)
              savePrefs({ theme: v }).catch(() => {})
            }}
            ariaLabel="Tema"
            options={[
              { value: 'light', label: 'Claro', icon: 'sun' },
              { value: 'dark', label: 'Oscuro', icon: 'moon' },
              { value: 'system', label: 'Automático', icon: 'monitor' },
            ]}
          />
          <p className="form-note">«Automático» sigue la configuración de tu teléfono o computadora.</p>
        </Card>

        <Card title="Dinero">
          <div className="form-grid">
            <Select label="Moneda" value={prefs.currency} onChange={(e) => save({ currency: e.target.value }, 'Moneda actualizada.')}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault()
                save({ daily_goal: parseAmount(goal) || 0 }, 'Objetivo diario actualizado.')
              }}
            >
              <MoneyInput label="Objetivo diario general" value={goal} onChange={setGoal} currency={prefs.currency} />
              <Button type="submit" variant="secondary">
                Guardar
              </Button>
            </form>
            <p className="form-note">El objetivo diario general se usa en los días que no tienen uno propio en tu horario.</p>
          </div>
        </Card>

        <Card title="Seguridad">
          <form className="form-grid" onSubmit={changePassword}>
            <Input label="Nueva contraseña" type="password" autoComplete="new-password" value={pwd} onChange={(e) => setPwd(e.target.value)} icon="lock" />
            <Input label="Repite la contraseña" type="password" autoComplete="new-password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} icon="lock" error={pwdErr} />
            <Button type="submit" variant="secondary" loading={busy === 'pwd'} disabled={!pwd}>
              Cambiar contraseña
            </Button>
          </form>
        </Card>

        <Card title="Datos y sincronización">
          <div className="settings-list">
            <div className="settings-item">
              <span className="settings-icon">
                <Icon name="sync" size={18} />
              </span>
              <div>
                <strong>Sincronización automática</strong>
                <span className="muted">Tus datos se guardan en la nube y se actualizan en todos tus dispositivos.</span>
              </div>
              <Button size="sm" variant="ghost" loading={syncing} onClick={() => reloadAll().then(() => toast('Datos actualizados.'))}>
                Actualizar
              </Button>
            </div>
            <div className="settings-item">
              <span className="settings-icon">
                <Icon name="download" size={18} />
              </span>
              <div>
                <strong>Exportar todo</strong>
                <span className="muted">{transactions.length} movimientos en formato CSV (Excel, Sheets).</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => exportTransactions(transactions, `metacash-todo-${todayISO()}.csv`)} disabled={!transactions.length}>
                Descargar
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Sesión">
          <div className="form-grid">
            <Button variant="secondary" icon="logout" onClick={() => signOut('local')} block>
              Cerrar sesión
            </Button>
            <Button variant="ghost" className="danger-text" onClick={logoutAll} block>
              Cerrar sesión en todos los dispositivos
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
