import { useState } from 'react'
import { today } from '../utils'
import { Modal, Field, AmountInput, DateInput } from './ui'
export default function PaymentForm({ item, payment, remaining, onClose, onSubmit }) {
  const [form,setForm] = useState({ amount: payment?.amount ?? '', date: payment?.date ?? today(), note: payment?.note ?? '' })
  const set=(k,v)=>setForm(c=>({...c,[k]:v}))
  const submit=e=>{e.preventDefault();if(onSubmit(form))onClose()}
  return <Modal title={payment?'اصلاح پرداخت':'ثبت پرداخت'} onClose={onClose}>
    <form onSubmit={submit}>
      <Field label="مبلغ پرداخت (ریال)"><AmountInput value={form.amount} onChange={v=>set('amount',v)}/></Field>
      <Field label="تاریخ پرداخت (شمسی)"><DateInput value={form.date} onChange={v=>set('date',v)}/></Field>
      <Field label="توضیحات"><textarea value={form.note} onChange={e=>set('note',e.target.value)} placeholder="اختیاری"/></Field>
      <p className="sub2">مانده فعلی: {remaining.toLocaleString('fa-IR')} ریال</p>
      <div className="seg"><button type="button" onClick={onClose}>انصراف</button><button className="on" type="submit">{payment?'ذخیره اصلاح':'ثبت پرداخت'}</button></div>
    </form>
  </Modal>
}
