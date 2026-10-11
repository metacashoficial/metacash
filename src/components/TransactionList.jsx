import { useData } from '../context/DataContext'
import { money, relativeDay } from '../lib/format'
import Icon from './Icon'
import { IconButton } from './ui'

/** Lista de movimientos agrupada por día. */
export default function TransactionList({ items, onEdit, onDelete, grouped = true, compact = false }) {
  const { currency } = useData()
  if (!grouped) {
    return (
      <ul className="tx-list">
        {items.map((t) => (
          <TxRow key={t.id} t={t} currency={currency} onEdit={onEdit} onDelete={onDelete} compact={compact} />
        ))}
      </ul>
    )
  }
  const groups = []
  for (const t of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return (
    <div className="tx-groups">
      {groups.map((g) => {
        const net = g.items.reduce((s, t) => s + (t.type === 'income' ? 1 : -1) * Number(t.amount), 0)
        return (
          <div key={g.date} className="tx-group">
            <div className="tx-group-head">
              <span>{relativeDay(g.date)}</span>
              <span className={net >= 0 ? 'pos' : 'neg'}>{money(net, currency, { sign: true })}</span>
            </div>
            <ul className="tx-list">
              {g.items.map((t) => (
                <TxRow key={t.id} t={t} currency={currency} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function TxRow({ t, currency, onEdit, onDelete, compact }) {
  const income = t.type === 'income'
  return (
    <li className="tx-row">
      <button type="button" className="tx-main" onClick={onEdit ? () => onEdit(t) : undefined} disabled={!onEdit}>
        <span className={`tx-icon ${income ? 'income' : 'expense'}`}>
          <Icon name={income ? 'arrowUp' : 'arrowDown'} size={16} strokeWidth={2} />
        </span>
        <span className="tx-text">
          <span className="tx-cat">{t.category}</span>
          <span className="tx-desc">{t.description || (income ? 'Ingreso' : 'Gasto')}{compact ? ` · ${relativeDay(t.date)}` : ''}</span>
        </span>
        <span className={`tx-amount ${income ? 'pos' : 'neg'}`}>
          {income ? '+' : '−'}
          {money(t.amount, currency)}
        </span>
      </button>
      {(onEdit || onDelete) && (
        <span className="tx-actions">
          {onEdit && <IconButton icon="pencil" label="Editar" size={16} onClick={() => onEdit(t)} />}
          {onDelete && <IconButton icon="trash" label="Eliminar" size={16} className="danger" onClick={() => onDelete(t)} />}
        </span>
      )}
    </li>
  )
}
