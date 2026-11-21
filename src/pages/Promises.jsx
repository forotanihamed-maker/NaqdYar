import { useState } from 'react'
import { balance, isLate, isOpen, promiseState, PROMISE_LABEL } from '../domain/ledger'
import { daysTo, fmt, rel, rial, shamsi, today } from '../utils'
import { Modal, Field, AmountInput, DateInput } from '../components/ui'

const TABS = [['todo', 'نیازمند اقدام'], ['pending', 'در انتظار'], ['paid', 'پرداخت‌شده'], ['cancelled', 'لغوشده'], ['all', 'همه']]
const CLS = { broken: 'bad', partial: 'out-t', paid: 'in-t' }

// Daily collection screen: who to chase today, which promises failed, which late debtors have no promise yet.
export default function Promises({ data, api, nameOf, onPerson }) {
  const [tab, setTab] = useState('todo')
  const [form, setForm] = useState(null)
  const { items, payments, people } = data
  const list = (data.promises || []).map(p => ({ ...p, ...promiseState(p, items, payments) })).sort((a, b) => a.date.localeCompare(b.date))
  const failed = list.filter(p => p.status === 'broken' || p.status === 'partial')
  const dueToday = list.filter(p => p.status === 'pending' && p.date === today())
  const promised = new Set(list.filter(p => p.status === 'pending').map(p => p.personId))
  const lateNoPromise = people
    .map(pr => ({ pr, sum: items.filter(i => i.personId === pr.id && i.dir === 'in' && isLate(i, payments)).reduce((s, i) => s + balance(i, payments), 0) }))
    .filter(x => x.sum > 0 && !promised.has(x.pr.id)).sort((a, b) => b.sum - a.sum)
  const followDue = (data.followUps || []).filter(f => f.nextFollowUpDate && f.nextFollowUpDate <= today()).length
  const shown = tab === 'todo' ? [...failed, ...dueToday] : tab === 'all' ? list : list.filter(p => p.status === tab)
  const row = p => <div className="payment-row" key={p.id}>
    <button className="btn" onClick={() => onPerson(p.personId)}>{nameOf(p.personId)}</button>
    <strong>{rial(p.amount)}</strong>
    <span>{shamsi(p.date)} · {rel(daysTo(p.date))}</span>
    <span>پرداخت‌شده از زمان وعده: {rial(p.paid)}</span>
    <strong className={CLS[p.status] || ''}>{PROMISE_LABEL[p.status]}</strong>
    {p.status !== 'paid' && p.status !== 'cancelled' && <button className="btn x" onClick={() => api.cancelPromise(p.id)}>لغو</button>}
  </div>
  const personItems = form ? items.filter(i => i.personId === form.personId && i.dir === 'in' && isOpen(i, payments)) : []
  return <>
    <div className="head">
      <div><h1>وعده‌ها و وظایف وصول</h1><p className="sub">ثبت وعده مانده بدهی را کم نمی‌کند؛ فقط پرداخت واقعی کم می‌کند.</p></div>
      <button className="btn p" onClick={() => setForm({ personId: '', itemId: '', amount: '', date: today() })}>+ وعده جدید</button>
    </div>
    <section className="cards">
      <div className="card"><small>وعده انجام‌نشده یا ناقص</small><b className="bad">{fmt(failed.length)}</b></div>
      <div className="card"><small>وعده‌های امروز</small><b>{fmt(dueToday.length)}</b></div>
      <div className="card"><small>پیگیری موعددار</small><b>{fmt(followDue)}</b></div>
      <div className="card"><small>معوق بدون وعده فعال</small><b className="bad">{fmt(lateNoPromise.length)}</b></div>
    </section>
    <div className="tabs">{TABS.map(([k, t]) => <button key={k} className={'btn ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{t}</button>)}</div>
    <section className="card">{shown.length ? shown.map(row) : <p className="empty">موردی در این بخش نیست.</p>}</section>
    <section className="card"><h2>بدهکاران معوق بدون وعده فعال</h2>
      {lateNoPromise.length ? lateNoPromise.map(({ pr, sum }) => <div className="payment-row" key={pr.id}>
        <button className="btn" onClick={() => onPerson(pr.id)}>{pr.name}</button><strong className="bad">{rial(sum)}</strong>
        <button className="btn p" onClick={() => setForm({ personId: pr.id, itemId: '', amount: '', date: today() })}>ثبت وعده</button>
      </div>) : <p className="empty">همه بدهکاران معوق وعده فعال دارند.</p>}
    </section>
    {form && <Modal title="ثبت وعده پرداخت" onClose={() => setForm(null)}>
      <form onSubmit={e => { e.preventDefault(); if (api.addPromise(form)) setForm(null) }}>
        <label>مشتری<select required value={form.personId} onChange={e => setForm({ ...form, personId: e.target.value, itemId: '' })}>
          <option value="">انتخاب مشتری</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label>سند مرتبط (اختیاری)<select value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })}>
          <option value="">همه اسناد باز این مشتری</option>
          {personItems.map(i => <option key={i.id} value={i.id}>{i.type === 'cheque' ? 'چک' : 'حساب'} · {rial(balance(i, payments))} · {shamsi(i.due)}</option>)}</select></label>
        <Field label="مبلغ وعده (ریال)"><AmountInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} /></Field>
        <Field label="تاریخ وعده (شمسی)"><DateInput value={form.date} onChange={v => setForm({ ...form, date: v })} /></Field>
        <div className="seg"><button type="button" onClick={() => setForm(null)}>انصراف</button><button className="on" type="submit">ثبت وعده</button></div>
      </form>
    </Modal>}
  </>
}
