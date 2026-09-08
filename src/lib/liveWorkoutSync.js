import { supabase } from './supabaseClient'

const WORKOUT_KEYS = [
  'fitlife-active-workout',
  'fitlife-live-workout',
  'fitlife-workout-draft',
  'fitlife-current-workout',
  'fitlife-workout-session',
  'fitlife-workout-history-v3',
  'fitlife-workout-history',
]
const DEVICE_KEY = 'fitlife-device-id'
const deviceId = localStorage.getItem(DEVICE_KEY) || crypto.randomUUID()
localStorage.setItem(DEVICE_KEY, deviceId)
let userId = null
let channel = null
let applyingRemote = false
let timer = null
const nativeSetItem = localStorage.setItem.bind(localStorage)

function parse(raw) { try { return JSON.parse(raw) } catch { return raw } }
async function pushKey(key) {
  if (!supabase || !userId || applyingRemote) return
  const value = parse(localStorage.getItem(key))
  const { error } = await supabase.from('fitlife_user_state').upsert({
    user_id: userId,
    state_key: key,
    state_value: value,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,state_key' })
  if (error) console.error('[Workout sync] Upload failed', key, error)
}
function queue(key) {
  clearTimeout(timer)
  timer = setTimeout(() => pushKey(key), 250)
}
async function hydrate() {
  if (!supabase || !userId) return
  const { data, error } = await supabase.from('fitlife_user_state').select('state_key,state_value,device_id').eq('user_id', userId).in('state_key', WORKOUT_KEYS)
  if (error) return console.error('[Workout sync] Download failed', error)
  applyingRemote = true
  for (const row of data || []) {
    nativeSetItem(row.state_key, typeof row.state_value === 'string' ? row.state_value : JSON.stringify(row.state_value))
  }
  applyingRemote = false
  window.dispatchEvent(new Event('fitlife:workout-synced'))
}
function subscribe() {
  if (channel) supabase.removeChannel(channel)
  channel = supabase.channel(`workout-state-${userId}`).on('postgres_changes', {
    event: '*', schema: 'public', table: 'fitlife_user_state', filter: `user_id=eq.${userId}`,
  }, payload => {
    const row = payload.new
    if (!row || !WORKOUT_KEYS.includes(row.state_key) || row.device_id === deviceId) return
    applyingRemote = true
    nativeSetItem(row.state_key, typeof row.state_value === 'string' ? row.state_value : JSON.stringify(row.state_value))
    applyingRemote = false
    window.dispatchEvent(new CustomEvent('fitlife:workout-synced', { detail: row }))
  }).subscribe(status => console.info('[Workout sync]', status))
}
async function connect(session) {
  userId = session?.user?.id || null
  if (!userId) return
  await hydrate()
  subscribe()
  await Promise.all(WORKOUT_KEYS.filter(key => localStorage.getItem(key) !== null).map(pushKey))
}
export async function startLiveWorkoutSync() {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  await connect(session)
  supabase.auth.onAuthStateChange((_event, next) => setTimeout(() => connect(next).catch(console.error), 0))
}
const priorSetItem = localStorage.setItem.bind(localStorage)
localStorage.setItem = (key, value) => {
  priorSetItem(key, value)
  if (!applyingRemote && WORKOUT_KEYS.includes(key)) queue(key)
}
window.fitlifeWorkoutSync = { start: startLiveWorkoutSync, hydrate, pushAll: () => Promise.all(WORKOUT_KEYS.map(pushKey)), deviceId }
startLiveWorkoutSync().catch(error => console.error('[Workout sync] Startup failed', error))
