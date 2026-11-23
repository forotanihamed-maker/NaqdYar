import { BACKUP_KEY, KEY } from './constants.js'

/* ---------- Numbers (no Intl: old Android WebViews may lack it) ---------- */
const FA = '۰۱۲۳۴۵۶۷۸۹'
const group = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '٬')
export const faNum = v => String(v ?? '').replace(/\d/g, d => FA[+d])
export const fmt = v => {
  const n = Math.trunc(Number(v) || 0)
  return (n < 0 ? '−' : '') + faNum(group(String(Math.abs(n))))
}
export const rial = v => fmt(v) + ' ریال'
export const rel = d => (d < 0 ? fmt(-d) + ' روز معوق' : d === 0 ? 'امروز' : fmt(d) + ' روز دیگر')
export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

export const digits = v => String(v ?? '')
  .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))

// "1234567" -> "۱٬۲۳۴٬۵۶۷" for amount inputs
export const amountInput = v => {
  const d = digits(v).replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  return d ? faNum(group(d)) : ''
}

// Persian search may be typed with Arabic letters or Persian/Arabic digits: compare a normalized copy only.
export const normalizeText = v => digits(v)
  .replace(/[ىي]/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[ۀة]/g, 'ه')
  .replace(/[\u064b-\u0652\u0640\u200c\u200e\u200f]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

/* ---------- Dates (pure Jalali conversion, no Intl) ---------- */
const div = (a, b) => Math.trunc(a / b)
const mod = (a, b) => a - Math.trunc(a / b) * b
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178]

function jalCal(jy) {
  if (jy < BREAKS[0] || jy >= BREAKS[BREAKS.length - 1]) return null
  const gy = jy + 621
  let leapJ = -14
  let jp = BREAKS[0]
  let jump = 0
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i]
    jump = jm - jp
    if (jy < jm) break
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4)
    jp = jm
  }
  let n = jy - jp
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
  const march = 20 + leapJ - leapG
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33
  let leap = mod(mod(n + 1, 33) - 1, 4)
  if (leap === -1) leap = 4
  return { leap, gy, march }
}

const g2d = (gy, gm, gd) => {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
}
const d2g = jdn => {
  let j = 4 * jdn + 139361631
  j += div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
  const i = div(mod(j, 1461), 4) * 5 + 308
  const gd = div(mod(i, 153), 5) + 1
  const gm = mod(div(i, 153), 12) + 1
  return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm, gd }
}
const j2d = (jy, jm, jd) => {
  const r = jalCal(jy)
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
}
const d2j = jdn => {
  const gy = d2g(jdn).gy
  let jy = gy - 621
  const r = jalCal(jy)
  let k = jdn - g2d(gy, 3, r.march)
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }
    k -= 186
  } else {
    jy -= 1
    k += 179
    if (r.leap === 1) k += 1
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 }
}
const leapJ = jy => jalCal(jy)?.leap === 0
export const jMonthLen = (jy, jm) => (jm <= 6 ? 31 : jm <= 11 ? 30 : leapJ(jy) ? 30 : 29)

export const isIsoDate = v => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [y, m, d] = v.split('-').map(Number)
  if (y < 1800 || y > 2300 || m < 1 || m > 12 || d < 1 || d > 31) return false
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}
// ISO timestamp (date, date-time or Z form) used only for ordering; anything else becomes null.
export const validStamp = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null)

export const jparts = iso => {
  if (!isIsoDate(iso)) return null
  const [y, m, d] = iso.split('-').map(Number)
  const j = d2j(g2d(y, m, d))
  return { year: j.jy, month: j.jm, day: j.jd }
}

const pad2 = n => (n < 10 ? '0' : '') + n

export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
// days from today to an ISO date (negative = past)
export const daysTo = iso => Math.round((Date.parse(iso) - Date.parse(today())) / 864e5)

export const shamsi = iso => {
  const p = jparts(iso)
  return p ? `${faNum(p.year)}/${faNum(pad2(p.month))}/${faNum(pad2(p.day))}` : ''
}

// "1405/09/01" -> "2026-11-22", or null when invalid
export const toIso = input => {
  const m = digits(input).trim().replace(/[.-]/g, '/').match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const [jy, jm, jd] = m.slice(1).map(Number)
  if (jy < 1200 || jy > 1600 || jm < 1 || jm > 12 || jd < 1 || jd > jMonthLen(jy, jm)) return null
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd))
  return `${gy}-${pad2(gm)}-${pad2(gd)}`
}

export const addDays = (iso, n) => new Date(Date.parse(iso) + n * 864e5).toISOString().slice(0, 10)
// rial -> toman (display only)
export const toman = v => fmt(Math.floor(Number(v || 0) / 10))

/* ---------- Backup bookkeeping ---------- */
// Data only lives on this device, so we remember when the user last saved a backup.
export const lastBackup = () => { try { return localStorage.getItem(BACKUP_KEY) } catch { return null } }
export const markBackup = () => { try { localStorage.setItem(BACKUP_KEY, today()) } catch { /* ignore */ } }

// When the stored JSON cannot be parsed it is copied here before anything is overwritten.
export const corruptBackups = () => {
  try {
    const out = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(KEY + '-corrupt-')) out.push({ key, size: (localStorage.getItem(key) || '').length })
    }
    return out.sort((a, b) => b.key.localeCompare(a.key))
  } catch { return [] }
}
export const readCorrupt = key => { try { return localStorage.getItem(key) } catch { return null } }
