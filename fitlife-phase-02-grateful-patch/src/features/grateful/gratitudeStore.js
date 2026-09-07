import { supabase } from '../../lib/supabaseClient'

const STORAGE_KEY = 'fitlife-gratitude-entries'
const HISTORY_KEY = 'fitlife-log-history'

const seed = [
  { id:'gratitude-seed-1', title:'Tiny wins', body:'I stayed consistent, moved my body, and made time to recover.', entry_date:'2026-09-06', entry_time:'20:15', favorite:true, photos:[], sync_status:'synced', created_at:'2026-09-06T20:15:00.000Z', updated_at:'2026-09-06T20:15:00.000Z' },
  { id:'gratitude-seed-2', title:'A quiet morning', body:'Grateful for a calm start, warm coffee, and a clear plan for the day.', entry_date:'2026-09-04', entry_time:'08:10', favorite:false, photos:[], sync_status:'synced', created_at:'2026-09-04T08:10:00.000Z', updated_at:'2026-09-04T08:10:00.000Z' },
  { id:'gratitude-seed-3', title:'Support', body:'Grateful for people who make difficult weeks lighter.', entry_date:'2026-08-29', entry_time:'21:05', favorite:true, photos:[], sync_status:'synced', created_at:'2026-08-29T21:05:00.000Z', updated_at:'2026-08-29T21:05:00.000Z' },
]

function readLocal(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):seed}catch{return seed}}
function writeLocal(entries){localStorage.setItem(STORAGE_KEY,JSON.stringify(entries));window.dispatchEvent(new CustomEvent('fitlife:gratitude-changed',{detail:entries}))}
function updateHistory(entry, action='upsert'){
  let history=[];try{history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]')}catch{}
  const historyId=`gratitude:${entry.id}`
  if(action==='delete') history=history.filter(item=>item.id!==historyId)
  else {
    const item={id:historyId,source_id:entry.id,type:'Grateful',title:entry.title||'Gratitude note',date:entry.entry_date,displayDate:entry.entry_date,summary:entry.body,status:entry.sync_status||'pending'}
    history=[item,...history.filter(existing=>existing.id!==historyId)]
  }
  localStorage.setItem(HISTORY_KEY,JSON.stringify(history))
  window.dispatchEvent(new CustomEvent('fitlife:history-changed',{detail:history}))
}
async function currentUser(){if(!supabase)return null;const{data}=await supabase.auth.getUser();return data.user||null}

export async function listGratitude(){
  const user=await currentUser()
  if(user){const{data,error}=await supabase.from('gratitude_entries').select('*, gratitude_media(*)').is('deleted_at',null).order('entry_date',{ascending:false}).order('entry_time',{ascending:false});if(!error&&data){const rows=data.map(row=>({...row,photos:(row.gratitude_media||[]).map(media=>({id:media.id,path:media.storage_path,preview:null}))}));writeLocal(rows);return rows}}
  return readLocal()
}

export async function saveGratitude(entry, files=[]){
  const user=await currentUser();const now=new Date().toISOString();const row={...entry,id:entry.id||crypto.randomUUID(),updated_at:now,created_at:entry.created_at||now,sync_status:user?'syncing':navigator.onLine?'local':'offline'}
  const local=[row,...readLocal().filter(item=>item.id!==row.id)];writeLocal(local);updateHistory(row)
  if(!user)return row
  const payload={id:row.id,user_id:user.id,title:row.title||null,body:row.body,entry_date:row.entry_date,entry_time:row.entry_time,favorite:!!row.favorite,created_at:row.created_at,updated_at:row.updated_at,deleted_at:null}
  const{error}=await supabase.from('gratitude_entries').upsert(payload,{onConflict:'id'});if(error){row.sync_status='failed';writeLocal([row,...local.filter(item=>item.id!==row.id)]);return row}
  for(const file of files){const ext='webp';const path=`${user.id}/gratitude/${row.id}/${crypto.randomUUID()}.${ext}`;const{error:uploadError}=await supabase.storage.from('activity-media').upload(path,file,{contentType:file.type||'image/webp'});if(!uploadError)await supabase.from('gratitude_media').insert({user_id:user.id,gratitude_id:row.id,storage_path:path,sort_order:0})}
  row.sync_status='synced';writeLocal([row,...local.filter(item=>item.id!==row.id)]);updateHistory(row);return row
}

export async function deleteGratitude(entry){
  const remaining=readLocal().filter(item=>item.id!==entry.id);writeLocal(remaining);updateHistory(entry,'delete')
  const user=await currentUser();if(user)await supabase.from('gratitude_entries').update({deleted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',entry.id)
}

export function subscribeGratitude(onChange){
  if(!supabase)return()=>{}
  const channel=supabase.channel('gratitude-cross-device').on('postgres_changes',{event:'*',schema:'public',table:'gratitude_entries'},()=>{listGratitude().then(onChange)}).subscribe()
  return()=>{supabase.removeChannel(channel)}
}
