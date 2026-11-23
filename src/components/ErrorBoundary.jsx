import { Component } from 'react'
import { KEY } from '../constants.js'
import { saveFile } from '../file.js'

const rawData = () => { try { return localStorage.getItem(KEY) || '' } catch { return '' } }

export default class ErrorBoundary extends Component {
  state = { failed: false, confirm: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error, info) { console.error(error, info) }
  download = async () => {
    const text = rawData()
    if (text) await saveFile(`naqdyar-raw-${new Date().toISOString().slice(0, 10)}.json`, text, 'application/json')
  }
  reset = () => {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    location.reload()
  }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="errorpage">
      <h1>برنامه به مشکل خورد</h1>
      <p>اطلاعات شما پاک نشده است. اگر فایل پشتیبان دارید، برنامه را دوباره باز کنید و از صفحه «پشتیبان» بازیابی کنید.</p>
      <p>اگر برنامه باز نمی‌شود، اول «دریافت فایل داده خام» را بزنید تا نسخه‌ای از اطلاعات فعلی داشته باشید.</p>
      <div className="actions">
        <button type="button" className="btn p" onClick={this.download}>دریافت فایل داده خام</button>
        <button type="button" className="btn" onClick={() => location.reload()}>تلاش دوباره</button>
        {!this.state.confirm
          ? <button type="button" className="btn ghost x" onClick={() => this.setState({ confirm: true })}>پاک کردن داده و شروع دوباره</button>
          : <>
            <span className="err">همه اسناد و پرداخت‌های این گوشی پاک می‌شود. مطمئنید؟</span>
            <button type="button" className="btn danger" onClick={this.reset}>بله، پاک شود</button>
            <button type="button" className="btn" onClick={() => this.setState({ confirm: false })}>انصراف</button>
          </>}
      </div>
    </main>
  }
}
