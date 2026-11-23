import { cloneElement, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import { addDays, amountInput, daysTo, digits, faNum, fmt, jparts, normalizeText, rel, shamsi, toIso, today, toman } from '../utils.js'

/* ---------- Icons ---------- */
const ICONS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  docs: 'M7 3h8l4 4v14H7z M15 3v4h4 M10 12h6 M10 16h6',
  wallet: 'M3 6h18v13H3z M16 12h5',
  down: 'M17 7L7 17 M7 8v9h9',
  up: 'M7 17L17 7 M8 7h9v9',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10 21h4',
  check: 'M9 12l2 2 4-4 M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0',
  chart: 'M4 20V10 M10 20V4 M16 20v-7 M2 20h20',
  save: 'M12 3v12 M7 10l5 5 5-5 M4 21h16',
  plus: 'M12 5v14 M5 12h14',
  chevD: 'M6 9l6 6 6-6',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  more: 'M4 12h2 M11 12h2 M18 12h2',
  close: 'M6 6l12 12 M18 6L6 18',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
}
export const Icon = ({ name, size = 20, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>
)

/* ---------- Small display pieces ---------- */
export const Badge = ({ tone = 'muted', children }) => <span className={'badge ' + tone}>{children}</span>

export const Stat = ({ label, value, tone, hint }) => (
  <div className="card stat"><small>{label}</small><b className={tone}>{value}</b>{hint && <span className="hint">{hint}</span>}</div>
)

export const EmptyState = ({ title, text, action }) => (
  <div className="empty-state">{title && <strong>{title}</strong>}{text && <p>{text}</p>}{action}</div>
)

/* ---------- Modal (Esc to close, focus trap, focus restore, no accidental data loss) ---------- */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'

export function Modal({ title, onClose, children, dismissible = false }) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const titleId = useId()
  useEffect(() => {
    const el = ref.current
    const previous = document.activeElement
    ;(el.querySelector('[data-autofocus]') || el.querySelector('input,select,textarea') || el).focus()
    const onKey = e => {
      if (e.key === 'Escape') { closeRef.current(); return }
      if (e.key !== 'Tab') return
      const items = [...el.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; previous?.focus?.() }
  }, [])
  return (
    <div className="modal-bg" onMouseDown={e => { if (dismissible && e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="بستن" onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export const FormActions = ({ onCancel, submitLabel = 'ثبت', cancelLabel = 'انصراف', children }) => (
  <div className="actions">
    <button type="submit" className="btn p">{submitLabel}</button>
    {children}
    <button type="button" className="btn" onClick={onCancel}>{cancelLabel}</button>
  </div>
)

export function ConfirmDialog({ title, children, confirmLabel = 'تأیید', danger, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose} dismissible>
      <div className="confirm-text">{children}</div>
      <div className="actions">
        <button type="button" data-autofocus className={'btn ' + (danger ? 'danger' : 'p')} onClick={() => { onConfirm(); onClose() }}>{confirmLabel}</button>
        <button type="button" className="btn" onClick={onClose}>انصراف</button>
      </div>
    </Modal>
  )
}

/* ---------- Form pieces ---------- */
// Links the label to its control, shows a hint and an inline error. `group` is for button groups (no single control).
export function Field({ label, hint, error, group, children }) {
  const id = useId()
  const Label = group ? 'span' : 'label'
  const body = !group && isValidElement(children)
    ? cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? id + '-e' : undefined })
    : children
  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <Label className="lbl" id={id + '-l'} htmlFor={group ? undefined : id}>{label}</Label>
      {group ? <div role="group" aria-labelledby={id + '-l'}>{body}</div> : body}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="err" id={id + '-e'} role="alert">{error}</small>}
    </div>
  )
}

export const Seg = ({ value, onChange, options }) => (
  <div className="seg">
    {options.map(([v, label, tone]) => (
      <button key={v} type="button" aria-pressed={value === v} className={(tone || '') + (value === v ? ' on' : '')} onClick={() => onChange(v)}>{label}</button>
    ))}
  </div>
)

export function AmountInput({ value, onChange, optional, showToman = true, ...rest }) {
  const n = Number(digits(value).replace(/\D/g, '')) || 0
  return <>
    <input {...rest} inputMode="numeric" autoComplete="off" value={amountInput(value)} placeholder="۰"
      onChange={e => onChange(digits(e.target.value).replace(/\D/g, ''))} />
    {showToman && n > 0 && <small className="hint">معادل {toman(n)} تومان</small>}
  </>
}

export const Tabs = ({ tabs, value, onChange, counts = {}, children }) => (
  <div className="tabs">
    <div className="tablist">
      {tabs.map(([k, t]) => (
        <button key={k} type="button" aria-pressed={value === k} className={'tab' + (value === k ? ' on' : '')} onClick={() => onChange(k)}>
          {t}{counts[k] != null && <span className="cnt">{fmt(counts[k])}</span>}
        </button>
      ))}
    </div>
    {children}
  </div>
)

export const Search = ({ value, onChange, placeholder }) => (
  <input className="search" type="search" aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
)

/* ---------- Jalali date input ---------- */
const JMONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند']
const JWEEK = ['ش','ی','د','س','چ','پ','ج']

// quick: [[label, days from today], ...] shows shortcut chips; relative: shows "۳ روز دیگر" under the field.
export function DateInput({ value, onChange, optional, quick, relative, ...rest }) {
  const selected = jparts(value || today()) || jparts(today())
  const [open, setOpen] = useState(false)
  const [view, setView] = useState({ year: Number(selected.year), month: Number(selected.month) })
  const [text, setText] = useState(() => shamsi(value))
  // What this field last sent up. Lets us follow external resets without wiping what the user is typing.
  const last = useRef({ value, text: shamsi(value) })
  const wrap = useRef(null)
  useEffect(() => {
    if (value === last.current.value) return
    last.current = { value, text: shamsi(value) }
    setText(shamsi(value))
  }, [value])
  useEffect(() => {
    if (!open) return
    // inside a scrolling dialog the popup can start below the fold: bring it fully into view
    wrap.current?.querySelector('.jalali-calendar')?.scrollIntoView({ block: 'nearest' })
    const h = e => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const changeMonth = delta => setView(v => {
    let m = v.month + delta, y = v.year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    return { year: y, month: m }
  })
  const { days, offset } = useMemo(() => {
    if (!open) return { days: [], offset: 0 }
    const first = toIso(`${view.year}/${view.month}/1`)
    if (!first) return { days: [], offset: 0 }
    const list = []
    for (let d = 1; d <= 31; d++) {
      const iso = addDays(first, d - 1)
      if (Number(jparts(iso).month) !== view.month) break
      list.push({ d, iso })
    }
    return { days: list, offset: (new Date(first + 'T12:00:00Z').getUTCDay() + 1) % 7 } // Saturday first
  }, [open, view])

  const syncView = iso => { const p = jparts(iso); setView({ year: +p.year, month: +p.month }) }
  const emit = (iso, shown) => {
    last.current = { value: iso || '', text: shown }
    setText(shown)
    if (iso) syncView(iso)
    onChange(iso || '')
  }
  const choose = iso => { emit(iso, shamsi(iso)); setOpen(false) }
  const maskDate = raw => {
    const d = digits(raw).replace(/\D/g, '').slice(0, 8)
    const s = d.length > 6 ? `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6)}` : d.length > 4 ? `${d.slice(0, 4)}/${d.slice(4)}` : d
    return faNum(s)
  }
  const invalid = !!(text && !toIso(text))
  const todayIso = today()

  return <div className="date-picker-wrap" ref={wrap} onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false) } }}>
    <div className="date-input-row">
      <input {...rest} aria-invalid={rest['aria-invalid'] || (invalid ? true : undefined)} value={text} placeholder="۱۴۰۵/۰۹/۰۱" inputMode="numeric" autoComplete="off"
        onChange={e => {
          const masked = maskDate(e.target.value)
          emit(toIso(masked), masked)
        }} />
      <button type="button" className="btn calendar-trigger" aria-expanded={open} onClick={() => setOpen(v => !v)}>تقویم</button>
      {optional && value && <button type="button" className="btn ghost" onClick={() => emit('', '')}>پاک‌کردن</button>}
    </div>
    {quick && <div className="chips">{quick.map(([label, n]) => {
      const iso = addDays(todayIso, n)
      return <button type="button" key={n} aria-pressed={value === iso} className={'chip' + (value === iso ? ' on' : '')} onClick={() => choose(iso)}>{label}</button>
    })}</div>}
    {relative && value && !invalid && <small className="hint">{rel(daysTo(value))}</small>}
    {invalid && <small className="err">تاریخ معتبر نیست؛ نمونه: ۱۴۰۵/۰۹/۰۱</small>}
    {open && <div className="jalali-calendar" role="dialog" aria-label="تقویم شمسی">
      <div className="calendar-head">
        <button type="button" aria-label="ماه قبل" onClick={() => changeMonth(-1)}><Icon name="chevR" size={18} /></button>
        <strong>{JMONTHS[view.month - 1]} {faNum(view.year)}</strong>
        <button type="button" aria-label="ماه بعد" onClick={() => changeMonth(1)}><Icon name="chevL" size={18} /></button>
      </div>
      <div className="calendar-grid">
        {JWEEK.map(w => <span className="weekday" key={w}>{w}</span>)}
        {Array.from({ length: offset }, (_, i) => <span className="calendar-blank" key={'b' + i} />)}
        {days.map(({ d, iso }) => (
          <button type="button" key={iso} aria-pressed={iso === value}
            className={'calendar-day' + (iso === value ? ' selected' : '') + (iso === todayIso ? ' today' : '') + ((offset + d - 1) % 7 === 6 ? ' fri' : '')}
            onClick={() => choose(iso)}>{faNum(d)}</button>
        ))}
      </div>
      <button type="button" className="calendar-today" onClick={() => choose(todayIso)}>برو به امروز</button>
    </div>}
  </div>
}

// Type to search existing people, click one to pick it, or keep the typed text as a new person.
export function PersonPicker({ people, value, onChange, ...rest }) {
  const q = normalizeText(value.name)
  const matches = people.filter(p => !q || normalizeText(p.name).includes(q)).slice(0, 6)
  const exact = people.some(p => normalizeText(p.name) === q)
  return <div>
    <input {...rest} value={value.name} placeholder={people.length ? 'نام شخص را بنویسید یا انتخاب کنید' : 'نام شخص (مثلاً: شرکت آلفا)'} autoComplete="off"
      onChange={e => onChange({ personId: '', name: e.target.value })} />
    <div className="chips">
      {matches.map(p => (
        <button type="button" key={p.id} aria-pressed={value.personId === p.id} className={'chip ' + (value.personId === p.id ? 'on' : '')}
          onClick={() => onChange({ personId: p.id, name: p.name })}>{p.name}</button>
      ))}
      {q && !exact && <span className="chip new">«{value.name.trim()}» شخص جدید ثبت می‌شود</span>}
    </div>
  </div>
}
