import { useState } from 'react'
import { balance, isLate, isOpen, sumBy } from '../domain/ledger'
import { daysTo, fmt, rial } from '../utils'
import ItemRow from '../components/ItemRow'

// dir 'in'  -> بدهکاران (people who owe us); dir 'out' -> طلبکاران (people we owe)
export default function Parties({ dir, items, people, api, payments = [], onPerson }) {
  const [openId, setOpenId] = useState(null)
  const isIn = dir === 'in'
  const rows = people.map(p => {
    const mine = items.filter(i => i.personId === p.id && i.dir === dir && isOpen(i, payments))
    const lateItems = mine.filter(i => isLate(i, payments))
    const maxLate = Math.max(0, ...lateItems.map(i => -daysTo(i.due)))
    const lateSum = sumBy(lateItems, i => balance(i, payments))
    const total = sumBy(mine, i => balance(i, payments))
    // priority = late amount weighted by how late it is, then total as a tiebreaker
    return { p, mine, total, lateSum, score: lateSum * (1 + maxLate / 30) + total / 1000 }
  }).filter(r => r.mine.length).sort((a, b) => b.score - a.score)
  const total = rows.reduce((t, r) => t + r.total, 0)
  const lateTotal = rows.reduce((t, r) => t + r.lateSum, 0)
  return <>
    <div className="head"><div>
      <h1>{isIn ? 'بدهکاران' : 'طلبکاران'}</h1>
      <p className="sub">{isIn ? 'کسانی که باید به ما پرداخت کنند؛ اولویت پیگیری از بالا' : 'کسانی که ما به آن‌ها بدهکاریم؛ اولویت پرداخت از بالا'}</p>
    </div></div>
    <section className="cards">
      <div className="card"><small>{isIn ? 'مجموع طلب باز' : 'مجموع بدهی باز'}</small><b className={isIn ? 'in-t' : 'out-t'}>{rial(total)}</b></div>
      <div className="card"><small>معوق</small><b className="bad">{rial(lateTotal)}</b></div>
      <div className="card"><small>تعداد اشخاص</small><b>{fmt(rows.length)}</b></div>
    </section>
    <section className="card">
      {rows.length ? rows.map(({ p, mine, total: t, lateSum }) => <div key={p.id}>
        <button className="party" onClick={() => setOpenId(openId === p.id ? null : p.id)}>
          <span><strong>{p.name}</strong>
            <small className="sub2">{fmt(mine.length)} مورد باز{lateSum ? ' · معوق: ' + rial(lateSum) : ''}</small></span>
          <strong>{rial(t)}</strong>
        </button>
        {openId === p.id && <button className="btn" onClick={() => onPerson(p.id)}>مشاهده پرونده شخص</button>}
        {openId === p.id && mine.map(i => <ItemRow key={i.id} item={i} name={p.name} api={api} payments={payments} />)}
      </div>) : <p className="empty">موردی ثبت نشده است.</p>}
    </section>
  </>
}
