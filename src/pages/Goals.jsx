import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { Badge, Button, Card, Empty, Field, IconButton, Input, Modal, MoneyInput, PageHeader, Progress, Ring, Segmented } from '../components/ui'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { GOAL_COLORS } from '../lib/constants'
import { goalsSummary } from '../lib/finance'
import { addDays, daysBetween, formatDate, money, parseAmount, percent, todayISO } from '../lib/format'

export default function Goals({ go }) {
  const { goals, currency, deleteGoal } = useData()
  const { toast, confirm } = useFeedback()
  const [form, setForm] = useState(null) // null | {} | goal
  const [move, setMove] = useState(null) // { goal, mode }
  const s = goalsSummary(goals)
  const today = todayISO()

  const remove = async (goal) => {
    const ok = await confirm({
      title: 'Eliminar meta',
      message: `Se eliminará "${goal.name}". El dinero apartado vuelve a tu disponible. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteGoal(goal.id)
      toast('Meta eliminada.')
    } catch (e) {
      toast(e.message, { tone: 'error' })
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Metas de ahorro"
        subtitle="Define cuánto quieres juntar y para cuándo. Aporta poco a poco y mira tu avance."
        actions={
          <Button icon="plus" onClick={() => setForm({})}>
            Nueva meta
          </Button>
        }
      />

      {goals.length > 0 && (
        <Card className="goals-summary">
          <Ring value={s.target ? s.saved / s.target : 0} size={84} stroke={8} color="var(--savings)">
            <strong>{percent(s.target ? Math.min(1, s.saved / s.target) : 0)}</strong>
          </Ring>
          <div className="goals-summary-text">
            <span className="eyebrow">Ahorro acumulado</span>
            <strong className="big-number">{money(s.saved, currency)}</strong>
            <span className="muted">
              de {money(s.target, currency)} en total · te faltan {money(Math.max(0, s.target - s.saved), currency)}
            </span>
          </div>
          <Button variant="secondary" icon="calculator" onClick={() => go('planificador')}>
            ¿Cuánto debo ganar?
          </Button>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card>
          <Empty
            icon="target"
            title="Crea tu primera meta"
            text="Por ejemplo: «Fondo de emergencia», «Viaje» o «Laptop nueva». Te diremos cuánto ahorrar cada día."
            action={
              <Button icon="plus" onClick={() => setForm({})}>
                Nueva meta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => {
            const current = Number(goal.current_amount)
            const target = Number(goal.target_amount)
            const pct = current / target
            const remaining = Math.max(0, target - current)
            const done = pct >= 1
            const days = goal.deadline ? daysBetween(today, goal.deadline) : null
            const perDay = days !== null && days >= 0 ? remaining / (days + 1) : null
            return (
              <Card key={goal.id} className={`goal-card ${done ? 'is-done' : ''}`}>
                <div className="goal-head">
                  <span className={`goal-chip c-${goal.color}`}>
                    <Icon name={done ? 'check' : 'flag'} size={16} strokeWidth={2} />
                  </span>
                  <div className="goal-title">
                    <h3>{goal.name}</h3>
                    <span className="muted">{goal.deadline ? `Para el ${formatDate(goal.deadline)}` : 'Sin fecha límite'}</span>
                  </div>
                  <div className="goal-menu">
                    <IconButton icon="pencil" label="Editar meta" size={16} onClick={() => setForm(goal)} />
                    <IconButton icon="trash" label="Eliminar meta" size={16} className="danger" onClick={() => remove(goal)} />
                  </div>
                </div>

                <div className="goal-amounts">
                  <strong>{money(current, currency)}</strong>
                  <span className="muted">de {money(target, currency)}</span>
                </div>
                <Progress value={pct} color={`var(--goal-${goal.color})`} height={10} label={`Avance de ${goal.name}`} />
                <div className="goal-meta">
                  <span>{percent(Math.min(1, pct))} completado</span>
                  {done ? (
                    <Badge tone="income" icon="check">
                      Meta cumplida
                    </Badge>
                  ) : days === null ? (
                    <span className="muted">Faltan {money(remaining, currency, { decimals: 0 })}</span>
                  ) : days < 0 ? (
                    <Badge tone="expense" icon="alert">
                      Venció hace {Math.abs(days)} d
                    </Badge>
                  ) : (
                    <span className="muted">{days === 0 ? 'Vence hoy' : `${days} días restantes`}</span>
                  )}
                </div>

                {!done && perDay !== null && (
                  <div className="goal-hint">
                    <Icon name="info" size={15} />
                    <span>
                      Aparta <strong>{money(perDay, currency)}</strong> al día para llegar a tiempo.
                    </span>
                  </div>
                )}

                <div className="goal-actions">
                  <Button icon="plus" size="sm" onClick={() => setMove({ goal, mode: 'add' })}>
                    Aportar
                  </Button>
                  <Button variant="secondary" icon="minus" size="sm" onClick={() => setMove({ goal, mode: 'withdraw' })} disabled={current <= 0}>
                    Retirar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <GoalForm goal={form} onClose={() => setForm(null)} />
      <MoveForm state={move} onClose={() => setMove(null)} />
    </div>
  )
}

function GoalForm({ goal, onClose }) {
  const { addGoal, updateGoal, currency } = useData()
  const { toast } = useFeedback()
  const open = goal !== null
  const editing = !!goal?.id
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [current, setCurrent] = useState('')
  const [deadline, setDeadline] = useState('')
  const [color, setColor] = useState('green')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(goal.name || '')
    setTarget(goal.target_amount ? String(goal.target_amount) : '')
    setCurrent(goal.current_amount ? String(goal.current_amount) : '')
    setDeadline(goal.deadline || addDays(todayISO(), 90))
    setColor(goal.color || 'green')
    setErrors({})
  }, [open, goal])

  const submit = async (e) => {
    e?.preventDefault()
    const t = parseAmount(target)
    const c = current === '' ? 0 : parseAmount(current)
    const errs = {}
    if (!name.trim()) errs.name = 'Ponle un nombre a tu meta.'
    if (!(t > 0)) errs.target = 'Escribe la cantidad que quieres juntar.'
    if (!(c >= 0)) errs.current = 'Escribe un monto válido (o déjalo en 0).'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const payload = { name: name.trim().slice(0, 80), target_amount: t, deadline: deadline || null, color }
      if (editing) {
        // Corregir el ahorro actual a mano no cuenta como aportación: no afecta tu disponible.
        const diff = c - Number(goal.current_amount)
        await updateGoal(goal.id, { ...payload, current_amount: c, initial_amount: Number(goal.initial_amount) + diff })
      } else {
        await addGoal({ ...payload, current_amount: c })
      }
      toast(editing ? 'Meta actualizada.' : 'Meta creada.')
      onClose()
    } catch (err) {
      toast(err.message, { tone: 'error', title: 'No se pudo guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Editar meta' : 'Nueva meta de ahorro'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="check" loading={saving} onClick={submit}>
            {editing ? 'Guardar cambios' : 'Crear meta'}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <Input label="Nombre de la meta" placeholder="Ej. Fondo de emergencia" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={errors.name} data-autofocus />
        <div className="row-2">
          <MoneyInput label="¿Cuánto quieres juntar?" value={target} onChange={setTarget} currency={currency} error={errors.target} />
          <MoneyInput
            label="¿Cuánto llevas ahorrado?"
            value={current}
            onChange={setCurrent}
            currency={currency}
            error={errors.current}
            hint={editing ? 'Corregirlo aquí no cambia tu disponible.' : 'Dinero que ya tenías guardado.'}
          />
        </div>
        <Input label="Fecha límite" type="date" value={deadline} min={todayISO()} onChange={(e) => setDeadline(e.target.value)} hint="Déjala vacía si no tienes prisa." />
        <Field label="Color">
          <div className="swatches">
            {GOAL_COLORS.map((c) => (
              <button key={c.id} type="button" className={`swatch c-${c.id} ${color === c.id ? 'active' : ''}`} onClick={() => setColor(c.id)} aria-label={c.label} title={c.label}>
                {color === c.id && <Icon name="check" size={14} strokeWidth={2.4} />}
              </button>
            ))}
          </div>
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function MoveForm({ state, onClose }) {
  const { adjustGoal, currency } = useData()
  const { toast } = useFeedback()
  const [mode, setMode] = useState('add')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const goal = state?.goal

  useEffect(() => {
    if (state) {
      setMode(state.mode)
      setAmount('')
      setError(null)
    }
  }, [state])

  const current = Number(goal?.current_amount || 0)
  const remaining = Math.max(0, Number(goal?.target_amount || 0) - current)

  const submit = async (e) => {
    e?.preventDefault()
    const v = parseAmount(amount)
    if (!(v > 0)) return setError('Escribe un monto mayor a 0.')
    if (mode === 'withdraw' && v > current) return setError(`Solo tienes ${money(current, currency)} en esta meta.`)
    setSaving(true)
    try {
      await adjustGoal(goal.id, mode === 'add' ? v : -v)
      toast(mode === 'add' ? `Aportaste ${money(v, currency)} a «${goal.name}».` : `Retiraste ${money(v, currency)} de «${goal.name}».`)
      onClose()
    } catch (err) {
      toast(err.message, { tone: 'error', title: 'No se pudo guardar' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="sm"
      title={goal?.name || ''}
      subtitle={`Llevas ${money(current, currency)} · faltan ${money(remaining, currency)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon="check" loading={saving} onClick={submit}>
            {mode === 'add' ? 'Aportar' : 'Retirar'}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={submit}>
        <Segmented
          className="seg-full"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'add', label: 'Aportar', icon: 'plus' },
            { value: 'withdraw', label: 'Retirar', icon: 'minus' },
          ]}
        />
        <MoneyInput label="Monto" value={amount} onChange={setAmount} currency={currency} error={error} large data-autofocus />
        {mode === 'add' && remaining > 0 && (
          <div className="chips">
            {[0.1, 0.25, 0.5, 1].map((f) => (
              <button key={f} type="button" className="chip" onClick={() => setAmount(String(Math.round(remaining * f * 100) / 100))}>
                {f === 1 ? 'Todo lo que falta' : `${f * 100}% de lo que falta`}
              </button>
            ))}
          </div>
        )}
        <p className="form-note">
          {mode === 'add' ? 'Aportar mueve dinero de tu disponible a esta meta.' : 'Retirar regresa el dinero a tu disponible.'}
        </p>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
