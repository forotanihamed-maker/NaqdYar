import { useState } from 'react'
import FollowUpForm from '../components/FollowUpForm'
import { fmt, rial, shamsi, today } from '../utils'

const TABS = [['due', 'امروز و عقب‌افتاده'], ['future', 'آینده'], ['none', 'بدون موعد'], ['all', 'همه']]
const blank = () => ({ personId: '', itemId: '', contactDate: today(), method: 'تماس', result: '', note: '', promisedAmount: '', promiseDate: '', nextFollowUpDate: '' })

export default function FollowUps({ data, api, nameOf }) {
  const [form, setForm] = useState(null)
  const [tab, setTab] = useState('due')
  const [q, setQ] = useState('')
  const now = today()

  const list = (data.followUps || [])
    .filter(f => nameOf(f.personId).includes(q.trim()))
    .sort((a, b) => (a.nextFollowUpDate || '9999').localeCompare(b.nextFollowUpDate || '9999'))
  const groups = {
    due: list.filter(f => f.nextFollowUpDate && f.nextFollowUpDate <= now),
    future: list.filter(f => f.nextFollowUpDate > now),
    none: list.filter(f => !f.nextFollowUpDate),
    all: list,
  }
  const save = f => (f.id ? (api.updateFollowUp(f.id, f), true) : api.addFollowUp(f))

  return <>
    <div className="head">
      <div><h1>پیگیری مطالبات</h1><p className="sub">وعده پرداخت ثبت‌شده، پرداخت واقعی نیست.</p></div>
      <button className="btn p" onClick={() => setForm(blank())}>+ ثبت پیگیری</button>
    </div>
    <div className="cards">
      <div className="card"><small>پیگیری‌های سررسید</small><b className="bad">{fmt(groups.due.length)}</b></div>
      <div className="card"><small>پیگیری آینده</small><b>{fmt(groups.future.length)}</b></div>
      <div className="card"><small>بدون موعد</small><b>{fmt(groups.none.length)}</b></div>
    </div>
    <div className="tabs">
      {TABS.map(([k, t]) => <button key={k} className={'btn ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{t}</button>)}
      <input className="search" placeholder="جست‌وجوی شخص" value={q} onChange={e => setQ(e.target.value)} />
    </div>
    <section className="card">
      {groups[tab].length ? groups[tab].map(f => <div className="payment-row" key={f.id}>
        <strong>{nameOf(f.personId)}</strong>
        <span>{shamsi(f.contactDate)} · {f.method}</span>
        <span>{f.nextFollowUpDate ? 'پیگیری بعدی: ' + shamsi(f.nextFollowUpDate) : 'بدون موعد'}</span>
        {(f.result || f.note) && <p style={{ width: '100%' }}>{f.result} {f.note}</p>}
        {f.promisedAmount > 0 && <span>وعده: {rial(f.promisedAmount)}{f.promiseDate ? ' · ' + shamsi(f.promiseDate) : ''}</span>}
        <button className="btn" onClick={() => setForm({ ...f })}>ویرایش</button>
        <button className="btn x" onClick={() => api.deleteFollowUp(f.id)}>حذف</button>
      </div>) : <p className="empty">پیگیری‌ای در این بخش وجود ندارد.</p>}
    </section>
    {form && <FollowUpForm initial={form} people={data.people} items={data.items} onClose={() => setForm(null)} onSave={save} />}
  </>
}
