import { useState } from 'react'
import { balance, isLate, isOpen, promiseState, PROMISE_LABEL } from '../domain/ledger'
import { daysTo, fmt, rel, rial, shamsi, today } from '../utils'
import { AmountInput, Badge, DateInput, EmptyState, Field, FormActions, Modal, Stat, Tabs } from '../components/ui'

const TABS = [['todo', 'نیازمند اقدام'], ['pending', 'در انتظار'], ['paid', 'پرداخت‌شده'], ['cancelled', 'لغوشده'], ['all', 'همه']]
const TONE = { pending: 'info', paid: 'ok', partial: 'warn', broken: 'bad', cancelled: 'muted' }
const PROMISE_QUICK = [['فردا', 1], ['۳ روز دیگر', 3], ['هفته دیگر', 7]]

// Daily collection screen: who to chase today, which promises failed, which late debtors have no promise yet.
export default function Promises({ data, api, nameOf, onPerson }) {
  const [tab, setTab] = useState('todo')
  const [form, setForm] = useState(null)
  const [err, setErr] = useState({})
  const { items, payments, people } = data
  const list = (data.promises || []).map(p => ({ ...p, ...promiseState(p, items, payments) })).sort((a, b) => a.date.localeCompare(b.date))
  const failed = list.filter(p => p.status === 'broken' || p.status === 'partial')
  const dueToday = list.filter(p => p.status === 'pending' && p.date === today())
  const promised = new Set(list.filter(p => p.status === 'pending').map(p => p.personId))
  const lateNoPromise = people
    .map(pr => ({ pr, sum: items.filter(i => i.personId === pr.id && i.dir === 'in' && isLate(i, payments)).reduce((s, i) => s + balance(i, payments), 0) }))
    .filter(x => x.sum > 0 && !promised.has(x.pr.id)).sort((a, b) => b.sum - a.sum)
  const followDue = (data.followUps || []).filter(f => f.nextFollowUpDate && f.nextFollowUpDate <= today()).length
  const todo = [...failed, ...dueToday]
  const shown = tab === 'todo' ? todo : tab === 'all' ? list : list.filter(p => p.status === tab)
  const counts = { todo: todo.length, pending: list.filter(p => p.status === 'pending').length, paid: list.filter(p => p.status === 'paid').length, cancelled: list.filter(p => p.status === 'cancelled').length, all: list.length }

  const openForm = personId => { setErr({}); setForm({ personId, itemId: '', amount: '', date: today() }) }
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(e => ({ ...e, [k]: '' })) }
  const submit = e => {
    e.preventDefault()
    const er = {}
    if (!form.personId) er.personId = 'مشتری را انتخاب کنید'
    if (!(Number(form.amount) > 0)) er.amount = 'مبلغ وعده را وارد کنید'
    if (!form.date) er.date = 'تاریخ وعده را وارد کنید'
    setErr(er)
    if (!Object.keys(er).length && api.addPromise(form)) setForm(null)
  }
  const personItems = form ? items.filter(i => i.personId === form.personId && i.dir === 'in' && isOpen(i, payments)) : []

  const row = p => <div className="payment-row" key={p.id}>
    <button type="button" className="linkish" onClick={() => onPerson(p.personId)}>{nameOf(p.personId)}</button>
    <strong>{rial(p.amount)}</strong>
    <span>{shamsi(p.date)} · {rel(daysTo(p.date))}</span>
    <span>پرداخت‌شده از زمان وعده: {rial(p.paid)}</span>
    <Badge tone={TONE[p.status]}>{PROMISE_LABEL[p.status]}</Badge>
    {p.status !== 'paid' && p.status !== 'cancelled' && <button type="button" className="btn sm ghost x" onClick={() => api.cancelPromise(p.id)}>لغو</button>}
  </div>

  return <>
    <div className="head">
      <div><h1>وعده‌ها و وظایف وصول</h1><p className="sub">ثبت وعده مانده بدهی را کم نمی‌کند؛ فقط پرداخت واقعی کم می‌کند.</p></div>
      <button type="button" className="btn p" onClick={() => openForm('')}>+ وعده جدید</button>
    </div>
    <section className="cards">
      <Stat label="وعده انجام‌نشده یا ناقص" value={fmt(failed.length)} tone={failed.length ? 'bad' : ''} />
      <Stat label="وعده‌های امروز" value={fmt(dueToday.length)} />
      <Stat label="پیگیری موعددار" value={fmt(followDue)} />
      <Stat label="معوق بدون وعده فعال" value={fmt(lateNoPromise.length)} tone={lateNoPromise.length ? 'bad' : ''} />
    </section>
    <Tabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />
    <section className="card">{shown.length ? shown.map(row) : <EmptyState title="موردی در این بخش نیست" text={tab === 'todo' ? 'وعده انجام‌نشده یا سررسید امروز ندارید.' : ''} />}</section>
    <section className="card"><h2>بدهکاران معوق بدون وعده فعال</h2>
      {lateNoPromise.length ? lateNoPromise.map(({ pr, sum }) => <div className="payment-row" key={pr.id}>
        <button type="button" className="linkish" onClick={() => onPerson(pr.id)}>{pr.name}</button><strong className="bad">{rial(sum)}</strong>
        <button type="button" className="btn sm p" onClick={() => openForm(pr.id)}>ثبت وعده</button>
      </div>) : <EmptyState text="همه بدهکاران معوق وعده فعال دارند." />}
    </section>
    {form && <Modal title="ثبت وعده پرداخت" onClose={() => setForm(null)}>
      <form noValidate onSubmit={submit}>
        <Field label="مشتری" error={err.personId}>
          <select value={form.personId} onChange={e => { setForm({ ...form, personId: e.target.value, itemId: '' }); setErr(x => ({ ...x, personId: '' })) }}>
            <option value="">انتخاب مشتری</option>{people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        {form.personId && personItems.length > 0 && <Field label="سند مرتبط (اختیاری)">
          <select value={form.itemId} onChange={e => set('itemId', e.target.value)}>
            <option value="">همه اسناد باز این مشتری</option>
            {personItems.map(i => <option key={i.id} value={i.id}>{i.type === 'cheque' ? 'چک' : 'حساب'} · {rial(balance(i, payments))} · {shamsi(i.due)}</option>)}
          </select>
        </Field>}
        <Field label="مبلغ وعده (ریال)" error={err.amount}><AmountInput value={form.amount} onChange={v => set('amount', v)} /></Field>
        <Field label="تاریخ وعده (شمسی)" error={err.date}><DateInput quick={PROMISE_QUICK} relative value={form.date} onChange={v => set('date', v)} /></Field>
        <FormActions onCancel={() => setForm(null)} submitLabel="ثبت وعده" />
      </form>
    </Modal>}
  </>
}
