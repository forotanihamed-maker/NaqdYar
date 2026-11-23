import { useState } from 'react'
import { today } from '../utils.js'
import { Modal, Field, AmountInput, DateInput, PersonPicker, Seg, FormActions } from './ui.jsx'

const DUE_QUICK = [['۳۰ روز دیگر', 30], ['۶۰ روز دیگر', 60], ['۹۰ روز دیگر', 90]]

// `initial` can prefill the person (e.g. when opened from a person's file).
export default function ItemForm({ people, initial, onClose, onSubmit }) {
  const [f, setF] = useState({ personId: '', name: '', dir: 'in', type: 'cheque', amount: '', due: today(), note: '', ...initial })
  const [err, setErr] = useState({})
  const set = (k, v) => { setF(c => ({ ...c, [k]: v })); if (err[k]) setErr(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!f.personId && !f.name.trim()) e.person = 'نام شخص را بنویسید یا از فهرست انتخاب کنید'
    if (!(Number(f.amount) > 0)) e.amount = 'مبلغ را وارد کنید'
    if (!f.due) e.due = 'تاریخ را وارد کنید (نمونه: ۱۴۰۵/۰۹/۰۱)'
    setErr(e)
    return !Object.keys(e).length
  }
  // `again` keeps the form open for entering several cheques from the same person quickly.
  const save = again => {
    if (!validate() || !onSubmit(f)) return
    if (again) {
      // the person now exists; keep the typed name so the next save reuses it
      setF(c => ({ ...c, amount: '', note: '' }))
    } else onClose()
  }
  const isCheque = f.type === 'cheque'

  return <Modal title="ثبت چک یا حساب جدید" onClose={onClose}>
    <form noValidate onSubmit={e => { e.preventDefault(); save(false) }}>
      <Field label="این مورد چیست؟" group>
        <Seg value={f.dir} onChange={v => set('dir', v)} options={[['in', 'دریافتی (باید بگیرم)', 'in'], ['out', 'پرداختی (باید بدهم)', 'out']]} />
      </Field>
      <Field label="نوع سند" group>
        <Seg value={f.type} onChange={v => set('type', v)} options={[['cheque', 'چک'], ['account', 'حساب بدون چک']]} />
      </Field>
      <Field label="شخص" error={err.person}>
        <PersonPicker people={people} value={{ personId: f.personId, name: f.name }} onChange={v => { setF(c => ({ ...c, ...v })); setErr(e => ({ ...e, person: '' })) }} />
      </Field>
      <Field label="مبلغ (ریال)" error={err.amount}><AmountInput value={f.amount} onChange={v => set('amount', v)} /></Field>
      <Field label={isCheque ? 'تاریخ سررسید چک (شمسی)' : 'موعد پرداخت (شمسی)'} error={err.due}>
        <DateInput value={f.due} onChange={v => set('due', v)} quick={DUE_QUICK} relative />
      </Field>
      <Field label="توضیحات (اختیاری)"><textarea rows={2} value={f.note} onChange={e => set('note', e.target.value)} placeholder="مثلاً: شماره چک، بابت چه کالایی" /></Field>
      <FormActions onCancel={onClose}>
        <button type="button" className="btn" onClick={() => save(true)}>ثبت و سند بعدی</button>
      </FormActions>
    </form>
  </Modal>
}
