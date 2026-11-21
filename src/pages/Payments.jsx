import { useState } from 'react'
import { balance } from '../domain/ledger'
import PaymentForm from '../components/PaymentForm'
import { EmptyState, Search } from '../components/ui'
import { rial, shamsi } from '../utils'

export default function Payments({ data, api, nameOf, onPerson }) {
  const [edit, setEdit] = useState(null), [query, setQuery] = useState('')
  const personOf = p => data.items.find(i => i.id === p.itemId)?.personId || ''
  const term = query.trim()
  const list = data.payments.filter(p => !p.deletedAt && (nameOf(personOf(p)).includes(term) || p.note.includes(term))).sort((a, b) => b.date.localeCompare(a.date))
  const item = edit && data.items.find(i => i.id === edit.itemId)
  return <>
    <div className="head"><div><h1>تاریخچه پرداخت‌ها</h1><p className="sub">پرداخت‌های ثبت‌شده برای حساب‌های بدون چک</p></div></div>
    <div className="tabs"><Search value={query} onChange={setQuery} placeholder="جست‌وجوی شخص یا توضیح..." /></div>
    <section className="card">
      {list.length ? list.map(p => <div className="payment-row" key={p.id}>
        <button type="button" className="linkish" onClick={() => onPerson(personOf(p))}>{nameOf(personOf(p))}</button>
        <span>{shamsi(p.date)}{p.legacyDateUnknown ? ' · تاریخ نامعلوم' : ''}</span>
        <strong>{rial(p.amount)}</strong>
        <small>{p.note}</small>
        <button type="button" className="btn sm" onClick={() => setEdit(p)}>اصلاح</button>
        <button type="button" className="btn sm ghost x" onClick={() => api.deletePayment(p.id)}>حذف</button>
      </div>) : <EmptyState title={term ? 'پرداختی پیدا نشد' : 'پرداختی ثبت نشده است'} text={term ? '' : 'در صفحه «چک‌ها و حساب‌ها» روی یک حساب بدون چک، «ثبت پرداخت» را بزنید.'} />}
    </section>
    {edit && item && <PaymentForm item={item} name={nameOf(item.personId)} payment={edit} remaining={balance(item, data.payments) + edit.amount} onClose={() => setEdit(null)} onSubmit={f => api.updatePayment(edit.id, f)} />}
  </>
}
