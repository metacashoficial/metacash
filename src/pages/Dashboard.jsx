import { useMemo, useState } from 'react'
import { BarChart, Donut, LineChart } from '../components/charts'
import Icon from '../components/Icon'
import TransactionList from '../components/TransactionList'
import { Button, Card, Empty, Progress, Segmented, Stat, useNow } from '../components/ui'
import { useData } from '../context/DataContext'
import { CHART_COLORS } from '../lib/constants'
import { byCategory, dailySeries, goalsSummary, inRange, scheduleMap, sumBy, topCategories, totals } from '../lib/finance'
import {
  daysBetween,
  formatDate,
  formatDateLong,
  formatDuration,
  greeting,
  hhmm,
  money,
  parseISODate,
  percent,
  shiftHours,
  startOfMonth,
  todayISO,
} from '../lib/format'

export default function Dashboard({ go, openAdd }) {
  const { transactions, goals, prefs, schedules, sessions, currency, user } = useData()
  const [range, setRange] = useState(30)
  const now = useNow(1000)
  const today = todayISO()

  const all = totals(transactions)
  const g = goalsSummary(goals)
  const available = all.net - g.movedFromApp
  const todayTx = transactions.filter((t) => t.date === today)
  const earnedToday = sumBy(todayTx, 'income')
  const spentToday = sumBy(todayTx, 'expense')
  const monthTx = inRange(transactions, startOfMonth(), today)
  const month = totals(monthTx)

  const sched = scheduleMap(schedules)[new Date().getDay()]
  const dailyGoal = (sched?.is_active && Number(sched.daily_goal)) || Number(prefs.daily_goal) || 0
  const openSession = sessions.find((s) => !s.ended_at)

  const series = useMemo(
    () =>
      dailySeries(transactions, range).map((d) => ({
        ...d,
        label: formatDate(d.date, range > 31 ? { month: 'short', day: 'numeric' } : { day: 'numeric', month: 'short' }),
        tipLabel: formatDateLong(d.date),
      })),
    [transactions, range]
  )
  const weekly = useMemo(() => {
    // Para 90 días agrupamos por semanas para que se lea mejor
    if (range < 90) return null
    const out = []
    for (let i = 0; i < series.length; i += 7) {
      const chunk = series.slice(i, i + 7)
      out.push({
        label: chunk[0].label,
        tipLabel: `Semana del ${formatDate(chunk[0].date, { day: 'numeric', month: 'short' })}`,
        income: chunk.reduce((s, d) => s + d.income, 0),
        expense: chunk.reduce((s, d) => s + d.expense, 0),
      })
    }
    return out
  }, [series, range])

  const cats = topCategories(byCategory(monthTx, 'expense')).map((c, i) => ({ ...c, color: CHART_COLORS[i % CHART_COLORS.length] }))
  const name = prefs.display_name || user.email.split('@')[0]
  const isEmpty = transactions.length === 0 && goals.length === 0

  return (
    <div className="page">
      <header className="dash-head">
        <div>
          <p className="eyebrow">{formatDateLong(today)}</p>
          <h1>
            {greeting()}, <span className="muted-strong">{name}</span>
          </h1>
        </div>
        <div className="dash-actions">
          <Button variant="secondary" icon="arrowDown" onClick={() => openAdd('expense')}>
            Gasto
          </Button>
          <Button icon="arrowUp" onClick={() => openAdd('income')}>
            Ingreso
          </Button>
        </div>
      </header>

      {isEmpty && (
        <Card className="welcome">
          <div className="welcome-body">
            <div>
              <h2>Empieza en 3 pasos</h2>
              <p>Así MetaCash podrá calcular todo por ti.</p>
            </div>
            <ol className="steps">
              <li>
                <button type="button" onClick={() => go('metas')}>
                  <span>1</span> Crea tu primera meta de ahorro <Icon name="chevronRight" size={16} />
                </button>
              </li>
              <li>
                <button type="button" onClick={() => go('horario')}>
                  <span>2</span> Configura tu horario de trabajo <Icon name="chevronRight" size={16} />
                </button>
              </li>
              <li>
                <button type="button" onClick={() => openAdd('income')}>
                  <span>3</span> Registra tu primer ingreso o gasto <Icon name="chevronRight" size={16} />
                </button>
              </li>
            </ol>
          </div>
        </Card>
      )}

      <div className="stats-grid">
        <Stat
          label="Dinero disponible"
          icon="wallet"
          tone="ink"
          value={money(available, currency)}
          hint="Ingresos − gastos − lo que apartaste en tus metas"
          foot={<span className="muted">Después de apartar para tus metas</span>}
        />
        <Stat
          label="Ganado hoy"
          icon="trendUp"
          tone="income"
          value={money(earnedToday, currency)}
          onClick={() => go('movimientos')}
          foot={
            dailyGoal > 0 ? (
              <div className="stat-progress">
                <Progress value={earnedToday / dailyGoal} tone="income" height={6} label="Objetivo del día" />
                <span>
                  {percent(Math.min(earnedToday / dailyGoal, 9.99))} de {money(dailyGoal, currency, { decimals: 0 })}
                </span>
              </div>
            ) : (
              <button type="button" className="link" onClick={() => go('horario')}>
                Definir objetivo diario
              </button>
            )
          }
        />
        <Stat
          label="Gastado hoy"
          icon="trendDown"
          tone="expense"
          value={money(spentToday, currency)}
          onClick={() => go('historial')}
          foot={<span className="muted">Este mes: {money(month.expense, currency, { decimals: 0 })}</span>}
        />
        <Stat
          label="Ahorro acumulado"
          icon="coins"
          tone="savings"
          value={money(g.saved, currency)}
          onClick={() => go('metas')}
          foot={
            g.target > 0 ? (
              <div className="stat-progress">
                <Progress value={g.saved / g.target} tone="savings" height={6} label="Avance total de metas" />
                <span>{percent(Math.min(1, g.saved / g.target))} de tus metas</span>
              </div>
            ) : (
              <span className="muted">Sin metas todavía</span>
            )
          }
        />
      </div>

      <div className="dash-grid">
        <Card
          className="span-2"
          title="Ingresos y gastos"
          subtitle={`Ganancia neta en el periodo: ${money(series.reduce((s, d) => s + d.net, 0), currency)}`}
          action={
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              ariaLabel="Periodo"
              options={[
                { value: 7, label: '7 d' },
                { value: 30, label: '30 d' },
                { value: 90, label: '90 d' },
              ]}
            />
          }
        >
          <div className="chart-legend-inline">
            <span>
              <i className="dot" style={{ background: 'var(--income)' }} /> Ingresos
            </span>
            <span>
              <i className="dot" style={{ background: 'var(--expense)' }} /> Gastos
            </span>
          </div>
          {range === 7 ? (
            <BarChart
              currency={currency}
              data={series.map((d) => ({ ...d, label: parseISODate(d.date).toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '') }))}
              series={[
                { key: 'income', name: 'Ingresos', color: 'var(--income)' },
                { key: 'expense', name: 'Gastos', color: 'var(--expense)' },
              ]}
            />
          ) : (
            <LineChart
              currency={currency}
              data={weekly || series}
              series={[
                { key: 'income', name: 'Ingresos', color: 'var(--income)', area: true },
                { key: 'expense', name: 'Gastos', color: 'var(--expense)' },
              ]}
            />
          )}
        </Card>

        <Card title="Gastos del mes" subtitle="Por categoría" action={<Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => go('movimientos')}>Detalle</Button>}>
          <Donut items={cats} currency={currency} centerLabel="Gastado" emptyText="Sin gastos" />
        </Card>

        <Card title="Jornada de hoy" subtitle={sched?.is_active ? `${hhmm(sched.start_time)} – ${hhmm(sched.end_time)} · ${shiftHours(sched.start_time, sched.end_time)} h` : 'Hoy no tienes jornada programada'}>
          {openSession ? (
            <div className="today-work">
              <span className="live-dot" />
              <div>
                <div className="timer">{formatDuration(now - new Date(openSession.started_at).getTime())}</div>
                <p className="muted">Jornada en curso</p>
              </div>
              <Button size="sm" variant="secondary" icon="stop" onClick={() => go('horario')}>
                Terminar
              </Button>
            </div>
          ) : (
            <div className="today-work">
              <span className="work-icon">
                <Icon name="briefcase" size={18} />
              </span>
              <div>
                <div className="timer muted-timer">00:00:00</div>
                <p className="muted">{dailyGoal > 0 ? `Objetivo: ${money(dailyGoal, currency, { decimals: 0 })}` : 'Sin objetivo diario'}</p>
              </div>
              <Button size="sm" icon="play" onClick={() => go('horario')}>
                Iniciar
              </Button>
            </div>
          )}
        </Card>

        <Card title="Metas" subtitle={goals.length ? `${goals.length} ${goals.length === 1 ? 'meta' : 'metas'} activas` : null} action={<Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => go('metas')}>Ver todas</Button>}>
          {goals.length === 0 ? (
            <Empty icon="target" title="Aún no tienes metas" text="Define cuánto quieres ahorrar y para cuándo." action={<Button size="sm" icon="plus" onClick={() => go('metas')}>Crear meta</Button>} />
          ) : (
            <ul className="mini-goals">
              {goals.slice(0, 4).map((goal) => {
                const pct = Number(goal.current_amount) / Number(goal.target_amount)
                const days = goal.deadline ? daysBetween(today, goal.deadline) : null
                return (
                  <li key={goal.id}>
                    <div className="mini-goal-top">
                      <span className={`goal-dot c-${goal.color}`} />
                      <strong>{goal.name}</strong>
                      <span className="muted">{percent(Math.min(1, pct))}</span>
                    </div>
                    <Progress value={pct} color={`var(--goal-${goal.color})`} height={6} label={goal.name} />
                    <div className="mini-goal-foot">
                      <span>
                        {money(goal.current_amount, currency, { decimals: 0 })} / {money(goal.target_amount, currency, { decimals: 0 })}
                      </span>
                      {days !== null && <span className="muted">{pct >= 1 ? 'Completada' : days < 0 ? 'Vencida' : `${days} días`}</span>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Últimos movimientos" action={<Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => go('historial')}>Historial</Button>}>
          {transactions.length === 0 ? (
            <Empty icon="receipt" title="Sin movimientos" text="Registra tu primer ingreso o gasto." action={<Button size="sm" icon="plus" onClick={() => openAdd('expense')}>Registrar</Button>} />
          ) : (
            <TransactionList items={transactions.slice(0, 5)} grouped={false} compact />
          )}
        </Card>
      </div>
    </div>
  )
}
