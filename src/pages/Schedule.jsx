import { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { Button, Card, Empty, IconButton, Input, Modal, MoneyInput, PageHeader, Progress, Toggle, useNow } from '../components/ui'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { scheduleMap, sumBy, weeklyScheduledHours } from '../lib/finance'
import {
  formatDate,
  formatDuration,
  formatHours,
  formatTime,
  hhmm,
  money,
  parseAmount,
  shiftHours,
  startOfWeek,
  toISODate,
  todayISO,
  WEEK_ORDER,
  WEEKDAYS,
} from '../lib/format'

export default function Schedule() {
  const { schedules, sessions, transactions, currency, prefs, saveSchedule, startSession, deleteSession } = useData()
  const { toast, confirm } = useFeedback()
  const now = useNow(1000)
  const [rows, setRows] = useState([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [ending, setEnding] = useState(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (dirty) return
    const map = scheduleMap(schedules)
    setRows(WEEK_ORDER.map((d) => ({ ...map[d], start_time: hhmm(map[d].start_time), end_time: hhmm(map[d].end_time), daily_goal: map[d].daily_goal ? String(map[d].daily_goal) : '' })))
  }, [schedules, dirty])

  const change = (weekday, patch) => {
    setDirty(true)
    setRows((rs) => rs.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)))
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSchedule(rows.map((r) => ({ ...r, daily_goal: parseAmount(r.daily_goal) || 0 })))
      setDirty(false)
      toast('Horario guardado.')
    } catch (e) {
      toast(e.message, { tone: 'error', title: 'No se pudo guardar' })
    } finally {
      setSaving(false)
    }
  }

  const openSession = sessions.find((s) => !s.ended_at)
  const today = todayISO()
  const todayRow = scheduleMap(schedules)[new Date().getDay()]
  const dailyGoal = (todayRow.is_active && Number(todayRow.daily_goal)) || Number(prefs.daily_goal) || 0
  const earnedToday = sumBy(transactions.filter((t) => t.date === today), 'income')

  // Resumen semanal: horas trabajadas vs. programadas
  const weekStart = startOfWeek(today)
  const weekSessions = sessions.filter((s) => toISODate(new Date(s.started_at)) >= weekStart)
  const workedMs = weekSessions.reduce((ms, s) => ms + ((s.ended_at ? new Date(s.ended_at).getTime() : now) - new Date(s.started_at).getTime()), 0)
  const scheduledH = weeklyScheduledHours(schedules)
  const draftWeekH = rows.filter((r) => r.is_active).reduce((h, r) => h + shiftHours(r.start_time, r.end_time), 0)
  const draftWeekGoal = rows.filter((r) => r.is_active).reduce((s, r) => s + (parseAmount(r.daily_goal) || 0), 0)

  const start = async () => {
    setStarting(true)
    try {
      await startSession()
      toast('Jornada iniciada. ¡A darle!')
    } catch (e) {
      toast(e.message.includes('duplicate') ? 'Ya tienes una jornada en curso.' : e.message, { tone: 'error' })
    } finally {
      setStarting(false)
    }
  }

  const removeSession = async (s) => {
    const ok = await confirm({ title: 'Eliminar jornada', message: 'Se borrará el registro de esta jornada. Los ingresos que hayas registrado no se borran.', confirmText: 'Eliminar', danger: true })
    if (!ok) return
    try {
      await deleteSession(s.id)
      toast('Jornada eliminada.')
    } catch (e) {
      toast(e.message, { tone: 'error' })
    }
  }

  const recent = sessions.filter((s) => s.ended_at).slice(0, 10)

  return (
    <div className="page">
      <PageHeader title="Horario de trabajo" subtitle="Elige qué días trabajas, a qué hora y cuánto quieres ganar. Luego registra cada jornada con un toque." />

      <div className="schedule-top">
        <Card className={`clock-card ${openSession ? 'is-live' : ''}`}>
          <div className="clock-head">
            <span className="eyebrow">{openSession ? 'Jornada en curso' : 'Control de jornada'}</span>
            {openSession && <span className="live-pill"><span className="live-dot" /> En vivo</span>}
          </div>
          <div className="clock-time">{openSession ? formatDuration(now - new Date(openSession.started_at).getTime()) : '00:00:00'}</div>
          <p className="muted">
            {openSession
              ? `Empezaste a las ${formatTime(openSession.started_at)}`
              : todayRow.is_active
                ? `Hoy trabajas de ${hhmm(todayRow.start_time)} a ${hhmm(todayRow.end_time)}`
                : 'Hoy no tienes jornada programada'}
          </p>
          {openSession ? (
            <Button size="lg" variant="danger-soft" icon="stop" block onClick={() => setEnding(openSession)}>
              Terminar jornada
            </Button>
          ) : (
            <Button size="lg" icon="play" block loading={starting} onClick={start}>
              Iniciar jornada
            </Button>
          )}
          {dailyGoal > 0 && (
            <div className="clock-goal">
              <div className="row-between">
                <span>Objetivo de hoy</span>
                <strong>
                  {money(earnedToday, currency, { decimals: 0 })} / {money(dailyGoal, currency, { decimals: 0 })}
                </strong>
              </div>
              <Progress value={earnedToday / dailyGoal} tone="income" label="Objetivo de hoy" />
            </div>
          )}
        </Card>

        <Card title="Esta semana" subtitle={`Desde el lunes ${formatDate(weekStart, { day: 'numeric', month: 'short' })}`}>
          <div className="week-summary">
            <div>
              <span>Trabajado</span>
              <strong>{formatHours(workedMs / 3600000)}</strong>
            </div>
            <div>
              <span>Programado</span>
              <strong>{formatHours(scheduledH)}</strong>
            </div>
            <div>
              <span>Jornadas</span>
              <strong>{weekSessions.length}</strong>
            </div>
          </div>
          <Progress value={scheduledH ? workedMs / 3600000 / scheduledH : 0} tone="accent" label="Horas trabajadas de la semana" />
        </Card>
      </div>

      <Card
        title="Días y horarios"
        subtitle={`${rows.filter((r) => r.is_active).length} días · ${formatHours(draftWeekH)} por semana${draftWeekGoal ? ` · objetivo semanal ${money(draftWeekGoal, currency, { decimals: 0 })}` : ''}`}
        action={
          <Button icon="check" onClick={save} loading={saving} disabled={!dirty}>
            {dirty ? 'Guardar horario' : 'Guardado'}
          </Button>
        }
      >
        <div className="week-editor">
          <div className="week-row week-row-head" aria-hidden="true">
            <span>Día</span>
            <span>Entrada</span>
            <span>Salida</span>
            <span>Horas</span>
            <span>Objetivo del día</span>
          </div>
          {rows.map((r) => (
            <div key={r.weekday} className={`week-row ${r.is_active ? '' : 'off'}`}>
              <div className="week-day">
                <Toggle checked={r.is_active} onChange={(v) => change(r.weekday, { is_active: v })} />
                <strong>{WEEKDAYS[r.weekday]}</strong>
              </div>
              <label className="week-cell">
                <span className="cell-label">Entrada</span>
                <input className="input" type="time" value={r.start_time} disabled={!r.is_active} onChange={(e) => change(r.weekday, { start_time: e.target.value })} />
              </label>
              <label className="week-cell">
                <span className="cell-label">Salida</span>
                <input className="input" type="time" value={r.end_time} disabled={!r.is_active} onChange={(e) => change(r.weekday, { end_time: e.target.value })} />
              </label>
              <span className="week-hours">{r.is_active ? formatHours(shiftHours(r.start_time, r.end_time)) : 'Descanso'}</span>
              <label className="week-cell">
                <span className="cell-label">Objetivo del día</span>
                <div className="input-wrap money-input money-sm">
                  <span className="money-prefix">$</span>
                  <input className="input" inputMode="decimal" placeholder="0" value={r.daily_goal} disabled={!r.is_active} onChange={(e) => change(r.weekday, { daily_goal: e.target.value.replace(/[^\d.,]/g, '') })} />
                </div>
              </label>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Jornadas recientes" subtitle="Tus últimas 10 jornadas terminadas">
        {recent.length === 0 ? (
          <Empty icon="clock" title="Sin jornadas todavía" text="Cuando inicies y termines una jornada, aparecerá aquí." />
        ) : (
          <ul className="session-list">
            {recent.map((s) => {
              const hours = (new Date(s.ended_at) - new Date(s.started_at)) / 3600000
              return (
                <li key={s.id}>
                  <span className="work-icon">
                    <Icon name="briefcase" size={16} />
                  </span>
                  <div className="session-text">
                    <strong>{formatDate(toISODate(new Date(s.started_at)), { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
                    <span className="muted">
                      {formatTime(s.started_at)} – {formatTime(s.ended_at)} · {formatHours(hours)}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </span>
                  </div>
                  <span className="session-earn">
                    {s.earnings != null ? money(s.earnings, currency) : '—'}
                    {s.earnings > 0 && hours > 0 && <em>{money(s.earnings / hours, currency, { decimals: 0 })}/h</em>}
                  </span>
                  <IconButton icon="trash" label="Eliminar jornada" size={16} className="danger" onClick={() => removeSession(s)} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <EndSession session={ending} onClose={() => setEnding(null)} />
    </div>
  )
}

function EndSession({ session, onClose }) {
  const { endSession, addTransaction, currency } = useData()
  const { toast } = useFeedback()
  const now = useNow(1000)
  const [earnings, setEarnings] = useState('')
  const [notes, setNotes] = useState('')
  const [record, setRecord] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session) {
      setEarnings('')
      setNotes('')
      setRecord(true)
    }
  }, [session])

  const elapsed = session ? now - new Date(session.started_at).getTime() : 0
  const value = parseAmount(earnings)

  const submit = async () => {
    setSaving(true)
    try {
      const amount = value > 0 ? value : null
      await endSession(session.id, { earnings: amount, notes: notes.trim() })
      if (amount && record) {
        await addTransaction({
          type: 'income',
          amount,
          category: 'Trabajo',
          date: toISODate(new Date(session.started_at)),
          description: notes.trim() || `Jornada de ${formatHours(elapsed / 3600000)}`,
        })
      }
      toast(amount ? `Jornada terminada: ganaste ${money(amount, currency)}.` : 'Jornada terminada.')
      onClose()
    } catch (e) {
      toast(e.message, { tone: 'error', title: 'No se pudo guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!session}
      onClose={onClose}
      size="sm"
      title="Terminar jornada"
      subtitle={`Trabajaste ${formatDuration(elapsed)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Seguir trabajando
          </Button>
          <Button icon="check" loading={saving} onClick={submit}>
            Terminar
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <MoneyInput label="¿Cuánto ganaste en esta jornada?" hint="Opcional. Déjalo vacío si aún no lo sabes." value={earnings} onChange={setEarnings} currency={currency} large data-autofocus />
        <Input label="Nota (opcional)" placeholder="Ej. Turno de la mañana" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} />
        {value > 0 && <Toggle checked={record} onChange={setRecord} label="Registrar como ingreso" description="Se agregará a tus ganancias en la categoría «Trabajo»." />}
      </div>
    </Modal>
  )
}
