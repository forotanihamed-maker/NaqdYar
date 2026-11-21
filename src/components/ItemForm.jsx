import { useState } from 'react'
import { today } from '../utils'
import { Modal, Field, AmountInput, DateInput, PersonPicker } from './ui'

export default function ItemForm({ people, onClose, onSubmit }) {
  const [f, setF] = useState({ personId: '', name: '', dir: 'in', type: 'cheque', amount: '', due: today(), note: '' })
  const set = (k, v) => setF(c => ({ ...c, [k]: v }))
  const submit = e => { e.preventDefault(); if (onSubmit(f)) onClose() }
  return <Modal title="ثبت چک یا حساب جدید" onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="نوع"><div className="seg">
        <button type="button" className={'in ' + (f.dir === 'in' ? 'on' : '')} onClick={() => set('dir', 'in')}>دریافتی (باید بگیرم)</button>
        <button type="button" className={'out ' + (f.dir === 'out' ? 'on' : '')} onClick={() => set('dir', 'out')}>پرداختی (باید بدهم)</button>
      </div></Field>
      <Field label="سند"><div className="seg">
        <button type="button" className={f.type === 'cheque' ? 'on' : ''} onClick={() => set('type', 'cheque')}>چک</button>
        <button type="button" className={f.type === 'account' ? 'on' : ''} onClick={() => set('type', 'account')}>حساب بدون چک</button>
      </div></Field>
      <Field label="شخص (جست‌وجو یا نام جدید)">
        <PersonPicker people={people} value={{ personId: f.personId, name: f.name }} onChange={v => setF(c => ({ ...c, ...v }))} />
      </Field>
      <Field label="مبلغ (ریال)"><AmountInput value={f.amount} onChange={v => set('amount', v)} /></Field>
      <Field label={f.type === 'cheque' ? 'تاریخ سررسید چک (شمسی)' : 'موعد پرداخت (شمسی)'}>
        <DateInput value={f.due} onChange={v => set('due', v)} />
      </Field>
      <Field label="توضیحات"><textarea value={f.note} onChange={e => set('note', e.target.value)} placeholder="اختیاری" /></Field>
      <div className="seg"><button type="button" onClick={onClose}>انصراف</button><button className="on" type="submit">ثبت</button></div>
    </form>
  </Modal>
}
