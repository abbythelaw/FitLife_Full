import { useEffect,useMemo,useState } from 'react'
import { Bike,BookHeart,CalendarDays,CheckCircle2,ChevronLeft,ChevronRight,Dumbbell,HeartPulse,Plus,Timer,Trash2,Edit3,X } from 'lucide-react'
import './MyLifePage.css'
const fallbackEvents=[
 {id:1,date:'2026-09-07',time:'08:15',type:'Habit',title:'Morning walk',summary:'37 minutes · Target exceeded'},
 {id:2,date:'2026-09-07',time:'18:20',type:'Sports',title:'Cycling Commute',summary:'42 min · 14.6 km · 381 kcal'},
 {id:3,date:'2026-09-07',time:'20:15',type:'Grateful',title:'Tiny wins',summary:'Gratitude note added'},
 {id:4,date:'2026-09-06',time:'23:45',type:'Fasting',title:'16-hour fast',summary:'Target completed'},
 {id:5,date:'2026-09-06',time:'17:10',type:'Workout',title:'Lower Body Power',summary:'54 min · 11 sets'},
 {id:6,date:'2026-09-06',time:'08:00',type:'Health',title:'Resting heart rate',summary:'61 bpm · In range'}
]
const icons={Habit:CheckCircle2,Sports:Bike,Grateful:BookHeart,Fasting:Timer,Workout:Dumbbell,Health:HeartPulse}
const key=d=>[
  d.getFullYear(),
  String(d.getMonth()+1).padStart(2,'0'),
  String(d.getDate()).padStart(2,'0')
].join('-')

function normalizeLifeEvent(entry) {
  const occurredAt = entry.occurred_at || ''
  const date =
    entry.date ||
    entry.entry_date ||
    entry.record_date ||
    entry.local_date ||
    occurredAt.slice(0, 10)

  const timeFromTimestamp =
    occurredAt.match(/T(\d{2}:\d{2})/)?.[1]

  const type =
    entry.type ||
    (
      entry.source_type === 'health_metric_reading'
        ? 'Health'
        : entry.event_type === 'health_metric_reading'
          ? 'Health'
          : 'Health'
    )

  return {
    ...entry,
    id:
      entry.id ||
      `${type}:${entry.source_id || crypto.randomUUID()}`,
    type,
    date,
    time: String(
      entry.time ||
      timeFromTimestamp ||
      '12:00'
    ).slice(0, 5),
    title: entry.title || 'Recorded entry',
    summary:
      entry.summary ||
      `${entry.value ?? '—'} ${entry.unit || ''}` +
        `${entry.status ? ` · ${entry.status}` : ''}`,
  }
}

function readLifeEvents() {
  try {
    const rows = JSON.parse(
      localStorage.getItem('fitlife-log-history') || '[]'
    )

    if (!Array.isArray(rows)) return []

    const seen = new Set()

    return rows
      .map(normalizeLifeEvent)
      .filter((entry) => {
        if (!entry.date) return false

        const identity =
          entry.source_id ||
          entry.id ||
          [
            entry.type,
            entry.date,
            entry.time,
            entry.title,
          ].join('|')

        if (seen.has(identity)) return false

        seen.add(identity)
        return true
      })
  } catch {
    return []
  }
}

export default function MyLifePage(){
 const today=new Date()
 const[events,setEvents]=useState(()=>{
   const rows=readLifeEvents()
   return rows.length?rows:fallbackEvents
 })
 const[month,setMonth]=useState(
   new Date(today.getFullYear(),today.getMonth(),1)
 )
 const[selected,setSelected]=useState(key(today))
 const[detail,setDetail]=useState(null)
 const[deleting,setDeleting]=useState(null)

 useEffect(()=>{
   const refresh=()=>{
     const rows=readLifeEvents()
     setEvents(rows)
   }

   window.addEventListener(
     'fitlife:log-history-changed',
     refresh
   )
   window.addEventListener(
     'fitlife:history-changed',
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
       'fitlife:history-changed',
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
const first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first);start.setDate(1-((first.getDay()+6)%7));const days=Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d});const filtered=events.filter(e=>e.date===selected);return <section className="life-page"><header><div><small>UNIFIED CALENDAR</small><h2>My Life</h2><p>Every health, habit, fast, sport, workout, and gratitude record in context.</p></div><button><Plus/>Log day</button></header><div className="life-layout"><section className="life-calendar"><header><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}><ChevronLeft/></button><h3>{new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(month)}</h3><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}><ChevronRight/></button></header><div className="life-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=><span key={x}>{x}</span>)}</div><div className="life-calendar-grid">{days.map(d=>{const rows=events.filter(e=>e.date===key(d));return <button className={`${selected===key(d)?'selected':''} ${d.getMonth()!==month.getMonth()?'outside':''}`} onClick={()=>setSelected(key(d))} key={key(d)}><b>{d.getDate()}</b><div>{rows.slice(0,6).map(row=><i className={row.type.toLowerCase()} key={row.id}/>)}</div></button>})}</div></section><aside className="life-day"><header><small>SELECTED DAY</small><h3>{new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${selected}T12:00`))}</h3><span>{filtered.length} entries</span></header>{filtered.length===0?<button className="empty-day"><Plus/>Add an entry</button>:<div className="life-timeline">{filtered.sort((a,b)=>b.time.localeCompare(a.time)).map(row=>{const Icon=icons[row.type]||HeartPulse;return <article key={row.id} onClick={()=>setDetail(row)}><span className={row.type.toLowerCase()}><Icon/></span><div><small>{row.time} · {row.type}</small><h4>{row.title}</h4><p>{row.summary}</p></div></article>})}</div>}</aside></div>{detail&&<div className="life-layer"><button className="life-backdrop" onClick={()=>setDetail(null)}/><section className="life-detail"><button className="close" onClick={()=>setDetail(null)}><X/></button><small>{detail.type.toUpperCase()}</small><h2>{detail.title}</h2><p>{detail.summary}</p><time>{detail.date} · {detail.time}</time><div><button><Edit3/>Edit in {detail.type}</button><button className="danger" onClick={()=>setDeleting(detail)}><Trash2/>Delete</button></div></section></div>}{deleting&&<div className="life-layer"><button className="life-backdrop" onClick={()=>setDeleting(null)}/><section className="life-confirm"><Trash2/><h2>Delete this entry?</h2><p>The source module and all connected views will update.</p><div><button onClick={()=>setDeleting(null)}>Cancel</button><button className="danger" onClick={()=>{setDeleting(null);setDetail(null)}}>Delete</button></div></section></div>}</section>}
