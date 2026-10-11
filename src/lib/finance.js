import { addDays, daysBetween, parseISODate, shiftHours, todayISO, toISODate } from './format'

export const amountOf = (t) => Number(t.amount) || 0

export function sumBy(list, type) {
  return list.reduce((s, t) => (t.type === type ? s + amountOf(t) : s), 0)
}

export function totals(list) {
  const income = sumBy(list, 'income')
  const expense = sumBy(list, 'expense')
  return { income, expense, net: income - expense }
}

export function inRange(list, from, to) {
  return list.filter((t) => (!from || t.date >= from) && (!to || t.date <= to))
}

/** Lo que hay en metas, y lo que se apartó desde la app (aportaciones netas). */
export function goalsSummary(goals) {
  const saved = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0)
  const movedFromApp = goals.reduce((s, g) => s + (Number(g.current_amount || 0) - Number(g.initial_amount || 0)), 0)
  const target = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0)
  return { saved, movedFromApp, target }
}

/** Serie diaria de ingresos y gastos para los últimos `days` días. */
export function dailySeries(list, days, end = todayISO()) {
  const start = addDays(end, -(days - 1))
  const map = new Map()
  for (let i = 0; i < days; i++) map.set(addDays(start, i), { income: 0, expense: 0 })
  for (const t of list) {
    const slot = map.get(t.date)
    if (slot) slot[t.type] += amountOf(t)
  }
  return [...map.entries()].map(([date, v]) => ({ date, ...v, net: v.income - v.expense }))
}

/** Serie mensual para los últimos `months` meses. */
export function monthlySeries(list, months = 6, end = todayISO()) {
  const d = parseISODate(end)
  const keys = []
  for (let i = months - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(toISODate(m).slice(0, 7))
  }
  const map = new Map(keys.map((k) => [k, { income: 0, expense: 0 }]))
  for (const t of list) {
    const slot = map.get(t.date.slice(0, 7))
    if (slot) slot[t.type] += amountOf(t)
  }
  return keys.map((k) => {
    const v = map.get(k)
    const label = parseISODate(k + '-01').toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')
    return { key: k, label: label.charAt(0).toUpperCase() + label.slice(1), ...v, net: v.income - v.expense }
  })
}

export function byCategory(list, type) {
  const map = new Map()
  for (const t of list) if (t.type === type) map.set(t.category, (map.get(t.category) || 0) + amountOf(t))
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

/** Agrupa las categorías pequeñas en "Otras" para que el gráfico sea legible. */
export function topCategories(items, max = 6) {
  if (items.length <= max) return items
  const head = items.slice(0, max - 1)
  const rest = items.slice(max - 1).reduce((s, i) => s + i.value, 0)
  return [...head, { label: 'Otras', value: rest }]
}

/* ------------------------------ Horario ------------------------------ */

export function scheduleMap(schedules) {
  const map = {}
  for (let d = 0; d < 7; d++) map[d] = { weekday: d, is_active: false, start_time: '09:00', end_time: '17:00', daily_goal: 0 }
  for (const s of schedules) map[s.weekday] = s
  return map
}

export function weeklyScheduledHours(schedules) {
  return schedules.filter((s) => s.is_active).reduce((h, s) => h + shiftHours(s.start_time, s.end_time), 0)
}

/** Días y horas de trabajo programados desde `from` hasta `to` (inclusive). */
export function workTimeBetween(from, to, schedules) {
  const map = scheduleMap(schedules)
  const anyActive = schedules.some((s) => s.is_active)
  let days = 0
  let hours = 0
  const total = daysBetween(from, to)
  for (let i = 0; i <= total; i++) {
    const wd = parseISODate(addDays(from, i)).getDay()
    const s = map[wd]
    if (anyActive) {
      if (s.is_active) {
        days++
        hours += shiftHours(s.start_time, s.end_time)
      }
    } else if (wd >= 1 && wd <= 5) {
      // Sin horario configurado: suponemos lunes a viernes, 8 h
      days++
      hours += 8
    }
  }
  return { days, hours, estimated: !anyActive }
}

/* ---------------------------- Planificador ---------------------------- */

export function averageDailyExpense(transactions, days = 30) {
  const from = addDays(todayISO(), -(days - 1))
  return sumBy(inRange(transactions, from, todayISO()), 'expense') / days
}

export function averageDailyNet(transactions, days = 30) {
  const from = addDays(todayISO(), -(days - 1))
  const t = totals(inRange(transactions, from, todayISO()))
  return t.net / days
}

/**
 * Cuánto hay que ganar para juntar `remaining` antes de `deadline`.
 * Si includeExpenses es true, también suma tus gastos promedio de ese periodo,
 * porque ese dinero también tiene que salir de lo que ganes.
 */
export function plan({ remaining, deadline, schedules, avgDailyExpense = 0, includeExpenses = false }) {
  const today = todayISO()
  if (!deadline) return null
  const calendarDays = Math.max(1, daysBetween(today, deadline) + 1)
  const expenses = includeExpenses ? avgDailyExpense * calendarDays : 0
  const need = Math.max(0, remaining) + expenses
  const work = workTimeBetween(today, deadline < today ? today : deadline, schedules)
  const overdue = deadline < today
  return {
    overdue,
    calendarDays,
    weeks: calendarDays / 7,
    expenses,
    need,
    perDay: need / calendarDays,
    perWeek: (need / calendarDays) * 7,
    perMonth: (need / calendarDays) * 30.44,
    workdays: work.days,
    workHours: work.hours,
    estimated: work.estimated,
    perWorkday: work.days ? need / work.days : need,
    perHour: work.hours ? need / work.hours : need,
  }
}

export function projectedDate(remaining, dailyRate) {
  if (remaining <= 0) return todayISO()
  if (!(dailyRate > 0)) return null
  const days = Math.ceil(remaining / dailyRate)
  if (days > 365 * 50) return null
  return addDays(todayISO(), days)
}
