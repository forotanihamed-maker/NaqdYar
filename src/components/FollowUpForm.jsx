import { useState } from 'react'
import { rial, shamsi } from '../utils'
import { Modal, Field, AmountInput, DateInput } from './ui'

const METHODS = ['تماس', 'پیام', 'مراجعه', 'سایر']

// Add or edit one follow-up. `initial` has an id when editing.
export default function FollowUpForm({ initial, people, items, onClose, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k, v) => setF(c => ({ ...c, [k]: v }))
  const submit = e => { e.preventDefault(); if (onSave(f)) onClose() }
  const personItems = items.filter(i => i.personId === f.personId)

  return <Modal title={f.id ? 'ویرایش پیگیری' : 'ثبت پیگیری'} onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="شخص">
        <select required value={f.personId} onChange={e => setF(c => ({ ...c, personId: e.target.value, itemId: '' }))}>
          <option value="">انتخاب شخص</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="سند مرتبط (اختیاری)">
        <select value={f.itemId} onChange={e => set('itemId', e.target.value)}>
          <option value="">بدون سند</option>
          {personItems.map(i => <option key={i.id} value={i.id}>{i.dir === 'in' ? 'طلب' : 'بدهی'} · {rial(i.amount)} · {shamsi(i.due)}</option>)}
        </select>
      </Field>
      <Field label="تاریخ تماس (شمسی)"><DateInput value={f.contactDate} onChange={v => set('contactDate', v)} /></Field>
      <Field label="روش">
        <select value={f.method} onChange={e => set('method', e.target.value)}>{METHODS.map(m => <option key={m}>{m}</option>)}</select>
      </Field>
      <Field label="نتیجه"><input value={f.result} onChange={e => set('result', e.target.value)} /></Field>
      <Field label="یادداشت"><textarea value={f.note} onChange={e => set('note', e.target.value)} /></Field>
      <Field label="مبلغ وعده پرداخت (ریال، اختیاری)"><AmountInput optional value={f.promisedAmount} onChange={v => set('promisedAmount', v)} /></Field>
      <Field label="تاریخ وعده (اختیاری)"><DateInput optional value={f.promiseDate} onChange={v => set('promiseDate', v)} /></Field>
      <Field label="موعد پیگیری بعدی (اختیاری)"><DateInput optional value={f.nextFollowUpDate} onChange={v => set('nextFollowUpDate', v)} /></Field>
      <div className="seg"><button type="button" onClick={onClose}>لغو</button><button className="on" type="submit">ذخیره</button></div>
    </form>
  </Modal>
}
