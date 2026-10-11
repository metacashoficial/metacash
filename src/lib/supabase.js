import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isConfigured = Boolean(url && key)

// Leemos la URL ANTES de que Supabase la procese y la limpie,
// para saber si el usuario llega desde un correo de recuperación o confirmación.
const rawUrl = typeof window !== 'undefined' ? window.location.hash + '&' + window.location.search : ''
const urlParams = new URLSearchParams(rawUrl.replace(/^#/, '').replace(/[?#]/g, '&'))
export const arrivedFrom = {
  recovery: urlParams.get('type') === 'recovery',
  signup: urlParams.get('type') === 'signup' || urlParams.get('type') === 'email',
  error: urlParams.get('error_description') || urlParams.get('error') || null,
  errorCode: urlParams.get('error_code') || null,
}

export const supabase = isConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true, // la sesión se guarda en este dispositivo
        autoRefreshToken: true, // el token se renueva solo antes de expirar
        detectSessionInUrl: true, // procesa enlaces de confirmación y recuperación
        storageKey: 'metacash-auth',
      },
    })
  : null

export const allowedDomains = String(import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase().replace(/^@/, ''))
  .filter(Boolean)

export function siteUrl() {
  const configured = import.meta.env.VITE_SITE_URL
  return (configured || window.location.origin).replace(/\/$/, '')
}

export function emailDomainAllowed(email) {
  if (!allowedDomains.length) return true
  const domain = String(email).split('@')[1]?.toLowerCase()
  return allowedDomains.includes(domain)
}

export function authErrorMessage(error) {
  const m = String(error?.message || error || '').toLowerCase()
  if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Tu correo aún no está confirmado. Abre el enlace que te enviamos (revisa también spam).'
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists'))
    return 'Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.'
  if (m.includes('password should') || m.includes('weak password') || m.includes('weak_password'))
    return 'La contraseña es muy débil. Usa al menos 8 caracteres combinando letras y números.'
  if (m.includes('rate limit') || m.includes('security purposes') || m.includes('too many'))
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.'
  if (m.includes('different from the old') || m.includes('same password'))
    return 'La nueva contraseña debe ser distinta a la anterior.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'El registro de cuentas está desactivado en el proyecto de Supabase.'
  if (m.includes('error sending') || m.includes('smtp'))
    return 'No se pudo enviar el correo. Revisa la configuración de correo (SMTP) en Supabase.'
  if (m.includes('reauthentication')) return 'Por seguridad, cierra sesión e inicia de nuevo antes de cambiar la contraseña.'
  if (m.includes('expired') || m.includes('otp_expired')) return 'El enlace expiró o ya fue usado. Solicita uno nuevo.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'No se pudo conectar. Revisa tu conexión a internet.'
  if (m.includes('database error saving new user') || m.includes('solo se permiten'))
    return 'No se pudo crear la cuenta con este correo.'
  return error?.message || 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
