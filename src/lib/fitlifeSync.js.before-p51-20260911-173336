import { optimiseImage } from './imageOptimizer'
import { supabase as fitlifeSupabase } from './supabaseClient'

const SYNC_KEYS = [
  'fitlife-habits','fitlife-habit-logs','fitlife-sports-entries','fitlife-sports',
  'fitlife-fasting-sessions','fitlife-fasting-sessions-v4','fitlife-workout-history',
  'fitlife-workout-history-v3','fitlife-routines','fitlife-routines-v2','fitlife-routines-v3',
  'fitlife-health-defs','fitlife-health-defs-v2','fitlife-health-readings',
  'fitlife-log-history','fitlife-grateful-entries','fitlife-snapshot-order',
  'fitlife-snapshot-visible','fitlife-glance-selected','fitlife-glance-max',
  'fitlife-profile','fitlife-avatar'
]
const DEVICE_ID_KEY='fitlife-device-id'
const deviceId=localStorage.getItem(DEVICE_ID_KEY)||crypto.randomUUID()
localStorage.setItem(DEVICE_ID_KEY,deviceId)
let userId=null,hydrating=false,channel=null,timer=null
const nativeSet=localStorage.setItem.bind(localStorage)

function parse(value){try{return JSON.parse(value)}catch{return value}}
function serialize(value){return typeof value==='string'?value:JSON.stringify(value)}
function notify(key){window.dispatchEvent(new CustomEvent('fitlife:sync-update',{detail:{key}}))}

async function pushKey(key){
  if(!fitlifeSupabase||!userId||hydrating||!SYNC_KEYS.includes(key))return
  const raw=localStorage.getItem(key)
  const {error}=await fitlifeSupabase.from('fitlife_user_state').upsert({
    user_id:userId,state_key:key,state_value:parse(raw),device_id:deviceId,updated_at:new Date().toISOString()
  },{onConflict:'user_id,state_key'})
  if(error)console.error('[FitLife sync] push failed',key,error)
}
function queuePush(key){clearTimeout(timer);timer=setTimeout(()=>pushKey(key),250)}

async function hydrate(){
  if(!fitlifeSupabase||!userId)return
  hydrating=true
  const {data,error}=await fitlifeSupabase.from('fitlife_user_state').select('state_key,state_value,updated_at').eq('user_id',userId)
  if(error){console.error('[FitLife sync] hydrate failed',error);hydrating=false;return}
  for(const row of data||[]){nativeSet(row.state_key,serialize(row.state_value));notify(row.state_key)}
  hydrating=false
  window.dispatchEvent(new Event('fitlife:sync-ready'))
}

function subscribe(){
  if(!fitlifeSupabase||!userId)return
  if(channel)fitlifeSupabase.removeChannel(channel)
  channel=fitlifeSupabase.channel(`fitlife-state-${userId}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'fitlife_user_state',filter:`user_id=eq.${userId}`},payload=>{
      const row=payload.new
      if(!row||row.device_id===deviceId)return
      hydrating=true
      nativeSet(row.state_key,serialize(row.state_value))
      hydrating=false
      notify(row.state_key)
    }).subscribe()
}

async function dataUrlToFile(dataUrl,name){
  const response=await fetch(dataUrl);const blob=await response.blob()
  return new File([blob],name,{type:blob.type||'image/jpeg'})
}
export async function uploadFitLifeMedia(file,folder='general'){
  if(!fitlifeSupabase)throw new Error('Supabase is not configured')
  const {data:{user}}=await fitlifeSupabase.auth.getUser()
  if(!user)throw new Error('Sign in before uploading media')
  const optimised=await optimiseImage(file)
  file=optimised.file
  const ext=(file.name?.split('.').pop()||'webp').replace(/[^a-z0-9]/gi,'').toLowerCase()
  const path=`${user.id}/${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`
  const {error}=await fitlifeSupabase.storage.from('fitlife-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type})
  if(error)throw error
  return {bucket:'fitlife-media',path}
}
export async function getFitLifeMediaUrl(path,expiresIn=3600){
  const {data,error}=await fitlifeSupabase.storage.from('fitlife-media').createSignedUrl(path,expiresIn)
  if(error)throw error
  return data.signedUrl
}

async function migrateDataUrls(){
  if(!fitlifeSupabase||!userId)return
  const mediaKeys=['fitlife-sports-entries','fitlife-sports','fitlife-grateful-entries','fitlife-profile']
  for(const key of mediaKeys){
    const raw=localStorage.getItem(key);if(!raw||!raw.includes('data:image/'))continue
    let value;try{value=JSON.parse(raw)}catch{continue}
    let changed=false
    async function visit(node,trail='media'){
      if(!node||typeof node!=='object')return
      for(const [k,v] of Object.entries(node)){
        if(typeof v==='string'&&v.startsWith('data:image/')){
          const file=await dataUrlToFile(v,`${k}.jpg`)
          const uploaded=await uploadFitLifeMedia(file,trail)
          node[k]=uploaded.path
          node[`${k}_bucket`]=uploaded.bucket
          node[`${k}_storage_path`]=uploaded.path
          changed=true
        }else if(typeof v==='object')await visit(v,`${trail}/${k}`)
      }
    }
    await visit(value,key.replace('fitlife-',''))
    if(changed){nativeSet(key,JSON.stringify(value));await pushKey(key)}
  }
}

export async function startFitLifeSync(){
  if(!fitlifeSupabase){console.warn('[FitLife sync] missing VITE_SUPABASE_URL/key');return}
  const {data:{session}}=await fitlifeSupabase.auth.getSession()
  userId=session?.user?.id||null
  if(userId){await hydrate();subscribe();migrateDataUrls().catch(console.error)}
  fitlifeSupabase.auth.onAuthStateChange(async(_event,next)=>{
    userId=next?.user?.id||null
    if(userId){await hydrate();subscribe();migrateDataUrls().catch(console.error)}
    else if(channel){fitlifeSupabase.removeChannel(channel);channel=null}
  })
}

localStorage.setItem=(key,value)=>{
  nativeSet(key,value)
  if(SYNC_KEYS.includes(key))queuePush(key)
}
window.fitlifeSync={start:startFitLifeSync,pushAll:()=>Promise.all(SYNC_KEYS.map(pushKey)),uploadMedia:uploadFitLifeMedia,getMediaUrl:getFitLifeMediaUrl,deviceId}
startFitLifeSync()
