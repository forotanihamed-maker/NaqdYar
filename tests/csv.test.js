import test from 'node:test'
import assert from 'node:assert/strict'
import { csvText } from '../src/csv.js'

test('csv starts with BOM and escapes quotes', () => {
  const text = csvText([['نام', 'توضیح'], ['شرکت الفا', 'گویا "مهم" است']])
  assert.ok(text.startsWith('\ufeff'))
  assert.ok(text.includes('"گویا ""مهم"" است"'))
})

test('csv keeps formula-looking values as text', () => {
  const text = csvText([['=SUM(A1:A2)'], ['+1'], ['-2'], ['@cmd']])
  assert.ok(text.includes('"\'=SUM(A1:A2)"'))
  assert.ok(text.includes('"\'+1"'))
  assert.ok(text.includes('"\'-2"'))
  assert.ok(text.includes('"\'@cmd"'))
})
