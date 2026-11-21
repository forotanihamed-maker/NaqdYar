import { SCHEMA_VERSION } from '../constants'
import { today, uid } from '../utils'

const arr = v => Array.isArray(v) ? v : []
const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v)
export const paymentTotal = (item, payments = []) => payments.filter(p => p.itemId === item.id && !p.deletedAt).reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
export const balance = (i, payments = []) => i.type === 'cheque' ? (i.status === 'done' ? 0 : i.amount) : Math.max(0, i.amount - (payments.length ? paymentTotal(i, payments) : (Number(i.paid) || 0)))
export const isOpen = (i, payments = []) => balance(i, payments) > 0
export const isLate = (i, payments = []) => isOpen(i, payments) && i.due < today()
export const sumBy = (items, f = i => balance(i)) => items.reduce((t, i) => t + f(i), 0)
export const parseAmount = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
export const findPerson = (people, name) => { const t = name.trim().toLocaleLowerCase(); return people.find(p => p.name.trim().toLocaleLowerCase() === t) }

export function normalize(raw) {
  const s = obj(raw) ? raw : {}
  const people = arr(s.people).filter(p => obj(p) && p.id && String(p.name ?? '').trim()).map(p => ({ id: String(p.id), name: String(p.name).trim(), phone: String(p.phone ?? ''), contactPerson: String(p.contactPerson ?? ''), creditLimit: Number(p.creditLimit) || 0, paymentTerms: String(p.paymentTerms ?? ''), note: String(p.note ?? ''), createdAt: p.createdAt || null, updatedAt: p.updatedAt || null }))
  const items = arr(s.items).filter(i => obj(i) && i.id && i.personId).map(i => ({ id: String(i.id), personId: String(i.personId), dir: i.dir === 'out' ? 'out' : 'in', type: i.type === 'account' ? 'account' : 'cheque', amount: Number(i.amount) || 0, paid: Number(i.paid) || 0, due: i.due || today(), status: ['open','done','bounced'].includes(i.status) ? i.status : 'open', note: String(i.note ?? ''), createdAt: i.createdAt || null, updatedAt: i.updatedAt || null, deletedAt: i.deletedAt || null }))
  let payments = arr(s.payments).filter(p => obj(p) && p.id && p.itemId).map(p => ({ id: String(p.id), itemId: String(p.itemId), amount: Number(p.amount) || 0, date: p.date || today(), note: String(p.note ?? ''), createdAt: p.createdAt || null, updatedAt: p.updatedAt || null, deletedAt: p.deletedAt || null, legacyDateUnknown: !!p.legacyDateUnknown }))
  // Migrate legacy aggregate payments into a single explicitly date-unknown record.
  if (!arr(s.payments).length) items.forEach(i => { if (i.type === 'account' && i.paid > 0) payments.push({ id: uid(), itemId: i.id, amount: i.paid, date: today(), note: 'پرداخت تجمیعی نسخه قبلی؛ تاریخ واقعی نامعلوم', createdAt: new Date().toISOString(), legacyDateUnknown: true }); i.paid = 0 })
  const followUps = arr(s.followUps).filter(f => obj(f) && f.id && f.personId).map(f => ({ ...f, method: String(f.method || 'تماس'), contactDate: f.contactDate || today(), note: String(f.note || ''), result: String(f.result || ''), promisedAmount: Number(f.promisedAmount) || 0, promiseDate: f.promiseDate || '', nextFollowUpDate: f.nextFollowUpDate || '', createdAt: f.createdAt || null, updatedAt: f.updatedAt || null }))
  const promises = arr(s.promises).filter(p => obj(p) && p.id && p.personId).map(p => ({ id: String(p.id), personId: String(p.personId), itemId: String(p.itemId || ''), amount: Number(p.amount) || 0, date: p.date || today(), startDate: p.startDate || today(), cancelled: !!p.cancelled, followUpId: String(p.followUpId || ''), createdAt: p.createdAt || null, updatedAt: p.updatedAt || null }))
  // Migrate promises that only existed inside follow-ups (schema < 3). Idempotent via followUpId.
  followUps.forEach(f => { if (f.promisedAmount > 0 && f.promiseDate && !promises.some(p => p.followUpId === f.id)) promises.push({ id: uid(), personId: f.personId, itemId: f.itemId || '', amount: f.promisedAmount, date: f.promiseDate, startDate: f.contactDate, cancelled: false, followUpId: f.id, createdAt: f.createdAt || null, updatedAt: null }) })
  return { schemaVersion: SCHEMA_VERSION, people, items, payments, followUps, promises }
}

export const PROMISE_LABEL = { pending: 'در انتظار پرداخت', paid: 'پرداخت‌شده', partial: 'پرداخت ناقص', broken: 'انجام‌نشده', cancelled: 'لغوشده' }

// Promise status is derived, never typed in. A promise itself never changes a balance (rule 5);
// only payments recorded after the promise was made (or cheques collected after it) count as paid (rule 6).
export function promiseState(p, items, payments, now = today()) {
  if (p.cancelled) return { status: 'cancelled', paid: 0 }
  const mine = items.filter(i => i.personId === p.personId && i.dir === 'in' && (!p.itemId || i.id === p.itemId))
  const ids = new Set(mine.map(i => i.id))
  const byPayments = payments.filter(x => !x.deletedAt && ids.has(x.itemId) && x.date >= p.startDate).reduce((s, x) => s + x.amount, 0)
  const byCheques = mine.filter(i => i.type === 'cheque' && i.status === 'done' && (i.updatedAt || '').slice(0, 10) >= p.startDate).reduce((s, i) => s + i.amount, 0)
  const paid = byPayments + byCheques
  if (paid >= p.amount) return { status: 'paid', paid }
  if (p.date >= now) return { status: 'pending', paid }
  return { status: paid > 0 ? 'partial' : 'broken', paid } // overdue promise stays visible for follow-up (rule 7)
}
