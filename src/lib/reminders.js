import { useEffect, useRef } from 'react'
import { REMINDER_KINDS } from './constants'
import { minutesToTime, timeToMinutes, todayISO } from './format'

/** Hora (HH:MM) a la que debe sonar un recordatorio hoy, o null si hoy no aplica. */
export function reminderTimeToday(reminder, schedules, date = new Date()) {
  const wd = date.getDay()
  if (reminder.use_schedule && reminder.kind === 'work') {
    const s = schedules.find((x) => x.weekday === wd)
    if (!s || !s.is_active) return null
    return minutesToTime(timeToMinutes(s.start_time) - (reminder.minutes_before || 0))
  }
  if (!reminder.weekdays?.includes(wd)) return null
  return String(reminder.time).slice(0, 5)
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function showNotification(title, body, page = 'inicio') {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  const options = { body, icon: '/icon-512.png', badge: '/logo.svg', tag: 'metacash-' + title, data: { url: '/#/' + page } }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return true
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}

const PAGE_FOR = { work: 'horario', expense: 'movimientos', goals: 'metas', custom: 'inicio' }

/**
 * Revisa cada 20 s si toca algún recordatorio. Funciona mientras MetaCash
 * esté abierta (pestaña o app instalada). Cada recordatorio suena una vez al día.
 */
export function useReminderScheduler({ reminders, schedules, onFire }) {
  const ref = useRef({ reminders, schedules, onFire })
  ref.current = { reminders, schedules, onFire }

  useEffect(() => {
    const check = () => {
      const { reminders, schedules, onFire } = ref.current
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const day = todayISO()
      for (const r of reminders) {
        if (!r.enabled) continue
        const at = reminderTimeToday(r, schedules, now)
        if (!at) continue
        const diff = nowMin - timeToMinutes(at)
        if (diff < 0 || diff > 5) continue // ventana de 5 minutos por si la app estaba en segundo plano
        const key = `metacash-fired-${r.id}-${day}-${at}`
        try {
          if (localStorage.getItem(key)) continue
          localStorage.setItem(key, '1')
        } catch {
          /* almacenamiento no disponible */
        }
        const kind = REMINDER_KINDS[r.kind] || REMINDER_KINDS.custom
        showNotification(r.title, kind.body, PAGE_FOR[r.kind])
        onFire?.(r, kind)
      }
    }
    check()
    const id = setInterval(check, 20000)
    return () => clearInterval(id)
  }, [])
}
