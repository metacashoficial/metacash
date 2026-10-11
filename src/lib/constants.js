export const INCOME_CATEGORIES = ['Trabajo', 'Salario', 'Ventas', 'Freelance', 'Propinas', 'Inversiones', 'Regalos', 'Otros']

export const EXPENSE_CATEGORIES = [
  'Comida',
  'Transporte',
  'Vivienda',
  'Servicios',
  'Salud',
  'Compras',
  'Entretenimiento',
  'Educación',
  'Deudas',
  'Otros',
]

export const GOAL_COLORS = [
  { id: 'green', label: 'Verde' },
  { id: 'blue', label: 'Azul' },
  { id: 'violet', label: 'Violeta' },
  { id: 'amber', label: 'Ámbar' },
  { id: 'rose', label: 'Rosa' },
  { id: 'slate', label: 'Grafito' },
]

export const CURRENCIES = [
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'USD', label: 'Dólar estadounidense (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'COP', label: 'Peso colombiano (COP)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'PEN', label: 'Sol peruano (PEN)' },
  { code: 'GTQ', label: 'Quetzal (GTQ)' },
  { code: 'DOP', label: 'Peso dominicano (DOP)' },
]

/** Paleta para gráficos de categorías (variables CSS) */
export const CHART_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)']

export const REMINDER_KINDS = {
  work: { label: 'Empezar a trabajar', icon: 'briefcase', body: 'Tu jornada está por comenzar. Abre MetaCash e inicia tu jornada.' },
  expense: { label: 'Registrar gastos', icon: 'receipt', body: '¿Gastaste algo hoy? Regístralo para mantener tus cuentas al día.' },
  goals: { label: 'Revisar metas', icon: 'target', body: 'Revisa cómo van tus metas de ahorro y cuánto te falta.' },
  custom: { label: 'Personalizado', icon: 'bell', body: 'Tienes un recordatorio de MetaCash.' },
}
