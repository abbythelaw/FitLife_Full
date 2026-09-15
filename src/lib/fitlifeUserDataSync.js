
import {supabase} from './supabaseClient'
const TABLE='fitlife_user_data'
const KEYS=[
 'fitlife-nutrition-daily',
 'fitlife-fasting-local-readings','fitlife-fasting-metric-mapping',
 'fitlife-health-defs-v2','fitlife-health-readings-v2','fitlife-profile','fitlife-settings'
]
const parse=(raw,fallback)=>{try{return JSON.parse(raw)??fallback}catch{return fallback}}
const itemId=(row,index)=>String(row?.id||row?.client_session_id||row?.date||row?.metric_id||index)
function mergeValue(localValue,remoteValue){
 if(Array.isArray(localValue)||Array.isArray(remoteValue)){
  const map=new Map()
  ;[...(remoteValue||[]),...(localValue||[])].forEach((row,index)=>{
   const id=itemId(row,index),prev=map.get(id)
   if(!prev||String(row?.updated_at||'')>=String(prev?.updated_at||''))map.set(id,row)
  })
  return [...map.values()]
 }
 return {...(remoteValue||{}),...(localValue||{})}
}
async function upload(userId,key,value){
 const {error}=await supabase.from(TABLE).upsert({user_id:userId,data_key:key,data:value,updated_at:new Date().toISOString()},{onConflict:'user_id,data_key'})
 if(error)throw error
}
export async function hydrateFitLifeUserData(){
 if(!supabase)return
 const {data:{user}}=await supabase.auth.getUser()
 if(!user)return
 const {data,error}=await supabase.from(TABLE).select('data_key,data,updated_at').eq('user_id',user.id)
 if(error){console.error('FitLife sync download failed',error);return}
 const remote=new Map((data||[]).map(row=>[row.data_key,row.data]))
 for(const key of KEYS){
  const fallback=key.includes('mapping')||key.includes('profile')||key.includes('settings')?{}:[]
  const local=parse(localStorage.getItem(key),fallback)
  const merged=mergeValue(local,remote.get(key))
  localStorage.setItem(key,JSON.stringify(merged))
  await upload(user.id,key,merged)
 }
 localStorage.setItem(`fitlife-cloud-migrated:${user.id}`,'true')
 window.dispatchEvent(new CustomEvent('fitlife:user-data-hydrated'))
 window.dispatchEvent(new CustomEvent('fitlife:nutrition-changed'))
 window.dispatchEvent(new CustomEvent('fitlife:fasting-synced'))
 window.dispatchEvent(new CustomEvent('fitlife:health-readings-changed'))
}
let timer
export async function queueFitLifeUserDataSync(){
 clearTimeout(timer)
 timer=setTimeout(async()=>{
  if(!supabase)return
  const {data:{user}}=await supabase.auth.getUser();if(!user)return
  for(const key of KEYS){const raw=localStorage.getItem(key);if(raw!=null)await upload(user.id,key,parse(raw,[]))}
  window.dispatchEvent(new CustomEvent('fitlife:cloud-sync-complete'))
 },450)
}
export function startFitLifeUserDataSync(){
 if(!supabase)return()=>{}
 hydrateFitLifeUserData()
 const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(session?.user)hydrateFitLifeUserData()})
 const events=['fitlife:nutrition-changed','fitlife:fasting-changed','fitlife:health-readings-changed','fitlife:fasting-local-readings-changed','fitlife:metric-mapping-changed']
 events.forEach(name=>window.addEventListener(name,queueFitLifeUserDataSync))
 return()=>{subscription?.unsubscribe();events.forEach(name=>window.removeEventListener(name,queueFitLifeUserDataSync))}
}
