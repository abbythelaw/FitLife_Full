import { useEffect,useState } from 'react'
import { Check,Cloud,Database,Globe2,Image,Monitor,Moon,RefreshCw,Smartphone,Sun,Tablet,Upload,X } from 'lucide-react'
import './SettingsPage.css'
const accents=[['FitLife Classic','#70e236'],['Forest Lodge','#46c985'],['Sauna','#d88b55'],['London City','#38bdf8'],['Nordic Recovery','#8b9df4'],['Autumn Reset','#e29d45']]
export default function SettingsPage(){const[mode,setMode]=useState(localStorage.getItem('fitlife-mode')||'dark'),[accent,setAccent]=useState(localStorage.getItem('fitlife-accent')||'FitLife Classic'),[density,setDensity]=useState('compact'),[timezone,setTimezone]=useState('Europe/London'),[hour12,setHour12]=useState(false),[weekStart,setWeekStart]=useState('Monday'),[avatar,setAvatar]=useState(null),[reduceMotion,setReduceMotion]=useState(false);useEffect(()=>{localStorage.setItem('fitlife-mode',mode);localStorage.setItem('fitlife-accent',accent);document.documentElement.dataset.mode=mode},[mode,accent]);function image(file){const reader=new FileReader();reader.onload=()=>setAvatar(reader.result);reader.readAsDataURL(file)}function clearLocalDemoData(){
  const accepted=window.confirm(
    'Clear all local demonstration data and restart FitLife with empty modules?\n\n' +
    'Your account, profile, theme and appearance settings will be preserved.'
  )
  if(!accepted)return

  const emptyArrayKeys=[
    'fitlife-sports-entries',
    'fitlife-sports',
    'fitlife-log-history',
    'fitlife-my-life-events',
    'fitlife-habits',
    'fitlife-habit-logs',
    'fitlife-fasting-sessions',
    'fitlife-fasting-sessions-v4',
    'fitlife-fasting-nutrition',
    'fitlife-fasting-local-readings',
    'fitlife-health-readings',
    'fitlife-health-readings-v2',
    'fitlife-routines',
    'fitlife-workout-history-v3',
    'fitlife-custom-exercises',
    'fitlife-grateful-entries',
    'fitlife-bivariate-history',
    'fitlife-analytics-history'
  ]

  const removeKeys=[
    'fitlife-snapshot-order',
    'fitlife-snapshot-visible',
    'fitlife-snapshot-glance',
    'fitlife-glance-selected',
    'fitlife-glance-max',
    'fitlife-open-health-metric',
    'fitlife-fasting-metric-mapping'
  ]

  emptyArrayKeys.forEach(key=>{
    localStorage.setItem(key,'[]')
  })

  removeKeys.forEach(key=>{
    localStorage.removeItem(key)
  })

  Object.keys(localStorage)
    .filter(key=>
      key.startsWith('fitlife-trend-period-') ||
      key.startsWith('fitlife-draft-')
    )
    .forEach(key=>localStorage.removeItem(key))

  window.dispatchEvent(new CustomEvent(
    'fitlife:demo-data-cleared'
  ))

  window.dispatchEvent(new CustomEvent(
    'fitlife:history-changed',
    {detail:[]}
  ))

  window.dispatchEvent(new CustomEvent(
    'fitlife:fasting-changed',
    {detail:[]}
  ))

  window.dispatchEvent(new CustomEvent(
    'fitlife:health-readings-changed',
    {detail:[]}
  ))

  window.dispatchEvent(new CustomEvent(
    'fitlife:gratitude-changed',
    {detail:[]}
  ))

  window.dispatchEvent(new CustomEvent(
    'fitlife:habit-changed',
    {detail:[]}
  ))

  window.alert(
    'Local demonstration data was cleared. FitLife will now reload with empty modules.'
  )

  window.location.reload()
}return <section className="settings-page"><header><div><small>PERSONALISE FITLIFE</small><h2>Settings</h2><p>Appearance, profile, time, devices, and synchronisation.</p></div></header><div className="settings-layout"><nav><a href="#appearance">Appearance</a><a href="#profile">Profile</a><a href="#time">Time & calendar</a><a href="#sync">Sync & devices</a><a href="#data">Data</a></nav><main><section id="appearance" className="settings-card"><header><Monitor/><div><h3>Appearance</h3><p>Choose the neutral surface mode and accent colours independently.</p></div></header><label>Display mode<div className="segmented"><button className={mode==='dark'?'selected':''} onClick={()=>setMode('dark')}><Moon/>Dark</button><button className={mode==='light'?'selected':''} onClick={()=>setMode('light')}><Sun/>Light</button><button className={mode==='system'?'selected':''} onClick={()=>setMode('system')}><Monitor/>System</button></div></label><label>Accent theme<div className="accent-grid">{accents.map(([name,color])=><button className={accent===name?'selected':''} onClick={()=>setAccent(name)} key={name}><i style={{background:color}}/>{name}{accent===name&&<Check/>}</button>)}</div></label><label>Card density<select value={density} onChange={e=>setDensity(e.target.value)}><option>compact</option><option>comfortable</option></select></label><label className="toggle"><input type="checkbox" checked={reduceMotion} onChange={e=>setReduceMotion(e.target.checked)}/><span/>Reduce motion</label></section><section id="profile" className="settings-card"><header><Image/><div><h3>Profile</h3><p>Update the visual identity used across devices.</p></div></header><div className="profile-edit">{avatar?<img src={avatar}/>:<b>AS</b>}<label><Upload/>Upload photo<input type="file" accept="image/*" onChange={e=>e.target.files[0]&&image(e.target.files[0])}/></label><button onClick={()=>setAvatar(null)}>Use initials</button></div><label>Display name<input value="Abner Serania" readOnly/></label></section><section id="time" className="settings-card"><header><Globe2/><div><h3>Time & calendar</h3><p>Controls greetings, clocks, day boundaries, and calendar layouts.</p></div></header><label>Timezone<select value={timezone} onChange={e=>setTimezone(e.target.value)}><option>Europe/London</option><option>Asia/Manila</option><option>America/New_York</option><option>Australia/Sydney</option></select></label><label>Clock format<div className="segmented"><button className={!hour12?'selected':''} onClick={()=>setHour12(false)}>24 hour</button><button className={hour12?'selected':''} onClick={()=>setHour12(true)}>12 hour</button></div></label><label>Week starts<select value={weekStart} onChange={e=>setWeekStart(e.target.value)}><option>Monday</option><option>Sunday</option></select></label></section><section id="sync" className="settings-card"><header><Cloud/><div><h3>Sync & devices</h3><p>Review local changes and connected device classes.</p></div></header><div className="sync-status"><i/><div><b>Synced</b><span>No changes waiting</span></div><button><RefreshCw/>Sync now</button></div><div className="device-grid"><article><Smartphone/><b>Phone</b><span>Last active today</span></article><article><Tablet/><b>iPad</b><span>Layout profile ready</span></article><article><Monitor/><b>Desktop</b><span>Current device</span></article></div></section><section id="data" className="settings-card"><header><Database/><div><h3>Data</h3><p>Export, clear local previews, or review database configuration.</p></div></header><button className="data-action">Export FitLife data</button><button type="button" className="data-action clear-demo-data" onClick={clearLocalDemoData}>Clear local demonstration data</button></section></main></div></section>}
