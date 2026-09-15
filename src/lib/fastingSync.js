import { supabase } from './supabaseClient'

const KEYS = [
  'fitlife-fasting-sessions-v4',
  'fitlife-fasting-sessions',
]

const DEVICE_KEY = 'fitlife-device-id'
const TOMBSTONE_KEY = 'fitlife-fasting-deleted-ids'
const START_TOMBSTONE_KEY =
  'fitlife-fasting-deleted-start-times'

const deviceId =
  localStorage.getItem(DEVICE_KEY) ||
  crypto.randomUUID()

localStorage.setItem(
  DEVICE_KEY,
  deviceId
)

let userId = null
let channel = null
let applyingRemote = false
let pushTimer = null
let authSubscription = null

const nativeSetItem =
  localStorage.setItem.bind(localStorage)

const parse = (raw, fallback = []) => {
  try {
    return JSON.parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

const idOf = row =>
  String(
    row?.id ||
    row?.session_id ||
    row?.client_session_id ||
    row?.started_at ||
    ''
  )

const startOf = row =>
  row?.started_at ||
  row?.start_time ||
  row?.startedAt ||
  row?.start ||
  ''

const exactStart = row => {
  const value = startOf(row)
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value || '')
  }

  return date.toISOString()
}

const endOf = row =>
  row?.ended_at ||
  row?.end_time ||
  row?.endedAt ||
  row?.end ||
  null

const statusOf = row =>
  endOf(row) || row?.status === 'ended'
    ? 'completed'
    : row?.status || 'active'

const tombstones = () =>
  new Set(
    parse(
      localStorage.getItem(TOMBSTONE_KEY),
      []
    ).map(String)
  )

const startTombstones = () =>
  new Set(
    parse(
      localStorage.getItem(
        START_TOMBSTONE_KEY
      ),
      []
    ).map(String)
  )

const saveTombstones = set =>
  nativeSetItem(
    TOMBSTONE_KEY,
    JSON.stringify([...set])
  )

const saveStartTombstones = set =>
  nativeSetItem(
    START_TOMBSTONE_KEY,
    JSON.stringify([...set])
  )

function isDeletedLocally(row) {
  const deletedIds = tombstones()
  const deletedStarts = startTombstones()

  return (
    !idOf(row) ||
    deletedIds.has(idOf(row)) ||
    deletedStarts.has(exactStart(row)) ||
    Boolean(row?.deleted_at) ||
    row?.status === 'deleted'
  )
}

function localRows() {
  const map = new Map()

  for (const key of KEYS) {
    for (
      const row of parse(
        localStorage.getItem(key),
        []
      )
    ) {
      if (isDeletedLocally(row)) {
        continue
      }

      const id = idOf(row)
      const previous = map.get(id)

      if (
        !previous ||
        String(row.updated_at || '') >=
          String(previous.updated_at || '')
      ) {
        map.set(id, row)
      }
    }
  }

  return [...map.values()].sort(
    (left, right) =>
      String(startOf(right))
        .localeCompare(
          String(startOf(left))
        )
  )
}

function dbRow(row) {
  const id = idOf(row)

  const payload = {
    ...row,
    id,
    client_session_id: id,
    sync_status: 'synced',
  }

  /*
   * Ordinary uploads must never contain deletion fields.
   * Only remove() is allowed to change deleted_at.
   */
  delete payload.deleted_at

  return {
    user_id: userId,
    client_session_id: id,
    started_at: startOf(row),
    ended_at: endOf(row),
    expected_end_at:
      row.expected_end_at || null,
    protocol: row.protocol || 'Custom',
    target_hours: Number(
      row.target_hours ||
      row.goal_hours ||
      row.target ||
      16
    ),
    actual_hours:
      row.actual_hours ?? null,
    status: statusOf(row),
    payload,
    device_id: deviceId,
    updated_at:
      row.updated_at ||
      new Date().toISOString(),
  }
}

function appRow(row) {
  const payload = row.payload || {}

  const id =
    payload.id ||
    row.client_session_id ||
    row.id

  return {
    ...payload,
    id,
    client_session_id:
      row.client_session_id || id,
    protocol:
      row.protocol ||
      payload.protocol ||
      'Custom',
    started_at: row.started_at,
    ended_at: row.ended_at,
    expected_end_at:
      row.expected_end_at ||
      payload.expected_end_at ||
      new Date(
        new Date(row.started_at).getTime() +
        Number(row.target_hours || 16) *
          3600000
      ).toISOString(),
    target_hours: Number(
      row.target_hours || 16
    ),
    actual_hours:
      row.actual_hours ??
      payload.actual_hours,
    status: row.status,
    deleted_at:
      row.deleted_at ||
      payload.deleted_at ||
      null,
    updated_at: row.updated_at,
    synced_at: row.updated_at,
    sync_status: 'synced',
  }
}

function write(rows) {
  const visibleRows = (rows || [])
    .filter(row =>
      !isDeletedLocally(row)
    )

  applyingRemote = true

  const content =
    JSON.stringify(visibleRows)

  for (const key of KEYS) {
    nativeSetItem(key, content)
  }

  applyingRemote = false

  window.dispatchEvent(
    new CustomEvent(
      'fitlife:fasting-synced',
      {
        detail: {
          rows: visibleRows,
        },
      }
    )
  )

  window.dispatchEvent(
    new CustomEvent(
      'fitlife:fasting-changed',
      {
        detail: visibleRows,
      }
    )
  )
}

async function downloadAll() {
  if (!supabase || !userId) {
    return []
  }

  const { data, error } = await supabase
    .from('fasting_sessions')
    .select('*')
    .eq('user_id', userId)
    .order(
      'started_at',
      { ascending: false }
    )

  if (error) {
    throw error
  }

  return data || []
}

function learnRemoteDeletions(rows) {
  const ids = tombstones()
  const starts = startTombstones()

  for (const row of rows) {
    if (
      row.deleted_at ||
      row.status === 'deleted'
    ) {
      if (row.client_session_id) {
        ids.add(
          String(row.client_session_id)
        )
      }

      const start = exactStart(row)

      if (start) {
        starts.add(start)
      }
    }
  }

  saveTombstones(ids)
  saveStartTombstones(starts)
}

/*
 * Existing stale devices may already have recreated a fast using
 * another client_session_id. If that row has the exact same start
 * timestamp as a deleted row, it is the same logical fast and must
 * also be marked deleted.
 */
async function reconcileRemoteDuplicates(
  rows
) {
  if (!supabase || !userId) {
    return false
  }

  const deletedStarts = new Set(
    rows
      .filter(row =>
        row.deleted_at ||
        row.status === 'deleted'
      )
      .map(exactStart)
      .filter(Boolean)
  )

  const duplicates = rows.filter(row =>
    !row.deleted_at &&
    row.status !== 'deleted' &&
    deletedStarts.has(exactStart(row))
  )

  if (!duplicates.length) {
    return false
  }

  const deletedAt =
    new Date().toISOString()

  for (const row of duplicates) {
    const { error } = await supabase
      .from('fasting_sessions')
      .update({
        deleted_at: deletedAt,
        status: 'deleted',
        device_id: deviceId,
        updated_at: deletedAt,
      })
      .eq('user_id', userId)
      .eq(
        'client_session_id',
        row.client_session_id
      )

    if (error) {
      throw error
    }
  }

  console.info(
    '[Fasting sync] Reconciled stale duplicates:',
    duplicates.length
  )

  return true
}

async function upload(
  rows = localRows()
) {
  if (
    !supabase ||
    !userId ||
    applyingRemote
  ) {
    return
  }

  /*
   * Read remote deletion fingerprints before uploading.
   * This prevents a stale phone from inserting the same logical
   * fast with a newly generated ID.
   */
  const remoteRows =
    await downloadAll()

  learnRemoteDeletions(remoteRows)

  const remotelyDeletedStarts =
    new Set(
      remoteRows
        .filter(row =>
          row.deleted_at ||
          row.status === 'deleted'
        )
        .map(exactStart)
        .filter(Boolean)
    )

  const activeRows = rows.filter(row =>
    !isDeletedLocally(row) &&
    !remotelyDeletedStarts.has(
      exactStart(row)
    )
  )

  if (!activeRows.length) {
    return
  }

  const { error } = await supabase
    .from('fasting_sessions')
    .upsert(
      activeRows.map(dbRow),
      {
        onConflict:
          'user_id,client_session_id',
      }
    )

  if (error) {
    throw error
  }
}

async function download() {
  const rows = await downloadAll()

  learnRemoteDeletions(rows)

  return rows
    .filter(row =>
      !row.deleted_at &&
      row.status !== 'deleted' &&
      !isDeletedLocally(row)
    )
    .map(appRow)
}

async function refresh() {
  if (!userId) {
    return []
  }

  let allRows =
    await downloadAll()

  learnRemoteDeletions(allRows)

  const reconciled =
    await reconcileRemoteDuplicates(
      allRows
    )

  if (reconciled) {
    allRows = await downloadAll()
    learnRemoteDeletions(allRows)
  }

  const activeRemote = allRows
    .filter(row =>
      !row.deleted_at &&
      row.status !== 'deleted' &&
      !isDeletedLocally(row)
    )
    .map(appRow)

  const remoteIds = new Set(
    activeRemote.map(idOf)
  )

  const remoteDeletedStarts =
    new Set(
      allRows
        .filter(row =>
          row.deleted_at ||
          row.status === 'deleted'
        )
        .map(exactStart)
        .filter(Boolean)
    )

  const pending = localRows()
    .filter(row => {
      const id = idOf(row)

      return (
        id &&
        !isDeletedLocally(row) &&
        !remoteDeletedStarts.has(
          exactStart(row)
        ) &&
        row.sync_status === 'pending' &&
        !remoteIds.has(id)
      )
    })

  if (pending.length) {
    await upload(pending)
  }

  const latest = pending.length
    ? await download()
    : activeRemote

  write(latest)

  return latest
}

async function remove(idOrRow) {
  const row =
    typeof idOrRow === 'object'
      ? idOrRow
      : localRows().find(
          item =>
            idOf(item) ===
            String(idOrRow)
        )

  const id = String(
    typeof idOrRow === 'object'
      ? idOf(idOrRow)
      : idOrRow
  )

  const startedAt =
    row ? exactStart(row) : ''

  const ids = tombstones()
  const starts = startTombstones()

  ids.add(id)

  if (startedAt) {
    starts.add(startedAt)
  }

  saveTombstones(ids)
  saveStartTombstones(starts)

  write(
    localRows().filter(item =>
      idOf(item) !== id &&
      (
        !startedAt ||
        exactStart(item) !== startedAt
      )
    )
  )

  if (supabase && userId) {
    const now =
      new Date().toISOString()

    let query = supabase
      .from('fasting_sessions')
      .update({
        deleted_at: now,
        status: 'deleted',
        device_id: deviceId,
        updated_at: now,
      })
      .eq('user_id', userId)

    /*
     * Delete all copies of the same logical fast, including copies
     * created by stale devices under another client_session_id.
     */
    query = startedAt
      ? query.or(
          `client_session_id.eq.${id},started_at.eq.${startedAt}`
        )
      : query.eq(
          'client_session_id',
          id
        )

    const { error } = await query

    if (error) {
      throw error
    }

    await refresh()
  }

  window.dispatchEvent(
    new CustomEvent(
      'fitlife:fasting-deleted',
      {
        detail: {
          id,
          started_at: startedAt,
        },
      }
    )
  )

  return true
}

function queuePush() {
  clearTimeout(pushTimer)

  pushTimer = setTimeout(
    () =>
      upload().catch(error =>
        console.error(
          '[Fasting sync] upload failed',
          error
        )
      ),
    250
  )
}

function subscribe() {
  if (!supabase || !userId) {
    return
  }

  if (channel) {
    supabase.removeChannel(channel)
  }

  channel = supabase
    .channel(
      `fasting:${userId}:${crypto.randomUUID()}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'fasting_sessions',
        filter:
          `user_id=eq.${userId}`,
      },
      () =>
        refresh().catch(error =>
          console.error(
            '[Fasting sync] realtime refresh failed',
            error
          )
        )
    )
    .subscribe()
}

async function connect(session) {
  userId =
    session?.user?.id || null

  if (!userId) {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }

    return
  }

  await refresh()
  subscribe()
}

export async function startFastingSync() {
  if (!supabase) {
    return
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  await connect(session)

  if (!authSubscription) {
    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, nextSession) => {
          setTimeout(
            () =>
              connect(nextSession)
                .catch(error =>
                  console.error(
                    '[Fasting sync] auth refresh failed',
                    error
                  )
                ),
            0
          )
        }
      )

    authSubscription = subscription
  }
}

localStorage.setItem = (
  key,
  value
) => {
  nativeSetItem(key, value)

  if (
    !applyingRemote &&
    KEYS.includes(key)
  ) {
    queuePush()
  }
}

window.addEventListener(
  'focus',
  () =>
    refresh().catch(console.error)
)

document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.visibilityState ===
      'visible'
    ) {
      refresh().catch(console.error)
    }
  }
)

window.addEventListener(
  'online',
  () =>
    refresh().catch(console.error)
)

window.fitlifeFastingSync = {
  start: startFastingSync,
  push: upload,
  refresh,
  download,
  remove,
  local: localRows,
  deviceId,
}

startFastingSync().catch(error =>
  console.error(
    '[Fasting sync] startup failed',
    error
  )
)
