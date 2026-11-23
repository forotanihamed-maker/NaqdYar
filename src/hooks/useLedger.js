import { useEffect, useMemo, useRef, useState } from 'react'
import { KEY } from '../constants.js'
import { balance, findPerson, normalizeReport, parseAmount, syncFollowUpPromise } from '../domain/ledger.js'
import { fmt, isIsoDate, today, uid } from '../utils.js'

const stamp = () => new Date().toISOString()
const empty = () => normalizeReport(null).data

// Never reset silently: an unreadable stored payload is copied to a corrupt-backup key first.
const load = () => {
  let raw = null
  try { raw = localStorage.getItem(KEY) } catch { return { data: empty(), notice: 'خواندن اطلاعات ذخیره‌شده ناموفق بود؛ دسترسی برنامه به حافظه را بررسی کنید.' } }
  if (!raw) return { data: empty() }
  try {
    const { data, issues } = normalizeReport(JSON.parse(raw))
    const fixed = issues.badDates + issues.badAmounts + issues.duplicates
    const dropped = issues.people + issues.items + issues.payments + issues.followUps + issues.promises
    return { data, notice: fixed + dropped ? `اطلاعات ذخیره‌شده نامعتبر بود: ${fmt(fixed)} مورد اصلاح و ${fmt(dropped)} مورد حذف شد.` : null }
  } catch {
    const key = `${KEY}-corrupt-${new Date().toISOString().replace(/[:.]/g, '-')}`
    try { localStorage.setItem(key, raw) } catch { /* storage is full; the message still warns the user */ }
    return { data: empty(), notice: 'اطلاعات ذخیره‌شده آسیب دیده بود؛ نسخه خام در «پشتیبان‌های خراب» نگه داشته شد.' }
  }
}

export function useLedger(notify) {
  const initial = useRef(null)
  if (!initial.current) initial.current = load()
  const [data, setData] = useState(initial.current.data)
  useEffect(() => { if (initial.current.notice) notify(initial.current.notice) }, [notify])
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { notify('ذخیره اطلاعات روی این دستگاه ناموفق بود؛ حافظه برنامه پر یا مسدود شده است.') }
  }, [data, notify])

  function addItem(form) {
    const amount = parseAmount(form.amount), name = String(form.name || '').trim(), due = isIsoDate(form.due) ? form.due : null
    if (amount === null || (!form.personId && !name) || !due) { notify('شخص، مبلغ و تاریخ معتبر را وارد کنید'); return false }
    let personId = form.personId, person = null
    if (!personId) { const existing = findPerson(data.people, name); if (existing) personId = existing.id; else { person = { id: uid(), name, phone: '', note: '', createdAt: stamp() }; personId = person.id } }
    const item = { id: uid(), personId, dir: form.dir, type: form.type, amount, due, status: 'open', note: String(form.note || '').trim(), createdAt: stamp() }
    const owner = data.people.find(p => p.id === personId)
    const used = form.dir === 'in' ? data.items.filter(i => i.personId === personId && i.dir === 'in' && !i.deletedAt).reduce((s, i) => s + balance(i, data.payments), 0) : 0
    const warn = owner?.creditLimit && used + amount > owner.creditLimit ? 'هشدار: مانده این مشتری از سقف اعتبارش بیشتر شد' : ''
    setData(c => ({ ...c, people: person ? [...c.people, person] : c.people, items: [item, ...c.items] })); notify(warn || (person ? 'شخص و سند جدید ثبت شدند' : 'ثبت شد')); return true
  }
  function updatePerson(id, form) {
    const name = String(form.name || '').trim()
    if (!name) { notify('نام شخص الزامی است'); return false }
    setData(c => ({ ...c, people: c.people.map(p => p.id === id ? { ...p, name, phone: String(form.phone || ''), contactPerson: String(form.contactPerson || ''), creditLimit: Math.max(0, Number(form.creditLimit) || 0), paymentTerms: String(form.paymentTerms || ''), note: String(form.note || ''), updatedAt: stamp() } : p) }))
    notify('اطلاعات شخص اصلاح شد'); return true
  }
  function addFollowUp(form) {
    if (!form.personId || !isIsoDate(form.contactDate)) { notify('شخص و تاریخ پیگیری را وارد کنید'); return false }
    const promisedAmount = Number(form.promisedAmount) || 0
    if (promisedAmount > 0 && !isIsoDate(form.promiseDate)) { notify('برای وعده پرداخت، تاریخ وعده را هم وارد کنید'); return false }
    const f = { id: uid(), personId: form.personId, itemId: form.itemId || '', contactDate: form.contactDate, method: form.method || 'تماس', result: String(form.result || ''), note: String(form.note || ''), promisedAmount, promiseDate: form.promiseDate || '', nextFollowUpDate: form.nextFollowUpDate || '', createdAt: stamp() }
    // a follow-up that carries a promise also creates a real promise record (same rule as normalize)
    setData(c => ({ ...c, followUps: [f, ...(c.followUps || [])], promises: syncFollowUpPromise(c.promises || [], f) }))
    notify(promisedAmount > 0 ? 'پیگیری و وعده پرداخت ثبت شد' : 'پیگیری ثبت شد'); return true
  }
  function updateFollowUp(id, form) {
    const promisedAmount = Number(form.promisedAmount) || 0
    if (promisedAmount > 0 && !isIsoDate(form.promiseDate)) { notify('برای وعده پرداخت، تاریخ وعده را هم وارد کنید'); return false }
    const prev = (data.followUps || []).find(f => f.id === id)
    const cleared = prev && prev.promisedAmount > 0 && !!prev.promiseDate && !(promisedAmount > 0 && form.promiseDate)
    setData(c => {
      const followUps = (c.followUps || []).map(f => (f.id === id ? { ...f, ...form, promisedAmount, promiseDate: form.promiseDate || '', nextFollowUpDate: form.nextFollowUpDate || '', itemId: form.itemId || '', updatedAt: stamp() } : f))
      const target = followUps.find(f => f.id === id)
      return { ...c, followUps, promises: target ? syncFollowUpPromise(c.promises || [], target, 'update') : c.promises }
    })
    notify(cleared ? 'پیگیری اصلاح شد؛ وعده مرتبط لغو شد (در تاریخچه می‌ماند)' : 'پیگیری اصلاح شد')
    return true
  }
  // Destructive actions run immediately and offer «بازگردانی» in the toast instead of a blocking confirm dialog.
  function deleteFollowUp(id) {
    const f = (data.followUps || []).find(x => x.id === id)
    if (!f) return
    setData(c => ({ ...c, followUps: (c.followUps || []).filter(x => x.id !== id) }))
    notify('پیگیری حذف شد', () => setData(c => ({ ...c, followUps: c.followUps.some(x => x.id === id) ? c.followUps : [f, ...c.followUps] })))
  }
  function addPayment(itemId, form) {
    const amount = parseAmount(form.amount), item = data.items.find(i => i.id === itemId), date = isIsoDate(form.date) ? form.date : null
    if (!item || item.type !== 'account' || amount === null || amount > balance(item, data.payments) || !date) { notify('مبلغ و تاریخ پرداخت را درست وارد کنید (حداکثر برابر مانده)'); return false }
    const payment = { id: uid(), itemId, amount, date, note: String(form.note || '').trim(), createdAt: stamp() }
    setData(c => ({ ...c, payments: [payment, ...c.payments] })); notify('پرداخت ثبت شد'); return true
  }
  function updatePayment(id, form) {
    const p = data.payments.find(x => x.id === id), item = p && data.items.find(i => i.id === p.itemId)
    const amount = parseAmount(form.amount), date = isIsoDate(form.date) ? form.date : null
    if (!p || !item || amount === null || !date) { notify('اطلاعات پرداخت معتبر نیست'); return false }
    const other = data.payments.filter(x => x.itemId === item.id && x.id !== id && !x.deletedAt).reduce((s, x) => s + x.amount, 0)
    if (amount + other > item.amount) { notify('مجموع پرداخت‌ها نمی‌تواند بیشتر از مبلغ حساب باشد'); return false }
    setData(c => ({ ...c, payments: c.payments.map(x => x.id === id ? { ...x, amount, date, note: String(form.note || '').trim(), updatedAt: stamp() } : x) })); notify('پرداخت اصلاح شد'); return true
  }
  function deletePayment(id) {
    setData(c => ({ ...c, payments: c.payments.map(p => p.id === id ? { ...p, deletedAt: stamp() } : p) }))
    notify('پرداخت حذف شد؛ مانده حساب دوباره محاسبه شد', () => setData(c => ({ ...c, payments: c.payments.map(p => p.id === id && p.deletedAt ? { ...p, deletedAt: null } : p) })))
  }
  function addPromise(form) {
    const amount = parseAmount(form.amount)
    if (!form.personId || amount === null || !isIsoDate(form.date)) { notify('مشتری، مبلغ و تاریخ وعده را وارد کنید'); return false }
    const p = { id: uid(), personId: form.personId, itemId: form.itemId || '', amount, date: form.date, startDate: today(), cancelled: false, followUpId: '', createdAt: stamp() }
    setData(c => ({ ...c, promises: [p, ...(c.promises || [])] })); notify('وعده پرداخت ثبت شد؛ مانده بدهی تغییری نکرد'); return true
  }
  // promises are cancelled, never deleted, so history stays traceable
  const cancelPromise = id => {
    setData(c => ({ ...c, promises: (c.promises || []).map(p => p.id === id ? { ...p, cancelled: true, updatedAt: stamp() } : p) }))
    notify('وعده لغو شد؛ در تاریخچه می‌ماند', () => setData(c => ({ ...c, promises: (c.promises || []).map(p => p.id === id && p.cancelled ? { ...p, cancelled: false } : p) })))
  }
  function setStatus(id, status) {
    const prev = data.items.find(i => i.id === id)
    if (!prev) return
    setData(c => ({ ...c, items: c.items.map(i => i.id === id ? { ...i, status, updatedAt: stamp() } : i) }))
    const word = prev.dir === 'in' ? 'وصول' : 'پاس'
    const msg = status === 'done' ? `به‌عنوان ${word}‌شده ثبت شد` : status === 'bounced' ? 'به‌عنوان برگشتی ثبت شد' : 'دوباره باز شد'
    // Undo only touches the item if it still has the status this action set (a newer change wins).
    notify(msg, () => setData(c => ({ ...c, items: c.items.map(i => i.id === id && i.status === status ? { ...i, status: prev.status, updatedAt: prev.updatedAt } : i) })))
  }
  // Soft delete: the item and its payments leave every screen but stay in the backup file.
  function remove(item) {
    setData(c => ({ ...c, items: c.items.map(i => (i.id === item.id ? { ...i, deletedAt: stamp() } : i)) }))
    notify('سند حذف شد (در فایل پشتیبان می‌ماند)', () => setData(c => ({ ...c, items: c.items.map(i => (i.id === item.id && i.deletedAt ? { ...i, deletedAt: null } : i)) })))
  }
  const importData = backup => {
    const prev = data
    const { data: next, issues } = normalizeReport(backup)
    setData(next)
    const dropped = issues.people + issues.items + issues.payments + issues.followUps + issues.promises
    notify(dropped ? `اطلاعات بازیابی شد؛ ${fmt(dropped)} رکورد نامعتبر وارد نشد` : 'اطلاعات از فایل پشتیبان بازیابی شد', () => setData(prev))
  }
  // Screens get `data` without deleted items; the backup page gets `raw` with everything.
  const view = useMemo(() => {
    const items = data.items.filter(i => !i.deletedAt)
    const ids = new Set(items.map(i => i.id))
    return { ...data, items, payments: data.payments.filter(p => ids.has(p.itemId)) }
  }, [data])
  return { data: view, raw: data, addItem, addPayment, updatePayment, deletePayment, setStatus, remove, importData, updatePerson, addFollowUp, updateFollowUp, deleteFollowUp, addPromise, cancelPromise }
}
