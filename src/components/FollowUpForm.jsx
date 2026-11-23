import { useState } from 'react'
import { rial, shamsi } from '../utils.js'
import { Modal, Field, AmountInput, DateInput, Seg, FormActions } from './ui.jsx'

const METHODS = ['تماس', 'پیام', 'مراجعه', 'سایر']
const NEXT_QUICK = [['فردا', 1], ['۳ روز دیگر', 3], ['هفته دیگر', 7]]

// Add or edit one follow-up. `initial` has an id when editing.
export default function FollowUpForm({ initial, people, items, onClose, onSave }) {
  const [f, setF] = useState(initial)
  const [err, setErr] = useState({})
  const set = (k, v) => { setF(c => ({ ...c, [k]: v })); if (err[k]) setErr(e => ({ ...e, [k]: '' })) }
  const submit = e => {
    e.preventDefault()
    const er = {}
    if (!f.personId) er.personId = 'شخص را انتخاب کنید'
    if (!f.contactDate) er.contactDate = 'تاریخ تماس را وارد کنید'
    setErr(er)
    if (!Object.keys(er).length && onSave(f)) onClose()
  }
  const personItems = items.filter(i => i.personId === f.personId)
  const hasPromise = Number(f.promisedAmount) > 0 || !!f.promiseDate

  return <Modal title={f.id ? 'ویرایش پیگیری' : 'ثبت پیگیری'} onClose={onClose}>
    <form noValidate onSubmit={submit}>
      <Field label="شخص" error={err.personId}>
        <select value={f.personId} onChange={e => { setF(c => ({ ...c, personId: e.target.value, itemId: '' })); setErr(x => ({ ...x, personId: '' })) }}>
          <option value="">انتخاب شخص</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      {f.personId && personItems.length > 0 && <Field label="سند مرتبط (اختیاری)">
        <select value={f.itemId} onChange={e => set('itemId', e.target.value)}>
          <option value="">بدون سند مشخص</option>
          {personItems.map(i => <option key={i.id} value={i.id}>{i.dir === 'in' ? 'طلب' : 'بدهی'} · {rial(i.amount)} · {shamsi(i.due)}</option>)}
        </select>
      </Field>}
      <Field label="تاریخ تماس (شمسی)" error={err.contactDate}><DateInput value={f.contactDate} onChange={v => set('contactDate', v)} /></Field>
      <Field label="روش" group><Seg value={f.method} onChange={v => set('method', v)} options={METHODS.map(m => [m, m])} /></Field>
      <Field label="نتیجه تماس"><input value={f.result} onChange={e => set('result', e.target.value)} placeholder="مثلاً: گفت هفته بعد پرداخت می‌کند" /></Field>
      <Field label="یادداشت (اختیاری)"><textarea rows={2} value={f.note} onChange={e => set('note', e.target.value)} /></Field>
      <Field label="موعد پیگیری بعدی (اختیاری)"><DateInput optional quick={NEXT_QUICK} relative value={f.nextFollowUpDate} onChange={v => set('nextFollowUpDate', v)} /></Field>
      <details className="more-fields" open={hasPromise}>
        <summary>ثبت وعده پرداخت (اختیاری)</summary>
        <Field label="مبلغ وعده (ریال)"><AmountInput optional value={f.promisedAmount} onChange={v => set('promisedAmount', v)} /></Field>
        <Field label="تاریخ وعده"><DateInput optional value={f.promiseDate} onChange={v => set('promiseDate', v)} /></Field>
      </details>
      <FormActions onCancel={onClose} submitLabel="ذخیره" cancelLabel="لغو" />
    </form>
  </Modal>
}
