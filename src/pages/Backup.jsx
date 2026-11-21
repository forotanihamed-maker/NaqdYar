import { today } from '../utils'

export default function Backup({ data, onImport }) {
  function save() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = `naqdyar-backup-${today()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  async function load(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const raw = JSON.parse(await file.text())
      if (window.confirm('اطلاعات فعلی با فایل پشتیبان جایگزین شود؟')) onImport(raw)
    } catch { window.alert('فایل پشتیبان معتبر نیست') }
    e.target.value = ''
  }
  return <>
    <div className="head"><div><h1>پشتیبان‌گیری</h1><p className="sub">اطلاعات فقط در همین مرورگر ذخیره می‌شود؛ از آن فایل بگیرید.</p></div></div>
    <section className="card">
      <button className="btn p" onClick={save}>دانلود فایل پشتیبان</button>
      <p className="sub">بازیابی از فایل:</p>
      <input type="file" accept="application/json" onChange={load} />
    </section>
  </>
}
