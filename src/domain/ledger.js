import { SCHEMA_VERSION } from '../constants.js'
import { isIsoDate, normalizeText, today, uid, validStamp } from '../utils.js'

const arr = v => Array.isArray(v) ? v : []
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const str = v => String(v ?? '')
const blank = v => !str(v).trim()
export const paymentTotal = (item, payments = []) => payments.filter(p => p.itemId === item.id && !p.deletedAt).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
export const balance = (i, payments = []) => i.type === 'cheque' ? (i.status === 'done' ? 0 : i.amount) : Math.max(0, i.amount - (payments.length ? paymentTotal(i, payments) : (Number(i.paid) || 0)))
export const isOpen = (i, payments = []) => balance(i, payments) > 0
export const isLate = (i, payments = []) => isOpen(i, payments) && i.due < today()
export const sumBy = (items, f = i => balance(i)) => items.reduce((t, i) => t + f(i), 0)
export const parseAmount = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
export const findPerson = (people, name) => { const t = normalizeText(name); return people.find(p => normalizeText(p.name) === t) }

// Keeps the first record with a given id; later duplicates are dropped (they would collide as React keys).
const dedupe = (list, issues) => {
  const seen = new Set()
  return list.filter(r => {
    if (seen.has(r.id)) { issues.duplicates++; return false }
    seen.add(r.id)
    return true
  })
}

// Bad or hand-edited backups must never crash the app. Invalid records are dropped, invalid
// dates/amounts fall back to safe values and every correction is counted in `issues`.
export function normalizeReport(raw) {
  const s = obj(raw) ? raw : {}
  const issues = { people: 0, items: 0, payments: 0, followUps: 0, promises: 0, duplicates: 0, badDates: 0, badAmounts: 0 }
  const day = (v, fallback) => {
    if (isIsoDate(v)) return v
    if (!blank(v)) issues.badDates++
    return fallback
  }
  const optDay = v => (blank(v) ? '' : day(v, ''))
  const stamp = v => validStamp(v)
  const amount = v => {
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) return n
    if (!blank(v)) issues.badAmounts++
    return 0
  }

  const people = dedupe(arr(s.people).filter(p => {
    const ok = obj(p) && !blank(p.id) && !blank(p.name)
    if (!ok) issues.people++
    return ok
  }).map(p => ({
    id: str(p.id), name: str(p.name).trim(), phone: str(p.phone), contactPerson: str(p.contactPerson),
    creditLimit: amount(p.creditLimit), paymentTerms: str(p.paymentTerms), note: str(p.note),
    createdAt: stamp(p.createdAt), updatedAt: stamp(p.updatedAt),
  })), issues)

  const items = dedupe(arr(s.items).filter(i => {
    const ok = obj(i) && !blank(i.id) && !blank(i.personId)
    if (!ok) issues.items++
    return ok
  }).map(i => ({
    id: str(i.id), personId: str(i.personId),
    dir: i.dir === 'out' ? 'out' : 'in', type: i.type === 'account' ? 'account' : 'cheque',
    amount: amount(i.amount), paid: amount(i.paid), due: day(i.due, today()),
    status: ['open', 'done', 'bounced'].includes(i.status) ? i.status : 'open',
    note: str(i.note), createdAt: stamp(i.createdAt), updatedAt: stamp(i.updatedAt), deletedAt: stamp(i.deletedAt),
  })), issues)

  let payments = dedupe(arr(s.payments).filter(p => {
    const ok = obj(p) && !blank(p.id) && !blank(p.itemId)
    if (!ok) issues.payments++
    return ok
  }).map(p => ({
    id: str(p.id), itemId: str(p.itemId), amount: amount(p.amount), date: day(p.date, today()),
    note: str(p.note), createdAt: stamp(p.createdAt), updatedAt: stamp(p.updatedAt), deletedAt: stamp(p.deletedAt),
    legacyDateUnknown: !!p.legacyDateUnknown,
  })), issues)

  // Migrate legacy aggregate payments into a single explicitly date-unknown record.
  if (!payments.length) items.forEach(i => {
    if (i.type === 'account' && i.paid > 0) {
      payments.push({ id: uid(), itemId: i.id, amount: i.paid, date: today(), note: 'پرداخت تجمیعی نسخه قبلی؛ تاریخ واقعی نامعلوم', createdAt: new Date().toISOString(), updatedAt: null, deletedAt: null, legacyDateUnknown: true })
      i.paid = 0
    }
  })

  const followUps = dedupe(arr(s.followUps).filter(f => {
    const ok = obj(f) && !blank(f.id) && !blank(f.personId)
    if (!ok) issues.followUps++
    return ok
  }).map(f => ({
    ...f, id: str(f.id), personId: str(f.personId), itemId: str(f.itemId),
    method: str(f.method || 'تماس'), contactDate: day(f.contactDate, today()),
    note: str(f.note), result: str(f.result), promisedAmount: amount(f.promisedAmount),
    promiseDate: optDay(f.promiseDate), nextFollowUpDate: optDay(f.nextFollowUpDate),
    createdAt: stamp(f.createdAt), updatedAt: stamp(f.updatedAt),
  })), issues)

  let promises = dedupe(arr(s.promises).filter(p => {
    const ok = obj(p) && !blank(p.id) && !blank(p.personId)
    if (!ok) issues.promises++
    return ok
  }).map(p => ({
    id: str(p.id), personId: str(p.personId), itemId: str(p.itemId), amount: amount(p.amount),
    date: day(p.date, today()), startDate: day(p.startDate, today()), cancelled: !!p.cancelled,
    followUpId: str(p.followUpId), createdAt: stamp(p.createdAt), updatedAt: stamp(p.updatedAt),
  })), issues)

  // Promises that only existed inside follow-ups (schema < 3). Idempotent via followUpId.
  followUps.forEach(f => { promises = syncFollowUpPromise(promises, f) })

  return { data: { schemaVersion: SCHEMA_VERSION, people, items, payments, followUps, promises }, issues }
}

export const normalize = raw => normalizeReport(raw).data

export const PROMISE_LABEL = { pending: 'در انتظار پرداخت', paid: 'پرداخت‌شده', partial: 'پرداخت ناقص', broken: 'انجام‌نشده', cancelled: 'لغوشده', deleted: 'سند حذف شده' }

// Promise status is derived, never typed in. A promise itself never changes a balance (rule 5);
// only payments recorded after the promise was made (or cheques collected after it) count as paid (rule 6).
export function promiseState(p, items, payments, now = today()) {
  if (p.cancelled) return { status: 'cancelled', paid: 0 }
  // The linked document was soft-deleted: keep the promise in history but out of every "to do" list.
  if (p.itemId && !items.some(i => i.id === p.itemId)) return { status: 'deleted', paid: 0 }
  const mine = items.filter(i => i.personId === p.personId && i.dir === 'in' && (!p.itemId || i.id === p.itemId))
  const ids = new Set(mine.map(i => i.id))
  const byPayments = payments.filter(x => !x.deletedAt && ids.has(x.itemId) && x.date >= p.startDate).reduce((s, x) => s + x.amount, 0)
  const byCheques = mine.filter(i => i.type === 'cheque' && i.status === 'done' && (i.updatedAt || '').slice(0, 10) >= p.startDate).reduce((s, i) => s + i.amount, 0)
  const paid = byPayments + byCheques
  if (paid >= p.amount) return { status: 'paid', paid }
  if (p.date >= now) return { status: 'pending', paid }
  return { status: paid > 0 ? 'partial' : 'broken', paid } // overdue promise stays visible for follow-up (rule 7)
}

// One source of truth for "a follow-up may create/update/cancel a promise".
// mode 'create' only adds a missing promise (used by normalize, so a cancelled promise is not revived on load).
// mode 'update' keeps an existing promise in step and cancels it when the promise fields are cleared.
export function syncFollowUpPromise(promises, f, mode = 'create') {
  const list = arr(promises)
  const i = list.findIndex(p => p.followUpId && p.followUpId === f.id)
  const hasPromise = f.promisedAmount > 0 && !!f.promiseDate
  const stamp = new Date().toISOString()
  if (hasPromise) {
    if (i < 0) return [...list, { id: uid(), personId: f.personId, itemId: f.itemId || '', amount: f.promisedAmount, date: f.promiseDate, startDate: f.contactDate || f.promiseDate, cancelled: false, followUpId: f.id, createdAt: stamp, updatedAt: null }]
    if (mode !== 'update') return list
    return list.map((p, k) => (k === i ? { ...p, personId: f.personId, itemId: f.itemId || '', amount: f.promisedAmount, date: f.promiseDate, startDate: f.contactDate || p.startDate, updatedAt: stamp } : p))
  }
  if (i >= 0 && mode === 'update' && !list[i].cancelled) return list.map((p, k) => (k === i ? { ...p, cancelled: true, updatedAt: stamp } : p))
  return list
}

// How many things need attention today (used for the navigation badges).
export function attention(data, now = today()) {
  const { items, payments, followUps = [], promises = [] } = data
  return {
    late: items.filter(i => isLate(i, payments)).length,
    followUps: followUps.filter(f => f.nextFollowUpDate && f.nextFollowUpDate <= now).length,
    promises: promises.filter(p => {
      const st = promiseState(p, items, payments, now).status
      return st === 'broken' || st === 'partial' || (st === 'pending' && p.date === now)
    }).length,
  }
}
