import {useMemo,useState} from 'react'
import {Plus,Save,X} from 'lucide-react'
import './HealthQuickEntry.css'

const KEY='fitlife-health-readings-v2'
const CONTEXTS={
 glucose:['Fasting','Before meal','After meal','Bedtime','Exercise','Other'],
 weight:['Morning','Evening','Before meal','After meal','Other'],
 rhr:['Resting','Morning','Evening','Other'],
 sleep:['Night sleep','Nap','Other'],
 mood:['Morning','Afternoon','Evening','Other'],
 energy:['Morning','Afternoon','Evening','Other'],
 stress:['Morning','Afternoon','Evening','Other'],
}
const today=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const nowTime=()=>{const d=new Date();return`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
function write(rows){localStorage.setItem(KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('fitlife:health-readings-changed',{detail:rows}))}
function id(){return crypto.randomUUID?.()||`health-${Date.now()}-${Math.random().toString(36).slice(2)}`}
function record(metric,value,date,time,context,notes){return{id:id(),metric_id:metric.id,metric:metric.id,metric_name:metric.name,value:Number(value),unit:metric.unit,record_date:date,date,time,recorded_at:`${date}T${time||'12:00'}:00`,observed_at:`${date}T${time||'12:00'}:00`,context:context||'',notes:notes||'',source:'manual',source_type:'manual',created_at:new Date().toISOString(),updated_at:new Date().toISOString()}}

export function QuickMetricEntry({metric,onClose,onSaved}){
 const[value,setValue]=useState(''),[date,setDate]=useState(today()),[time,setTime]=useState(nowTime()),[context,setContext]=useState(CONTEXTS[metric.id]?.[0]||''),[notes,setNotes]=useState(''),[busy,setBusy]=useState(false)
 function save(){if(value===''||!Number.isFinite(Number(value)))return;setBusy(true);const rows=[record(metric,value,date,time,context,notes),...read()];write(rows);setBusy(false);onSaved?.();onClose()}
 return <EntryLayer title={`Add ${metric.name}`} subtitle="Quick single-metric entry" onClose={onClose}><div className="quick-health-value"><label>Value<input autoFocus type="number" inputMode="decimal" step="any" value={value} onChange={e=>setValue(e.target.value)} placeholder={`Enter ${metric.name.toLowerCase()}`}/><span>{metric.unit}</span></label></div><div className="quick-health-grid"><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label>{CONTEXTS[metric.id]&&<label className="wide">Context<select value={context} onChange={e=>setContext(e.target.value)}>{CONTEXTS[metric.id].map(x=><option key={x}>{x}</option>)}</select></label>}<label className="wide">Notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Optional note"/></label></div><footer><button onClick={onClose}>Cancel</button><button className="primary" disabled={busy||value===''} onClick={save}><Save/>{busy?'Saving...':`Save ${metric.name}`}</button></footer></EntryLayer>
}

export function BulkHealthEntry({metrics,onClose,onSaved}){
 const[date,setDate]=useState(today()),[time,setTime]=useState(nowTime()),[values,setValues]=useState({}),[busy,setBusy]=useState(false)
 const active=useMemo(()=>metrics.filter(x=>x.enabled).sort((a,b)=>a.display_order-b.display_order),[metrics])
 function save(){const entries=active.filter(metric=>values[metric.id]!==''&&values[metric.id]!=null&&Number.isFinite(Number(values[metric.id]))).map(metric=>record(metric,values[metric.id],date,time,'Bulk entry',''));if(!entries.length)return;setBusy(true);write([...entries,...read()]);setBusy(false);onSaved?.();onClose()}
 const count=active.filter(metric=>values[metric.id]!==''&&values[metric.id]!=null).length
 return <EntryLayer title="Add Bulk Data" subtitle="Add several readings using one date and time" onClose={onClose} wide><div className="bulk-health-date"><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>Time<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label></div><div className="bulk-health-list">{active.map(metric=><label key={metric.id}><span><i style={{background:metric.color}}/><b>{metric.name}</b><small>{metric.category}</small></span><div><input type="number" inputMode="decimal" step="any" value={values[metric.id]??''} onChange={e=>setValues(current=>({...current,[metric.id]:e.target.value}))} placeholder="Not entered"/><em>{metric.unit}</em></div></label>)}</div><footer><span>{count} {count===1?'reading':'readings'} ready</span><button onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!count} onClick={save}><Save/>{busy?'Saving...':'Save All'}</button></footer></EntryLayer>
}

function EntryLayer({title,subtitle,onClose,wide=false,children}){return <div className="health-entry-layer"><button className="backdrop" aria-label="Close" onClick={onClose}/><aside className={wide?'wide':''}><header><div><small>HEALTH ENTRY</small><h2>{title}</h2><p>{subtitle}</p></div><button className="close" onClick={onClose}><X/></button></header>{children}</aside></div>}
