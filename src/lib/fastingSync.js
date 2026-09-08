import { supabase } from './supabaseClient'

const FASTING_KEYS = [
  'fitlife-fasting-sessions-v4',
  'fitlife-fasting-sessions',
]

const DEVICE_KEY = 'fitlife-device-id'
const deviceId = localStorage.getItem(DEVICE_KEY) || crypto.randomUUID()
localStorage.setItem(DEVICE_KEY, deviceId)

let userId = null
let channel = null
let applyingRemote = false
let pushTimer = null
let authSubscription = null

const nativeSetItem = localStorage.setItem.bind(localStorage)

function parseJson(raw, fallback = []) {
  try {
    return JSON.parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

function getLocalSessions() {
  for (const key of FASTING_KEYS) {
    const rows = parseJson(localStorage.getItem(key), [])
    if (Array.isArray(rows) && rows.length > 0) return rows
  }
  return []
}

function getSessionId(row) {
  return String(
    row.id ||
    row.session_id ||
    row.client_session_id ||
    row.started_at ||
    row.start_time ||
    crypto.randomUUID()
  )
}

function getStartedAt(row) {
  return (
    row.started_at ||
    row.start_time ||
    row.startedAt ||
    row.start ||
    new Date().toISOString()
  )
}

function getEndedAt(row) {
  return row.ended_at || row.end_time || row.endedAt || row.end || null
}

function getStatus(row) {
  if (getEndedAt(row)) return 'completed'
  if (row.status === 'ended') return 'completed'
  return row.status || 'active'
}

function toDatabaseRow(row) {
  return {
    user_id: userId,
    client_session_id: getSessionId(row),
    started_at: getStartedAt(row),
    ended_at: getEndedAt(row),
    target_hours: Number(
      row.target_hours || row.goal_hours || row.target || 16
    ),
    status: getStatus(row),
    payload: row,
    device_id: deviceId,
    updated_at: new Date().toISOString(),
  }
}

function fromDatabaseRow(row) {
  return {
    ...(row.payload || {}),
    id: row.payload?.id || row.client_session_id,
    started_at: row.started_at,
    ended_at: row.ended_at,
    expected_end_at:
      row.payload?.expected_end_at ||
      new Date(
        new Date(row.started_at).getTime() +
        Number(row.target_hours || 16) * 60 * 60 * 1000
      ).toISOString(),
    target_hours: Number(row.target_hours || 16),
    status: row.status,
    synced_at: row.updated_at,
  }
}

function writeLocalSessions(rows) {
  applyingRemote = true
  const serialized = JSON.stringify(rows)

  for (const key of FASTING_KEYS) {
    nativeSetItem(key, serialized)
  }

  applyingRemote = false

  window.dispatchEvent(
    new CustomEvent('fitlife:fasting-synced', {
      detail: { rows },
    })
  )

  window.dispatchEvent(
    new StorageEvent('storage', {
      key: FASTING_KEYS[0],
      newValue: serialized,
    })
  )
}

async function pushLocalSessions() {
  if (!supabase || !userId || applyingRemote) return

  const rows = getLocalSessions()
  if (rows.length === 0) return

  const records = rows.map(toDatabaseRow)

  const activeRecords = records.filter((row) => row.status === 'active')
  if (activeRecords.length > 1) {
    activeRecords
      .sort((a, b) =>
        String(b.started_at).localeCompare(String(a.started_at))
      )
      .slice(1)
      .forEach((row) => {
        row.status = 'completed'
        row.ended_at = row.ended_at || row.started_at
      })
  }

  const { error } = await supabase
    .from('fasting_sessions')
    .upsert(records, {
      onConflict: 'user_id,client_session_id',
    })

  if (error) {
    console.error('[Fasting sync] Upload failed', error)
    throw error
  }
}

function queuePush() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushLocalSessions().catch((error) => {
      console.error('[Fasting sync] Deferred upload failed', error)
    })
  }, 350)
}

async function downloadSessions() {
  if (!supabase || !userId) return []

  const { data, error } = await supabase
    .from('fasting_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('[Fasting sync] Download failed', error)
    throw error
  }

  return (data || []).map(fromDatabaseRow)
}

function mergeSessions(remoteRows, localRows) {
  const byId = new Map()

  for (const row of localRows) {
    byId.set(getSessionId(row), row)
  }

  for (const row of remoteRows) {
    byId.set(getSessionId(row), row)
  }

  return [...byId.values()].sort((a, b) =>
    String(getStartedAt(b)).localeCompare(String(getStartedAt(a)))
  )
}

async function hydrateFromSupabase() {
  if (!supabase || !userId) return

  const remoteRows = await downloadSessions()
  const localRows = getLocalSessions()

  if (remoteRows.length === 0 && localRows.length > 0) {
    await pushLocalSessions()
    return
  }

  const mergedRows = mergeSessions(remoteRows, localRows)
  writeLocalSessions(mergedRows)

  const remoteIds = new Set(remoteRows.map(getSessionId))
  const hasUnsyncedLocal = localRows.some(
    (row) => !remoteIds.has(getSessionId(row))
  )

  if (hasUnsyncedLocal) await pushLocalSessions()
}

async function refreshFromSupabase() {
  const rows = await downloadSessions()
  writeLocalSessions(rows)
}

function subscribeToRealtime() {
  if (!supabase || !userId) return

  if (channel) {
    supabase.removeChannel(channel)
  }

  channel = supabase
    .channel(`fasting-sessions-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fasting_sessions',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new?.device_id === deviceId) return

        refreshFromSupabase().catch((error) => {
          console.error('[Fasting sync] Realtime refresh failed', error)
        })
      }
    )
    .subscribe((subscriptionStatus) => {
      console.info('[Fasting sync]', subscriptionStatus)
    })
}

async function connectForSession(session) {
  userId = session?.user?.id || null

  if (!userId) {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
    return
  }

  await hydrateFromSupabase()
  subscribeToRealtime()
}

export async function startFastingSync() {
  if (!supabase) {
    console.warn('[Fasting sync] Supabase is not configured')
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  await connectForSession(session)

  if (!authSubscription) {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setTimeout(() => {
        connectForSession(nextSession).catch((error) => {
          console.error('[Fasting sync] Auth refresh failed', error)
        })
      }, 0)
    })

    authSubscription = subscription
  }
}

localStorage.setItem = (key, value) => {
  nativeSetItem(key, value)

  if (!applyingRemote && FASTING_KEYS.includes(key)) {
    queuePush()
  }
}

window.fitlifeFastingSync = {
  start: startFastingSync,
  push: pushLocalSessions,
  refresh: hydrateFromSupabase,
  download: downloadSessions,
  deviceId,
}

startFastingSync().catch((error) => {
  console.error('[Fasting sync] Startup failed', error)
})
