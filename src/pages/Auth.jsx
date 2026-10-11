import { useState } from 'react'
import Icon, { Logo, Wordmark } from '../components/Icon'
import { Button, Input } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { allowedDomains, authErrorMessage, emailDomainAllowed } from '../lib/supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function strength(p) {
  let s = 0
  if (p.length >= 8) s++
  if (p.length >= 12) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(4, s)
}
const STRENGTH = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente']

function PasswordInput({ label, value, onChange, error, autoComplete, hint }) {
  const [show, setShow] = useState(false)
  return (
    <Input
      label={label}
      type={show ? 'text' : 'password'}
      icon="lock"
      value={value}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      hint={hint}
      right={
        <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
        </button>
      }
    />
  )
}

function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-aside">
        <Wordmark size={34} />
        <div className="auth-pitch">
          <h2>Tu dinero, con un plan.</h2>
          <p>Metas de ahorro, ingresos, gastos y horarios de trabajo en un solo lugar. Simple y claro.</p>
          <ul>
            <li>
              <Icon name="target" size={18} /> Sabe cuánto ganar por día para cumplir tus metas
            </li>
            <li>
              <Icon name="trendUp" size={18} /> Mira en qué se va tu dinero con gráficos claros
            </li>
            <li>
              <Icon name="sync" size={18} /> Tus datos sincronizados en el celular y la computadora
            </li>
          </ul>
        </div>
        <svg className="auth-art" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 140 C60 132 90 110 130 112 S200 70 240 76 S320 30 400 18" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" />
          <path d="M0 150 C70 148 110 136 160 130 S260 120 300 104 S360 90 400 84" fill="none" stroke="currentColor" strokeWidth="2" opacity=".2" />
          <circle cx="400" cy="18" r="5" fill="var(--logo-dot)" />
        </svg>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-logo">
            <Logo size={44} />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AuthScreen() {
  const { signIn, signUp, requestPasswordReset, resendConfirmation, linkError, clearLinkError } = useAuth()
  const [mode, setMode] = useState('login') // login | register | forgot | sent | confirm
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [name, setName] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const go = (m) => {
    setMode(m)
    setErrors({})
    setMessage(null)
    clearLinkError()
  }

  const placeholder = allowedDomains.length ? `usuario@${allowedDomains[0]}` : 'tucorreo@gmail.com'

  const validateEmail = () => {
    const e = email.trim()
    if (!EMAIL_RE.test(e)) return 'Escribe un correo válido.'
    if (mode === 'register' && !emailDomainAllowed(e)) return `Usa un correo ${allowedDomains.map((d) => '@' + d).join(' o ')}.`
    return null
  }

  const submit = async (ev) => {
    ev.preventDefault()
    const errs = {}
    const em = validateEmail()
    if (em) errs.email = em
    if (mode === 'login' && !password) errs.password = 'Escribe tu contraseña.'
    if (mode === 'register') {
      if (password.length < 8) errs.password = 'Usa al menos 8 caracteres.'
      else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errs.password = 'Combina letras y números.'
      if (password2 !== password) errs.password2 = 'Las contraseñas no coinciden.'
    }
    setErrors(errs)
    setMessage(null)
    if (Object.keys(errs).length) return
    setLoading(true)
    try {
      if (mode === 'login') await signIn(email, password)
      if (mode === 'register') {
        const { needsConfirmation } = await signUp(email, password, name)
        if (needsConfirmation) go('confirm')
      }
      if (mode === 'forgot') {
        await requestPasswordReset(email)
        go('sent')
      }
    } catch (err) {
      const msg = authErrorMessage(err)
      if (mode === 'login' && /no está confirmado/.test(msg)) setMessage({ tone: 'info', text: msg, resend: true })
      else setMessage({ tone: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setLoading(true)
    try {
      await resendConfirmation(email)
      setMessage({ tone: 'success', text: 'Te enviamos un nuevo correo de confirmación.' })
    } catch (err) {
      setMessage({ tone: 'error', text: authErrorMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'sent' || mode === 'confirm') {
    return (
      <AuthLayout>
        <div className="auth-sent">
          <span className="sent-icon">
            <Icon name="mail" size={26} />
          </span>
          <h1>Revisa tu correo</h1>
          <p>
            {mode === 'sent' ? 'Si existe una cuenta con ' : 'Te enviamos un enlace de confirmación a '}
            <strong>{email.trim().toLowerCase()}</strong>
            {mode === 'sent' ? ', te llegará un enlace para crear una nueva contraseña.' : '. Ábrelo para activar tu cuenta.'}
          </p>
          <p className="muted small">¿No lo ves? Revisa las carpetas de spam y promociones. Puede tardar un par de minutos.</p>
          {message && <div className={`alert alert-${message.tone}`}>{message.text}</div>}
          {mode === 'confirm' && (
            <Button variant="secondary" block loading={loading} onClick={resend} icon="sync">
              Reenviar correo
            </Button>
          )}
          <Button variant="ghost" block onClick={() => go('login')} icon="chevronLeft">
            Volver a iniciar sesión
          </Button>
        </div>
      </AuthLayout>
    )
  }

  const titles = {
    login: ['Inicia sesión', 'Qué bueno verte de nuevo.'],
    register: ['Crea tu cuenta', 'Gratis. Solo necesitas tu correo.'],
    forgot: ['Recupera tu contraseña', 'Te enviaremos un enlace para crear una nueva.'],
  }
  const s = strength(password)

  return (
    <AuthLayout>
      <header className="auth-head">
        <h1>{titles[mode][0]}</h1>
        <p>{titles[mode][1]}</p>
      </header>

      {mode !== 'forgot' && (
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => go('login')}>
            Iniciar sesión
          </button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => go('register')}>
            Crear cuenta
          </button>
        </div>
      )}

      {linkError && (
        <div className="alert alert-error">
          {authErrorMessage({ message: linkError })}
          {' '}
          <button type="button" className="link" onClick={() => go('forgot')}>
            Pedir otro enlace
          </button>
        </div>
      )}
      {message && (
        <div className={`alert alert-${message.tone}`}>
          {message.text}
          {message.resend && (
            <>
              {' '}
              <button type="button" className="link" onClick={resend}>
                Reenviar correo
              </button>
            </>
          )}
        </div>
      )}

      <form className="form-grid" onSubmit={submit} noValidate>
        {mode === 'register' && <Input label="Tu nombre (opcional)" icon="user" autoComplete="name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Cómo quieres que te llamemos" />}
        <Input
          label="Correo electrónico"
          type="email"
          icon="mail"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        {mode !== 'forgot' && (
          <PasswordInput
            label="Contraseña"
            value={password}
            onChange={setPassword}
            error={errors.password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        )}
        {mode === 'register' && password && (
          <div className="strength" data-level={s}>
            <div>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={i < s ? 'on' : ''} />
              ))}
            </div>
            <em>{STRENGTH[s]}</em>
          </div>
        )}
        {mode === 'register' && <PasswordInput label="Repite la contraseña" value={password2} onChange={setPassword2} error={errors.password2} autoComplete="new-password" />}

        {mode === 'login' && (
          <button type="button" className="link align-right" onClick={() => go('forgot')}>
            ¿Olvidaste tu contraseña?
          </button>
        )}

        <Button type="submit" size="lg" block loading={loading}>
          {mode === 'login' ? 'Entrar' : mode === 'register' ? 'Crear cuenta' : 'Enviar enlace'}
        </Button>

        {mode === 'forgot' && (
          <Button variant="ghost" block icon="chevronLeft" onClick={() => go('login')}>
            Volver
          </Button>
        )}
      </form>

      {mode === 'register' && <p className="auth-legal">Al crear tu cuenta aceptas que tus datos se guarden de forma privada en tu cuenta.</p>}
    </AuthLayout>
  )
}

export function ResetPassword() {
  const { updatePassword, signOut, user } = useAuth()
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (password.length < 8) errs.password = 'Usa al menos 8 caracteres.'
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errs.password = 'Combina letras y números.'
    if (password2 !== password) errs.password2 = 'Las contraseñas no coinciden.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setLoading(true)
    setMessage(null)
    try {
      setDone(true)
      await updatePassword(password)
    } catch (err) {
      setDone(false)
      setMessage(authErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <header className="auth-head">
        <h1>Crea una nueva contraseña</h1>
        <p>{user?.email ? `Para la cuenta ${user.email}` : 'Elige una contraseña segura.'}</p>
      </header>
      {!user && <div className="alert alert-info">Validando el enlace…</div>}
      {message && <div className="alert alert-error">{message}</div>}
      <form className="form-grid" onSubmit={submit} noValidate>
        <PasswordInput label="Nueva contraseña" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" />
        <PasswordInput label="Repite la contraseña" value={password2} onChange={setPassword2} error={errors.password2} autoComplete="new-password" />
        <Button type="submit" size="lg" block loading={loading || done} disabled={!user}>
          Guardar contraseña
        </Button>
        <Button variant="ghost" block onClick={() => signOut('local')}>
          Cancelar
        </Button>
      </form>
    </AuthLayout>
  )
}

export function SetupScreen() {
  return (
    <AuthLayout>
      <header className="auth-head">
        <h1>Falta conectar Supabase</h1>
        <p>MetaCash necesita las credenciales de tu proyecto para funcionar.</p>
      </header>
      <ol className="setup-steps">
        <li>
          Copia el archivo <code>.env.example</code> como <code>.env</code> en la carpeta del proyecto.
        </li>
        <li>
          Llena <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (Supabase › Project Settings › API).
        </li>
        <li>
          Reinicia el servidor con <code>npm run dev</code>. Si la app está publicada, agrega las variables en tu hosting y vuelve a desplegar.
        </li>
      </ol>
    </AuthLayout>
  )
}
