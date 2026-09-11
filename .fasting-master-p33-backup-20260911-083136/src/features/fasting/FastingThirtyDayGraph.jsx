
import {displayReadingsForMetric,listNutritionDays,macroContribution} from './fastingNutritionStore'

const META={
 glucose:{label:'Glucose',unit:'mg/dL',colour:'#f97373'},
 rhr:{label:'RHR',unit:'bpm',colour:'#fb7185'},
 weight:{label:'Weight',unit:'kg',colour:'#38bdf8'},
 hba1c:{label:'HbA1c',unit:'%',colour:'#a78bfa'}
}
const dateKey=value=>String(value||'').slice(0,10)
const recentDates=()=>Array.from({length:30},(_,index)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(29-index));return dateKey(d.toISOString())})
const number=(value,decimals=1)=>Number(value).toLocaleString('en-GB',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})

function baseline(rows,metric){
 const configured=rows.find(row=>row.configured_min!=null||row.configured_max!=null||row.configured_target!=null)
 if(configured){
  const min=Number(configured.configured_min),max=Number(configured.configured_max),target=Number(configured.configured_target)
  if(Number.isFinite(min)&&Number.isFinite(max))return {kind:'configured',min,max,label:'Configured range'}
  if(Number.isFinite(target))return {kind:'configured',min:target,max:target,label:'Configured target'}
 }
 const values=rows.map(row=>Number(row.normalized_value)).filter(Number.isFinite)
 if(values.length>=5){
  const sorted=[...values].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)]
  const deviations=values.map(value=>Math.abs(value-median)).sort((a,b)=>a-b)
  const mad=deviations[Math.floor(deviations.length/2)]||Math.max(0.1,Math.abs(median)*.02)
  return {kind:'personal',min:median-mad,max:median+mad,label:'Personal baseline'}
 }
 return null
}

function DotPlot({metric}){
 const meta=META[metric]
 const rows=displayReadingsForMetric(metric)
  .filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(String(row.normalized_date||''))&&Number.isFinite(Number(row.normalized_value)))
  .sort((a,b)=>`${a.normalized_date}T${a.normalized_time||'00:00'}`.localeCompare(`${b.normalized_date}T${b.normalized_time||'00:00'}`))
  .slice(-30)
 const base=baseline(rows,metric)
 const values=[...rows.map(row=>Number(row.normalized_value)),...(base?[base.min,base.max]:[])].filter(Number.isFinite)
 if(!rows.length)return <div className="metric-dot-plot enhanced"><header><b>30D {meta.label}</b></header><div className="metric-graph-empty static"><b>No dated readings</b><span>Link a Health Metric or add a manual reading.</span></div></div>
 const min=Math.min(...values),max=Math.max(...values),range=Math.max(.1,max-min),start=new Date();start.setHours(0,0,0,0);start.setDate(start.getDate()-29)
 const x=row=>Math.max(0,Math.min(100,(new Date(`${row.normalized_date}T${row.normalized_time||'12:00'}`)-start)/(29*86400000)*100))
 const y=value=>(Number(value)-min)/range*76+12
 const latest=[...rows].reverse().slice(0,5)
 return <div className={`metric-dot-plot enhanced metric-${metric}`} style={{'--metric-default':meta.colour}}>
  <header><div><b>30D {meta.label}</b><small>{base?base.label:'Baseline unavailable'}</small></div><span><i className="solid"/>Linked <i className="hollow"/>Manual</span></header>
  <div className="dot-plot-stage enhanced-stage">
   {base&&<span className={`baseline-band ${base.kind}`} style={{bottom:`${y(base.min)}%`,height:`${Math.max(2,y(base.max)-y(base.min))}%`}}><b>{base.label}</b></span>}
   {rows.map((row,index)=>{const colour=row.display_colour||meta.colour;return <button key={row.attachment_id||row.id||index} className={`reading-plot-dot ${row.display_source}`} style={{left:`${x(row)}%`,bottom:`${y(row.normalized_value)}%`,'--dot-colour':colour}} title={`${row.normalized_date}${row.normalized_time?` ${row.normalized_time}`:''}: ${row.normalized_value} ${row.normalized_unit||meta.unit} · ${row.display_source==='linked'?`Linked: ${row.display_metric_name}`:'Manual'}`}/>})}
  </div>
  <div className="plot-axis"><span>{rows[0]?.normalized_date?.slice(5)}</span><span>{rows.at(-1)?.normalized_date?.slice(5)}</span></div>
  <section className="latest-readings"><h4>Latest readings</h4>{latest.map((row,index)=><button key={row.attachment_id||row.id||index}><span><b>{row.normalized_date}</b><small>{row.normalized_time||'Time not recorded'}</small></span><strong>{number(row.normalized_value,metric==='glucose'||metric==='rhr'?0:1)} {row.normalized_unit||meta.unit}</strong><em className={row.display_source}>{row.display_source==='linked'?`Linked · ${row.display_metric_name}`:'Manual'}</em></button>)}</section>
 </div>
}

function NutritionBars(){const map=new Map(listNutritionDays().map(row=>[row.date,row])),rows=recentDates().map(date=>map.get(date)).filter(Boolean),max=Math.max(1,...rows.map(row=>Number(row.calories||0)));return <div className="nutrition-30d-bars"><header><b>30D Nutrition</b><span><i className="c"/>Carbs <i className="f"/>Fat <i className="p"/>Protein</span></header><div className="nutrition-target-lines"><i/><i/><i/><i/></div>{rows.slice(-14).map(row=>{const macro=macroContribution(row),width=Number(row.calories||0)/max*100;return <button key={row.date} title={`${row.date}: ${row.calories} kcal`}><small>{row.date.slice(5)}</small><span style={{width:`${width}%`,opacity:row.completeness==='Partial day'?.5:1}}><i className="c" style={{width:`${macro.carbs}%`}}/><i className="f" style={{width:`${macro.fat}%`}}/><i className="p" style={{width:`${macro.protein}%`}}/></span><b>{row.calories} kcal</b></button>})}</div>}
export default function FastingThirtyDayGraph({tab}){return <section className="fasting-30d-graph">{tab==='nutrition'?<NutritionBars/>:<DotPlot metric={tab}/>}</section>}
