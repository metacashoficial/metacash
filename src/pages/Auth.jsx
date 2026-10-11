import { useEffect, useState } from 'react'
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

const CODE_LEN = Math.max(6, Math.min(10, Number(import.meta.env.VITE_OTP_LENGTH) || 6))
const RESEND_SECONDS = 60

function CodeInput({ value, onChange, error, onComplete }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label className="field-label" htmlFor="otp-code">
        Código de {CODE_LEN} dígitos
      </label>
      <input
        id="otp-code"
        className="input code-input"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={10}
        placeholder={'0'.repeat(CODE_LEN)}
        value={value}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 10)
          onChange(v)
          if (v.length === CODE_LEN) onComplete?.(v)
        }}
        data-autofocus
        autoFocus
      />
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}

function useCooldown() {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, () => setLeft(RESEND_SECONDS)]
}

export default function AuthScreen() {
  const {
    signIn,
    signUp,
    resendConfirmation,
    verifySignupCode,
    requestPasswordReset,
    verifyRecoveryCode,
    updatePassword,
    setHold,
    signOut,
    linkError,
    clearLinkError,
  } = useAuth()
  // login | register | verify (código de registro) | forgot (pide correo) | reset (código + contraseña nueva)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [codeVerified, setCodeVerified] = useState(false)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cooldown, startCooldown] = useCooldown()

  const go = (m) => {
    setMode(m)
    setErrors({})
    setMessage(null)
    setCode('')
    setCodeVerified(false)
    if (m === 'login' || m === 'register') {
      setPassword('')
      setPassword2('')
    }
    clearLinkError()
  }

  const placeholder = allowedDomains.length ? `usuario@${allowedDomains[0]}` : 'tucorreo@gmail.com'
  const cleanEmail = email.trim().toLowerCase()

  const validateEmail = () => {
    if (!EMAIL_RE.test(cleanEmail)) return 'Escribe un correo válido.'
    if (mode === 'register' && !emailDomainAllowed(cleanEmail)) return `Usa un correo ${allowedDomains.map((d) => '@' + d).join(' o ')}.`
    return null
  }

  const validateNewPassword = (errs) => {
    if (password.length < 8) errs.password = 'Usa al menos 8 caracteres.'
    else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) errs.password = 'Combina letras y números.'
    if (password2 !== password) errs.password2 = 'Las contraseñas no coinciden.'
  }

  const run = async (fn) => {
    setLoading(true)
    setMessage(null)
    try {
      await fn()
    } catch (err) {
      setMessage({ tone: 'error', text: authErrorMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  /* ----- Iniciar sesión / crear cuenta / pedir código de recuperación ----- */
  const submit = (ev) => {
    ev.preventDefault()
    const errs = {}
    const em = validateEmail()
    if (em) errs.email = em
    if (mode === 'login' && !password) errs.password = 'Escribe tu contraseña.'
    if (mode === 'register') validateNewPassword(errs)
    setErrors(errs)
    setMessage(null)
    if (Object.keys(errs).length) return

    if (mode === 'login')
      return run(async () => {
        try {
          await signIn(cleanEmail, password)
        } catch (err) {
          // Cuenta creada pero sin confirmar: le mandamos un código nuevo
          if (/email not confirmed/i.test(err?.message || '')) {
            await resendConfirmation(cleanEmail).catch(() => {})
            startCooldown()
            setMode('verify')
            setCode('')
            setMessage({ tone: 'info', text: 'Tu correo aún no está confirmado. Te enviamos un código para confirmarlo.' })
            return
          }
          throw err
        }
      })

    if (mode === 'register')
      return run(async () => {
        const { needsConfirmation } = await signUp(cleanEmail, password, name)
        if (needsConfirmation) {
          startCooldown()
          setMode('verify')
          setCode('')
        }
      })

    if (mode === 'forgot')
      return run(async () => {
        await requestPasswordReset(cleanEmail)
        startCooldown()
        setMode('reset')
        setCode('')
        setPassword('')
        setPassword2('')
      })
  }

  /* ----- Confirmar registro con el código ----- */
  const confirmSignup = (value = code) => {
    if (value.length < 6) return setErrors({ code: `Escribe el código de ${CODE_LEN} dígitos.` })
    setErrors({})
    return run(() => verifySignupCode(cleanEmail, value)) // al confirmar, la app entra sola
  }

  /* ----- Recuperar: código + contraseña nueva ----- */
  const confirmReset = (ev) => {
    ev?.preventDefault()
    const errs = {}
    if (!codeVerified && code.length < 6) errs.code = `Escribe el código de ${CODE_LEN} dígitos.`
    validateNewPassword(errs)
    setErrors(errs)
    if (Object.keys(errs).length) return
    return run(async () => {
      setHold(true) // que la app no entre sola antes de guardar la contraseña
      try {
        if (!codeVerified) {
          await verifyRecoveryCode(cleanEmail, code)
          setCodeVerified(true) // el código ya se usó: si falla la contraseña no se vuelve a pedir
        }
        await updatePassword(password)
        setHold(false, 'Contraseña actualizada. ¡Bienvenido de vuelta!')
      } catch (err) {
        if (!codeVerified) setHold(false)
        throw err
      }
    })
  }

  const cancelReset = async () => {
    if (codeVerified) await signOut('local').catch(() => {})
    setHold(false)
    go('login')
  }

  const resend = () => {
    if (cooldown > 0) return
    return run(async () => {
      if (mode === 'verify') await resendConfirmation(cleanEmail)
      else await requestPasswordReset(cleanEmail)
      startCooldown()
      setCode('')
      setMessage({ tone: 'success', text: 'Te enviamos un código nuevo.' })
    })
  }

  const resendLine = (
    <p className="resend">
      ¿No te llegó? Revisa <b>Spam</b> y <b>Promociones</b>.{' '}
      {cooldown > 0 ? (
        <span className="muted">Reenviar en {cooldown} s</span>
      ) : (
        <button type="button" className="link" onClick={resend} disabled={loading}>
          Reenviar código
        </button>
      )}
    </p>
  )

  const alerts = (
    <>
      {linkError && (
        <div className="alert alert-error">
          {authErrorMessage({ message: linkError })}{' '}
          <button type="button" className="link" onClick={() => go('forgot')}>
            Pedir un código
          </button>
        </div>
      )}
      {message && <div className={`alert alert-${message.tone}`}>{message.text}</div>}
    </>
  )

  /* ------------------------- Pantalla: código de registro ------------------------- */
  if (mode === 'verify') {
    return (
      <AuthLayout>
        <button type="button" className="auth-back" onClick={() => go('register')}>
          <Icon name="chevronLeft" size={18} /> Regresar
        </button>
        <header className="auth-head">
          <span className="sent-icon">
            <Icon name="mail" size={24} />
          </span>
          <h1>Revisa tu correo</h1>
          <p>
            Te enviamos un código de {CODE_LEN} dígitos a <strong className="break">{cleanEmail}</strong>. Escríbelo aquí para activar tu cuenta.
          </p>
        </header>
        {alerts}
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            confirmSignup()
          }}
          noValidate
        >
          <CodeInput value={code} onChange={setCode} error={errors.code} onComplete={(v) => !loading && confirmSignup(v)} />
          <Button type="submit" size="lg" block loading={loading} disabled={code.length < 6}>
            Confirmar y entrar
          </Button>
          {resendLine}
        </form>
      </AuthLayout>
    )
  }

  /* ------------------- Pantalla: código + contraseña nueva ------------------- */
  if (mode === 'reset') {
    return (
      <AuthLayout>
        <button type="button" className="auth-back" onClick={cancelReset}>
          <Icon name="chevronLeft" size={18} /> Regresar
        </button>
        <header className="auth-head">
          <span className="sent-icon">
            <Icon name="lock" size={24} />
          </span>
          <h1>Crea tu nueva contraseña</h1>
          <p>
            Escribe el código que enviamos a <strong className="break">{cleanEmail}</strong> y elige una contraseña nueva.
          </p>
        </header>
        {alerts}
        <form className="form-grid" onSubmit={confirmReset} noValidate>
          {codeVerified ? (
            <div className="alert alert-success">Código verificado. Solo falta guardar tu contraseña.</div>
          ) : (
            <CodeInput value={code} onChange={setCode} error={errors.code} />
          )}
          <PasswordInput label="Contraseña nueva" value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" />
          <PasswordInput label="Repite la contraseña" value={password2} onChange={setPassword2} error={errors.password2} autoComplete="new-password" />
          <Button type="submit" size="lg" block loading={loading}>
            Cambiar contraseña
          </Button>
          {!codeVerified && resendLine}
        </form>
      </AuthLayout>
    )
  }

  /* ------------------- Pantallas: entrar / crear cuenta / olvidé ------------------- */
  const titles = {
    login: ['Inicia sesión', 'Qué bueno verte de nuevo.'],
    register: ['Crea tu cuenta', 'Gratis. Te enviaremos un código para confirmar tu correo.'],
    forgot: ['Recupera tu contraseña', 'Te enviaremos un código a tu correo para crear una nueva.'],
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

      {alerts}

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
          <PasswordInput label="Contraseña" value={password} onChange={setPassword} error={errors.password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
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

        <Button type="submit" size="lg" block loading={loading} icon={mode === 'login' ? null : 'mail'}>
          {mode === 'login' ? 'Entrar' : 'Enviar código a mi correo'}
        </Button>

        {mode === 'forgot' && (
          <Button variant="ghost" block icon="chevronLeft" onClick={() => go('login')}>
            Volver
          </Button>
        )}
      </form>

      {mode === 'register' && <p className="auth-legal">Tus datos se guardan de forma privada en tu cuenta.</p>}
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
