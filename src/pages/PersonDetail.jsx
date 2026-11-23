import { useState } from 'react'
import { balance, isLate, isOpen, promiseState, PROMISE_LABEL } from '../domain/ledger.js'
import { rial, shamsi, today } from '../utils.js'
import ItemRow from '../components/ItemRow.jsx'
import FollowUpForm from '../components/FollowUpForm.jsx'
import { AmountInput, Badge, EmptyState, Field, FormActions, Icon, Modal, Stat } from '../components/ui.jsx'

const blankFollowUp = personId => ({ personId, itemId: '', contactDate: today(), method: 'تماس', result: '', note: '', promisedAmount: '', promiseDate: '', nextFollowUpDate: '' })
const PROMISE_TONE = { pending: 'info', paid: 'ok', partial: 'warn', broken: 'bad', cancelled: 'muted', deleted: 'muted' }

export default function PersonDetail({ person, data, api, onBack, onAddItem, nameOf }) {
  const [edit, setEdit] = useState(false)
  const [f, setF] = useState(person)
  const [nameErr, setNameErr] = useState('')
  const [followUp, setFollowUp] = useState(null)
  const set = (k, v) => setF(c => ({ ...c, [k]: v }))

  const items = data.items.filter(i => i.personId === person.id)
    .sort((a, b) => (isOpen(b, data.payments) - isOpen(a, data.payments)) || a.due.localeCompare(b.due))
  const payments = data.payments.filter(p => items.some(i => i.id === p.itemId) && !p.deletedAt)
  const followups = (data.followUps || []).filter(x => x.personId === person.id)
  const promises = (data.promises || []).filter(p => p.personId === person.id)
  const open = items.filter(i => isOpen(i, data.payments))
  const lateItems = open.filter(i => isLate(i, data.payments))
  const sum = list => list.reduce((s, i) => s + balance(i, data.payments), 0)
  const save = e => {
    e.preventDefault()
    if (!f.name.trim()) { setNameErr('نام شخص الزامی است'); return }
    if (api.updatePerson(person.id, f)) setEdit(false)
  }
  const saveFollowUp = x => (x.id ? (api.updateFollowUp(x.id, x), true) : api.addFollowUp(x))

  return <>
    <div className="head">
      <div>
        <button type="button" className="linkish back" onClick={onBack}><Icon name="chevR" size={16} /> بازگشت</button>
        <h1>پرونده {person.name}</h1>
        <p className="sub">تاریخچه کامل اسناد، پرداخت‌ها و پیگیری‌ها</p>
      </div>
      <div className="head-actions">
        <button type="button" className="btn p" onClick={() => onAddItem({ personId: person.id, name: person.name })}>+ سند جدید</button>
        <button type="button" className="btn" onClick={() => setFollowUp(blankFollowUp(person.id))}>+ پیگیری</button>
        <button type="button" className="btn ghost" onClick={() => { setF(person); setNameErr(''); setEdit(true) }}>ویرایش اطلاعات</button>
      </div>
    </div>

    <section className="cards">
      <Stat label="مانده دریافتنی" value={rial(sum(open.filter(i => i.dir === 'in')))} tone="in-t" />
      <Stat label="مانده پرداختنی" value={rial(sum(open.filter(i => i.dir === 'out')))} tone="out-t" />
      <Stat label="معوق" value={rial(sum(lateItems))} tone={lateItems.length ? 'bad' : ''} />
    </section>

    <section className="card">
      <h2>اطلاعات شخص</h2>
      <dl className="kv">
        <dt>تلفن</dt><dd>{person.phone ? <a className="tel" href={`tel:${person.phone}`}><Icon name="phone" size={15} /> {person.phone}</a> : 'ثبت نشده'}</dd>
        <dt>مسئول خرید/حسابداری</dt><dd>{person.contactPerson || '—'}</dd>
        <dt>سقف اعتبار</dt><dd>{person.creditLimit ? rial(person.creditLimit) : 'ندارد'}</dd>
        <dt>شرایط پرداخت</dt><dd>{person.paymentTerms || '—'}</dd>
        <dt>یادداشت</dt><dd>{person.note || '—'}</dd>
      </dl>
    </section>

    <section className="card">
      <h2>اسناد</h2>
      {items.length
        ? items.map(i => <ItemRow key={i.id} item={i} name={person.name} showName={false} api={api} payments={data.payments} />)
        : <EmptyState title="سندی ثبت نشده" action={<button type="button" className="btn p" onClick={() => onAddItem({ personId: person.id, name: person.name })}>+ ثبت سند برای این شخص</button>} />}
    </section>

    <section className="card">
      <h2>وعده‌های پرداخت</h2>
      {promises.length ? promises.map(p => {
        const s = promiseState(p, data.items, data.payments)
        return <div className="payment-row" key={p.id}>
          <strong>{rial(p.amount)}</strong><span>تا {shamsi(p.date)}</span><span>پرداخت‌شده: {rial(s.paid)}</span>
          <Badge tone={PROMISE_TONE[s.status]}>{PROMISE_LABEL[s.status]}</Badge>
        </div>
      }) : <EmptyState text="وعده‌ای ثبت نشده" />}
    </section>

    <section className="card">
      <h2>پیگیری‌ها</h2>
      {followups.length ? followups.map(x => <div className="payment-row" key={x.id}>
        <strong>{x.method} · {shamsi(x.contactDate)}</strong><span>{x.result}</span><small>{x.note}</small>
        {x.promisedAmount > 0 && <span>وعده: {rial(x.promisedAmount)}{x.promiseDate ? ' · ' + shamsi(x.promiseDate) : ''}</span>}
        <span>پیگیری بعدی: {x.nextFollowUpDate ? shamsi(x.nextFollowUpDate) : '—'}</span>
        <button type="button" className="btn sm" onClick={() => setFollowUp({ ...x })}>ویرایش</button>
      </div>) : <EmptyState text="پیگیری ثبت نشده" />}
    </section>

    {payments.length > 0 && <section className="card">
      <h2>همه پرداخت‌ها</h2>
      {payments.map(p => <div className="payment-row" key={p.id}><span>{shamsi(p.date)}</span><strong>{rial(p.amount)}</strong><small>{p.note}</small></div>)}
    </section>}

    {edit && <Modal title="ویرایش اطلاعات شخص" onClose={() => setEdit(false)}>
      <form noValidate onSubmit={save}>
        <Field label="نام" error={nameErr}><input value={f.name} onChange={e => { set('name', e.target.value); setNameErr('') }} /></Field>
        <Field label="تلفن"><input className="ltr" type="tel" inputMode="tel" value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="مسئول خرید/حسابداری"><input value={f.contactPerson || ''} onChange={e => set('contactPerson', e.target.value)} /></Field>
        <Field label="سقف اعتبار (ریال)" hint="هنگام ثبت سند دریافتی، اگر مانده از سقف بگذرد هشدار می‌گیرید."><AmountInput optional value={f.creditLimit || ''} onChange={v => set('creditLimit', v)} /></Field>
        <Field label="شرایط پرداخت"><input value={f.paymentTerms || ''} onChange={e => set('paymentTerms', e.target.value)} placeholder="مثلاً چک ۶۰ روزه" /></Field>
        <Field label="یادداشت"><textarea rows={2} value={f.note || ''} onChange={e => set('note', e.target.value)} /></Field>
        <FormActions onCancel={() => setEdit(false)} submitLabel="ذخیره" cancelLabel="لغو" />
      </form>
    </Modal>}
    {followUp && <FollowUpForm initial={followUp} people={data.people} items={data.items} onClose={() => setFollowUp(null)} onSave={saveFollowUp} />}
  </>
}
