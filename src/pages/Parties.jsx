import { useState } from 'react'
import { balance, isLate, isOpen, sumBy } from '../domain/ledger.js'
import { daysTo, fmt, normalizeText, rial } from '../utils.js'
import ItemRow from '../components/ItemRow.jsx'
import { Badge, EmptyState, Icon, Search, Stat } from '../components/ui.jsx'

// dir 'in'  -> بدهکاران (people who owe us); dir 'out' -> طلبکاران (people we owe)
export default function Parties({ dir, items, people, api, payments = [], onPerson }) {
  const [openId, setOpenId] = useState(null)
  const [q, setQ] = useState('')
  const isIn = dir === 'in'
  const rows = people.map(p => {
    const mine = items.filter(i => i.personId === p.id && i.dir === dir && isOpen(i, payments))
    const lateItems = mine.filter(i => isLate(i, payments))
    const maxLate = Math.max(0, ...lateItems.map(i => -daysTo(i.due)))
    const lateSum = sumBy(lateItems, i => balance(i, payments))
    const total = sumBy(mine, i => balance(i, payments))
    // priority = late amount weighted by how late it is, then total as a tiebreaker
    return { p, mine, total, lateSum, maxLate, score: lateSum * (1 + maxLate / 30) + total / 1000 }
  }).filter(r => r.mine.length).sort((a, b) => b.score - a.score)
  const total = rows.reduce((t, r) => t + r.total, 0)
  const lateTotal = rows.reduce((t, r) => t + r.lateSum, 0)
  const shown = rows.filter(r => !q.trim() || normalizeText(r.p.name).includes(normalizeText(q)))

  return <>
    <div className="head"><div>
      <h1>{isIn ? 'بدهکاران' : 'طلبکاران'}</h1>
      <p className="sub">{isIn ? 'کسانی که باید به ما پرداخت کنند؛ اولویت پیگیری از بالا' : 'کسانی که ما به آن‌ها بدهکاریم؛ اولویت پرداخت از بالا'}</p>
    </div></div>
    <section className="cards">
      <Stat label={isIn ? 'مجموع طلب باز' : 'مجموع بدهی باز'} value={rial(total)} tone={isIn ? 'in-t' : 'out-t'} />
      <Stat label="معوق" value={rial(lateTotal)} tone={lateTotal ? 'bad' : ''} />
      <Stat label="تعداد اشخاص" value={fmt(rows.length)} />
    </section>
    {rows.length > 6 && <div className="tabs"><Search value={q} onChange={setQ} placeholder="جست‌وجوی نام شخص..." /></div>}
    <section className="card">
      {shown.length ? shown.map(({ p, mine, total: t, lateSum, maxLate }) => {
        const expanded = openId === p.id
        return <div key={p.id} className={'party-row' + (expanded ? ' open' : '')}>
          <button type="button" className="party" aria-expanded={expanded} onClick={() => setOpenId(expanded ? null : p.id)}>
            <Icon name="chevD" size={18} className="chev" />
            <span className="pinfo"><strong>{p.name}</strong>
              <small className="sub2">{fmt(mine.length)} مورد باز{lateSum ? ' · معوق: ' + rial(lateSum) : ''}</small></span>
            {maxLate > 0 && <Badge tone="bad">{fmt(maxLate)} روز تأخیر</Badge>}
            <strong className="pamt">{rial(t)}</strong>
          </button>
          {expanded && <div className="party-body">
            <button type="button" className="btn sm" onClick={() => onPerson(p.id)}>مشاهده پرونده کامل</button>
            {mine.map(i => <ItemRow key={i.id} item={i} name={p.name} showName={false} api={api} payments={payments} />)}
          </div>}
        </div>
      }) : <EmptyState title={q ? 'شخصی با این نام پیدا نشد' : 'موردی ثبت نشده است'} text={q ? '' : (isIn ? 'وقتی چک یا حساب «دریافتی» ثبت کنید، بدهکاران اینجا فهرست می‌شوند.' : 'وقتی چک یا حساب «پرداختی» ثبت کنید، طلبکاران اینجا فهرست می‌شوند.')} />}
    </section>
  </>
}
