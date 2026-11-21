import { useState } from 'react'
import { rial, today } from '../utils'
import { Modal, Field, AmountInput, DateInput, FormActions } from './ui'

export default function PaymentForm({ item, name, payment, remaining, onClose, onSubmit }) {
  const [form, setForm] = useState({ amount: payment?.amount ?? '', date: payment?.date ?? today(), note: payment?.note ?? '' })
  const [err, setErr] = useState('')
  const set = (k, v) => { setForm(c => ({ ...c, [k]: v })); if (k === 'amount') setErr('') }
  const submit = e => {
    e.preventDefault()
    const n = Number(form.amount)
    const msg = !(n > 0) ? 'مبلغ پرداخت را وارد کنید' : n > remaining ? `مبلغ نمی‌تواند بیشتر از مانده (${rial(remaining)}) باشد` : ''
    setErr(msg)
    if (!msg && onSubmit(form)) onClose()
  }
  return <Modal title={payment ? 'اصلاح پرداخت' : 'ثبت پرداخت'} onClose={onClose}>
    {name && <p className="sub2 modal-sub">{name} · {item.dir === 'in' ? 'دریافتی' : 'پرداختی'}</p>}
    <form noValidate onSubmit={submit}>
      <Field label="مبلغ پرداخت (ریال)" error={err} hint={`مانده قابل پرداخت: ${rial(remaining)}`}>
        <AmountInput value={form.amount} onChange={v => set('amount', v)} />
      </Field>
      <button type="button" className="btn sm fill-btn" onClick={() => set('amount', String(remaining))}>پرداخت کامل مانده</button>
      <Field label="تاریخ پرداخت (شمسی)"><DateInput value={form.date} onChange={v => set('date', v)} /></Field>
      <Field label="توضیحات (اختیاری)"><textarea rows={2} value={form.note} onChange={e => set('note', e.target.value)} /></Field>
      <FormActions onCancel={onClose} submitLabel={payment ? 'ذخیره اصلاح' : 'ثبت پرداخت'} />
    </form>
  </Modal>
}
