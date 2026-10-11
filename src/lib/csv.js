function escapeCell(value) {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // Evita inyección de fórmulas al abrir en Excel / Sheets
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'
  return s
}

export function toCSV(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(',')
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(','))
  return [header, ...body].join('\r\n')
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  // BOM para que Excel respete acentos
  const blob = new Blob(['﻿' + text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportTransactions(transactions, filename = 'metacash-movimientos.csv') {
  const csv = toCSV(transactions, [
    { label: 'Fecha', value: (t) => t.date },
    { label: 'Tipo', value: (t) => (t.type === 'income' ? 'Ingreso' : 'Gasto') },
    { label: 'Categoría', value: (t) => t.category },
    { label: 'Descripción', value: (t) => t.description || '' },
    { label: 'Monto', value: (t) => Number(t.amount).toFixed(2) },
    { label: 'Monto con signo', value: (t) => (t.type === 'income' ? 1 : -1) * Number(t.amount) },
  ])
  downloadText(filename, csv)
}
