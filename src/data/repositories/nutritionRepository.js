import {supabase} from '../../lib/supabaseClient'
const legacyKey='fitlife-nutrition-daily'
const user=async()=>{const{data:{user},error}=await supabase.auth.getUser();if(error)throw error;if(!user)throw new Error('Sign in is required.');return user}
const clean=row=>Object.fromEntries(Object.entries(row).filter(([,v])=>v!==undefined))
export const nutritionRepository={
 async list({from,to}={}){const u=await user();let q=supabase.from('fitlife_nutrition_days').select('*').eq('user_id',u.id).is('deleted_at',null).order('record_date',{ascending:false});if(from)q=q.gte('record_date',from);if(to)q=q.lte('record_date',to);const{data,error}=await q;if(error)throw error;return data||[]},
 async save(row){const u=await user();const payload=clean({...row,user_id:u.id,record_date:row.record_date||row.date,carbohydrates_g:row.carbohydrates_g??row.carbs_g,source_type:row.source_type||row.source||'manual',deleted_at:null});delete payload.date;delete payload.carbs_g;delete payload.source;const{data,error}=await supabase.from('fitlife_nutrition_days').upsert(payload,{onConflict:payload.id?'id':'user_id,record_date,source_type'}).select().single();if(error)throw error;return data},
 async remove(id){const u=await user();const{error}=await supabase.from('fitlife_nutrition_days').update({deleted_at:new Date().toISOString()}).eq('user_id',u.id).eq('id',id);if(error)throw error},
 async migrateLegacy(){const u=await user();if(localStorage.getItem('fitlife-nutrition-canonical-migrated')==='yes')return{migrated:0};let rows=[];try{rows=JSON.parse(localStorage.getItem(legacyKey)||'[]')}catch{};let migrated=0;for(const x of rows){if(!x?.date)continue;const payload={user_id:u.id,record_date:x.date,calories:Number(x.calories)||null,protein_g:Number(x.protein_g)||null,carbohydrates_g:Number(x.carbs_g)||null,fat_g:Number(x.fat_g)||null,fibre_g:Number(x.fiber_g)||null,sugar_g:Number(x.sugar_g)||null,completeness:String(x.completeness||'complete').toLowerCase().startsWith('partial')?'partial':'complete',notes:x.notes||null,source_type:'legacy_fasting',legacy_source_id:String(x.id||`nutrition:${x.date}`),metadata:{migrated_from:legacyKey,original_source:x.source||'Manual'}};const{error}=await supabase.from('fitlife_nutrition_days').upsert(payload,{onConflict:'user_id,record_date,source_type'});if(error)throw error;migrated++}localStorage.setItem('fitlife-nutrition-canonical-migrated','yes');localStorage.setItem('fitlife-nutrition-daily-readonly-backup',JSON.stringify(rows));return{migrated}},
subscribe(fn) {
  let channel = null
  let cancelled = false

  const channelId = [
    'nutrition-full',
    Date.now(),
    Math.random().toString(36).slice(2),
  ].join(':')

  user()
    .then(currentUser => {
      if (cancelled) return

      channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'fitlife_nutrition_days',
            filter: `user_id=eq.${currentUser.id}`,
          },
          fn
        )
        .subscribe()
    })
    .catch(error => {
      if (!cancelled) {
        console.error(
          '[Nutrition Realtime] Subscription failed:',
          error
        )
      }
    })

  return () => {
    cancelled = true

    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }
 }
}
