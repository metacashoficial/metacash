import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'
import { useFeedback } from '../context/Feedback'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../lib/constants'
import { parseAmount, todayISO } from '../lib/format'
import { Button, ChipGroup, Field, Input, Modal, MoneyInput, Segmented } from './ui'

/** Ventana para registrar o editar un ingreso o gasto. */
export default function TransactionForm({ open, onClose, initial, defaultType = 'expense' }) {
  const { addTransaction, updateTransaction, currency, transactions } = useData()
  const { toast } = useFeedback()
  const editing = !!initial?.id
  const [type, setType] = useState(defaultType)
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [custom, setCustom] = useState('')
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const t = initial?.type || defaultType
    const base = t === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setType(t)
    setAmount(initial?.amount ? String(initial.amount) : '')
    if (initial?.category && !base.includes(initial.category)) {
      setCategory('__custom')
      setCustom(initial.category)
    } else {
      setCategory(initial?.category || '')
      setCustom('')
    }
    setDate(initial?.date || todayISO())
    setDescription(initial?.description || '')
    setErrors({})
  }, [open, initial, defaultType])

  const base = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  // Categorías personalizadas que el usuario ya usó
  const used = [...new Set(transactions.filter((t) => t.type === type).map((t) => t.category))].filter((c) => !base.includes(c))
  const options = [...base, ...used.slice(0, 6)]

  const submit = async (e) => {
    e?.preventDefault()
    const value = parseAmount(amount)
    const cat = category === '__custom' ? custom.trim() : category
    const errs = {}
    if (!(value > 0)) errs.amount = 'Escribe un monto mayor a 0.'
    if (!cat) errs.category = 'Elige una categoría.'
    if (!date) errs.date = 'Elige la fecha.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      const payload = { type, amount: value, category: cat.slice(0, 40), date, description: description.trim() || null }
      if (editing) await updateTransaction(initial.id, payload)
      else await addTransaction(payload)
      toast(editing ? 'Movimiento actualizado.' : type === 'income' ? 'Ingreso registrado.' : 'Gasto registrado.')
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
      title={editing ? 'Editar movimiento' : 'Registrar movimiento'}
      subtitle={editing ? null : 'Anota el dinero que entra o sale.'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={saving} icon="check">
            {editing ? 'Guardar cambios' : 'Guardar'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="form-grid">
        <Segmented
          className="seg-full"
          ariaLabel="Tipo de movimiento"
          value={type}
          onChange={(v) => {
            setType(v)
            setCategory('')
          }}
          options={[
            { value: 'expense', label: 'Gasto', icon: 'arrowDown', tone: 'expense' },
            { value: 'income', label: 'Ingreso', icon: 'arrowUp', tone: 'income' },
          ]}
        />
        <MoneyInput label="Monto" value={amount} onChange={setAmount} currency={currency} error={errors.amount} large data-autofocus />
        <Field label="Categoría" error={errors.category}>
          <ChipGroup options={options} value={category} onChange={setCategory} />
          <button type="button" className={`chip chip-ghost ${category === '__custom' ? 'active' : ''}`} onClick={() => setCategory('__custom')}>
            + Otra categoría
          </button>
          {category === '__custom' && (
            <input className="input mt-8" placeholder="Nombre de la categoría" value={custom} maxLength={40} onChange={(e) => setCustom(e.target.value)} autoFocus />
          )}
        </Field>
        <div className="row-2">
          <Input label="Fecha" type="date" value={date} max="2100-12-31" onChange={(e) => setDate(e.target.value)} error={errors.date} />
          <Input label="Nota (opcional)" placeholder={type === 'income' ? 'Ej. Pago de cliente' : 'Ej. Supermercado'} value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
