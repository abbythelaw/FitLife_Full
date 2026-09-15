import {useEffect,useMemo,useState} from 'react'
import {Activity,ChevronRight,Eye,EyeOff,GripVertical,HeartPulse,Plus,Search,Settings2,X} from 'lucide-react'
import {BulkHealthEntry,QuickMetricEntry} from './HealthQuickEntry'
import {readingsForMetric} from './HealthMetricCardCompletion'
import {aggregateMetricReadings,metricDecimals,readingDate,readingTime} from './metricAggregation'
import './HealthOverviewV2.css'

const PREF_KEY='fitlife-health-metric-preferences-v1'
const DEF_KEY='fitlife-health-defs-v2'
const READING_KEY='fitlife-health-readings-v2'
const DEFAULTS=[
 {id:'weight',name:'Weight',category:'Body composition',unit:'kg',color:'#54aaf5',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:1},
 {id:'glucose',name:'Blood glucose',category:'Metabolic',unit:'mmol/L',color:'#35d483',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:2},
 {id:'rhr',name:'Resting heart rate',category:'Recovery',unit:'bpm',color:'#a66be8',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:3},
 {id:'sleep',name:'Sleep duration',category:'Recovery',unit:'h',color:'#f0b82f',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:4},
 {id:'steps',name:'Steps',category:'Activity',unit:'steps',color:'#2ec4b6',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:5},
 {id:'vo2',name:'VO₂ Max',category:'Performance',unit:'ml/kg/min',color:'#f07a2f',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:6},
 {id:'mood',name:'Mood',category:'Wellness',unit:'/10',color:'#e84f8a',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:7},
 {id:'energy',name:'Energy',category:'Wellness',unit:'/10',color:'#f0bf2f',enabled:true,show_on_health:true,show_on_dashboard:true,show_on_snapshot:true,display_order:8},
 {id:'hba1c',name:'HbA1c',category:'Metabolic',unit:'%',color:'#c66be8',enabled:true,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:9},
 {id:'bodyfat',name:'Body fat %',category:'Body composition',unit:'%',color:'#40b9c2',enabled:true,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:10},
 {id:'blood-pressure',name:'Blood pressure',category:'Cardiovascular',unit:'mmHg',color:'#ef6b72',enabled:true,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:11},
 {id:'hrv',name:'Heart-rate variability',category:'Recovery',unit:'ms',color:'#8b83e8',enabled:true,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:12},
 {id:'stress',name:'Stress',category:'Wellness',unit:'/10',color:'#e89845',enabled:true,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:13},
 {id:'cholesterol',name:'Total cholesterol',category:'Blood markers',unit:'mmol/L',color:'#7aa0ca',enabled:false,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:20},
 {id:'ldl',name:'LDL cholesterol',category:'Blood markers',unit:'mmol/L',color:'#d97979',enabled:false,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:21},
 {id:'hdl',name:'HDL cholesterol',category:'Blood markers',unit:'mmol/L',color:'#64b5d8',enabled:false,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:22},
 {id:'triglycerides',name:'Triglycerides',category:'Blood markers',unit:'mmol/L',color:'#d89b64',enabled:false,show_on_health:false,show_on_dashboard:false,show_on_snapshot:false,display_order:23},
]
const aliases={vo2:['vo2','vo₂ max','vo2 max'],bodyfat:['body fat','bodyfat'],'blood-pressure':['blood pressure','bp']}
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function normalized(text){return String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function mergePreferences(){const defs=read(DEF_KEY,[]),saved=read(PREF_KEY,[]),map=new Map();for(const item of DEFAULTS)map.set(item.id,{...item});for(const item of defs){const label=normalized(item.name||item.short||item.id);const match=DEFAULTS.find(x=>x.id===item.id||[x.name,...(aliases[x.id]||[])].some(v=>label===normalized(v)||label.includes(normalized(v))));const id=match?.id||String(item.id||crypto.randomUUID());map.set(id,{...(match||{}),...item,id,name:item.name||match?.name||'Custom metric',category:item.category||match?.category||'Custom'})}for(const item of saved){if(map.has(item.id))map.set(item.id,{...map.get(item.id),...item})}return[...map.values()].sort((a,b)=>(a.display_order??100)-(b.display_order??100))}
function savePreferences(rows){localStorage.setItem(PREF_KEY,JSON.stringify(rows));window.dispatchEvent(new CustomEvent('fitlife:health-metric-preferences-changed',{detail:rows}))}
function logs(){return read(READING_KEY,[])}
function metricRows(metric){try{return readingsForMetric(metric.id)||[]}catch{return logs().filter(row=>String(row.metric_id||row.metric||row.name||'')===String(metric.id))}}
function latest(metric){const rows=metricRows(metric).sort((a,b)=>`${readingDate(a)}T${readingTime(a)||'00:00'}`.localeCompare(`${readingDate(b)}T${readingTime(b)||'00:00'}`));return rows.at(-1)||null}
function value(row){return Number(row?.normalized_value??row?.value)}
function stat(metric){const model=aggregateMetricReadings(metricRows(metric),metric.id,'30D');const current=latest(metric);return{model,current,currentValue:value(current)}}

export default function HealthOverviewV2({onOpenLegacy,onAddReading}){
 const[metrics,setMetrics]=useState(mergePreferences),[drawer,setDrawer]=useState(false),[quickMetric,setQuickMetric]=useState(null),[bulkOpen,setBulkOpen]=useState(false),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[token,setToken]=useState(0)
 useEffect(()=>{const f=()=>{setMetrics(mergePreferences());setToken(x=>x+1)};window.addEventListener('fitlife:health-readings-changed',f);window.addEventListener('fitlife:health-metric-preferences-changed',f);window.addEventListener('storage',f);return()=>{window.removeEventListener('fitlife:health-readings-changed',f);window.removeEventListener('fitlife:health-metric-preferences-changed',f);window.removeEventListener('storage',f)}},[])
 const visible=useMemo(()=>metrics.filter(x=>x.enabled&&x.show_on_health).sort((a,b)=>a.display_order-b.display_order),[metrics,token])
 const recent=useMemo(()=>logs().filter(x=>!x.deleted_at).sort((a,b)=>String(b.date||b.normalized_date||b.observed_at).localeCompare(String(a.date||a.normalized_date||a.observed_at))).slice(0,8),[token])
 function update(id,patch){const next=metrics.map(x=>x.id===id?{...x,...patch}:x);setMetrics(next);savePreferences(next)}
 return <section className="health-b"><header className="health-b-heading"><div><small>HEALTH</small><h2>Health</h2><p>A focused summary of visible metrics, status, and recent readings.</p></div><div><button onClick={()=>setDrawer(true)}><Settings2/>Manage metrics</button><button className="primary" onClick={()=>setBulkOpen(true)}><Plus/>Add Bulk Data</button></div></header>
 <section className="health-summary"><header><div><h3>Health Summary</h3><p>{visible.length} visible metrics</p></div><button onClick={onOpenLegacy}>View metric details <ChevronRight/></button></header><div>{visible.length?visible.map(metric=><SummaryRow metric={metric} onQuickAdd={()=>setQuickMetric(metric)} key={metric.id}/>):<div className="health-empty">No metrics are currently shown. Open Manage Metrics to choose them.</div>}</div></section>
 <section className="health-status"><header><h3>Health Status</h3><span>Based only on saved readings</span></header><div>{visible.slice(0,6).map(metric=><StatusRow metric={metric} key={metric.id}/>)}</div></section>
 <section className="health-recent"><header><div><h3>Recent Readings</h3><p>Raw observations remain independently editable.</p></div><button onClick={onOpenLegacy}>View all records <ChevronRight/></button></header><div className="health-record-head"><span>Metric</span><span>Value</span><span>Date and time</span><span>Source</span></div>{recent.length?recent.map((row,index)=><RecordRow row={row} metrics={metrics} key={row.id||index}/>):<div className="health-empty">No readings have been recorded yet.</div>}</section>
 {quickMetric&&<QuickMetricEntry metric={quickMetric} onClose={()=>setQuickMetric(null)} onSaved={()=>setToken(x=>x+1)}/>} {bulkOpen&&<BulkHealthEntry metrics={metrics} onClose={()=>setBulkOpen(false)} onSaved={()=>setToken(x=>x+1)}/>} {drawer&&<ManageMetrics metrics={metrics} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} update={update} onClose={()=>setDrawer(false)}/>}</section>
}
function SummaryRow({ metric, onQuickAdd }) {
  const {
    model,
    currentValue,
  } = stat(metric)

  const unit = model.unit || metric.unit
  const decimals = metricDecimals(metric.id, unit)

  function openMetric() {
    sessionStorage.setItem(
      'fitlife-health-prefill',
      JSON.stringify({
        metric: metric.id,
      })
    )

    window.dispatchEvent(
      new CustomEvent('fitlife:health-open-detail', {
        detail: {
          metric: metric.id,
        },
      })
    )
  }

  function handleKeyDown(event) {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      openMetric()
    }
  }

  return (
    <div
      className="health-summary-row"
      role="button"
      tabIndex={0}
      aria-label={`Open ${metric.name} details`}
      style={{
        '--metric': metric.color,
      }}
      onClick={openMetric}
      onKeyDown={handleKeyDown}
    >
      <i aria-hidden="true">
        {metric.icon || '●'}
      </i>

      <div>
        <b>{metric.name}</b>
        <small>{metric.category}</small>
      </div>

      <strong>
        {Number.isFinite(currentValue)
          ? currentValue.toFixed(decimals)
          : '—'}
        {' '}
        <em>{unit}</em>
      </strong>

      <span>
        {model.summary
          ? `${model.summary.count} readings · avg ${
              model.summary.average.toFixed(decimals)
            }`
          : 'No readings'}
      </span>

      <button
        type="button"
        className="metric-quick-add"
        aria-label={`Add ${metric.name} reading`}
        title={`Add ${metric.name} reading`}
        onClick={event => {
          event.stopPropagation()
          onQuickAdd()
        }}
      >
        <Plus aria-hidden="true" />
      </button>

      <ChevronRight aria-hidden="true" />
    </div>
  )
}

function StatusRow({metric}){const{model}=stat(metric);let status='No data';if(model.summary){const groups=model.buckets;if(groups.length>=2){const change=groups.at(-1).average-groups[0].average;status=Math.abs(change)<.01?'Stable':change<0?'Trending down':'Trending up'}else status='Tracking'}return <article style={{'--metric':metric.color}}><i/><b>{metric.name}</b><span>{status}</span><small>{model.summary?`${model.summary.count} readings`:'Add a reading'}</small></article>}
function RecordRow({row,metrics}){const id=String(row.metric_id||row.metric||row.metric_type||'');const metric=metrics.find(x=>x.id===id)||metrics.find(x=>normalized(row.name||row.metric_name).includes(normalized(x.name)))||{name:row.name||id||'Health metric',unit:row.unit||row.normalized_unit||''};return <article><b>{metric.name}</b><span>{row.value??row.normalized_value??'—'} {row.unit||row.normalized_unit||metric.unit||''}</span><span>{row.date||row.normalized_date||String(row.observed_at||'').slice(0,10)} {row.time||row.normalized_time||''}</span><span>{row.source||row.source_type||'Manual'}</span></article>}
function ManageMetrics({metrics,filter,setFilter,query,setQuery,update,onClose}){const filtered=metrics.filter(x=>filter==='visible'?x.enabled&&x.show_on_health:filter==='hidden'?x.enabled&&!x.show_on_health:filter==='disabled'?!x.enabled:true).filter(x=>normalized(x.name).includes(normalized(query))||normalized(x.category).includes(normalized(query)));return <div className="health-manage-layer"><button className="backdrop" onClick={onClose}/><aside><header><div><small>HEALTH CONFIGURATION</small><h2>Manage Metrics</h2><p>Enable metrics, control visibility, and choose where each metric appears.</p></div><button className="close" onClick={onClose}><X/></button></header><div className="health-manage-tools"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search metrics"/></label><nav>{[['all','All'],['visible','Visible'],['hidden','Hidden'],['disabled','Disabled']].map(([id,label])=><button className={filter===id?'active':''} onClick={()=>setFilter(id)} key={id}>{label}</button>)}</nav></div><div className="metric-manage-head"><span>Metric</span><span>Enabled</span><span>Overview</span><span>Dashboard</span><span>Snapshot</span><span>Order</span></div><div className="metric-manage-list">{filtered.map(metric=><article key={metric.id}><div><i style={{background:metric.color}}/><span><b>{metric.name}</b><small>{metric.category}</small></span></div><Toggle value={metric.enabled} label={`Enable ${metric.name}`} onChange={value=>update(metric.id,{enabled:value,show_on_health:value?metric.show_on_health:false,show_on_dashboard:value?metric.show_on_dashboard:false,show_on_snapshot:value?metric.show_on_snapshot:false})}/><Toggle value={metric.enabled&&metric.show_on_health} disabled={!metric.enabled} label={`Show ${metric.name} on Health Overview`} onChange={value=>update(metric.id,{show_on_health:value})}/><Toggle value={metric.enabled&&metric.show_on_dashboard} disabled={!metric.enabled} label={`Show ${metric.name} on Dashboard`} onChange={value=>update(metric.id,{show_on_dashboard:value})}/><Toggle value={metric.enabled&&metric.show_on_snapshot} disabled={!metric.enabled} label={`Show ${metric.name} on Snapshot`} onChange={value=>update(metric.id,{show_on_snapshot:value})}/><label className="order"><input type="number" min="1" value={metric.display_order??100} onChange={e=>update(metric.id,{display_order:Number(e.target.value)||100})}/><GripVertical/></label></article>)}</div><footer><button onClick={()=>{localStorage.removeItem(PREF_KEY);setTimeout(()=>location.reload(),0)}}>Reset defaults</button><button className="primary" onClick={onClose}>Done</button></footer></aside></div>}
function Toggle({value,onChange,label,disabled}){return <button type="button" className={`health-toggle ${value?'on':''}`} role="switch" aria-checked={value} aria-label={label} title={label} disabled={disabled} onClick={()=>onChange(!value)}>{value?<Eye/>:<EyeOff/>}<i/></button>}
