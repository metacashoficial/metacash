import { useMemo, useState } from 'react'
import { BarChart, Donut } from '../components/charts'
import TransactionList from '../components/TransactionList'
import { Button, Card, Empty, PageHeader, Segmented, Stat } from '../components/ui'
import { useData } from '../context/DataContext'
import { CHART_COLORS } from '../lib/constants'
import { byCategory, inRange, monthlySeries, topCategories, totals } from '../lib/finance'
import { addDays, daysBetween, money, parseISODate, percent, startOfMonth, toISODate, todayISO } from '../lib/format'

function periodRange(period) {
  const today = todayISO()
  const d = parseISODate(today)
  switch (period) {
    case 'month':
      return { from: startOfMonth(today), to: today, label: 'este mes' }
    case 'last': {
      const from = toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1))
      const to = toISODate(new Date(d.getFullYear(), d.getMonth(), 0))
      return { from, to, label: 'el mes pasado' }
    }
    case 'year':
      return { from: `${d.getFullYear()}-01-01`, to: today, label: 'este año' }
    default:
      return { from: null, to: null, label: 'todo el tiempo' }
  }
}

export default function Finance({ go, openAdd, onEdit, onDelete }) {
  const { transactions, currency } = useData()
  const [period, setPeriod] = useState('month')
  const { from, to, label } = periodRange(period)
  const list = useMemo(() => inRange(transactions, from, to), [transactions, from, to])
  const t = totals(list)

  const firstDate = from || transactions[transactions.length - 1]?.date || todayISO()
  const days = Math.max(1, daysBetween(firstDate, to || todayISO()) + 1)
  const margin = t.income > 0 ? t.net / t.income : 0

  // Comparación con el periodo anterior de la misma duración
  const prev = from ? totals(inRange(transactions, addDays(from, -days), addDays(from, -1))) : null
  const delta = (cur, before) => (before > 0 ? (cur - before) / before : null)

  const months = monthlySeries(transactions, period === 'year' || period === 'all' ? 12 : 6)
  const expenseCats = topCategories(byCategory(list, 'expense')).map((c, i) => ({ ...c, color: CHART_COLORS[i % 8] }))
  const incomeCats = topCategories(byCategory(list, 'income')).map((c, i) => ({ ...c, color: CHART_COLORS[(i + 2) % 8] }))

  const trend = (value, invert) =>
    value === null ? null : (
      <span className={`trend ${(invert ? -value : value) >= 0 ? 'pos' : 'neg'}`}>
        {value >= 0 ? '↑' : '↓'} {percent(Math.abs(value))} vs. periodo anterior
      </span>
    )

  return (
    <div className="page">
      <PageHeader
        title="Ganancias y gastos"
        subtitle="Registra lo que entra y sale, y mira en qué se va tu dinero."
        actions={
          <>
            <Button variant="secondary" icon="arrowDown" onClick={() => openAdd('expense')}>
              Registrar gasto
            </Button>
            <Button icon="arrowUp" onClick={() => openAdd('income')}>
              Registrar ingreso
            </Button>
          </>
        }
      />

      <Segmented
        className="period-tabs"
        value={period}
        onChange={setPeriod}
        ariaLabel="Periodo"
        options={[
          { value: 'month', label: 'Este mes' },
          { value: 'last', label: 'Mes pasado' },
          { value: 'year', label: 'Este año' },
          { value: 'all', label: 'Todo' },
        ]}
      />

      <div className="stats-grid">
        <Stat label="Ingresos" icon="trendUp" tone="income" value={money(t.income, currency)} foot={trend(prev && delta(t.income, prev.income)) || <span className="muted">Total de {label}</span>} />
        <Stat label="Gastos" icon="trendDown" tone="expense" value={money(t.expense, currency)} foot={trend(prev && delta(t.expense, prev.expense), true) || <span className="muted">Total de {label}</span>} />
        <Stat
          label="Ganancia neta"
          icon="wallet"
          tone="ink"
          value={<span className={t.net < 0 ? 'neg' : ''}>{money(t.net, currency)}</span>}
          foot={<span className="muted">{t.income > 0 ? `Conservas el ${percent(Math.max(0, margin))} de lo que ganas` : 'Ingresos − gastos'}</span>}
        />
        <Stat
          label="Promedio diario"
          icon="calendar"
          tone="savings"
          value={money(t.net / days, currency)}
          foot={<span className="muted">Gastas {money(t.expense / days, currency, { decimals: 0 })} al día</span>}
        />
      </div>

      <div className="dash-grid">
        <Card className="span-2" title="Por mes" subtitle={`Últimos ${months.length} meses`}>
          <div className="chart-legend-inline">
            <span>
              <i className="dot" style={{ background: 'var(--income)' }} /> Ingresos
            </span>
            <span>
              <i className="dot" style={{ background: 'var(--expense)' }} /> Gastos
            </span>
          </div>
          <BarChart
            currency={currency}
            data={months.map((m) => ({ ...m, tipLabel: `${m.label} · Neto ${money(m.net, currency, { decimals: 0 })}` }))}
            series={[
              { key: 'income', name: 'Ingresos', color: 'var(--income)' },
              { key: 'expense', name: 'Gastos', color: 'var(--expense)' },
            ]}
          />
        </Card>
        <Card title="¿En qué gastas?" subtitle={`Gastos de ${label}`}>
          <Donut items={expenseCats} currency={currency} centerLabel="Gastos" emptyText="Sin gastos" />
        </Card>
        <Card title="¿De dónde viene tu dinero?" subtitle={`Ingresos de ${label}`}>
          <Donut items={incomeCats} currency={currency} centerLabel="Ingresos" emptyText="Sin ingresos" />
        </Card>
        <Card
          className="span-2"
          title="Movimientos del periodo"
          subtitle={`${list.length} ${list.length === 1 ? 'registro' : 'registros'}`}
          action={
            <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => go('historial')}>
              Ver historial completo
            </Button>
          }
        >
          {list.length === 0 ? (
            <Empty icon="receipt" title="Nada por aquí" text={`No hay movimientos en ${label}.`} action={<Button size="sm" icon="plus" onClick={() => openAdd('expense')}>Registrar movimiento</Button>} />
          ) : (
            <TransactionList items={list.slice(0, 8)} onEdit={onEdit} onDelete={onDelete} />
          )}
        </Card>
      </div>
    </div>
  )
}
