import { useState } from 'react'
import { balance, isLate, isOpen } from '../domain/ledger'
import { downloadCsv } from '../csv'
import { Badge, EmptyState, Field, Stat, DateInput } from '../components/ui'
import { fmt, rial, shamsi, today } from '../utils'

const DIR_LABEL = { in: 'دریافتنی', out: 'پرداختنی' }

export default function Reports({ data, nameOf }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [dir, setDir] = useState('all')
  const { items: allItems, payments: allPayments } = data

  const items = allItems.filter(i => (dir === 'all' || i.dir === dir) && (!from || i.due >= from) && (!to || i.due <= to))
  const open = items.filter(i => isOpen(i, allPayments))
  const late = open.filter(i => isLate(i, allPayments))
  const payments = allPayments.filter(p => !p.deletedAt && (!from || p.date >= from) && (!to || p.date <= to))
  const filtered = !!(from || to || dir !== 'all')

  const sumBalance = list => list.reduce((s, i) => s + balance(i, allPayments), 0)
  const paidSum = payments.reduce((s, p) => s + p.amount, 0)
  const personOfPayment = p => nameOf(allItems.find(i => i.id === p.itemId)?.personId || '')
  const statusOf = i => (i.status === 'bounced' ? 'برگشتی' : !isOpen(i, allPayments) ? 'تسویه‌شده' : isLate(i, allPayments) ? 'معوق' : 'باز')
  const TONE = { 'برگشتی': 'bad', 'تسویه‌شده': 'ok', 'معوق': 'bad', 'باز': 'info' }

  const exportItems = () => downloadCsv([
    ['نام', 'نوع', 'سند', 'مبلغ', 'مانده', 'سررسید', 'وضعیت', 'توضیح'],
    ...items.map(i => [nameOf(i.personId), DIR_LABEL[i.dir], i.type === 'cheque' ? 'چک' : 'حساب', i.amount, balance(i, allPayments), shamsi(i.due), statusOf(i), i.note]),
  ], `naqdyar-items-${today()}.csv`)
  const exportPayments = () => downloadCsv([
    ['شخص', 'تاریخ', 'مبلغ', 'توضیح'],
    ...payments.map(p => [personOfPayment(p), shamsi(p.date), p.amount, p.note]),
  ], `naqdyar-payments-${today()}.csv`)
  const exportSummary = () => downloadCsv([
    ['گزارش نقدیار', shamsi(today())],
    ['نوع', DIR_LABEL[dir] || 'همه'], ['از', from ? shamsi(from) : ''], ['تا', to ? shamsi(to) : ''],
    ['مجموع اسناد', items.length], ['مانده باز', sumBalance(open)], ['معوق', sumBalance(late)], ['پرداخت در بازه', paidSum],
  ], `naqdyar-summary-${today()}.csv`)

  return <>
    <div className="head"><div><h1>گزارش‌ها</h1><p className="sub">گزارش قابل فیلتر و خروجی سازگار با Excel</p></div></div>
    <section className="card">
      <div className="filters">
        <Field label="از تاریخ (شمسی)"><DateInput optional value={from} onChange={setFrom} /></Field>
        <Field label="تا تاریخ (شمسی)"><DateInput optional value={to} onChange={setTo} /></Field>
        <Field label="نوع">
          <select value={dir} onChange={e => setDir(e.target.value)}>
            <option value="all">همه</option><option value="in">دریافتنی</option><option value="out">پرداختنی</option>
          </select>
        </Field>
        {filtered && <button type="button" className="btn ghost" onClick={() => { setFrom(''); setTo(''); setDir('all') }}>پاک‌کردن فیلتر</button>}
      </div>
    </section>
    <section className="cards">
      <Stat label="اسناد فیلترشده" value={fmt(items.length)} />
      <Stat label="مانده باز" value={rial(sumBalance(open))} />
      <Stat label="مانده معوق" value={rial(sumBalance(late))} tone={late.length ? 'bad' : ''} />
      <Stat label="پرداخت در بازه" value={rial(paidSum)} />
    </section>
    <section className="card">
      <div className="block-head">
        <h2>جدول اسناد</h2>
        <div className="head-actions">
          <button type="button" className="btn sm p" onClick={exportItems}>خروجی Excel اسناد</button>
          <button type="button" className="btn sm" onClick={exportPayments}>پرداخت‌ها</button>
          <button type="button" className="btn sm" onClick={exportSummary}>خلاصه</button>
        </div>
      </div>
      {items.length ? <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>نام</th><th>نوع</th><th>سررسید</th><th>وضعیت</th><th>مانده</th></tr></thead>
        <tbody>{[...items].sort((a, b) => a.due.localeCompare(b.due)).map(i => <tr key={i.id}>
          <td><strong>{nameOf(i.personId)}</strong></td>
          <td>{DIR_LABEL[i.dir]} · {i.type === 'cheque' ? 'چک' : 'حساب'}</td>
          <td>{shamsi(i.due)}</td>
          <td><Badge tone={TONE[statusOf(i)]}>{statusOf(i)}</Badge></td>
          <td className="num"><strong>{rial(balance(i, allPayments))}</strong></td>
        </tr>)}</tbody>
      </table></div> : <EmptyState title="موردی نیست" text={filtered ? 'با این فیلترها سندی پیدا نشد؛ فیلتر را تغییر دهید.' : ''} />}
    </section>
  </>
}
