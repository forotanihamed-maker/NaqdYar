import { useEffect, useMemo, useState } from 'react'
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
    const owner = data.people.find(p => p.id === personId)
    const used = form.dir === 'in' ? data.items.filter(i => i.personId === personId && i.dir === 'in' && !i.deletedAt).reduce((s, i) => s + balance(i, data.payments), 0) : 0
    const warn = owner?.creditLimit && used + amount > owner.creditLimit ? 'هشدار: مانده این مشتری از سقف اعتبارش بیشتر شد' : ''
    setData(c => ({ ...c, people: person ? [...c.people, person] : c.people, items: [item, ...c.items] })); notify(warn || (person ? 'شخص و سند جدید ثبت شدند' : 'ثبت شد')); return true
  }
  function updatePerson(id, form) {
    const name = String(form.name || '').trim()
    if (!name) { notify('نام شخص الزامی است'); return false }
    setData(c => ({ ...c, people: c.people.map(p => p.id === id ? { ...p, name, phone: String(form.phone || ''), contactPerson: String(form.contactPerson || ''), creditLimit: Number(form.creditLimit) || 0, paymentTerms: String(form.paymentTerms || ''), note: String(form.note || ''), updatedAt: stamp() } : p) }))
    notify('اطلاعات شخص اصلاح شد'); return true
  }
  function addFollowUp(form) {
    if (!form.personId || !form.contactDate) { notify('شخص و تاریخ پیگیری را وارد کنید'); return false }
    const f = { id: uid(), personId: form.personId, itemId: form.itemId || '', contactDate: form.contactDate, method: form.method || 'تماس', result: String(form.result || ''), note: String(form.note || ''), promisedAmount: Number(form.promisedAmount) || 0, promiseDate: form.promiseDate || '', nextFollowUpDate: form.nextFollowUpDate || '', createdAt: stamp() }
    // a follow-up that carries a promise also creates a real promise record
    const pr = f.promisedAmount > 0 && f.promiseDate ? { id: uid(), personId: f.personId, itemId: f.itemId, amount: f.promisedAmount, date: f.promiseDate, startDate: f.contactDate, cancelled: false, followUpId: f.id, createdAt: stamp() } : null
    setData(c => ({ ...c, followUps: [f, ...(c.followUps || [])], promises: pr ? [pr, ...(c.promises || [])] : (c.promises || []) })); notify('پیگیری ثبت شد'); return true
  }
  function updateFollowUp(id, form) {
    const amount = Number(form.promisedAmount) || 0
    setData(c => ({
      ...c,
      followUps: (c.followUps || []).map(f => (f.id === id ? { ...f, ...form, promisedAmount: amount, updatedAt: stamp() } : f)),
      // keep the promise that came from this follow-up in step with it
      promises: (c.promises || []).map(p => (p.followUpId === id && amount > 0 && form.promiseDate ? { ...p, amount, date: form.promiseDate, updatedAt: stamp() } : p)),
    }))
    notify('پیگیری اصلاح شد')
  }
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
  function addPromise(form) {
    const amount = parseAmount(form.amount)
    if (!form.personId || amount === null || !form.date) { notify('مشتری، مبلغ و تاریخ وعده را وارد کنید'); return false }
    const p = { id: uid(), personId: form.personId, itemId: form.itemId || '', amount, date: form.date, startDate: today(), cancelled: false, followUpId: '', createdAt: stamp() }
    setData(c => ({ ...c, promises: [p, ...(c.promises || [])] })); notify('وعده پرداخت ثبت شد؛ مانده بدهی تغییری نکرد'); return true
  }
  // promises are cancelled, never deleted, so history stays traceable
  const cancelPromise = id => { if (window.confirm('وعده لغو شود؟ در تاریخچه می‌ماند.')) setData(c => ({ ...c, promises: (c.promises || []).map(p => p.id === id ? { ...p, cancelled: true, updatedAt: stamp() } : p) })) }
  const setStatus = (id, status) => setData(c => ({ ...c, items: c.items.map(i => i.id === id ? { ...i, status, updatedAt: stamp() } : i) }))
  // Soft delete: the item and its payments leave every screen but stay in the backup file.
  function remove(item) {
    if (!window.confirm('این مورد از فهرست‌ها حذف شود؟ در فایل پشتیبان نگه داشته می‌شود.')) return
    setData(c => ({ ...c, items: c.items.map(i => (i.id === item.id ? { ...i, deletedAt: stamp() } : i)) }))
    notify('حذف شد')
  }
  const importData = backup => { setData(normalize(backup)); notify('اطلاعات بازیابی شد') }
  // Screens get `data` without deleted items; the backup page gets `raw` with everything.
  const view = useMemo(() => {
    const items = data.items.filter(i => !i.deletedAt)
    const ids = new Set(items.map(i => i.id))
    return { ...data, items, payments: data.payments.filter(p => ids.has(p.itemId)) }
  }, [data])
  return { data: view, raw: data, addItem, addPayment, updatePayment, deletePayment, setStatus, remove, importData, updatePerson, addFollowUp, updateFollowUp, deleteFollowUp, addPromise, cancelPromise }
}
