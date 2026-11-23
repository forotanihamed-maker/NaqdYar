import test from 'node:test'
import assert from 'node:assert/strict'
import {
  attention, balance, findPerson, isLate, normalize, normalizeReport, promiseState, syncFollowUpPromise,
} from '../src/domain/ledger.js'
import { today } from '../src/utils.js'

test('balance and lateness for cheques and accounts', () => {
  const cheque = { id: 'i', type: 'cheque', amount: 1000, status: 'open', due: '2000-01-01' }
  assert.equal(balance(cheque), 1000)
  assert.equal(isLate(cheque), true)
  assert.equal(balance({ ...cheque, status: 'done' }), 0)
  assert.equal(isLate({ ...cheque, due: today() }), false)

  const account = { id: 'a', type: 'account', amount: 1000, status: 'open', due: today() }
  const payments = [
    { id: 'p1', itemId: 'a', amount: 400, date: today(), deletedAt: null },
    { id: 'p2', itemId: 'a', amount: 100, date: today(), deletedAt: '2026-01-01T00:00:00Z' },
  ]
  assert.equal(balance(account, payments), 600)
})

test('normalize repairs a hand-edited backup without throwing', () => {
  const raw = {
    people: [
      { id: 'p1', name: ' علي ' },
      { id: 'p1', name: 'تکراری' },
      { name: 'بی‌شناسه' },
    ],
    items: [
      { id: 'i1', personId: 'p1', amount: '-5', due: 'abc', status: 'weird' },
      { id: 'i1', personId: 'p1', amount: 100, due: '2026-01-01' },
      { id: 'i2', personId: 'p1', amount: 100, due: 12345 },
    ],
  }
  const { data, issues } = normalizeReport(raw)
  assert.equal(data.people.length, 1)
  assert.equal(data.people[0].name, 'علي')
  assert.equal(data.items.length, 2)
  assert.equal(data.items[0].amount, 0)
  assert.equal(data.items[0].due, today())
  assert.equal(data.items[0].status, 'open')
  assert.equal(data.items[1].due, today())
  assert.equal(data.items[0].note, '')
  assert.equal(issues.people, 1)
  assert.equal(issues.duplicates, 2)
  assert.equal(issues.badAmounts, 1)
  assert.equal(issues.badDates, 2)
  // a second pass must not change anything (no "breaks again on reload")
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(data))), data)
})

test('normalize keeps only valid iso dates and non-negative amounts', () => {
  const data = normalize({
    people: [{ id: 'p', name: 'شرکت' }],
    items: [{ id: 'i', personId: 'p', amount: '1200', due: '2026-02-30' }],
    payments: [{ id: 'x', itemId: 'i', amount: -50, date: '2026-13-01' }],
    promises: [{ id: 'pr', personId: 'p', amount: -1, date: '2026-02-01', startDate: 'bad' }],
  })
  assert.equal(data.items[0].amount, 1200)
  assert.equal(data.items[0].due, today())
  assert.equal(data.payments[0].amount, 0)
  assert.equal(data.payments[0].date, today())
  assert.equal(data.promises[0].amount, 0)
  assert.equal(data.promises[0].startDate, today())
})

test('legacy aggregate payments migrate into one payment record', () => {
  const data = normalize({
    people: [{ id: 'p', name: 'مشتری' }],
    items: [{ id: 'i', personId: 'p', type: 'account', amount: 1000, paid: 300, due: '2026-01-01' }],
  })
  assert.equal(data.payments.length, 1)
  assert.equal(data.payments[0].amount, 300)
  assert.equal(data.payments[0].legacyDateUnknown, true)
  assert.equal(data.items[0].paid, 0)
  assert.equal(balance(data.items[0], data.payments), 700)
})

test('promise status is derived and deleted documents leave the todo list', () => {
  const item = { id: 'i', personId: 'p', dir: 'in', type: 'account', amount: 1000, status: 'open', due: '2026-01-01' }
  const payments = [{ id: 'x', itemId: 'i', amount: 200, date: '2026-01-02', deletedAt: null }]
  const promise = { id: 'pr', personId: 'p', itemId: 'i', amount: 500, date: '2099-01-01', startDate: '2026-01-01', cancelled: false }

  assert.equal(promiseState(promise, [item], payments, '2100-01-01').status, 'partial')
  assert.equal(promiseState({ ...promise, cancelled: true }, [item], payments, '2100-01-01').status, 'cancelled')
  assert.equal(promiseState(promise, [], payments, '2100-01-01').status, 'deleted')
  assert.equal(attention({ items: [], payments: [], promises: [promise] }).promises, 0)
})

test('a follow-up creates, updates and cancels exactly one promise', () => {
  const f = { id: 'f1', personId: 'p', itemId: '', contactDate: '2026-01-01', promisedAmount: 100, promiseDate: '2026-02-01' }
  const created = syncFollowUpPromise([], f)
  assert.equal(created.length, 1)
  assert.equal(created[0].followUpId, 'f1')
  assert.equal(created[0].startDate, '2026-01-01')

  assert.equal(syncFollowUpPromise(created, f).length, 1)
  assert.equal(syncFollowUpPromise(created, f)[0].amount, 100)

  const updated = syncFollowUpPromise(created, { ...f, promisedAmount: 200 }, 'update')
  assert.equal(updated.length, 1)
  assert.equal(updated[0].amount, 200)

  const cleared = { ...f, promisedAmount: 0, promiseDate: '' }
  const cancelled = syncFollowUpPromise(updated, cleared, 'update')
  assert.equal(cancelled[0].cancelled, true)
  // loading the backup must not revive a cancelled promise
  assert.equal(syncFollowUpPromise(cancelled, cleared)[0].cancelled, true)
})

test('findPerson matches Arabic yeh/kaf and Persian digits', () => {
  const people = [{ id: 'p', name: 'علي كريمي' }, { id: 'q', name: 'شرکت ۲' }]
  assert.equal(findPerson(people, 'علی کریمی').id, 'p')
  assert.equal(findPerson(people, 'شركت 2').id, 'q')
  assert.equal(findPerson(people, 'ناشناس'), undefined)
})
