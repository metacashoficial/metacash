import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const DataContext = createContext(null)

const TABLES = {
  goals: { order: 'created_at', ascending: true },
  transactions: { order: 'date', ascending: false, then: 'created_at' },
  work_schedules: { order: 'weekday', ascending: true },
  work_sessions: { order: 'started_at', ascending: false },
  reminders: { order: 'created_at', ascending: true },
}

const sorters = {
  goals: (a, b) => (a.created_at < b.created_at ? -1 : 1),
  transactions: (a, b) => (a.date !== b.date ? (a.date < b.date ? 1 : -1) : a.created_at < b.created_at ? 1 : -1),
  work_schedules: (a, b) => a.weekday - b.weekday,
  work_sessions: (a, b) => (a.started_at < b.started_at ? 1 : -1),
  reminders: (a, b) => (a.created_at < b.created_at ? -1 : 1),
}

const DEFAULT_PREFS = { currency: 'MXN', theme: 'system', daily_goal: 0, display_name: null, plan_include_expenses: true }

/** Descarga todas las filas en bloques de 1000 (límite por consulta de Supabase). */
async function fetchAll(table) {
  const cfg = TABLES[table]
  const size = 1000
  const rows = []
  for (let from = 0; ; from += size) {
    let q = supabase.from(table).select('*').order(cfg.order, { ascending: cfg.ascending })
    if (cfg.then) q = q.order(cfg.then, { ascending: cfg.ascending })
    const { data, error } = await q.range(from, from + size - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < size) break
  }
  return rows
}

export function DataProvider({ user, children }) {
  const [data, setData] = useState({ goals: [], transactions: [], work_schedules: [], work_sessions: [], reminders: [] })
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const timers = useRef({})

  const loadPrefs = useCallback(async () => {
    const { data: row, error: err } = await supabase.from('preferences').select('*').eq('user_id', user.id).maybeSingle()
    if (err) throw err
    if (row) return setPrefs(row)
    // Si la cuenta se creó antes de instalar el esquema, creamos sus preferencias
    const { data: created, error: insErr } = await supabase
      .from('preferences')
      .upsert({ user_id: user.id, ...DEFAULT_PREFS, display_name: user.user_metadata?.display_name || null })
      .select()
      .single()
    if (insErr) throw insErr
    setPrefs(created)
  }, [user])

  const reload = useCallback(async (table) => {
    if (table === 'preferences') return loadPrefs()
    const rows = await fetchAll(table)
    setData((d) => ({ ...d, [table]: rows }))
  }, [loadPrefs])

  const reloadAll = useCallback(async () => {
    setSyncing(true)
    try {
      await Promise.all([loadPrefs(), ...Object.keys(TABLES).map(reload)])
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }, [loadPrefs, reload])

  // Carga inicial + sincronización en tiempo real entre dispositivos
  useEffect(() => {
    reloadAll()
    const schedule = (table) => {
      clearTimeout(timers.current[table])
      timers.current[table] = setTimeout(() => reload(table).catch(() => {}), 250)
    }
    const channel = supabase.channel(`metacash-${user.id}`)
    for (const table of [...Object.keys(TABLES), 'preferences']) {
      const filter = `user_id=eq.${user.id}`
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, () => schedule(table))
      channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table, filter }, () => schedule(table))
      if (table !== 'preferences') {
        // Los borrados no admiten filtro: solo traen el id, así que lo quitamos localmente
        channel.on('postgres_changes', { event: 'DELETE', schema: 'public', table }, (payload) => {
          const id = payload.old?.id
          if (id) setData((d) => ({ ...d, [table]: d[table].filter((r) => r.id !== id) }))
        })
      }
    }
    channel.subscribe()

    // Al volver a la pestaña o recuperar conexión, se refrescan los datos
    const onVisible = () => document.visibilityState === 'visible' && reloadAll()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', reloadAll)
    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', reloadAll)
      Object.values(timers.current).forEach(clearTimeout)
    }
  }, [user.id, reload, reloadAll])

  /* ----------------------- Operaciones genéricas ----------------------- */

  const upsertLocal = useCallback((table, row) => {
    setData((d) => {
      const list = d[table].filter((r) => r.id !== row.id)
      return { ...d, [table]: [...list, row].sort(sorters[table]) }
    })
  }, [])

  const create = useCallback(
    async (table, values) => {
      const { data: row, error: err } = await supabase.from(table).insert({ ...values, user_id: user.id }).select().single()
      if (err) throw err
      upsertLocal(table, row)
      return row
    },
    [user, upsertLocal]
  )

  const update = useCallback(
    async (table, id, patch) => {
      const { data: row, error: err } = await supabase.from(table).update(patch).eq('id', id).select().single()
      if (err) throw err
      upsertLocal(table, row)
      return row
    },
    [upsertLocal]
  )

  const remove = useCallback(async (table, id) => {
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (err) throw err
    setData((d) => ({ ...d, [table]: d[table].filter((r) => r.id !== id) }))
  }, [])

  /* ------------------------- Acciones de negocio ------------------------- */

  const actions = useMemo(
    () => ({
      reloadAll,
      addTransaction: (v) => create('transactions', v),
      updateTransaction: (id, v) => update('transactions', id, v),
      deleteTransaction: (id) => remove('transactions', id),

      addGoal: (v) => create('goals', { ...v, initial_amount: v.current_amount || 0 }),
      updateGoal: (id, v) => update('goals', id, v),
      deleteGoal: (id) => remove('goals', id),
      adjustGoal: async (id, delta) => {
        const { data: row, error: err } = await supabase.rpc('adjust_goal', { p_goal: id, p_delta: delta })
        if (err) throw err
        if (row?.id) upsertLocal('goals', row)
        return row
      },

      saveSchedule: async (rows) => {
        const payload = rows.map((r) => ({
          user_id: user.id,
          weekday: r.weekday,
          is_active: r.is_active,
          start_time: r.start_time,
          end_time: r.end_time,
          daily_goal: Number(r.daily_goal) || 0,
        }))
        const { data: saved, error: err } = await supabase.from('work_schedules').upsert(payload, { onConflict: 'user_id,weekday' }).select()
        if (err) throw err
        setData((d) => ({ ...d, work_schedules: [...saved].sort(sorters.work_schedules) }))
      },

      startSession: () => create('work_sessions', { started_at: new Date().toISOString() }),
      endSession: (id, { earnings, notes }) =>
        update('work_sessions', id, { ended_at: new Date().toISOString(), earnings: earnings ?? null, notes: notes || null }),
      updateSession: (id, v) => update('work_sessions', id, v),
      deleteSession: (id) => remove('work_sessions', id),

      addReminder: (v) => create('reminders', v),
      updateReminder: (id, v) => update('reminders', id, v),
      deleteReminder: (id) => remove('reminders', id),

      savePrefs: async (patch) => {
        setPrefs((p) => ({ ...p, ...patch }))
        const { data: row, error: err } = await supabase.from('preferences').update(patch).eq('user_id', user.id).select().single()
        if (err) {
          loadPrefs()
          throw err
        }
        setPrefs(row)
      },
    }),
    [create, update, remove, upsertLocal, reloadAll, loadPrefs, user]
  )

  const value = {
    user,
    loading,
    error,
    syncing,
    prefs: prefs || DEFAULT_PREFS,
    currency: prefs?.currency || 'MXN',
    goals: data.goals,
    transactions: data.transactions,
    schedules: data.work_schedules,
    sessions: data.work_sessions,
    reminders: data.reminders,
    ...actions,
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)
