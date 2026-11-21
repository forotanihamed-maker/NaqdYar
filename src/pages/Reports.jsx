import { useState } from 'react'
import { balance, isLate, isOpen } from '../domain/ledger'
import { downloadCsv } from '../csv'
import { Field, DateInput } from '../components/ui'
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

  const sumBalance = list => list.reduce((s, i) => s + balance(i, allPayments), 0)
  const paidSum = payments.reduce((s, p) => s + p.amount, 0)
  const personOfPayment = p => nameOf(allItems.find(i => i.id === p.itemId)?.personId || '')
  const statusOf = i => (i.status === 'bounced' ? 'برگشتی' : !isOpen(i, allPayments) ? 'تسویه‌شده' : isLate(i, allPayments) ? 'معوق' : 'باز')

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
      <div className="tabs filters">
        <Field label="از تاریخ (شمسی)"><DateInput optional value={from} onChange={setFrom} /></Field>
        <Field label="تا تاریخ (شمسی)"><DateInput optional value={to} onChange={setTo} /></Field>
        <select value={dir} onChange={e => setDir(e.target.value)}>
          <option value="all">همه</option><option value="in">دریافتنی</option><option value="out">پرداختنی</option>
        </select>
        <button className="btn" onClick={() => { setFrom(''); setTo(''); setDir('all') }}>پاک‌کردن فیلتر</button>
      </div>
      <div className="cards">
        <div className="card"><small>اسناد فیلترشده</small><b>{fmt(items.length)}</b></div>
        <div className="card"><small>مانده باز</small><b>{rial(sumBalance(open))}</b></div>
        <div className="card"><small>مانده معوق</small><b className="bad">{rial(sumBalance(late))}</b></div>
        <div className="card"><small>پرداخت در بازه</small><b>{rial(paidSum)}</b></div>
      </div>
      <button className="btn p" onClick={exportItems}>خروجی Excel اسناد</button>{' '}
      <button className="btn" onClick={exportPayments}>خروجی Excel پرداخت‌ها</button>{' '}
      <button className="btn" onClick={exportSummary}>خروجی خلاصه</button>
    </section>
    <section className="card"><h2>جدول اسناد</h2>
      {items.length ? items.map(i => <div className="payment-row" key={i.id}>
        <strong>{nameOf(i.personId)}</strong><span>{DIR_LABEL[i.dir]}</span><span>{shamsi(i.due)}</span><span>{statusOf(i)}</span><strong>{rial(balance(i, allPayments))}</strong>
      </div>) : <p className="empty">موردی نیست</p>}
    </section>
  </>
}
