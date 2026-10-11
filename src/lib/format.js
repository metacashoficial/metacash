const LOCALE = 'es-MX'
const cache = new Map()

function nf(key, opts) {
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(LOCALE, opts))
  return cache.get(key)
}

export function money(value, currency = 'MXN', { decimals = 2, sign = false } = {}) {
  const n = Number(value) || 0
  const f = nf(`m-${currency}-${decimals}`, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const s = f.format(Math.abs(n))
  if (n < 0) return '−' + s
  return sign && n > 0 ? '+' + s : s
}

function currencySymbol(currency) {
  const parts = nf(`m-${currency}-0`, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).formatToParts(0)
  return parts.find((p) => p.type === 'currency')?.value || '$'
}

/** Formato corto para ejes y gráficos: $950, $1.8k, $2.4M */
export function moneyCompact(value, currency = 'MXN') {
  const n = Number(value) || 0
  const abs = Math.abs(n)
  if (abs < 1000) return money(n, currency, { decimals: 0 })
  const [v, suffix] = abs >= 1e6 ? [abs / 1e6, 'M'] : [abs / 1e3, 'k']
  const s = nf('c1', { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v)
  return (n < 0 ? '−' : '') + currencySymbol(currency) + s + suffix
}

export function percent(value, decimals = 0) {
  return nf(`p-${decimals}`, { style: 'percent', maximumFractionDigits: decimals }).format(Number(value) || 0)
}

export function number(value, decimals = 1) {
  return nf(`n-${decimals}`, { maximumFractionDigits: decimals }).format(Number(value) || 0)
}

/** Convierte texto como "1,250.50" o "1250,5" a número. */
export function parseAmount(text) {
  if (typeof text === 'number') return text
  let s = String(text || '').trim().replace(/[^\d.,-]/g, '')
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '')
  else if (s.includes(',')) s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN
}

/* ---------- Fechas (siempre en hora local, formato YYYY-MM-DD) ---------- */

const pad = (n) => String(n).padStart(2, '0')

export function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function parseISODate(s) {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function addDays(iso, days) {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function daysBetween(fromISO, toISO) {
  return Math.round((parseISODate(toISO) - parseISODate(fromISO)) / 86400000)
}

export function startOfMonth(iso = todayISO()) {
  return iso.slice(0, 8) + '01'
}

export function startOfWeek(iso = todayISO()) {
  // Semana de lunes a domingo
  const d = parseISODate(iso)
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  return toISODate(d)
}

export function formatDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '—'
  return parseISODate(iso).toLocaleDateString(LOCALE, opts).replace('.', '')
}

export function formatDateLong(iso) {
  const s = parseISODate(iso).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function relativeDay(iso) {
  const diff = daysBetween(todayISO(), iso)
  if (diff === 0) return 'Hoy'
  if (diff === -1) return 'Ayer'
  if (diff === 1) return 'Mañana'
  return formatDateLong(iso)
}

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
/** Orden de visualización: lunes primero */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/* ---------- Horas ---------- */

export function hhmm(t) {
  return String(t || '').slice(0, 5)
}

export function timeToMinutes(t) {
  const [h, m] = hhmm(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToTime(min) {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`
}

/** Horas entre dos horas del día (soporta turnos que cruzan medianoche). */
export function shiftHours(start, end) {
  let diff = timeToMinutes(end) - timeToMinutes(start)
  if (diff <= 0) diff += 1440
  return diff / 60
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export function formatHours(hours) {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' })
}

export function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
