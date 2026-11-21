import { useState } from 'react'
import { isLate } from '../domain/ledger'
import ItemRow from '../components/ItemRow'

const TABS = [['all', 'همه'], ['in', 'دریافتی'], ['out', 'پرداختی'], ['late', 'معوق']]

export default function Cheques({ items, nameOf, api, onAdd, payments = [] }) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const list = items
    .filter(i => (tab === 'all' || (tab === 'late' ? isLate(i, payments) : i.dir === tab)) && nameOf(i.personId).includes(q.trim()))
    .sort((a, b) => a.due.localeCompare(b.due))
  return <>
    <div className="head">
      <div><h1>چک‌ها و حساب‌ها</h1><p className="sub">همه اسناد، مرتب‌شده بر اساس سررسید</p></div>
      <button className="btn p" onClick={onAdd}>+ ثبت چک یا حساب</button>
    </div>
    <div className="tabs">
      {TABS.map(([k, t]) => <button key={k} className={'btn ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{t}</button>)}
      <input className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="جست‌وجوی نام شخص..." />
    </div>
    <section className="card">
      {list.length
        ? list.map(i => <ItemRow key={i.id} item={i} name={nameOf(i.personId)} api={api} payments={payments} />)
        : <p className="empty">موردی پیدا نشد. با دکمه «ثبت چک یا حساب» شروع کنید.</p>}
    </section>
  </>
}
