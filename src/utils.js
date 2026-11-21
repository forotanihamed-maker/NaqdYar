import { BACKUP_KEY } from './constants'

const nf = new Intl.NumberFormat('fa-IR')
export const fmt = v => nf.format(Number(v || 0))
export const rial = v => fmt(v) + ' ریال'
export const rel = d => (d < 0 ? fmt(-d) + ' روز معوق' : d === 0 ? 'امروز' : fmt(d) + ' روز دیگر')
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const digits = v => String(v ?? '')
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))

// "1234567" -> "۱,۲۳۴,۵۶۷" for amount inputs
export const amountInput = v => {
  const d = digits(v).replace(/\D/g, '')
  return d ? BigInt(d).toLocaleString('en-US').replace(/,/g, '٬').replace(/[0-9]/g, x => '۰۱۲۳۴۵۶۷۸۹'[x]) : ''
}

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// days from today to an ISO date (negative = past)
export const daysTo = iso => Math.round((Date.parse(iso) - Date.parse(today())) / 864e5)

export const shamsi = iso => {
  const d = new Date(iso + 'T12:00:00Z')
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
    .format(d).replace(/\u200e/g, '').replace(/-/g, '/')
}

const cal = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })
// "1405/09/01" -> "2026-11-22", or null when invalid
export const toIso = input => {
  const m = digits(input).trim().replace(/[.-]/g, '/').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [y, mo, da] = m.slice(1).map(Number)
  if (mo < 1 || mo > 12 || da < 1 || da > 31) return null
  // day of the Persian year (months 1-6 have 31 days, 7-12 have 30); Nowruz falls on Mar 19-22
  const doy = (mo <= 6 ? (mo - 1) * 31 : 186 + (mo - 7) * 30) + da - 1
  const base = Date.UTC(y + 621, 2, 19) + doy * 864e5
  for (let o = -2; o <= 6; o++) {
    const d = new Date(base + o * 864e5)
    const p = Object.fromEntries(cal.formatToParts(d).map(x => [x.type, x.value]))
    if (+p.year === y && +p.month === mo && +p.day === da) return d.toISOString().slice(0, 10)
  }
  return null
}

export const addDays = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10)
// rial -> toman (display only)
export const toman = v => fmt(Math.floor(Number(v || 0) / 10))

// Data only lives in this browser, so we remember when the user last downloaded a backup.
export const lastBackup = () => { try { return localStorage.getItem(BACKUP_KEY) } catch { return null } }
export const markBackup = () => { try { localStorage.setItem(BACKUP_KEY, today()) } catch { /* ignore */ } }
