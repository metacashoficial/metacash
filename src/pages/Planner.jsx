import { useMemo, useState } from 'react'
import Icon from '../components/Icon'
import { Button, Card, Empty, Input, MoneyInput, PageHeader, Select, Toggle } from '../components/ui'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { averageDailyExpense, averageDailyNet, plan, projectedDate, weeklyScheduledHours } from '../lib/finance'
import { addDays, formatDate, formatHours, money, number, parseAmount, todayISO } from '../lib/format'

export default function Planner({ go }) {
  const { goals, schedules, transactions, currency, prefs, savePrefs } = useData()
  const { toast } = useFeedback()
  const [mode, setMode] = useState(goals.length ? 'goals' : 'custom')
  const [goalId, setGoalId] = useState('all')
  const [customAmount, setCustomAmount] = useState('')
  const [customDate, setCustomDate] = useState(addDays(todayISO(), 60))
  const includeExpenses = prefs.plan_include_expenses ?? true

  const avgExpense = useMemo(() => averageDailyExpense(transactions), [transactions])
  const avgNet = useMemo(() => averageDailyNet(transactions), [transactions])
  const weekHours = weeklyScheduledHours(schedules)

  const active = goals.filter((g) => Number(g.current_amount) < Number(g.target_amount))

  const target = useMemo(() => {
    if (mode === 'custom') {
      const v = parseAmount(customAmount)
      return { name: 'Tu objetivo', remaining: v > 0 ? v : 0, deadline: customDate || null }
    }
    if (goalId === 'all') {
      const withDate = active.filter((g) => g.deadline)
      const pool = withDate.length ? withDate : active
      return {
        name: 'Todas tus metas',
        remaining: pool.reduce((s, g) => s + (Number(g.target_amount) - Number(g.current_amount)), 0),
        deadline: withDate.length ? withDate.map((g) => g.deadline).sort().pop() : null,
        skipped: withDate.length ? active.length - withDate.length : 0,
      }
    }
    const g = goals.find((x) => x.id === goalId)
    if (!g) return null
    return { name: g.name, remaining: Math.max(0, Number(g.target_amount) - Number(g.current_amount)), deadline: g.deadline }
  }, [mode, goalId, goals, active, customAmount, customDate])

  // Para "todas", sumamos lo que exige cada meta por su propia fecha
  const result = useMemo(() => {
    if (!target) return null
    if (mode === 'goals' && goalId === 'all') {
      const plans = active.filter((g) => g.deadline).map((g) => plan({ remaining: Number(g.target_amount) - Number(g.current_amount), deadline: g.deadline, schedules }))
      if (!plans.length) return null
      const base = plan({ remaining: 0, deadline: target.deadline, schedules, avgDailyExpense: avgExpense, includeExpenses })
      const sum = (k) => plans.reduce((s, p) => s + p[k], 0)
      const exp = includeExpenses ? avgExpense : 0
      const hoursPerDay = base.workHours / base.calendarDays
      const daysPerDay = base.workdays / base.calendarDays
      return {
        ...base,
        need: target.remaining + base.expenses,
        perDay: sum('perDay') + exp,
        perWeek: (sum('perDay') + exp) * 7,
        perMonth: (sum('perDay') + exp) * 30.44,
        perWorkday: daysPerDay ? (sum('perDay') + exp) / daysPerDay : 0,
        perHour: hoursPerDay ? (sum('perDay') + exp) / hoursPerDay : 0,
      }
    }
    return plan({ remaining: target.remaining, deadline: target.deadline, schedules, avgDailyExpense: avgExpense, includeExpenses })
  }, [target, mode, goalId, active, schedules, avgExpense, includeExpenses])

  const eta = target ? projectedDate(target.remaining, avgNet) : null

  return (
    <div className="page">
      <PageHeader title="Planificador" subtitle="Te decimos cuánto necesitas ganar por día, semana y hora para cumplir tus metas a tiempo." />

      <div className="planner-grid">
        <Card title="¿Qué quieres calcular?">
          <div className="form-grid">
            <div className="choice-cards">
              <button type="button" className={`choice ${mode === 'goals' ? 'active' : ''}`} onClick={() => setMode('goals')}>
                <Icon name="target" size={18} />
                <span>
                  <strong>Mis metas</strong>
                  <em>Usa las metas que ya creaste</em>
                </span>
              </button>
              <button type="button" className={`choice ${mode === 'custom' ? 'active' : ''}`} onClick={() => setMode('custom')}>
                <Icon name="calculator" size={18} />
                <span>
                  <strong>Otra cantidad</strong>
                  <em>Calcula cualquier monto</em>
                </span>
              </button>
            </div>

            {mode === 'goals' ? (
              goals.length === 0 ? (
                <Empty icon="target" title="No tienes metas" text="Crea una meta o usa «Otra cantidad»." action={<Button size="sm" icon="plus" onClick={() => go('metas')}>Crear meta</Button>} />
              ) : (
                <Select label="Meta" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
                  <option value="all">Todas mis metas ({active.length} pendientes)</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              )
            ) : (
              <div className="row-2">
                <MoneyInput label="¿Cuánto necesitas?" value={customAmount} onChange={setCustomAmount} currency={currency} />
                <Input label="¿Para cuándo?" type="date" value={customDate} min={todayISO()} onChange={(e) => setCustomDate(e.target.value)} />
              </div>
            )}

            <Toggle
              checked={includeExpenses}
              onChange={(v) => savePrefs({ plan_include_expenses: v }).catch((e) => toast(e.message, { tone: 'error' }))}
              label="Incluir mis gastos del día a día"
              description={`Suma tu gasto promedio (${money(avgExpense, currency)} al día, últimos 30 días), porque también sale de lo que ganas.`}
            />

            <div className="info-box">
              <Icon name="clock" size={16} />
              <span>
                {weekHours > 0 ? (
                  <>
                    Tu horario: <strong>{formatHours(weekHours)}</strong> por semana.
                  </>
                ) : (
                  <>Sin horario configurado: calculamos con lunes a viernes, 8 h al día.</>
                )}{' '}
                <button type="button" className="link" onClick={() => go('horario')}>
                  {weekHours > 0 ? 'Cambiar' : 'Configurar horario'}
                </button>
              </span>
            </div>
          </div>
        </Card>

        <Card className="plan-result" title={target?.name || 'Resultado'}>
          {!target || target.remaining <= 0 ? (
            <Empty
              icon={mode === 'custom' ? 'calculator' : 'check'}
              title={mode === 'custom' ? 'Escribe una cantidad' : 'Nada pendiente'}
              text={mode === 'custom' ? 'Pon cuánto necesitas y para cuándo.' : 'Esta meta ya está cumplida.'}
            />
          ) : !result ? (
            <Empty icon="calendar" title="Falta una fecha límite" text="Agrega una fecha a tu meta para saber cuánto ganar cada día." action={<Button size="sm" onClick={() => go('metas')}>Ir a metas</Button>} />
          ) : (
            <>
              <div className="plan-hero">
                <span className="eyebrow">Necesitas ganar</span>
                <div className="plan-big">
                  {money(result.perDay, currency)}
                  <small>al día</small>
                </div>
                <p className="muted">
                  Para juntar {money(target.remaining, currency)}
                  {result.expenses > 0 && <> + {money(result.expenses, currency, { decimals: 0 })} de gastos</>} antes del {formatDate(target.deadline)}
                  {result.overdue && ' (la fecha ya pasó)'}.
                  {target.skipped > 0 && ` No incluye ${target.skipped} ${target.skipped === 1 ? 'meta' : 'metas'} sin fecha límite.`}
                </p>
              </div>

              <div className="plan-cells">
                <div>
                  <span>Por semana</span>
                  <strong>{money(result.perWeek, currency)}</strong>
                </div>
                <div>
                  <span>Por mes</span>
                  <strong>{money(result.perMonth, currency)}</strong>
                </div>
                <div>
                  <span>Por jornada</span>
                  <strong>{money(result.perWorkday, currency)}</strong>
                </div>
                <div>
                  <span>Por hora trabajada</span>
                  <strong>{money(result.perHour, currency)}</strong>
                </div>
              </div>

              <ul className="plan-facts">
                <li>
                  <Icon name="calendar" size={16} />
                  <span>
                    <strong>{result.calendarDays}</strong> días · <strong>{number(result.weeks)}</strong> semanas restantes
                  </span>
                </li>
                <li>
                  <Icon name="briefcase" size={16} />
                  <span>
                    <strong>{result.workdays}</strong> jornadas y <strong>{formatHours(result.workHours)}</strong> de trabajo {result.estimated && '(estimado)'}
                  </span>
                </li>
                <li>
                  <Icon name="trendUp" size={16} />
                  <span>
                    {avgNet > 0 ? (
                      <>
                        A tu ritmo actual ({money(avgNet, currency)} netos al día) llegarías{' '}
                        <strong>{eta ? `el ${formatDate(eta)}` : 'en mucho tiempo'}</strong>
                        {eta && target.deadline && (eta <= target.deadline ? ', a tiempo.' : ', después de tu fecha límite.')}
                      </>
                    ) : (
                      <>En los últimos 30 días gastaste igual o más de lo que ganaste. Registra tus ingresos para ver tu proyección.</>
                    )}
                  </span>
                </li>
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
