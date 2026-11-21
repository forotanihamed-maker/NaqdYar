import { useEffect, useState } from 'react'
import { KEY } from '../constants'
import { balance, findPerson, normalize, parseAmount } from '../domain/ledger'
import { digits, uid, today } from '../utils'

const load = () => { try { return normalize(JSON.parse(localStorage.getItem(KEY))) } catch { return normalize(null) } }
const stamp = () => new Date().toISOString()
export function useLedger(notify) {
  const [data, setData] = useState(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { notify('ذخیره اطلاعات در مرورگر ناموفق بود') } }, [data, notify])
  function addItem(form) {
    const amount = parseAmount(form.amount), name = form.name.trim()
    if (amount === null || (!form.personId && !name)) { notify('شخص و مبلغ معتبر را وارد کنید'); return false }
    let personId = form.personId, person = null
    if (!personId) { const existing = findPerson(data.people, name); if (existing) personId = existing.id; else { person = { id: uid(), name, phone: '', note: '', createdAt: stamp() }; personId = person.id } }
    const item = { id: uid(), personId, dir: form.dir, type: form.type, amount, due: form.due, status: 'open', note: form.note.trim(), createdAt: stamp() }
    setData(c => ({ ...c, people: person ? [...c.people, person] : c.people, items: [item, ...c.items] })); notify(person ? 'شخص و سند جدید ثبت شدند' : 'ثبت شد'); return true
  }
  function updatePerson(id, form) {
    const name = String(form.name || '').trim()
    if (!name) { notify('نام شخص الزامی است'); return false }
    setData(c => ({ ...c, people: c.people.map(p => p.id === id ? { ...p, name, phone: String(form.phone || ''), note: String(form.note || ''), updatedAt: stamp() } : p) }))
    notify('اطلاعات شخص اصلاح شد'); return true
  }
  function addFollowUp(form) {
    if (!form.personId || !form.contactDate) { notify('شخص و تاریخ پیگیری را وارد کنید'); return false }
    const f = { id: uid(), personId: form.personId, itemId: form.itemId || '', contactDate: form.contactDate, method: form.method || 'تماس', result: String(form.result || ''), note: String(form.note || ''), promisedAmount: Number(form.promisedAmount) || 0, promiseDate: form.promiseDate || '', nextFollowUpDate: form.nextFollowUpDate || '', createdAt: stamp() }
    setData(c => ({ ...c, followUps: [f, ...(c.followUps || [])] })); notify('پیگیری ثبت شد'); return true
  }
  function updateFollowUp(id, form) { setData(c => ({ ...c, followUps: (c.followUps || []).map(f => f.id === id ? { ...f, ...form, updatedAt: stamp() } : f) })); notify('پیگیری اصلاح شد') }
  function deleteFollowUp(id) { if (!window.confirm('پیگیری حذف شود؟')) return; setData(c => ({ ...c, followUps: (c.followUps || []).filter(f => f.id !== id) })); notify('پیگیری حذف شد') }
  function addPayment(itemId, form) {
    const amount = parseAmount(form.amount), item = data.items.find(i => i.id === itemId)
    if (!item || item.type !== 'account' || amount === null || amount > balance(item, data.payments)) { notify('مبلغ باید بیشتر از صفر و حداکثر برابر مانده باشد'); return false }
    const payment = { id: uid(), itemId, amount, date: form.date || today(), note: String(form.note || '').trim(), createdAt: stamp() }
    setData(c => ({ ...c, payments: [payment, ...c.payments] })); notify('پرداخت ثبت شد'); return true
  }
  function updatePayment(id, form) {
    const p = data.payments.find(x => x.id === id), item = p && data.items.find(i => i.id === p.itemId)
    const amount = parseAmount(form.amount)
    if (!p || !item || amount === null) { notify('اطلاعات پرداخت معتبر نیست'); return false }
    const other = data.payments.filter(x => x.itemId === item.id && x.id !== id && !x.deletedAt).reduce((s,x)=>s+x.amount,0)
    if (amount + other > item.amount) { notify('مجموع پرداخت‌ها نمی‌تواند بیشتر از مبلغ حساب باشد'); return false }
    setData(c => ({ ...c, payments: c.payments.map(x => x.id === id ? { ...x, amount, date: form.date, note: String(form.note || '').trim(), updatedAt: stamp() } : x) })); notify('پرداخت اصلاح شد'); return true
  }
  function deletePayment(id) { if (!window.confirm('این پرداخت حذف شود؟ مانده حساب مجدداً محاسبه می‌شود.')) return; setData(c=>({...c,payments:c.payments.map(p=>p.id===id?{...p,deletedAt:stamp()}:p)})); notify('پرداخت حذف شد') }
  const setStatus = (id, status) => setData(c => ({ ...c, items: c.items.map(i => i.id === id ? { ...i, status, updatedAt: stamp() } : i) }))
  function remove(item) { if (window.confirm('این مورد حذف شود؟')) setData(c => ({ ...c, items: c.items.filter(i => i.id !== item.id), payments: c.payments.filter(p => p.itemId !== item.id) })) }
  const importData = backup => { setData(normalize(backup)); notify('اطلاعات بازیابی شد') }
  return { data, addItem, addPayment, updatePayment, deletePayment, setStatus, remove, importData, updatePerson, addFollowUp, updateFollowUp, deleteFollowUp }
}
