import { supabase } from '../../lib/supabaseClient'
const requireClient=()=>{if(!supabase)throw new Error('Supabase is not configured.');return supabase}
const userId=async()=>{const{data:{user},error}=await requireClient().auth.getUser();if(error)throw error;if(!user)throw new Error('Sign in is required.');return user.id}
export function createRepository(table,{dateColumn='created_at',softDelete=true}={}){
 const active=q=>softDelete?q.is('deleted_at',null):q
 return {
  async list({from,to,order=dateColumn,ascending=false}={}){const uid=await userId();let q=active(requireClient().from(table).select('*').eq('user_id',uid));if(from)q=q.gte(dateColumn,from);if(to)q=q.lte(dateColumn,to);const{data,error}=await q.order(order,{ascending});if(error)throw error;return data||[]},
  async get(id){const uid=await userId();const{data,error}=await active(requireClient().from(table).select('*').eq('user_id',uid).eq('id',id)).single();if(error)throw error;return data},
  async save(record){const uid=await userId();const now=new Date().toISOString();const payload={...record,user_id:uid,client_updated_at:record.client_updated_at||now};delete payload.deleted_at;if(!payload.id)delete payload.id;const{data,error}=await requireClient().from(table).upsert(payload).select().single();if(error)throw error;return data},
  async remove(id){const uid=await userId();const now=new Date().toISOString();const{data,error}=softDelete?await requireClient().from(table).update({deleted_at:now,updated_at:now,client_updated_at:now}).eq('user_id',uid).eq('id',id).select().single():await requireClient().from(table).delete().eq('user_id',uid).eq('id',id).select().single();if(error)throw error;return data},
  subscribe(onChange){let disposed=false;userId().then(uid=>{if(disposed)return;const channel=requireClient().channel(`${table}:${uid}`).on('postgres_changes',{event:'*',schema:'public',table,filter:`user_id=eq.${uid}`},onChange).subscribe();this._channel=channel});return()=>{disposed=true;if(this._channel)requireClient().removeChannel(this._channel)}},
 }
}
