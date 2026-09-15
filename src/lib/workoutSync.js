import { supabase } from './supabaseClient'

const DEVICE_KEY = 'fitlife-device-id'
const deviceId = localStorage.getItem(DEVICE_KEY) || crypto.randomUUID()
localStorage.setItem(DEVICE_KEY, deviceId)

const EXACT_KEYS = new Set([
  'fitlife-active-workout',
  'fitlife-active-workout-v2',
  'fitlife-active-workout-v3',
  'fitlife-live-workout',
  'fitlife-current-workout',
  'fitlife-workout-draft',
  'fitlife-workout-session',
  'fitlife-workout-history',
  'fitlife-workout-history-v2',
  'fitlife-workout-history-v3',
  'fitlife-routines',
  'fitlife-routines-v2',
  'fitlife-routines-v3',
  'fitlife-exercises',
  'fitlife-exercises-v2',
  'fitlife-exercises-v3',
  'fitlife-routine-exercises',
])

let userId = null
let channel = null
let authSubscription = null
let applyingRemote = false
let debounceTimer = null
const pendingKeys = new Set()
const nativeSetItem = localStorage.setItem.bind(localStorage)
const nativeRemoveItem = localStorage.removeItem.bind(localStorage)

function isWorkoutKey(key) {
  if (EXACT_KEYS.has(key)) return true
  return key.startsWith('fitlife-') && /(active|live|current|draft).*(workout|exercise|routine)|(workout|exercise|routine).*(active|live|current|draft)/i.test(key)
}

function parseValue(raw) {
  if (raw === null) return null
  try { return JSON.parse(raw) } catch { return raw }
}

function serializeValue(value) {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function currentWorkoutKeys() {
  return Object.keys(localStorage).filter(isWorkoutKey)
}

async function pushKey(key) {
  if (!supabase || !userId || applyingRemote || !isWorkoutKey(key)) return
  const raw = localStorage.getItem(key)
  const record = {
    user_id: userId,
    state_key: key,
    state_value: parseValue(raw),
    is_deleted: raw === null,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('live_workout_state')
    .upsert(record, { onConflict: 'user_id,state_key' })
  if (error) {
    console.error('[Workout sync] Upload failed', key, error)
    throw error
  }
}

async function flushPending() {
  const keys = [...pendingKeys]
  pendingKeys.clear()
  await Promise.all(keys.map((key) => pushKey(key)))
}

function queueKey(key) {
  pendingKeys.add(key)
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    flushPending().catch((error) => console.error('[Workout sync] Deferred upload failed', error))
  }, 250)
}

async function pushAll() {
  await Promise.all(currentWorkoutKeys().map((key) => pushKey(key)))
}

async function download() {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('live_workout_state')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

function applyRows(rows) {
  applyingRemote = true
  for (const row of rows) {
    if (row.is_deleted) {
      nativeRemoveItem(row.state_key)
    } else {
      nativeSetItem(row.state_key, serializeValue(row.state_value))
    }
  }
  applyingRemote = false
  window.dispatchEvent(new CustomEvent('fitlife:workout-synced', { detail: { rows } }))
  window.dispatchEvent(new Event('storage'))
}

async function refresh() {
  const rows = await download()
  applyRows(rows)
  return rows
}

function subscribe() {
  if (!supabase || !userId) return
  if (channel) supabase.removeChannel(channel)
  channel = supabase
    .channel(`live-workout-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'live_workout_state',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      const row = payload.new || payload.old
      if (!row || row.device_id === deviceId) return
      applyRows([row])
    })
    .subscribe((status) => console.info('[Workout sync]', status))
}

async function connect(session) {
  userId = session?.user?.id || null
  if (!userId) {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
    return
  }
  const remoteRows = await download()
  if (remoteRows.length) applyRows(remoteRows)
  await pushAll()
  subscribe()
}

export async function startWorkoutSync() {
  if (!supabase) {
    console.warn('[Workout sync] Supabase is not configured')
    return
  }
  const { data: { session } } = await supabase.auth.getSession()
  await connect(session)
  if (!authSubscription) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => connect(nextSession).catch((error) => console.error('[Workout sync] Auth refresh failed', error)), 0)
    })
    authSubscription = subscription
  }
}

localStorage.setItem = (key, value) => {
  nativeSetItem(key, value)
  if (!applyingRemote && isWorkoutKey(key)) queueKey(key)
}

localStorage.removeItem = (key) => {
  nativeRemoveItem(key)
  if (!applyingRemote && isWorkoutKey(key)) queueKey(key)
}

window.fitlifeWorkoutSync = {
  start: startWorkoutSync,
  pushAll,
  refresh,
  download,
  keys: currentWorkoutKeys,
  deviceId,
}

startWorkoutSync().catch((error) => console.error('[Workout sync] Startup failed', error))
