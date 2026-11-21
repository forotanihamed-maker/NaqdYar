import { useState } from 'react'
import { balance, isLate, isOpen, paymentTotal } from '../domain/ledger'
import { daysTo, rel, rial, shamsi } from '../utils'
import PaymentForm from './PaymentForm'
export default function ItemRow({ item, name, api, payments = [] }) {
  const [paymentForm,setPaymentForm]=useState(null)
  const isIn=item.dir==='in', bal=balance(item,payments), late=isLate(item,payments), cheque=item.type==='cheque'
  const itemPayments=payments.filter(p=>p.itemId===item.id&&!p.deletedAt).sort((a,b)=>b.date.localeCompare(a.date))
  const label=cheque?(item.status==='done'?(isIn?'وصول شد':'پاس شد'):item.status==='bounced'?'برگشتی':late?'معوق':'باز'):(bal===0?'تسویه‌شده':late?'معوق':'باز')
  return <>
    <article className="item"><span className={'dot '+item.dir}/><div className="info"><strong>{name}</strong><small>{cheque?'چک':'حساب'} {isIn?'دریافتی':'پرداختی'} · {shamsi(item.due)}{item.note?' · '+item.note:''}</small>{!cheque&&<small>اولیه: {rial(item.amount)} · پرداخت‌شده: {rial(paymentTotal(item,payments))}</small>}</div>
      <div className="amt"><strong>{rial(bal)}</strong><small className={late||item.status==='bounced'?'bad':''}>{label}{isOpen(item,payments)?' · '+rel(daysTo(item.due)):''}</small></div>
      <div className="acts">{cheque&&item.status==='open'&&<><button className="btn" onClick={()=>api.setStatus(item.id,'done')}>{isIn?'وصول شد':'پاس شد'}</button><button className="btn" onClick={()=>api.setStatus(item.id,'bounced')}>برگشت خورد</button></>}{cheque&&item.status==='bounced'&&<button className="btn" onClick={()=>api.setStatus(item.id,'open')}>دوباره باز شود</button>}{!cheque&&bal>0&&<button className="btn" onClick={()=>setPaymentForm({})}>ثبت پرداخت</button>}<button className="btn x" onClick={()=>api.remove(item)}>حذف</button></div>
    </article>
    {!cheque&&itemPayments.length>0&&<details className="payment-history"><summary>تاریخچه پرداخت ({itemPayments.length})</summary>{itemPayments.map(p=><div className="payment-row" key={p.id}><span>{shamsi(p.date)}{p.legacyDateUnknown?' · تاریخ واقعی نامعلوم':''}</span><strong>{rial(p.amount)}</strong><small>{p.note}</small><button className="btn" onClick={()=>setPaymentForm(p)}>اصلاح</button><button className="btn x" onClick={()=>api.deletePayment(p.id)}>حذف</button></div>)}</details>}
    {paymentForm&&<PaymentForm item={item} payment={paymentForm.id?paymentForm:null} remaining={paymentForm.id?bal+paymentForm.amount:bal} onClose={()=>setPaymentForm(null)} onSubmit={f=>paymentForm.id?api.updatePayment(paymentForm.id,f):api.addPayment(item.id,f)}/>}
  </>
}
