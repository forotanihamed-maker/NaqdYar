import test from 'node:test'
import assert from 'node:assert/strict'
import {
  amountInput, faNum, fmt, isIsoDate, jMonthLen, jparts, normalizeText, shamsi, toIso, validStamp,
} from '../src/utils.js'

test('jalali conversion matches known official dates', () => {
  assert.equal(toIso('1405/01/01'), '2026-03-21')
  assert.equal(toIso('1403/12/30'), '2025-03-20')
  assert.equal(toIso('1404/12/30'), null) // 1404 is not a leap year
  assert.equal(toIso('1405/13/01'), null)
  assert.equal(toIso('abc'), null)
  assert.equal(shamsi('2026-03-21'), '۱۴۰۵/۰۱/۰۱')
  assert.equal(shamsi('2025-03-20'), '۱۴۰۳/۱۲/۳۰')
  assert.equal(shamsi('nope'), '')
})

test('every day of 1400-1410 survives a round trip', () => {
  let bad = 0
  for (let y = 1400; y <= 1410; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= jMonthLen(y, m); d++) {
        const iso = toIso(`${y}/${m}/${d}`)
        const p = jparts(iso)
        if (!iso || !p || p.year !== y || p.month !== m || p.day !== d) bad++
      }
    }
  }
  assert.equal(bad, 0)
})

test('iso date validation rejects impossible and mistyped values', () => {
  assert.equal(isIsoDate('2026-02-28'), true)
  assert.equal(isIsoDate('2025-02-29'), false)
  assert.equal(isIsoDate('2026-02-30'), false)
  assert.equal(isIsoDate('2026-2-3'), false)
  assert.equal(isIsoDate(20260203), false)
  assert.equal(validStamp('2026-02-03T10:00:00.000Z'), '2026-02-03T10:00:00.000Z')
  assert.equal(validStamp('2026-02-03T10:00:00.000Z'.replace('2026', 'x')), null)
  assert.equal(validStamp(123), null)
  assert.equal(jparts(null), null)
})

test('persian formatting does not need Intl', () => {
  assert.equal(fmt(1234567), '۱٬۲۳۴٬۵۶۷')
  assert.equal(fmt(-5), '−۵')
  assert.equal(fmt(0), '۰')
  assert.equal(faNum(1405), '۱۴۰۵')
  assert.equal(amountInput('0012345'), '۱۲٬۳۴۵')
  assert.equal(amountInput('abc'), '')
})

test('normalizeText unifies letters, digits and spacing', () => {
  assert.equal(normalizeText(' علي  كريمي '), 'علی کریمی')
  assert.equal(normalizeText('۱۲۳'), '123')
  assert.equal(normalizeText('نیم\u200cفاصله'), 'نیمفاصله')
})
