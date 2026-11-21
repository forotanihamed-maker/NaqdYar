import { useState } from 'react'
import { balance, isLate, isOpen, paymentTotal } from '../domain/ledger'
import { daysTo, rel, rial, shamsi } from '../utils'
import { Badge } from './ui'
import PaymentForm from './PaymentForm'

// One cheque/account. `showName={false}` is for lists that are already grouped under a person.
export default function ItemRow({ item, name, api, payments = [], onPerson, showName = true }) {
  const [paymentForm, setPaymentForm] = useState(null)
  const isIn = item.dir === 'in', cheque = item.type === 'cheque'
  const bal = balance(item, payments), late = isLate(item, payments), open = isOpen(item, payments)
  const paid = paymentTotal(item, payments)
  const itemPayments = payments.filter(p => p.itemId === item.id && !p.deletedAt).sort((a, b) => b.date.localeCompare(a.date))

  let status
  if (cheque) status = item.status === 'done' ? [isIn ? 'وصول شد' : 'پاس شد', 'ok'] : item.status === 'bounced' ? ['برگشتی', 'bad'] : late ? ['معوق', 'bad'] : ['باز', 'info']
  else status = !open ? ['تسویه‌شده', 'ok'] : late ? ['معوق', 'bad'] : ['باز', 'info']

  const doc = (cheque ? 'چک' : 'حساب') + ' ' + (isIn ? 'دریافتی' : 'پرداختی')
  const pct = !cheque && item.amount > 0 ? Math.min(100, Math.round(paid / item.amount * 100)) : 0

  return <>
    <article className={'item' + (open ? '' : ' closed')}>
      <span className={'dot ' + item.dir} title={isIn ? 'دریافتی' : 'پرداختی'} />
      <div className="info">
        {showName
          ? (onPerson ? <button type="button" className="linkish" onClick={() => onPerson(item.personId)}>{name}</button> : <strong>{name}</strong>)
          : <strong>{doc}</strong>}
        <small>{showName ? doc + ' · ' : ''}سررسید {shamsi(item.due)}{item.note ? ' · ' + item.note : ''}</small>
        {!cheque && <div className="mini-wrap" title={`${pct}٪ پرداخت شده`}>
          <div className="mini"><i style={{ width: pct + '%' }} /></div>
          <small>پرداخت‌شده {rial(paid)} از {rial(item.amount)}</small>
        </div>}
      </div>
      <div className="amt">
        <strong>{rial(bal)}</strong>
        <Badge tone={status[1]}>{status[0]}</Badge>
        {open && <small className={late ? 'bad' : ''}>{rel(daysTo(item.due))}</small>}
      </div>
      <div className="acts">
        {cheque && item.status === 'open' && <>
          <button type="button" className="btn sm ok" onClick={() => api.setStatus(item.id, 'done')}>{isIn ? '✓ وصول شد' : '✓ پاس شد'}</button>
          <button type="button" className="btn sm" onClick={() => api.setStatus(item.id, 'bounced')}>برگشت خورد</button>
        </>}
        {cheque && item.status === 'bounced' && <button type="button" className="btn sm" onClick={() => api.setStatus(item.id, 'open')}>دوباره باز شود</button>}
        {cheque && item.status === 'done' && <button type="button" className="btn sm ghost" onClick={() => api.setStatus(item.id, 'open')}>لغو {isIn ? 'وصول' : 'پاس'}</button>}
        {!cheque && bal > 0 && <button type="button" className="btn sm ok" onClick={() => setPaymentForm({})}>+ ثبت پرداخت</button>}
        <button type="button" className="btn sm ghost x" onClick={() => api.remove(item)}>حذف</button>
      </div>
    </article>
    {!cheque && itemPayments.length > 0 && <details className="payment-history">
      <summary>تاریخچه پرداخت ({itemPayments.length})</summary>
      {itemPayments.map(p => <div className="payment-row" key={p.id}>
        <span>{shamsi(p.date)}{p.legacyDateUnknown ? ' · تاریخ واقعی نامعلوم' : ''}</span>
        <strong>{rial(p.amount)}</strong>
        <small>{p.note}</small>
        <button type="button" className="btn sm" onClick={() => setPaymentForm(p)}>اصلاح</button>
        <button type="button" className="btn sm ghost x" onClick={() => api.deletePayment(p.id)}>حذف</button>
      </div>)}
    </details>}
    {paymentForm && <PaymentForm item={item} name={name} payment={paymentForm.id ? paymentForm : null}
      remaining={paymentForm.id ? bal + paymentForm.amount : bal} onClose={() => setPaymentForm(null)}
      onSubmit={f => paymentForm.id ? api.updatePayment(paymentForm.id, f) : api.addPayment(item.id, f)} />}
  </>
}
