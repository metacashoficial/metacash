import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, Button, Card, Empty, Field, IconButton, Input, Modal, PageHeader, Segmented, Select, Toggle } from '../components/ui'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { REMINDER_KINDS } from '../lib/constants'
import { hhmm, WEEK_ORDER, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/format'
import { notificationsSupported, reminderTimeToday, requestNotificationPermission, showNotification } from '../lib/reminders'

const PRESETS = [
  { kind: 'work', title: 'Hora de empezar a trabajar', use_schedule: true, minutes_before: 15, time: '09:00', weekdays: [1, 2, 3, 4, 5] },
  { kind: 'expense', title: 'Registra tus gastos del día', use_schedule: false, minutes_before: 0, time: '21:00', weekdays: [0, 1, 2, 3, 4, 5, 6] },
  { kind: 'goals', title: 'Revisa el progreso de tus metas', use_schedule: false, minutes_before: 0, time: '10:00', weekdays: [0] },
]

function describe(r) {
  if (r.kind === 'work' && r.use_schedule) return r.minutes_before ? `${r.minutes_before} min antes de tu entrada` : 'A la hora de tu entrada'
  const days = r.weekdays || []
  const label =
    days.length === 7 ? 'Todos los días' : days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d)) ? 'Lunes a viernes' : WEEK_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(', ')
  return `${label} · ${hhmm(r.time)}`
}

export default function Reminders() {
  const { reminders, schedules, updateReminder, deleteReminder, addReminder } = useData()
  const { toast, confirm } = useFeedback()
  const [permission, setPermission] = useState(notificationsSupported() ? Notification.permission : 'unsupported')
  const [form, setForm] = useState(null)

  const ask = async () => {
    const p = await requestNotificationPermission()
    setPermission(p)
    if (p === 'granted') {
      showNotification('Notificaciones activadas', 'Así se verán tus recordatorios de MetaCash.')
      toast('Notificaciones activadas.')
    } else if (p === 'denied') toast('Bloqueaste las notificaciones. Actívalas desde la configuración del navegador.', { tone: 'error' })
  }

  const addPreset = async (p) => {
    try {
      await addReminder({ ...p, enabled: true })
      toast('Recordatorio creado.')
    } catch (e) {
      toast(e.message, { tone: 'error' })
    }
  }

  const remove = async (r) => {
    const ok = await confirm({ title: 'Eliminar recordatorio', message: `Se eliminará «${r.title}».`, confirmText: 'Eliminar', danger: true })
    if (!ok) return
    try {
      await deleteReminder(r.id)
      toast('Recordatorio eliminado.')
    } catch (e) {
      toast(e.message, { tone: 'error' })
    }
  }

  const missingPresets = PRESETS.filter((p) => !reminders.some((r) => r.kind === p.kind))
  const todayWd = new Date().getDay()

  return (
    <div className="page">
      <PageHeader
        title="Recordatorios"
        subtitle="Te avisamos cuándo empezar a trabajar, registrar tus gastos y revisar tus metas."
        actions={
          <Button icon="plus" onClick={() => setForm({})}>
            Nuevo recordatorio
          </Button>
        }
      />

      {permission !== 'granted' && (
        <Card className="notice">
          <span className="notice-icon">
            <Icon name={permission === 'denied' ? 'bellOff' : 'bell'} size={20} />
          </span>
          <div>
            <strong>{permission === 'unsupported' ? 'Tu navegador no admite notificaciones' : permission === 'denied' ? 'Las notificaciones están bloqueadas' : 'Activa las notificaciones'}</strong>
            <p>
              {permission === 'unsupported'
                ? 'Igual verás los avisos dentro de la app mientras esté abierta. En iPhone, agrega MetaCash a tu pantalla de inicio para recibir notificaciones.'
                : permission === 'denied'
                  ? 'Permite las notificaciones para este sitio desde la configuración de tu navegador (ícono del candado junto a la dirección).'
                  : 'Para que los recordatorios aparezcan en tu pantalla aunque estés en otra pestaña.'}
            </p>
          </div>
          {permission === 'default' && (
            <Button icon="bell" onClick={ask}>
              Activar
            </Button>
          )}
        </Card>
      )}

      {missingPresets.length > 0 && (
        <Card title="Recordatorios sugeridos" subtitle="Agrégalos con un toque. Puedes editarlos después.">
          <div className="preset-grid">
            {missingPresets.map((p) => (
              <button key={p.kind} type="button" className="preset" onClick={() => addPreset(p)}>
                <span className={`preset-icon k-${p.kind}`}>
                  <Icon name={REMINDER_KINDS[p.kind].icon} size={18} />
                </span>
                <span className="preset-text">
                  <strong>{REMINDER_KINDS[p.kind].label}</strong>
                  <em>{describe(p)}</em>
                </span>
                <Icon name="plus" size={18} className="preset-add" />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card title="Tus recordatorios" subtitle={reminders.length ? `${reminders.filter((r) => r.enabled).length} activos` : null}>
        {reminders.length === 0 ? (
          <Empty icon="bell" title="Sin recordatorios" text="Usa uno de los sugeridos o crea uno propio." />
        ) : (
          <ul className="reminder-list">
            {reminders.map((r) => {
              const kind = REMINDER_KINDS[r.kind] || REMINDER_KINDS.custom
              const at = reminderTimeToday(r, schedules)
              return (
                <li key={r.id} className={r.enabled ? '' : 'off'}>
                  <span className={`preset-icon k-${r.kind}`}>
                    <Icon name={kind.icon} size={18} />
                  </span>
                  <button type="button" className="reminder-text" onClick={() => setForm(r)}>
                    <strong>{r.title}</strong>
                    <span className="muted">{describe(r)}</span>
                    {r.enabled && at && (
                      <Badge tone="neutral" icon="clock">
                        Hoy a las {at}
                      </Badge>
                    )}
                    {r.enabled && !at && r.kind === 'work' && r.use_schedule && !schedules.find((s) => s.weekday === todayWd)?.is_active && (
                      <span className="muted small">Hoy no trabajas</span>
                    )}
                  </button>
                  <Toggle checked={r.enabled} onChange={(v) => updateReminder(r.id, { enabled: v }).catch((e) => toast(e.message, { tone: 'error' }))} />
                  <IconButton icon="trash" label="Eliminar" size={16} className="danger" onClick={() => remove(r)} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <p className="footnote">
        <Icon name="info" size={14} /> Los recordatorios suenan mientras MetaCash esté abierta en tu navegador o instalada en tu teléfono. Se sincronizan entre tus dispositivos.
      </p>

      <ReminderForm reminder={form} onClose={() => setForm(null)} />
    </div>
  )
}

function ReminderForm({ reminder, onClose }) {
  const { addReminder, updateReminder } = useData()
  const { toast } = useFeedback()
  const open = reminder !== null
  const editing = !!reminder?.id
  const [v, setV] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setV({
      kind: reminder.kind || 'custom',
      title: reminder.title || '',
      time: hhmm(reminder.time || '09:00'),
      weekdays: reminder.weekdays || [1, 2, 3, 4, 5],
      use_schedule: reminder.use_schedule ?? false,
      minutes_before: reminder.minutes_before ?? 15,
      enabled: reminder.enabled ?? true,
    })
    setError(null)
  }, [open, reminder])

  const set = (patch) => setV((x) => ({ ...x, ...patch }))
  const toggleDay = (d) => set({ weekdays: v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d].sort() })

  const submit = async (e) => {
    e?.preventDefault()
    const title = v.title.trim() || REMINDER_KINDS[v.kind].label
    if (!(v.kind === 'work' && v.use_schedule) && v.weekdays.length === 0) return setError('Elige al menos un día.')
    setSaving(true)
    try {
      const payload = { ...v, title: title.slice(0, 80), use_schedule: v.kind === 'work' && v.use_schedule, minutes_before: Number(v.minutes_before) || 0 }
      if (editing) await updateReminder(reminder.id, payload)
      else await addReminder(payload)
      toast(editing ? 'Recordatorio actualizado.' : 'Recordatorio creado.')
      onClose()
    } catch (err) {
      toast(err.message, { tone: 'error', title: 'No se pudo guardar' })
    } finally {
      setSaving(false)
    }
  }

  if (!open || !v.kind) return null
  const bySchedule = v.kind === 'work' && v.use_schedule

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar recordatorio' : 'Nuevo recordatorio'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="check" loading={saving} onClick={submit}>
            Guardar
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <Select label="Tipo" value={v.kind} onChange={(e) => set({ kind: e.target.value, title: v.title || '' })}>
          {Object.entries(REMINDER_KINDS).map(([k, x]) => (
            <option key={k} value={k}>
              {x.label}
            </option>
          ))}
        </Select>
        <Input label="Mensaje" placeholder={REMINDER_KINDS[v.kind].label} value={v.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
        {v.kind === 'work' && (
          <Toggle checked={v.use_schedule} onChange={(x) => set({ use_schedule: x })} label="Usar mi horario de trabajo" description="Te avisa antes de tu hora de entrada, solo los días que trabajas." />
        )}
        {bySchedule ? (
          <Select label="¿Cuánto antes?" value={v.minutes_before} onChange={(e) => set({ minutes_before: Number(e.target.value) })}>
            {[0, 5, 10, 15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'A la hora exacta' : `${m} minutos antes`}
              </option>
            ))}
          </Select>
        ) : (
          <>
            <Input label="Hora" type="time" value={v.time} onChange={(e) => set({ time: e.target.value })} />
            <Field label="Días" error={error}>
              <div className="day-picker">
                {WEEK_ORDER.map((d) => (
                  <button key={d} type="button" className={v.weekdays.includes(d) ? 'active' : ''} onClick={() => toggleDay(d)} aria-label={WEEKDAYS[d]} aria-pressed={v.weekdays.includes(d)}>
                    {WEEKDAYS_SHORT[d].charAt(0)}
                  </button>
                ))}
              </div>
              <Segmented
                size="sm"
                className="mt-8"
                value={v.weekdays.length === 7 ? 'all' : v.weekdays.join() === '1,2,3,4,5' ? 'week' : v.weekdays.join() === '0,6' ? 'weekend' : ''}
                onChange={(x) => set({ weekdays: x === 'all' ? [0, 1, 2, 3, 4, 5, 6] : x === 'week' ? [1, 2, 3, 4, 5] : [0, 6] })}
                options={[
                  { value: 'all', label: 'Diario' },
                  { value: 'week', label: 'Lun–Vie' },
                  { value: 'weekend', label: 'Fin de semana' },
                ]}
              />
            </Field>
          </>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
