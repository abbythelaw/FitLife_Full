import { supabase } from './supabaseClient'

const KEYS=['fitlife-fasting-sessions-v4','fitlife-fasting-sessions']
const DEVICE_KEY='fitlife-device-id'
const TOMBSTONE_KEY='fitlife-fasting-deleted-ids'
const deviceId=localStorage.getItem(DEVICE_KEY)||crypto.randomUUID()
localStorage.setItem(DEVICE_KEY,deviceId)

let userId=null
let channel=null
let applyingRemote=false
let pushTimer=null
let authSubscription=null
const nativeSetItem=localStorage.setItem.bind(localStorage)

const parse=(raw,fallback=[])=>{try{return JSON.parse(raw)??fallback}catch{return fallback}}
const idOf=row=>String(row?.id||row?.session_id||row?.client_session_id||row?.started_at||'')
const startOf=row=>row?.started_at||row?.start_time||row?.startedAt||row?.start
const endOf=row=>row?.ended_at||row?.end_time||row?.endedAt||row?.end||null
const statusOf=row=>endOf(row)||row?.status==='ended'?'completed':row?.status||'active'
const tombstones=()=>new Set(parse(localStorage.getItem(TOMBSTONE_KEY),[]).map(String))
const saveTombstones=set=>nativeSetItem(TOMBSTONE_KEY,JSON.stringify([...set]))

function localRows(){
  const deleted=tombstones()
  const map=new Map()
  for(const key of KEYS){
    for(const row of parse(localStorage.getItem(key),[])){
      const id=idOf(row)
      if(!id||deleted.has(id)||row.deleted_at)continue
      const previous=map.get(id)
      if(!previous||String(row.updated_at||'')>=String(previous.updated_at||''))map.set(id,row)
    }
  }
  return [...map.values()].sort((a,b)=>String(startOf(b)).localeCompare(String(startOf(a))))
}

function dbRow(row){
  const id=idOf(row)
  return {
    user_id:userId,
    client_session_id:id,
    started_at:startOf(row),
    ended_at:endOf(row),
    expected_end_at:row.expected_end_at||null,
    protocol:row.protocol||'Custom',
    target_hours:Number(row.target_hours||row.goal_hours||row.target||16),
    actual_hours:row.actual_hours??null,
    status:statusOf(row),
    payload:{...row,id,client_session_id:id,sync_status:'synced'},
    device_id:deviceId,
    deleted_at:null,
    updated_at:row.updated_at||new Date().toISOString()
  }
}

function appRow(row){
  const payload=row.payload||{}
  const id=payload.id||row.client_session_id||row.id
  return {
    ...payload,
    id,
    client_session_id:row.client_session_id||id,
    protocol:row.protocol||payload.protocol||'Custom',
    started_at:row.started_at,
    ended_at:row.ended_at,
    expected_end_at:row.expected_end_at||payload.expected_end_at||new Date(new Date(row.started_at).getTime()+Number(row.target_hours||16)*3600000).toISOString(),
    target_hours:Number(row.target_hours||16),
    actual_hours:row.actual_hours??payload.actual_hours,
    status:row.status,
    updated_at:row.updated_at,
    synced_at:row.updated_at,
    sync_status:'synced'
  }
}

function write(rows){
  applyingRemote=true
  const content=JSON.stringify(rows)
  for(const key of KEYS)nativeSetItem(key,content)
  applyingRemote=false
  window.dispatchEvent(new CustomEvent('fitlife:fasting-synced',{detail:{rows}}))
  window.dispatchEvent(new CustomEvent('fitlife:fasting-changed',{detail:rows}))
}

async function upload(rows=localRows()){
  if(!supabase||!userId||applyingRemote||!rows.length)return
  const {error}=await supabase.from('fasting_sessions').upsert(rows.map(dbRow),{onConflict:'user_id,client_session_id'})
  if(error)throw error
}

async function download(){
  if(!supabase||!userId)return[]
  const {data,error}=await supabase.from('fasting_sessions').select('*').eq('user_id',userId).is('deleted_at',null).order('started_at',{ascending:false})
  if(error)throw error
  const deleted=tombstones()
  return (data||[]).filter(row=>!deleted.has(String(row.client_session_id||row.id))).map(appRow)
}

async function refresh(){
  if(!userId)return[]
  const remote=await download()
  const remoteIds=new Set(remote.map(idOf))
  const pending=localRows().filter(row=>row.sync_status==='pending'&&!remoteIds.has(idOf(row)))
  if(pending.length)await upload(pending)
  const latest=pending.length?await download():remote
  write(latest)
  return latest
}

async function remove(id){
  id=String(id)
  const deleted=tombstones();deleted.add(id);saveTombstones(deleted)
  write(localRows().filter(row=>idOf(row)!==id))
  if(supabase&&userId){
    const {error}=await supabase.from('fasting_sessions').update({deleted_at:new Date().toISOString(),status:'deleted',device_id:deviceId,updated_at:new Date().toISOString()}).eq('user_id',userId).eq('client_session_id',id)
    if(error)throw error
  }
  window.dispatchEvent(new CustomEvent('fitlife:fasting-deleted',{detail:{id}}))
  return true
}

function queuePush(){clearTimeout(pushTimer);pushTimer=setTimeout(()=>upload().catch(error=>console.error('[Fasting sync] upload failed',error)),200)}
function subscribe(){
  if(channel)supabase.removeChannel(channel)
  channel=supabase.channel(`fasting-${userId}`).on('postgres_changes',{event:'*',schema:'public',table:'fasting_sessions',filter:`user_id=eq.${userId}`},()=>refresh().catch(console.error)).subscribe()
}
async function connect(session){
  userId=session?.user?.id||null
  if(!userId)return
  await refresh();subscribe()
}
export async function startFastingSync(){
  if(!supabase)return
  const {data:{session}}=await supabase.auth.getSession();await connect(session)
  if(!authSubscription){
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>setTimeout(()=>connect(next).catch(console.error),0))
    authSubscription=subscription
  }
}

localStorage.setItem=(key,value)=>{nativeSetItem(key,value);if(!applyingRemote&&KEYS.includes(key))queuePush()}
window.addEventListener('focus',()=>refresh().catch(console.error))
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh().catch(console.error)})
window.addEventListener('online',()=>refresh().catch(console.error))
window.fitlifeFastingSync={start:startFastingSync,push:upload,refresh,download,remove,local:localRows,deviceId}
startFastingSync().catch(error=>console.error('[Fasting sync] startup failed',error))
