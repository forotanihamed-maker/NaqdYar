import { useState } from 'react'
import { normalize } from '../domain/ledger'
import { ConfirmDialog } from '../components/ui'
import { daysTo, fmt, lastBackup, markBackup, shamsi, today } from '../utils'

export default function Backup({ data, onImport }) {
  const [pending, setPending] = useState(null) // parsed backup waiting for the user's OK
  const [error, setError] = useState('')
  const [last, setLast] = useState(lastBackup)
  const active = data.items.filter(i => !i.deletedAt).length

  function save() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = `naqdyar-backup-${today()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    markBackup(); setLast(today())
  }
  async function load(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const raw = JSON.parse(await file.text())
      const n = normalize(raw)
      if (!n.people.length && !n.items.length) { setError('این فایل سند یا شخصی ندارد؛ فایل پشتیبان نقدیار را انتخاب کنید.'); return }
      setPending({ raw, people: n.people.length, items: n.items.filter(i => !i.deletedAt).length })
    } catch { setError('فایل پشتیبان معتبر نیست.') }
  }

  return <>
    <div className="head"><div><h1>پشتیبان‌گیری</h1><p className="sub">اطلاعات فقط در همین مرورگر ذخیره می‌شود؛ از آن فایل بگیرید.</p></div></div>
    <section className="card">
      <h2>دانلود پشتیبان</h2>
      <p className="sub">{last ? `آخرین پشتیبان: ${shamsi(last)} (${daysTo(last) === 0 ? 'امروز' : fmt(-daysTo(last)) + ' روز پیش'})` : 'هنوز پشتیبان نگرفته‌اید.'} · اکنون {fmt(active)} سند و {fmt(data.people.length)} شخص دارید.</p>
      <button type="button" className="btn p" onClick={save}>دانلود فایل پشتیبان</button>
    </section>
    <section className="card">
      <h2>بازیابی از فایل</h2>
      <p className="sub">اطلاعات فعلی با محتوای فایل جایگزین می‌شود. بعد از بازیابی تا چند ثانیه می‌توانید با «بازگردانی» پشیمان شوید.</p>
      <label className="btn file-btn">انتخاب فایل پشتیبان<input type="file" accept="application/json,.json" onChange={load} hidden /></label>
      {error && <p className="err" role="alert">{error}</p>}
    </section>
    {pending && <ConfirmDialog title="جایگزینی اطلاعات؟" danger confirmLabel="بله، بازیابی شود" onClose={() => setPending(null)} onConfirm={() => onImport(pending.raw)}>
      <p>فایل شامل <b>{fmt(pending.items)}</b> سند و <b>{fmt(pending.people)}</b> شخص است. اطلاعات فعلی ({fmt(active)} سند) جایگزین می‌شود.</p>
    </ConfirmDialog>}
  </>
}
