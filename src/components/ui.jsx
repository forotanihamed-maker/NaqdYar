import { useEffect, useState } from 'react'
import { amountInput, digits, shamsi, toIso, today } from '../utils'

export const Modal = ({ title, onClose, children }) => (
  <div className="modal-bg" onClick={onClose}>
    <div className="modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
      <h2>{title}</h2>{children}
    </div>
  </div>
)

export const Field = ({ label, children }) => <div className="field"><label>{label}</label>{children}</div>

export const AmountInput = ({ value, onChange, optional }) => (
  <input inputMode="numeric" value={amountInput(value)} placeholder="۰" required={!optional}
    onChange={e => onChange(digits(e.target.value).replace(/\D/g, ''))} />
)

// Jalali calendar picker with Persian month names and Saturday-first weeks.
const JMONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']
const JWEEK = ['ش','ی','د','س','چ','پ','ج']
const jparts = iso => {
  const d = new Date(iso + 'T12:00:00Z')
  const p = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'}).formatToParts(d)
  return Object.fromEntries(p.map(x=>[x.type,x.value]))
}
// optional: the date may stay empty (a clear button appears). Typing/choosing always yields an ISO date.
export function DateInput({ value, onChange, optional }) {
  const selected = jparts(value || today())
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({ year:Number(selected.year), month:Number(selected.month) })
  const [text, setText] = useState(() => shamsi(value))
  useEffect(() => { setText(shamsi(value)) }, [value]) // follow changes made from outside (reset, calendar)
  const changeMonth = delta => setView(v => {
    let m=v.month+delta,y=v.year; if(m<1){m=12;y--} if(m>12){m=1;y++} return {year:y,month:m}
  })
  const days=[]
  for(let d=1;d<=31;d++){ const iso=toIso(`${view.year}/${view.month}/${d}`); if(!iso)break; days.push({d,iso}) }
  const first=days[0]?.iso
  const offset=first ? (new Date(first+'T12:00:00Z').getUTCDay()+1)%7 : 0 // Saturday first
  const selectedIso=value
  const todayIso=today()
  const choose=iso=>{onChange(iso);setText(shamsi(iso));setOpen(false)}
  const maskDate = raw => {
    const d=digits(raw).replace(/\D/g,'').slice(0,8)
    return d.length>6 ? `${d.slice(0,4)}/${d.slice(4,6)}/${d.slice(6)}` : d.length>4 ? `${d.slice(0,4)}/${d.slice(4)}` : d
  }
  return <div className="date-picker-wrap">
    <div className="date-input-row"><input value={text} placeholder="۱۴۰۵/۰۹/۰۱" inputMode="numeric" required={!optional} aria-invalid={!!(text&&!toIso(text))}
      onChange={e=>{const masked=maskDate(e.target.value);setText(masked);const iso=toIso(masked);if(!masked&&optional)onChange('');if(iso){onChange(iso);const p=jparts(iso);setView({year:+p.year,month:+p.month})}}}/>
      <button type="button" className="btn calendar-trigger" aria-label="بازکردن تقویم" onClick={()=>setOpen(v=>!v)}>▦ تقویم</button>{optional&&value&&<button type="button" className="btn" onClick={()=>{onChange('');setText('')}}>پاک‌کردن</button>}</div>
    {open&&<div className="jalali-calendar" dir="rtl">
      <div className="calendar-head"><button type="button" onClick={()=>changeMonth(1)}>‹</button><strong>{JMONTHS[view.month-1]} {view.year}</strong><button type="button" onClick={()=>changeMonth(-1)}>›</button></div>
      <div className="calendar-grid">{JWEEK.map(w=><span className="weekday" key={w}>{w}</span>)}{Array.from({length:offset},(_,i)=><span className="calendar-blank" key={'b'+i}/>)}{days.map(({d,iso})=><button type="button" key={iso} className={'calendar-day '+(iso===selectedIso?'selected ':'')+(iso===todayIso?'today':'')} onClick={()=>choose(iso)}>{new Intl.NumberFormat('fa-IR').format(d)}</button>)}</div>
      <button type="button" className="calendar-today" onClick={()=>choose(todayIso)}>امروز</button>
    </div>}
  </div>
}

// Type to search existing people, click one to pick it, or keep the typed text as a new person.
export function PersonPicker({ people, value, onChange }) {
  const q = value.name.trim().toLocaleLowerCase()
  const matches = people.filter(p => p.name.toLocaleLowerCase().includes(q)).slice(0, 5)
  const exact = people.some(p => p.name.trim().toLocaleLowerCase() === q)
  return <div>
    <input value={value.name} placeholder="نام شخص را بنویسید یا انتخاب کنید" required
      onChange={e => onChange({ personId: '', name: e.target.value })} />
    <div className="chips">
      {matches.map(p => (
        <button type="button" key={p.id} className={'chip ' + (value.personId === p.id ? 'on' : '')}
          onClick={() => onChange({ personId: p.id, name: p.name })}>{p.name}</button>
      ))}
      {q && !exact && <span className="chip new">«{value.name.trim()}» به‌عنوان شخص جدید ثبت می‌شود</span>}
    </div>
  </div>
}
