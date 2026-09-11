import { supabase } from '../../src/lib/supabaseClient'
const TOMBSTONES='fitlife-tombstones-v1'
const DEMO_FLAGS=['is_demo','is_dummy','is_sample','demo','dummy','sample']
const read=(k,f=[])=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v))
export const isDemo=row=>!!row&&DEMO_FLAGS.some(k=>row[k]===true)||String(row?.id||'').startsWith('demo-')
export function removeDemoData(){for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);const v=read(k,null);if(Array.isArray(v))write(k,v.filter(x=>!isDemo(x)));else if(v&&typeof v==='object'&&isDemo(v))localStorage.removeItem(k)}window.dispatchEvent(new CustomEvent('fitlife:data-changed',{detail:{reason:'demo-cleared'}}))}
export function tombstone(type,id){const rows=read(TOMBSTONES,[]);write(TOMBSTONES,[{type,id,deleted_at:new Date().toISOString()},...rows.filter(x=>!(x.type===type&&x.id===id))])}
export function applyTombstones(type,rows=[]){const gone=new Set(read(TOMBSTONES,[]).filter(x=>x.type===type).map(x=>String(x.id)));return rows.filter(x=>!gone.has(String(x.id))&&!x.deleted_at&&!isDemo(x))}
export async function deleteEverywhere({table,type,id,localKeys=[]}){if(!id)throw new Error('Record id is required');tombstone(type,id);for(const key of localKeys)write(key,applyTombstones(type,read(key,[])).filter(x=>String(x.id)!==String(id)));if(supabase){const {error}=await supabase.from(table).update({deleted_at:new Date().toISOString()}).eq('id',id);if(error)throw error}window.dispatchEvent(new CustomEvent('fitlife:record-deleted',{detail:{type,id}}));window.dispatchEvent(new CustomEvent('fitlife:data-changed',{detail:{type,id}}))}
export function formatForViewport(date=new Date()){const w=innerWidth;return new Intl.DateTimeFormat('en-GB',w<=650?{day:'2-digit',month:'2-digit',year:'2-digit'}:w<=1050?{day:'2-digit',month:'short',year:'2-digit'}:{day:'2-digit',month:'short',year:'numeric'}).format(date)}
export function installProductionBridge(){window.fitlifeProduction={removeDemoData,deleteEverywhere,formatForViewport,applyTombstones};addEventListener('focus',()=>dispatchEvent(new CustomEvent('fitlife:sync-requested')));addEventListener('online',()=>dispatchEvent(new CustomEvent('fitlife:sync-requested')))}
