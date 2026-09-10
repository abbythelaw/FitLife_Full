
import {useMemo,useState} from 'react'
import {ChevronLeft,ChevronRight,Flame,Trophy} from 'lucide-react'

const dateKey=date=>[
  date.getFullYear(),
  String(date.getMonth()+1).padStart(2,'0'),
  String(date.getDate()).padStart(2,'0')
].join('-')

const startOfDay=date=>new Date(
  date.getFullYear(),date.getMonth(),date.getDate(),0,0,0,0
)

const endOfDay=date=>new Date(
  date.getFullYear(),date.getMonth(),date.getDate()+1,0,0,0,0
)

function sessionEnd(row,now){
  if(row.status==='active')return new Date(now)
  return new Date(row.ended_at||row.expected_end_at||row.started_at)
}

function overlapHours(row,date,now){
  const start=new Date(row.started_at)
  const end=sessionEnd(row,now)
  const from=new Date(Math.max(start.getTime(),startOfDay(date).getTime()))
  const to=new Date(Math.min(end.getTime(),endOfDay(date).getTime()))
  return Math.max(0,(to-from)/36e5)
}

function totalHours(row,now){
  return Math.max(0,(sessionEnd(row,now)-new Date(row.started_at))/36e5)
}

function buildAllDays(sessions,now){
  const valid=sessions.filter(row=>row.started_at&&!row.deleted_at)
  if(!valid.length)return []
  const earliest=new Date(Math.min(...valid.map(row=>new Date(row.started_at).getTime())))
  const latest=new Date(now)
  const days=[]
  for(let date=startOfDay(earliest);date<=latest;date=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1)){
    const coverage=valid.reduce((sum,row)=>sum+overlapHours(row,date,now),0)
    days.push({date:new Date(date),key:dateKey(date),coverage,qualifies:coverage>=12})
  }
  return days
}

function streaksFrom(days){
  const streaks=[]
  let current=[]
  for(const day of days){
    if(day.qualifies){current.push(day)}
    else if(current.length){streaks.push(current);current=[]}
  }
  if(current.length)streaks.push(current)
  return streaks
}

export default function FastingCalendar({sessions=[],now=Date.now()}){
  const today=new Date(now)
  const [month,setMonth]=useState(new Date(today.getFullYear(),today.getMonth(),1))
  const [selected,setSelected]=useState(null)

  const allDays=useMemo(()=>buildAllDays(sessions,now),[sessions,now])
  const streaks=useMemo(()=>streaksFrom(allDays),[allDays])
  const bestLength=Math.max(0,...streaks.map(streak=>streak.length))
  const currentStreak=streaks.find(streak=>streak.at(-1)?.key===dateKey(today))||[]

  const first=new Date(month.getFullYear(),month.getMonth(),1)
  const gridStart=new Date(first)
  gridStart.setDate(1-((first.getDay()+6)%7))
  const cells=Array.from({length:42},(_,index)=>{
    const date=new Date(gridStart)
    date.setDate(gridStart.getDate()+index)
    const stored=allDays.find(day=>day.key===dateKey(date))
    return stored||{date,key:dateKey(date),coverage:0,qualifies:false}
  })

  function streakFor(day){
    return streaks.find(streak=>streak.some(item=>item.key===day.key))||null
  }

  const completed=[...sessions]
    .filter(row=>row.status==='completed'&&row.ended_at)
    .sort((a,b)=>new Date(b.started_at)-new Date(a.started_at))
    .slice(0,5)

  return <section className="fast-calendar-card exercises-style-calendar">
    <header className="fast-calendar-month-head">
      <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))} aria-label="Previous month"><ChevronLeft/></button>
      <h2>{new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric'}).format(month)}</h2>
      <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))} aria-label="Next month"><ChevronRight/></button>
    </header>

    <div className="fast-calendar-weekdays">
      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}
    </div>

    <div className="fast-month-grid">
      {cells.map((day,index)=>{
        const streak=streakFor(day)
        const position=streak?.findIndex(item=>item.key===day.key)??-1
        const rowStart=index%7===0
        const rowEnd=index%7===6
        const segmentStart=day.qualifies&&(position===0||rowStart)
        const segmentEnd=day.qualifies&&(position===streak.length-1||rowEnd)
        const isCurrent=Boolean(streak&&currentStreak.length&&streak===currentStreak)
        const isBest=Boolean(streak&&streak.length===bestLength&&bestLength>0)
        const showBadge=segmentEnd&&position===streak.length-1
        return <button
          key={day.key}
          className={[
            'fast-month-day',
            day.date.getMonth()!==month.getMonth()?'outside':'',
            day.qualifies?'qualifies':'break-day',
            segmentStart?'segment-start':'',
            segmentEnd?'segment-end':'',
            isCurrent?'current-streak':'',
            isBest?'best-streak':'',
            day.key===dateKey(today)?'today':''
          ].filter(Boolean).join(' ')}
          onClick={()=>setSelected(day)}
          title={`${day.key}: ${day.coverage.toFixed(1)} fasting hours`}
        >
          <b>{day.date.getDate()}</b>
          {day.coverage>0&&<small>{day.coverage.toFixed(day.coverage>=10?0:1)}h</small>}
          {showBadge&&isCurrent&&(
            <span className={`fast-streak-badge ${isBest?'trophy':'flame'}`}>
              {isBest?<Trophy/>:<Flame/>}
              <strong>{streak.length}</strong>
            </span>
          )}
          {showBadge&&!isCurrent&&isBest&&(
            <span className="fast-streak-badge trophy historical">
              <Trophy/><strong>{streak.length}</strong>
            </span>
          )}
        </button>
      })}
    </div>

    <div className="fast-streak-summary">
      <span><Flame/><b>{currentStreak.length}</b>Current streak</span>
      <span><Trophy/><b>{bestLength}</b>Best-ever streak</span>
      <small>A day qualifies after at least 12 fasting hours within that local calendar date.</small>
    </div>

    <section className="fast-recent-list">
      <h3>Recent fasts</h3>
      {completed.length?completed.map(row=><button key={row.id} onClick={()=>setSelected({row,key:String(row.started_at).slice(0,10)})}>
        <span>{new Date(row.started_at).toLocaleDateString('en-GB')}</span>
        <b>{row.protocol||'Custom fast'}</b>
        <small>{totalHours(row,now).toFixed(1)}h</small>
        <ChevronRight/>
      </button>):<p>No completed fasts yet.</p>}
    </section>

    {selected&&<div className="fast-day-detail">
      <button onClick={()=>setSelected(null)}>Close</button>
      <small>{selected.key}</small>
      <h3>{selected.row?selected.row.protocol:`${selected.coverage?.toFixed(1)||0} fasting hours`}</h3>
      {!selected.row&&<p>{selected.qualifies?'Qualifies for a fasting streak.':'Does not yet qualify for a fasting streak.'}</p>}
    </div>}
  </section>
}
