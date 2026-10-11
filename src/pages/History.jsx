import { useMemo, useState } from 'react'
import TransactionList from '../components/TransactionList'
import { Button, Card, Empty, Input, PageHeader, Segmented, Select } from '../components/ui'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { exportTransactions } from '../lib/csv'
import { totals } from '../lib/finance'
import { money, todayISO } from '../lib/format'

const PAGE = 50

export default function History({ openAdd, onEdit, onDelete }) {
  const { transactions, currency } = useData()
  const { toast } = useFeedback()
  const [q, setQ] = useState('')
  const [type, setType] = useState('all')
  const [category, setCategory] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [showFilters, setShowFilters] = useState(false)

  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category))].sort((a, b) => a.localeCompare(b, 'es')), [transactions])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return transactions.filter(
      (t) =>
        (type === 'all' || t.type === type) &&
        (!category || t.category === category) &&
        (!from || t.date >= from) &&
        (!to || t.date <= to) &&
        (!needle || `${t.category} ${t.description || ''} ${t.amount}`.toLowerCase().includes(needle))
    )
  }, [transactions, q, type, category, from, to])

  const sum = totals(filtered)
  const activeFilters = [category, from, to].filter(Boolean).length
  const clear = () => {
    setQ('')
    setType('all')
    setCategory('')
    setFrom('')
    setTo('')
  }

  const doExport = () => {
    if (!filtered.length) return toast('No hay movimientos para exportar.', { tone: 'info' })
    exportTransactions(filtered, `metacash-movimientos-${todayISO()}.csv`)
    toast(`Exportaste ${filtered.length} movimientos.`)
  }

  return (
    <div className="page">
      <PageHeader
        title="Historial"
        subtitle="Todos tus movimientos. Toca uno para editarlo, o descárgalos en CSV para Excel."
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={doExport}>
              Exportar CSV
            </Button>
            <Button icon="plus" onClick={() => openAdd('expense')}>
              Registrar
            </Button>
          </>
        }
      />

      <Card className="filters-card">
        <div className="filters-row">
          <Input icon="search" placeholder="Buscar por categoría, nota o monto" value={q} onChange={(e) => setQ(e.target.value)} className="grow" aria-label="Buscar" />
          <Segmented
            value={type}
            onChange={setType}
            ariaLabel="Tipo"
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'income', label: 'Ingresos' },
              { value: 'expense', label: 'Gastos' },
            ]}
          />
          <Button variant={showFilters || activeFilters ? 'secondary' : 'ghost'} icon="filter" onClick={() => setShowFilters((s) => !s)}>
            Filtros{activeFilters ? ` (${activeFilters})` : ''}
          </Button>
        </div>
        {showFilters && (
          <div className="filters-extra">
            <Select label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input label="Desde" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label="Hasta" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button variant="ghost" icon="x" onClick={clear}>
              Limpiar
            </Button>
          </div>
        )}
      </Card>

      <div className="history-summary">
        <div>
          <span>Movimientos</span>
          <strong>{filtered.length}</strong>
        </div>
        <div>
          <span>Ingresos</span>
          <strong className="pos">{money(sum.income, currency)}</strong>
        </div>
        <div>
          <span>Gastos</span>
          <strong className="neg">{money(sum.expense, currency)}</strong>
        </div>
        <div>
          <span>Neto</span>
          <strong className={sum.net < 0 ? 'neg' : ''}>{money(sum.net, currency)}</strong>
        </div>
      </div>

      <Card padded={false}>
        {filtered.length === 0 ? (
          <Empty
            icon={transactions.length ? 'search' : 'receipt'}
            title={transactions.length ? 'Sin resultados' : 'Tu historial está vacío'}
            text={transactions.length ? 'Prueba con otros filtros.' : 'Cuando registres ingresos o gastos aparecerán aquí.'}
            action={transactions.length ? <Button size="sm" variant="secondary" onClick={clear}>Quitar filtros</Button> : <Button size="sm" icon="plus" onClick={() => openAdd('expense')}>Registrar movimiento</Button>}
          />
        ) : (
          <>
            <TransactionList items={filtered.slice(0, limit)} onEdit={onEdit} onDelete={onDelete} />
            {filtered.length > limit && (
              <div className="load-more">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                  Mostrar más ({filtered.length - limit} restantes)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
