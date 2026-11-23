import { saveFile } from './file.js'

// Excel treats a leading = + - @ as a formula; prefix such text so it stays plain.
const cell = v => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}

// The BOM makes Excel read the Persian text correctly.
export const csvText = rows => '\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n')
export const downloadCsv = (rows, name) => saveFile(name, csvText(rows), 'text/csv;charset=utf-8')
