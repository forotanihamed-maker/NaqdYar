import { useState } from 'react'
import { normalizeReport } from '../domain/ledger.js'
import { ConfirmDialog } from '../components/ui.jsx'
import { KEY } from '../constants.js'
import { saveFile } from '../file.js'
import { corruptBackups, daysTo, fmt, lastBackup, markBackup, readCorrupt, shamsi, today } from '../utils.js'

const droppedOf = issues => issues.people + issues.items + issues.payments + issues.followUps + issues.promises
const fixedOf = issues => issues.badDates + issues.badAmounts + issues.duplicates

export default function Backup({ data, onImport }) {
  const [pending, setPending] = useState(null) // parsed backup waiting for the user's OK
  const [error, setError] = useState('')
  const [last, setLast] = useState(lastBackup)
  const [corrupt, setCorrupt] = useState(corruptBackups)
  const active = data.items.filter(i => !i.deletedAt).length

  async function save() {
    setError('')
    const ok = await saveFile(`naqdyar-backup-${today()}.json`, JSON.stringify(data, null, 2), 'application/json')
    if (!ok) { setError('ساخت فایل پشتیبان ناموفق بود؛ دوباره تلاش کنید.'); return }
    markBackup()
    setLast(today())
  }
  async function saveCorrupt(entry) {
    const text = readCorrupt(entry.key)
    if (!text) { setError('این نسخه دیگر در حافظه برنامه نیست.'); setCorrupt(corruptBackups()); return }
    await saveFile(`${entry.key}.json`, text, 'application/json')
  }
  async function load(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const raw = JSON.parse(await file.text())
      const { data: n, issues } = normalizeReport(raw)
      if (!n.people.length && !n.items.length) { setError('این فایل سند یا شخصی ندارد؛ فایل پشتیبان نقدیار را انتخاب کنید.'); return }
      setPending({ raw, people: n.people.length, items: n.items.filter(i => !i.deletedAt).length, dropped: droppedOf(issues), fixed: fixedOf(issues) })
    } catch { setError('فایل پشتیبان معتبر نیست.') }
  }

  return <>
    <div className="head"><div><h1>پشتیبان‌گیری</h1><p className="sub">اطلاعات فقط روی همین گوشی و داخل برنامه ذخیره می‌شود؛ برای نگهداری، فایل بگیرید.</p></div></div>
    <div className="banner" role="note">
      <span>حذف برنامه، پاک‌کردن اطلاعات برنامه یا تعویض گوشی باعث از دست رفتن داده می‌شود، مگر فایل پشتیبان داشته باشید.</span>
    </div>
    <section className="card">
      <h2>دانلود پشتیبان</h2>
      <p className="sub">{last ? `آخرین پشتیبان: ${shamsi(last)} (${daysTo(last) === 0 ? 'امروز' : fmt(-daysTo(last)) + ' روز پیش'})` : 'هنوز پشتیبان نگرفته‌اید.'} · اکنون {fmt(active)} سند و {fmt(data.people.length)} شخص دارید.</p>
      <button type="button" className="btn p" onClick={save}>دانلود فایل پشتیبان</button>
      {error && <p className="err" role="alert">{error}</p>}
    </section>
    <section className="card">
      <h2>بازیابی از فایل</h2>
      <p className="sub">اطلاعات فعلی با محتوای فایل جایگزین می‌شود. بعد از بازیابی تا چند ثانیه می‌توانید با «بازگردانی» پشیمان شوید.</p>
      <label className="btn file-btn">انتخاب فایل پشتیبان<input type="file" accept="application/json,.json" onChange={load} hidden /></label>
    </section>
    {corrupt.length > 0 && <section className="card">
      <h2>نسخه‌های خام آسیب‌دیده</h2>
      <p className="sub">این نسخه‌ها از اطلاعات ذخیره‌شده‌ای ساخته شده‌اند که برنامه نتوانست آن‌ها را هنگام باز شدن بخواند. تا قبل از هر بازنشانی، فایلشان را نگه دارید.</p>
      {corrupt.map(entry => <div className="payment-row" key={entry.key}>
        <small className="ltr">{entry.key.replace(KEY + '-corrupt-', '')}</small>
        <span>{fmt(Math.ceil(entry.size / 1024))} کیلوبایت</span>
        <button type="button" className="btn sm" onClick={() => saveCorrupt(entry)}>دریافت فایل</button>
      </div>)}
    </section>}
    {pending && <ConfirmDialog title="جایگزینی اطلاعات؟" danger confirmLabel="بله، بازیابی شود" onClose={() => setPending(null)} onConfirm={() => onImport(pending.raw)}>
      <p>فایل شامل <b>{fmt(pending.items)}</b> سند و <b>{fmt(pending.people)}</b> شخص است. اطلاعات فعلی ({fmt(active)} سند) جایگزین می‌شود.</p>
      {pending.dropped > 0 && <p className="err">{fmt(pending.dropped)} رکورد نامعتبر در فایل بود و وارد نمی‌شود.</p>}
      {pending.fixed > 0 && <p className="hint">{fmt(pending.fixed)} مقدار نامعتبر (تاریخ، مبلغ یا شناسه تکراری) اصلاح یا حذف می‌شود.</p>}
    </ConfirmDialog>}
  </>
}
