import { supabase } from '../../lib/supabaseClient'
import { dataUrlToBlob } from '../media/imagePersistence'
const KEY='fitlife-sports-entries',HISTORY='fitlife-log-history'
const seed=[{id:'sport-1',category:'Cycling',title:'Cycling Commute',entry_date:'2026-09-06',start_time:'17:38',end_time:'18:20',duration_minutes:42,distance_km:14.6,pace_min_km:2.9,calories:381,average_hr:142,max_hr:168,rpe:6,notes:'Steady commute through the city.',photos:[],featured_index:0,position_x:50,position_y:50,sync_status:'synced'},{id:'sport-2',category:'Swimming',title:'Sunday Class Swim',entry_date:'2026-09-04',start_time:'10:00',end_time:'10:42',duration_minutes:42,distance_km:.7,calories:250,average_hr:134,max_hr:154,rpe:5,notes:'Technique-focused pool session.',photos:[],featured_index:0,position_x:50,position_y:50,sync_status:'synced'}]
const safeRows=rows=>rows.map(row=>({...row,photos:(row.photos||[]).filter(photo=>{const source=photo?.signed_url||photo?.url||photo?.data_url||photo?.preview;return source&&!source.startsWith('blob:')})}))
const read=()=>{try{const raw=JSON.parse(localStorage.getItem(KEY));return safeRows(raw||seed)}catch{return seed}}
const write = rows => {
  let safe = safeRows(rows)

  try {
    localStorage.setItem(KEY, JSON.stringify(safe))
  } catch (error) {
    console.warn(
      '[Sports] Local storage quota reached. Retrying without embedded photos.',
      error
    )

    safe = safe.map(row => ({
      ...row,
      photos: (row.photos || []).filter(photo =>
        photo?.signed_url ||
        photo?.url ||
        photo?.storage_path ||
        photo?.path
      )
    }))

    try {
      localStorage.setItem(KEY, JSON.stringify(safe))
    } catch (retryError) {
      console.error(
        '[Sports] Unable to cache sports entries locally:',
        retryError
      )
    }
  }

  window.dispatchEvent(
    new CustomEvent('fitlife:sports-changed', {
      detail: safe
    })
  )

  return safe
}
function history(row,remove=false){let rows=[];try{rows=JSON.parse(localStorage.getItem(HISTORY)||'[]')}catch{}const id=`sports:${row.id}`;rows=rows.filter(x=>x.id!==id);if(!remove)rows.unshift({id,source_id:row.id,type:'Sports',title:row.title,date:row.entry_date,time:row.start_time,displayDate:row.entry_date,summary:`${row.duration_minutes||0} min · ${row.distance_km||0} km · ${row.calories||0} kcal`,status:row.sync_status||'pending'});localStorage.setItem(HISTORY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('fitlife:history-changed',{detail:rows}))}
async function user(){if(!supabase)return null;const{data}=await supabase.auth.getUser();return data.user||null}
async function signedMedia(media) {
  if (!supabase) return []

  const output = []

  const sorted = [...(media || [])].sort(
    (a, b) =>
      Number(a.sort_order || 0) -
      Number(b.sort_order || 0)
  )

  for (const item of sorted) {
    const {data, error} = await supabase.storage
      .from('activity-media')
      .createSignedUrl(
        item.storage_path,
        60 * 60 * 12
      )

    if (!error && data?.signedUrl) {
      output.push({
        id: item.id,
        path: item.storage_path,
        storage_path: item.storage_path,
        signed_url: data.signedUrl,
        url: data.signedUrl,
        is_featured: Boolean(item.is_featured),
        sort_order: Number(item.sort_order || 0),
        position_x: Number(item.position_x ?? 50),
        position_y: Number(item.position_y ?? 50),
        crop_scale: Number(item.crop_scale ?? 1)
      })
    }
  }

  return output
}
export async function listSports(){const u=await user();if(u){const{data,error}=await supabase.from('sports_entries').select('*, sports_media(*)').is('deleted_at',null).order('entry_date',{ascending:false});if (!error && data) {
    const rows = []

    for (const row of data) {
      const photos = await signedMedia(row.sports_media)

      const featuredIndex = Math.max(
        0,
        photos.findIndex(photo => photo.is_featured)
      )

      const featuredPhoto =
        photos[featuredIndex] ||
        photos[0] ||
        null

      rows.push({
        ...row,
        photos,
        featured_index: featuredIndex,
        position_x:
          featuredPhoto?.position_x ??
          row.position_x ??
          50,
        position_y:
          featuredPhoto?.position_y ??
          row.position_y ??
          50,
        crop_scale:
          featuredPhoto?.crop_scale ??
          1
      })
    }

    write(rows)
    return rows
  }}return read()}
export async function saveSport(entry, media = {}) {
  const u = await user()

  const suppliedPhotos = Array.isArray(media.photos)
    ? media.photos
    : Array.isArray(entry.photos)
      ? entry.photos
      : []

  const localPhotos = suppliedPhotos
    .filter(photo =>
      photo?.data_url ||
      photo?.signed_url ||
      photo?.url ||
      photo?.preview
    )
    .map((photo, index) => ({
      ...photo,
      id: photo.id || crypto.randomUUID(),
      sort_order: index,
      position_x: photo.position_x ?? media.positionX ?? 50,
      position_y: photo.position_y ?? media.positionY ?? 50,
      crop_scale: photo.crop_scale ?? 1
    }))

  const row = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    photos: localPhotos,
    featured_index: Math.min(
      Number(media.featured || 0),
      Math.max(0, localPhotos.length - 1)
    ),
    position_x:
      localPhotos[Number(media.featured || 0)]?.position_x ??
      media.positionX ??
      entry.position_x ??
      50,
    position_y:
      localPhotos[Number(media.featured || 0)]?.position_y ??
      media.positionY ??
      entry.position_y ??
      50,
    sync_status: u
      ? 'syncing'
      : navigator.onLine
        ? 'local'
        : 'offline',
    updated_at: new Date().toISOString()
  }

  let rows = [
    row,
    ...read().filter(existing => existing.id !== row.id)
  ]

  /*
   * Embedded photo data can exceed localStorage limits.
   * Signed-in users upload photos before the final local cache write.
   */
  if (!u) {
    write(rows)
    history(row)
    return row
  }

  const cacheRow = {
    ...row,
    photos: localPhotos.filter(photo =>
      photo?.signed_url ||
      photo?.url ||
      photo?.storage_path ||
      photo?.path ||
      photo?.data_url
    )
  }

  write([
    cacheRow,
    ...read().filter(existing => existing.id !== row.id)
  ])

  history(cacheRow)

  const payload = {
    id: row.id,
    user_id: u.id,
    category: row.category,
    title: row.title,
    entry_date: row.entry_date,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_minutes: Math.max(
      1,
      Math.round(Number(row.duration_minutes || 0))
    ),
    distance_km: row.distance_km,
    pace_min_km: row.pace_min_km,
    calories: row.calories,
    average_hr: row.average_hr,
    max_hr: row.max_hr,
    rpe: row.rpe,
    notes: row.notes,
    featured_index: row.featured_index,
    position_x: row.position_x,
    position_y: row.position_y,
    updated_at: row.updated_at,
    deleted_at: null
  }

  const {error: entryError} = await supabase
    .from('sports_entries')
    .upsert(payload, {onConflict: 'id'})

  if (entryError) {
    console.error(
      '[Sports] Entry sync failed:',
      JSON.stringify(entryError, null, 2),
      entryError
    )

    row.sync_status = 'failed'
    row.sync_error = entryError.message

    write([
      row,
      ...rows.filter(existing => existing.id !== row.id)
    ])

    history(row)
    return row
  }

  const existingRemotePhotos = localPhotos.filter(photo =>
    photo.signed_url || photo.url
  )

  const newPhotos = localPhotos.filter(photo =>
    typeof photo.data_url === 'string' &&
    photo.data_url.startsWith('data:image/')
  )

  let photoSyncFailed = false
  const savedPhotos = [...existingRemotePhotos]

  // Only replace remote media after the activity itself has saved.
  if (newPhotos.length > 0) {
    const {error: deleteMediaError} = await supabase
      .from('sports_media')
      .delete()
      .eq('sports_id', row.id)

    if (deleteMediaError) {
      console.warn(
        '[Sports] Existing media cleanup failed:',
        deleteMediaError
      )
    }

    for (let index = 0; index < newPhotos.length; index += 1) {
      const photo = newPhotos[index]

      try {
        const blob = await dataUrlToBlob(photo.data_url)

        const photoId = photo.id || crypto.randomUUID()
        const storagePath =
          `${u.id}/sports/${row.id}/${photoId}.webp`

        const {error: uploadError} = await supabase.storage
          .from('activity-media')
          .upload(storagePath, blob, {
            contentType: 'image/webp',
            upsert: true
          })

        if (uploadError) {
          photoSyncFailed = true
          console.error(
            '[Sports] Photo upload failed:',
            uploadError
          )
          continue
        }

        const {data: signed, error: signedError} =
          await supabase.storage
            .from('activity-media')
            .createSignedUrl(storagePath, 60 * 60 * 12)

        /*
         * Preserve every successfully uploaded Storage object immediately.
         * The photo remains visible even if sports_media metadata fails.
         */
        const savedPhoto = {
          id: photoId,
          path: storagePath,
          storage_path: storagePath,
          signed_url: signed?.signedUrl || null,
          url: signed?.signedUrl || null,
          preview: signed?.signedUrl || photo.data_url,
          is_featured: index === row.featured_index,
          sort_order: index,
          position_x: photo.position_x ?? row.position_x,
          position_y: photo.position_y ?? row.position_y,
          crop_scale: photo.crop_scale ?? 1
        }

        savedPhotos.push(savedPhoto)

        if (signedError) {
          console.warn(
            '[Sports] Signed photo URL creation failed:',
            signedError
          )
        }

        /*
         * Save metadata separately. Do not discard the uploaded image
         * when the metadata table rejects an optional column.
         */
        const metadataBase = {
          user_id: u.id,
          sports_id: row.id,
          storage_path: storagePath,
          sort_order: index,
          is_featured: index === row.featured_index
        }

        let {data: mediaRow, error: mediaError} = await supabase
          .from('sports_media')
          .insert({
            ...metadataBase,
            position_x: savedPhoto.position_x,
            position_y: savedPhoto.position_y,
            crop_scale: savedPhoto.crop_scale
          })
          .select()
          .single()

        /*
         * Retry using only the known core columns if the table does not
         * contain position_x or position_y.
         */
        if (mediaError) {
          console.warn(
            '[Sports] Retrying photo metadata with core columns:',
            mediaError
          )

          const retry = await supabase
            .from('sports_media')
            .insert(metadataBase)
            .select()
            .single()

          mediaRow = retry.data
          mediaError = retry.error
        }

        if (mediaError) {
          photoSyncFailed = true
          console.error(
            '[Sports] Photo metadata save failed after retry:',
            mediaError
          )
        } else if (mediaRow?.id) {
          savedPhoto.id = mediaRow.id
        }
      } catch (error) {
        photoSyncFailed = true
        console.error('[Sports] Photo processing failed:', error)
      }
    }
  }

  row.sync_status = photoSyncFailed
    ? 'photo-sync-failed'
    : 'synced'

  /*
   * Retain local data URLs until signed URLs exist. This prevents the
   * saved activity from disappearing when a photo upload fails.
   */
  row.photos = savedPhotos.length
    ? savedPhotos
    : localPhotos

  const latestRows = [
    row,
    ...read().filter(existing => existing.id !== row.id)
  ]

  write(latestRows)
  history(row)

  return row
}

export async function deleteSport(row){write(read().filter(x=>x.id!==row.id));history(row,true);const u=await user();if(u)await supabase.from('sports_entries').update({deleted_at:new Date().toISOString()}).eq('id',row.id)}
export function subscribeSports(cb){if(!supabase)return()=>{};const ch=supabase.channel('sports-cross-device').on('postgres_changes',{event:'*',schema:'public',table:'sports_entries'},()=>listSports().then(cb)).subscribe();return()=>supabase.removeChannel(ch)}
