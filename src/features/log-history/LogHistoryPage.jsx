import { useEffect, useMemo, useState } from 'react'
import { Bike, BookHeart, CheckCircle2, ChevronDown, ChevronRight, Dumbbell, Edit3, HeartPulse, Plus, Search, Timer, Trash2, X } from 'lucide-react'
import './LogHistoryPage.css'
import './phase-03-history.css'

const starterEntries=[{id:'walk-1',type:'Habit',title:'Morning walk',date:'2026-09-06',time:'07:42',summary:'Completed · 37 minutes',status:'synced'},{id:'fast-1',type:'Fasting',title:'Fasting session',date:'2026-09-06',time:'23:45',summary:'16 hours · Target completed',status:'synced'},{id:'gratitude-1',type:'Grateful',title:'Tiny wins',date:'2026-09-06',time:'20:15',summary:'I stayed consistent and listened to my body.',status:'synced'},{id:'workout-1',type:'Workout',title:'Cycling commute',date:'2026-09-05',time:'18:20',summary:'42 min · 14.6 km · 381 kcal',status:'synced'},{id:'health-1',type:'Health',title:'Resting heart rate',date:'2026-09-05',time:'08:15',summary:'58 bpm · Within personal baseline',status:'pending'}]
const filters=['All','Fasting','Habit','Workout','Sports','Grateful','Health']
const typeIcons={Habit:CheckCircle2,Fasting:Timer,Grateful:BookHeart,Workout:Dumbbell,Sports:Bike,Health:HeartPulse}
const formatDate=value=>{const date=new Date(`${value}T12:00:00`);return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date)}
const dateKey=entry=>entry.date||entry.entry_date||'Unknown'


function normalizeHistoryEntry(entry) {
  if (
    entry.source_type !== 'health_metric_reading' &&
    entry.event_type !== 'health_metric_reading'
  ) {
    return entry
  }

  const occurredAt = entry.occurred_at || ''
  const date =
    entry.record_date ||
    entry.local_date ||
    occurredAt.slice(0, 10)

  const timeMatch = occurredAt.match(/T(\d{2}:\d{2})/)

  return {
    ...entry,
    type: 'Health',
    date,
    time: entry.time || timeMatch?.[1] || '12:00',
    displayDate: date,
    title: entry.title || 'Health metric',
    summary:
      entry.summary ||
      `${entry.value ?? '—'} ${entry.unit || ''}` +
        `${entry.status ? ` · ${entry.status}` : ''}`,
    status: entry.sync_status || entry.status_sync || 'synced',
  }
}

function readHistoryEntries() {
  try {
    const rows = JSON.parse(
      localStorage.getItem('fitlife-log-history') || '[]'
    )

    return Array.isArray(rows)
      ? rows.map(normalizeHistoryEntry)
      : []
  } catch {
    return []
  }
}

export default function LogHistoryPage(){
 const[entries,setEntries]=useState(()=>{const rows=readHistoryEntries();return rows.length?rows:starterEntries.map(normalizeHistoryEntry)}),[filter,setFilter]=useState('All'),[search,setSearch]=useState(''),[editing,setEditing]=useState(null),[deleting,setDeleting]=useState(null),[collapsed,setCollapsed]=useState({}),[addingDate,setAddingDate]=useState(null)

 useEffect(()=>{
   const refresh=()=>{
     setEntries(readHistoryEntries())
   }

   window.addEventListener(
     'fitlife:log-history-changed',
     refresh
   )
   window.addEventListener(
     'fitlife:health-readings-changed',
     refresh
   )
   window.addEventListener(
     'storage',
     refresh
   )

   return ()=>{
     window.removeEventListener(
       'fitlife:log-history-changed',
       refresh
     )
     window.removeEventListener(
       'fitlife:health-readings-changed',
       refresh
     )
     window.removeEventListener(
       'storage',
       refresh
     )
   }
 },[])

 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return entries.filter(e=>(filter==='All'||e.type===filter)&&(!q||e.title.toLowerCase().includes(q)||(e.summary||'').toLowerCase().includes(q))).sort((a,b)=>`${dateKey(b)} ${b.time||''}`.localeCompare(`${dateKey(a)} ${a.time||''}`))},[entries,filter,search])
 const groups=useMemo(()=>visible.reduce((all,e)=>{const key=dateKey(e);(all[key]??=[]).push(e);return all},{}),[visible])
 function persist(next){const normalized=next.map(normalizeHistoryEntry);setEntries(normalized);localStorage.setItem('fitlife-log-history',JSON.stringify(normalized))}
 function saveEdit(e){e.preventDefault();persist(entries.map(row=>row.id===editing.id?{...editing,status:navigator.onLine?'pending':'offline'}:row));setEditing(null)}
 function confirmDelete(){persist(entries.filter(row=>row.id!==deleting.id));setDeleting(null)}
 function chooseType(type,date){setAddingDate(null);if(type==='Sports'){location.hash='sports';window.dispatchEvent(new CustomEvent('fitlife:add-sports',{detail:{date}}))}else if(type==='Grateful'){location.hash='grateful';window.dispatchEvent(new CustomEvent('fitlife:add-gratitude',{detail:{date}}))}else alert(`${type} form will use ${formatDate(date)} when its source tab is completed.`)}
 const priorDates=Array.from({length:10},(_,i)=>{const d=new Date();d.setDate(d.getDate()-i);return d.toISOString().slice(0,10)})
 return <section className="history-page"><div className="history-heading"><div><small>YOUR RECORDED TIMELINE</small><h2>Log History</h2><p>Review, correct, or backdate FitLife entries.</p></div><label className="history-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records"/></label></div><div className="history-filters">{filters.map(item=><button key={item} className={filter===item?'selected':''} onClick={()=>setFilter(item)}>{item}</button>)}</div><div className="history-list">
 {priorDates.map(date=>{const rows=groups[date]||[];if(rows.length===0)return <button className="history-empty-date" key={date} onClick={()=>setAddingDate(date)}><Plus/><b>{formatDate(date)}</b><span>No entries</span><small>Click to add a backdated entry</small></button>;const isCollapsed=collapsed[date];const pending=rows.filter(row=>row.status==='pending'||row.status==='offline').length;return <section className="history-date-group" key={date}><header><button onClick={()=>setCollapsed({...collapsed,[date]:!isCollapsed})}>{isCollapsed?<ChevronRight/>:<ChevronDown/>}</button><div><h3>{formatDate(date)}</h3><span>{rows.length} {rows.length===1?'entry':'entries'}{pending?` · ${pending} waiting to sync`:''}</span></div><button className="history-add-date" onClick={()=>setAddingDate(date)}><Plus/>Add</button></header>{!isCollapsed&&rows.map(entry=>{const Icon=typeIcons[entry.type]||Dumbbell;return <article className="history-entry" key={entry.id}><div className={`history-entry-icon history-${entry.type.toLowerCase()}`}><Icon size={19}/></div><div className="history-entry-content"><div className="history-title-row"><h3>{entry.title}</h3><span>{entry.type}</span></div><p>{entry.summary}</p><div className="history-meta"><time>{entry.time||'—'}</time><span className={`history-status ${entry.status}`}>{entry.status==='synced'?'Synced':entry.status==='pending'?'Waiting to sync':'Saved offline'}</span></div></div><div className="history-actions"><button onClick={()=>setEditing(entry)}><Edit3/>Edit</button><button className="delete" onClick={()=>setDeleting(entry)}><Trash2/>Delete</button></div></article>})}</section>})}
 </div>{editing&&<div className="history-overlay"><button className="history-backdrop" onClick={()=>setEditing(null)}/><aside className="history-drawer"><div className="history-drawer-heading"><div><small>EDIT LOG ENTRY</small><h2>{editing.title}</h2></div><button onClick={()=>setEditing(null)}><X/></button></div><form onSubmit={saveEdit}><label>Title<input value={editing.title} onChange={e=>setEditing({...editing,title:e.target.value})}/></label><label>Summary<textarea value={editing.summary} onChange={e=>setEditing({...editing,summary:e.target.value})}/></label><div className="history-form-actions"><button type="button" onClick={()=>setEditing(null)}>Cancel</button><button className="history-save">Save changes</button></div></form></aside></div>}{deleting&&<div className="history-overlay"><button className="history-backdrop" onClick={()=>setDeleting(null)}/><section className="history-delete-dialog"><div className="history-delete-icon"><Trash2/></div><h2>Delete “{deleting.title}”?</h2><p>This removes the source record from every connected FitLife view.</p><div className="history-form-actions"><button onClick={()=>setDeleting(null)}>Cancel</button><button className="history-confirm-delete" onClick={confirmDelete}>Delete entry</button></div></section></div>}{addingDate&&<div className="history-overlay"><button className="history-backdrop" onClick={()=>setAddingDate(null)}/><section className="history-type-chooser"><small>ADD A BACKDATED ENTRY</small><h2>{formatDate(addingDate)}</h2><p>Choose the source form. The selected date will be carried into that form.</p><div>{['Habit','Health','Sports','Workout','Fasting','Grateful'].map(type=><button key={type} onClick={()=>chooseType(type,addingDate)}>{type}</button>)}</div></section></div>}</section>
}
