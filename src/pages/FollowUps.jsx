import { useState } from 'react'
import FollowUpForm from '../components/FollowUpForm.jsx'
import { Badge, EmptyState, Search, Tabs } from '../components/ui.jsx'
import { rial, shamsi, today, normalizeText } from '../utils.js'

const TABS = [['due', 'امروز و عقب‌افتاده'], ['future', 'آینده'], ['none', 'بدون موعد'], ['all', 'همه']]
const blank = () => ({ personId: '', itemId: '', contactDate: today(), method: 'تماس', result: '', note: '', promisedAmount: '', promiseDate: '', nextFollowUpDate: '' })

export default function FollowUps({ data, api, nameOf, onPerson }) {
  const [form, setForm] = useState(null)
  const [tab, setTab] = useState('due')
  const [q, setQ] = useState('')
  const now = today()

  const needle = normalizeText(q)
  const list = (data.followUps || [])
    .filter(f => normalizeText(nameOf(f.personId)).includes(needle))
    .sort((a, b) => (a.nextFollowUpDate || '9999').localeCompare(b.nextFollowUpDate || '9999'))
  const groups = {
    due: list.filter(f => f.nextFollowUpDate && f.nextFollowUpDate <= now),
    future: list.filter(f => f.nextFollowUpDate > now),
    none: list.filter(f => !f.nextFollowUpDate),
    all: list,
  }
  const counts = Object.keys(groups).reduce((m, k) => { m[k] = groups[k].length; return m }, {})
  const save = f => (f.id ? (api.updateFollowUp(f.id, f), true) : api.addFollowUp(f))

  return <>
    <div className="head">
      <div><h1>پیگیری مطالبات</h1><p className="sub">وعده پرداخت ثبت‌شده، پرداخت واقعی نیست.</p></div>
      <button type="button" className="btn p" onClick={() => setForm(blank())}>+ ثبت پیگیری</button>
    </div>
    <Tabs tabs={TABS} value={tab} onChange={setTab} counts={counts}>
      <Search value={q} onChange={setQ} placeholder="جست‌وجوی شخص..." />
    </Tabs>
    <section className="card">
      {groups[tab].length ? groups[tab].map(f => {
        const overdue = f.nextFollowUpDate && f.nextFollowUpDate < now
        return <div className="payment-row" key={f.id}>
          <button type="button" className="linkish" onClick={() => onPerson(f.personId)}>{nameOf(f.personId)}</button>
          <span>{shamsi(f.contactDate)} · {f.method}</span>
          {f.nextFollowUpDate
            ? <Badge tone={overdue ? 'bad' : f.nextFollowUpDate === now ? 'warn' : 'info'}>{overdue ? 'عقب‌افتاده از ' : f.nextFollowUpDate === now ? 'امروز · ' : 'پیگیری بعدی '}{shamsi(f.nextFollowUpDate)}</Badge>
            : <Badge>بدون موعد</Badge>}
          {(f.result || f.note) && <p className="full">{f.result} {f.note}</p>}
          {f.promisedAmount > 0 && <span>وعده: {rial(f.promisedAmount)}{f.promiseDate ? ' · ' + shamsi(f.promiseDate) : ''}</span>}
          <button type="button" className="btn sm" onClick={() => setForm({ ...f })}>ویرایش</button>
          <button type="button" className="btn sm ghost x" onClick={() => api.deleteFollowUp(f.id)}>حذف</button>
        </div>
      }) : <EmptyState title="پیگیری‌ای در این بخش نیست" text={tab === 'due' ? 'پیگیری امروز یا عقب‌افتاده‌ای ندارید.' : ''} />}
    </section>
    {form && <FollowUpForm initial={form} people={data.people} items={data.items} onClose={() => setForm(null)} onSave={save} />}
  </>
}
