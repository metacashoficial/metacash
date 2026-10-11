import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { arrivedFrom, supabase, siteUrl } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovery, setRecovery] = useState(arrivedFrom.recovery)
  const [linkError, setLinkError] = useState(arrivedFrom.error)
  const [notice, setNotice] = useState(null) // mensaje de bienvenida al entrar
  const [hold, setHoldState] = useState(false) // mantiene la pantalla de acceso mientras se termina un flujo

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session && arrivedFrom.signup) setNotice('Tu correo quedó confirmado. ¡Bienvenido a MetaCash!')
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
      setSession(newSession)
      setLoading(false)
    })

    // Si el usuario llegó por un enlace con error, dejamos la URL limpia
    if (arrivedFrom.error) window.history.replaceState(null, '', window.location.pathname)

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: siteUrl() + '/', data: { display_name: displayName?.trim() || null } },
    })
    if (error) throw error
    // Supabase devuelve un usuario sin identidades si el correo ya estaba registrado
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('User already registered')
    }
    return { needsConfirmation: !data.session }
  }, [])

  const resendConfirmation = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: siteUrl() + '/' },
    })
    if (error) throw error
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: siteUrl() + '/',
    })
    if (error) throw error
  }, [])

  /** Confirma la cuenta con el código de 6 dígitos que llegó al correo. */
  const verifySignupCode = useCallback(async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: String(token).trim(), type: 'email' })
    if (error) throw error
    setNotice('Tu correo quedó confirmado. ¡Bienvenido a MetaCash!')
  }, [])

  /** Valida el código de recuperación; deja la sesión abierta para guardar la contraseña nueva. */
  const verifyRecoveryCode = useCallback(async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: String(token).trim(), type: 'recovery' })
    if (error) throw error
  }, [])

  const setHold = useCallback((value, message) => {
    setHoldState(value)
    if (message) setNotice(message)
  }, [])

  const updatePassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecovery(false)
  }, [])

  const signOut = useCallback(async (scope = 'local') => {
    await supabase.auth.signOut({ scope })
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        recovery,
        setRecovery,
        linkError,
        clearLinkError: () => setLinkError(null),
        notice,
        clearNotice: () => setNotice(null),
        hold,
        setHold,
        verifySignupCode,
        verifyRecoveryCode,
        signIn,
        signUp,
        resendConfirmation,
        requestPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
