import { useState } from 'react'
import PaymentForm from '../components/PaymentForm'
import { rial, shamsi } from '../utils'
export default function Payments({ data, api, nameOf }) {
  const [edit,setEdit]=useState(null), [query,setQuery]=useState('')
  const list=data.payments.filter(p=>!p.deletedAt && (nameOf(data.items.find(i=>i.id===p.itemId)?.personId||'').includes(query.trim()) || p.note.includes(query.trim()))).sort((a,b)=>b.date.localeCompare(a.date))
  const item=edit&&data.items.find(i=>i.id===edit.itemId)
  return <>
    <div className="head"><div><h1>تاریخچه پرداخت‌ها</h1><p className="sub">پرداخت‌های ثبت‌شده برای حساب‌های بدون چک</p></div></div>
    <div className="tabs"><input className="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی شخص یا توضیح..."/></div>
    <section className="card">{list.length?list.map(p=><div className="payment-row" key={p.id}><strong>{nameOf(data.items.find(i=>i.id===p.itemId)?.personId||'')}</strong><span>{shamsi(p.date)}{p.legacyDateUnknown?' · تاریخ نامعلوم':''}</span><strong>{rial(p.amount)}</strong><small>{p.note}</small><button className="btn" onClick={()=>setEdit(p)}>اصلاح</button><button className="btn x" onClick={()=>api.deletePayment(p.id)}>حذف</button></div>):<p className="empty">پرداختی ثبت نشده است.</p>}</section>
    {edit&&item&&<PaymentForm item={item} payment={edit} remaining={item.amount} onClose={()=>setEdit(null)} onSubmit={f=>api.updatePayment(edit.id,f)}/>}
  </>
}
