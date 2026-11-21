const cell = v => '"' + String(v ?? '').replaceAll('"', '""') + '"'

// Downloads rows as a CSV. The BOM makes Excel read the Persian text correctly.
export function downloadCsv(rows, name) {
  const text = '\ufeff' + rows.map(r => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
