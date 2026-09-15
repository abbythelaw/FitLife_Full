import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts'

export default function HabitChart({ habit, logs, chartType, period = '30D' }) {
  const days = period === '7D' ? 7 : period === '90D' ? 90 : period === '1Y' ? 365 : 30
  const data = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - days + 1)
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(start); date.setDate(start.getDate() + index)
      const key = date.toISOString().slice(0, 10)
      const log = logs.find(item => item.habit_id === habit.id && item.log_date === key)
      return { date: key, label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date), value: log ? Number(log.value) : null }
    })
  }, [habit.id, logs, days])
  const common = <><CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} interval="preserveStartEnd"/><YAxis tick={{ fill: 'var(--muted)', fontSize: 10 }} unit={habit.unit ? ` ${habit.unit}` : ''}/><Tooltip contentStyle={{ background: '#0a1510', border: '1px solid var(--line)', borderRadius: 10 }}/>{habit.target_mode === 'range' ? <ReferenceArea y1={habit.target_min} y2={habit.target_max} fill={habit.color} fillOpacity={0.12}/> : habit.target_mode !== 'track_only' && <ReferenceLine y={habit.target_value} stroke={habit.color} strokeDasharray="5 5"/>}</>
  if (chartType === 'bar') return <ResponsiveContainer width="100%" height={250}><BarChart data={data}>{common}<Bar dataKey="value" fill={habit.color} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
  if (chartType === 'dot') return <ResponsiveContainer width="100%" height={250}><ScatterChart>{common}<ZAxis range={[55,55]}/><Scatter data={data.filter(d => d.value !== null)} dataKey="value" fill={habit.color}/></ScatterChart></ResponsiveContainer>
  if (chartType === 'scale') { const latest = [...data].reverse().find(d => d.value !== null); const min = habit.target_mode === 'range' ? Math.min(0, habit.target_min * .7) : 0; const max = habit.target_mode === 'range' ? habit.target_max * 1.35 : Math.max((habit.target_value || 1) * 1.5, (latest?.value || 1) * 1.2); return <div className="habit-scale-chart"><div className="habit-scale-track"><i className="habit-scale-target" style={habit.target_mode === 'range' ? { left: `${habit.target_min/max*100}%`, width: `${(habit.target_max-habit.target_min)/max*100}%`, background: habit.color } : { left: 0, width: `${(habit.target_value||0)/max*100}%`, background: habit.color }}/>{latest && <b style={{ left: `${Math.min(100,Math.max(0,(latest.value-min)/(max-min)*100))}%` }}>{latest.value}</b>}</div><div><span>{min}</span><span>Target</span><span>{max.toFixed(1)} {habit.unit}</span></div></div> }
  return <ResponsiveContainer width="100%" height={250}><LineChart data={data}>{common}<Line type="monotone" dataKey="value" stroke={habit.color} strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: habit.color }}/></LineChart></ResponsiveContainer>
}
