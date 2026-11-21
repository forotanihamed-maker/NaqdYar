import { useState } from 'react'
import { isLate, isOpen } from '../domain/ledger'
import { fmt } from '../utils'
import ItemRow from '../components/ItemRow'
import { EmptyState, Search, Tabs } from '../components/ui'

const TABS = [['all', 'همه'], ['in', 'دریافتی'], ['out', 'پرداختی'], ['late', 'معوق'], ['closed', 'بسته‌شده']]

export default function Cheques({ items, nameOf, api, onAdd, payments = [], onPerson }) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const term = q.trim()
  const open = i => isOpen(i, payments)
  const match = i => !term || nameOf(i.personId).includes(term) || (i.note || '').includes(term)
  const inTab = {
    all: () => true, in: i => i.dir === 'in', out: i => i.dir === 'out',
    late: i => isLate(i, payments), closed: i => !open(i),
  }
  const base = items.filter(match)
  const counts = Object.fromEntries(TABS.map(([k]) => [k, base.filter(inTab[k]).length]))
  // open documents first (by due date), settled ones at the bottom
  const list = base.filter(inTab[tab]).sort((a, b) => (open(b) - open(a)) || (open(a) ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due)))

  return <>
    <div className="head"><div><h1>چک‌ها و حساب‌ها</h1><p className="sub">اسناد باز بر اساس سررسید؛ تسویه‌شده‌ها پایین فهرست</p></div></div>
    <Tabs tabs={TABS} value={tab} onChange={setTab} counts={counts}>
      <Search value={q} onChange={setQ} placeholder="جست‌وجوی نام یا توضیح..." />
    </Tabs>
    <section className="card">
      {list.length
        ? list.map(i => <ItemRow key={i.id} item={i} name={nameOf(i.personId)} api={api} payments={payments} onPerson={onPerson} />)
        : items.length
          ? <EmptyState title="موردی پیدا نشد" text={term ? `برای «${term}» نتیجه‌ای در این بخش نیست.` : 'در این بخش سندی وجود ندارد.'} />
          : <EmptyState title="هنوز سندی ثبت نشده" text="اولین چک یا حساب را ثبت کنید تا اینجا ببینید." action={<button type="button" className="btn p" onClick={onAdd}>+ ثبت چک یا حساب</button>} />}
    </section>
  </>
}
