import { supabase } from './supabaseClient'

const FASTING_KEYS = ['fitlife-fasting-sessions-v4', 'fitlife-fasting-sessions']
const DEVICE_KEY = 'fitlife-device-id'
const deviceId = localStorage.getItem(DEVICE_KEY) || crypto.randomUUID()
localStorage.setItem(DEVICE_KEY, deviceId)

let userId = null
let channel = null
let applyingRemote = false
let pushTimer = null
let authSubscription = null
const nativeSetItem = localStorage.setItem.bind(localStorage)

function parse(raw, fallback = []) {
  try { return JSON.parse(raw) ?? fallback } catch { return fallback }
}
function getId(row) {
  return String(row.id || row.session_id || row.client_session_id || row.started_at || row.start_time || crypto.randomUUID())
}
function getStart(row) {
  return row.started_at || row.start_time || row.startedAt || row.start || new Date().toISOString()
}
function getEnd(row) {
  return row.ended_at || row.end_time || row.endedAt || row.end || null
}
function getStatus(row) {
  if (getEnd(row)) return 'completed'
  if (row.status === 'ended') return 'completed'
  return row.status || 'active'
}
function allLocalSessions() {
  const byId = new Map()
  for (const key of FASTING_KEYS) {
    const rows = parse(localStorage.getItem(key), [])
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      const id = getId(row)
      const existing = byId.get(id)
      if (!existing || getStatus(row) === 'active' || String(row.updated_at || '') > String(existing.updated_at || '')) {
        byId.set(id, row)
      }
    }
  }
  return [...byId.values()].sort((a, b) => String(getStart(b)).localeCompare(String(getStart(a))))
}
function toDatabase(row) {
  return {
    user_id: userId,
    client_session_id: getId(row),
    started_at: getStart(row),
    ended_at: getEnd(row),
    target_hours: Number(row.target_hours || row.goal_hours || row.target || 16),
    status: getStatus(row),
    payload: row,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  }
}
function fromDatabase(row) {
  return {
    ...(row.payload || {}),
    id: row.payload?.id || row.client_session_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    expected_end_at: row.payload?.expected_end_at || new Date(new Date(row.started_at).getTime() + Number(row.target_hours || 16) * 3600000).toISOString(),
    target_hours: Number(row.target_hours || 16),
    status: row.status,
    synced_at: row.updated_at,
  }
}
function writeLocal(rows) {
  applyingRemote = true
  const content = JSON.stringify(rows)
  for (const key of FASTING_KEYS) nativeSetItem(key, content)
  applyingRemote = false
  window.dispatchEvent(new CustomEvent('fitlife:fasting-synced', { detail: { rows } }))
  window.dispatchEvent(new StorageEvent('storage', { key: FASTING_KEYS[0], newValue: content }))
}
async function push() {
  if (!supabase || !userId || applyingRemote) return
  const sessions = allLocalSessions()
  if (!sessions.length) return
  const records = sessions.map(toDatabase)
  const active = records.filter(row => row.status === 'active').sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))
  for (const duplicate of active.slice(1)) {
    duplicate.status = 'completed'
    duplicate.ended_at = duplicate.ended_at || duplicate.started_at
  }
  const { error } = await supabase.from('fasting_sessions').upsert(records, { onConflict: 'user_id,client_session_id' })
  if (error) throw error
}
async function download() {
  if (!supabase || !userId) return []
  const { data, error } = await supabase.from('fasting_sessions').select('*').eq('user_id', userId).order('started_at', { ascending: false })
  if (error) throw error
  return (data || []).map(fromDatabase)
}
async function refresh() {
  const remote = await download()
  const local = allLocalSessions()
  const byId = new Map(local.map(row => [getId(row), row]))
  for (const row of remote) byId.set(getId(row), row)
  const merged = [...byId.values()].sort((a, b) => String(getStart(b)).localeCompare(String(getStart(a))))
  writeLocal(merged)
  if (local.some(row => !remote.some(remoteRow => getId(remoteRow) === getId(row)))) await push()
}
function queuePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => push().catch(error => console.error('[Fasting sync] Upload failed', error)), 250)
}
function subscribe() {
  if (channel) supabase.removeChannel(channel)
  channel = supabase.channel(`fasting-${userId}`).on('postgres_changes', {
    event: '*', schema: 'public', table: 'fasting_sessions', filter: `user_id=eq.${userId}`,
  }, payload => {
    if (payload.new?.device_id === deviceId) return
    refresh().catch(error => console.error('[Fasting sync] Realtime refresh failed', error))
  }).subscribe(status => console.info('[Fasting sync]', status))
}
async function connect(session) {
  userId = session?.user?.id || null
  if (!userId) return
  await refresh()
  subscribe()
}
export async function startFastingSync() {
  if (!supabase) return
  const { data: { session } } = await supabase.auth.getSession()
  await connect(session)
  if (!authSubscription) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => connect(nextSession).catch(console.error), 0)
    })
    authSubscription = subscription
  }
}
localStorage.setItem = (key, value) => {
  nativeSetItem(key, value)
  if (!applyingRemote && FASTING_KEYS.includes(key)) queuePush()
}
window.fitlifeFastingSync = { start: startFastingSync, push, refresh, download, local: allLocalSessions, deviceId }
startFastingSync().catch(error => console.error('[Fasting sync] Startup failed', error))
