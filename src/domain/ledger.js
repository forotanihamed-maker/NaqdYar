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
  const people = arr(s.people).filter(p => obj(p) && p.id && String(p.name ?? '').trim()).map(p => ({ id: String(p.id), name: String(p.name).trim(), phone: String(p.phone ?? ''), note: String(p.note ?? ''), createdAt: p.createdAt || null, updatedAt: p.updatedAt || null }))
  const items = arr(s.items).filter(i => obj(i) && i.id && i.personId).map(i => ({ id: String(i.id), personId: String(i.personId), dir: i.dir === 'out' ? 'out' : 'in', type: i.type === 'account' ? 'account' : 'cheque', amount: Number(i.amount) || 0, paid: Number(i.paid) || 0, due: i.due || today(), status: ['open','done','bounced'].includes(i.status) ? i.status : 'open', note: String(i.note ?? ''), createdAt: i.createdAt || null, updatedAt: i.updatedAt || null }))
  let payments = arr(s.payments).filter(p => obj(p) && p.id && p.itemId).map(p => ({ id: String(p.id), itemId: String(p.itemId), amount: Number(p.amount) || 0, date: p.date || today(), note: String(p.note ?? ''), createdAt: p.createdAt || null, updatedAt: p.updatedAt || null, deletedAt: p.deletedAt || null, legacyDateUnknown: !!p.legacyDateUnknown }))
  // Migrate legacy aggregate payments into a single explicitly date-unknown record.
  if (!arr(s.payments).length) items.forEach(i => { if (i.type === 'account' && i.paid > 0) payments.push({ id: uid(), itemId: i.id, amount: i.paid, date: today(), note: 'پرداخت تجمیعی نسخه قبلی؛ تاریخ واقعی نامعلوم', createdAt: new Date().toISOString(), legacyDateUnknown: true }); i.paid = 0 })
  const followUps = arr(s.followUps).filter(f => obj(f) && f.id && f.personId).map(f => ({ ...f, method: String(f.method || 'تماس'), contactDate: f.contactDate || today(), note: String(f.note || ''), result: String(f.result || ''), promisedAmount: Number(f.promisedAmount) || 0, promiseDate: f.promiseDate || '', nextFollowUpDate: f.nextFollowUpDate || '', createdAt: f.createdAt || null, updatedAt: f.updatedAt || null }))
  return { schemaVersion: SCHEMA_VERSION, people, items, payments, followUps }
}
