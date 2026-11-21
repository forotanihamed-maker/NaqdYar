import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLedger } from './hooks/useLedger'
import { attention } from './domain/ledger'
import ItemForm from './components/ItemForm'
import { Icon } from './components/ui'
import Home from './pages/Home'
import Cheques from './pages/Cheques'
import Parties from './pages/Parties'
import Backup from './pages/Backup'
import Payments from './pages/Payments'
import FollowUps from './pages/FollowUps'
import Promises from './pages/Promises'
import Reports from './pages/Reports'
import PersonDetail from './pages/PersonDetail'

// [key, label, icon]
const GROUPS = [
  { items: [['home', 'نمای کلی', 'home']] },
  { title: 'دفتر', items: [['cheques', 'چک‌ها و حساب‌ها', 'docs'], ['payments', 'پرداخت‌ها', 'wallet']] },
  { title: 'مطالبات', items: [['debtors', 'بدهکاران', 'down'], ['creditors', 'طلبکاران', 'up'], ['followups', 'پیگیری‌ها', 'bell'], ['promises', 'وعده‌ها و وصول', 'check']] },
  { title: 'ابزار', items: [['reports', 'گزارش‌ها', 'chart'], ['backup', 'پشتیبان', 'save']] },
]
const ALL = GROUPS.flatMap(g => g.items)
const TITLES = { ...Object.fromEntries(ALL.map(([k, t]) => [k, t])), person: 'پرونده شخص' }
const MOBILE_MAIN = ['home', 'cheques']          // left of the + button
const MOBILE_MAIN2 = ['promises']                 // right of the + button
const SHORT = { cheques: 'اسناد', promises: 'وصول' } // one-line labels for the narrow bottom bar

export default function App() {
  const [page, setPage] = useState('home')
  const [personId, setPersonId] = useState(null)
  const [from, setFrom] = useState('debtors')     // where "back" goes from a person's file
  const [form, setForm] = useState(null)          // { initial } while the add dialog is open
  const [more, setMore] = useState(false)
  const [toast, setToast] = useState(null)        // { id, msg, undo? }

  const notify = useCallback((msg, undo) => setToast({ id: Date.now() + Math.random(), msg, undo }), [])
  const ledger = useLedger(notify)
  const { people, items } = ledger.data
  const names = useMemo(() => Object.fromEntries(people.map(p => [p.id, p.name])), [people])
  const nameOf = id => names[id] || 'شخص حذف‌شده'
  const counts = useMemo(() => attention(ledger.data), [ledger.data])
  const badge = { cheques: counts.late, followups: counts.followUps, promises: counts.promises }

  // Toasts with an undo stay longer so there is time to react.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), toast.undo ? 7000 : 3200)
    return () => clearTimeout(t)
  }, [toast])

  const go = k => { setPersonId(null); setPage(k); setMore(false) }
  const openPerson = id => { if (page !== 'person') setFrom(page); setPersonId(id); setPage('person'); setMore(false) }
  const openForm = (initial = {}) => { setMore(false); setForm({ initial }) }

  const person = page === 'person' && people.find(p => p.id === personId)
  const current = page === 'person' ? from : page
  useEffect(() => { window.scrollTo(0, 0) }, [page, personId])
  useEffect(() => { document.title = `نقدیار · ${person ? 'پرونده ' + person.name : TITLES[page]}` }, [page, person])

  const navBtn = (k, mobile) => {
    const [, label, icon] = ALL.find(x => x[0] === k)
    return <button key={k} type="button" className={current === k ? 'on' : ''} aria-current={current === k ? 'page' : undefined} onClick={() => go(k)}>
      <Icon name={icon} size={mobile ? 22 : 19} /><span className="nav-label">{mobile && SHORT[k] ? SHORT[k] : label}</span>
      {badge[k] > 0 && <span className="nav-badge" aria-label={`${badge[k]} مورد`}>{badge[k].toLocaleString('fa-IR')}</span>}
    </button>
  }

  const common = { items, nameOf, api: ledger, payments: ledger.data.payments, onPerson: openPerson }
  return <>
    <header className="top">
      <div className="brand-wrap"><span className="brand">نقدیار</span><span className="tagline">دفتر چک و مطالبات</span></div>
      <button type="button" className="btn p add-top" onClick={() => openForm()}><Icon name="plus" size={18} /> ثبت چک یا حساب</button>
    </header>
    <div className="layout">
      <nav className="side" aria-label="ناوبری اصلی">
        {GROUPS.map((g, gi) => <div className="grp" key={gi}>
          {g.title && <div className="grp-title">{g.title}</div>}
          {g.items.map(([k]) => navBtn(k))}
        </div>)}
      </nav>
      <main id="main">
        {page === 'home' && <Home {...common} people={people} onAdd={() => openForm()} followUps={ledger.data.followUps} go={go} />}
        {page === 'cheques' && <Cheques {...common} onAdd={() => openForm()} />}
        {page === 'debtors' && <Parties dir="in" {...common} people={people} />}
        {page === 'creditors' && <Parties dir="out" {...common} people={people} />}
        {page === 'payments' && <Payments data={ledger.data} api={ledger} nameOf={nameOf} onPerson={openPerson} />}
        {page === 'followups' && <FollowUps data={ledger.data} api={ledger} nameOf={nameOf} onPerson={openPerson} />}
        {page === 'promises' && <Promises data={ledger.data} api={ledger} nameOf={nameOf} onPerson={openPerson} />}
        {page === 'reports' && <Reports data={ledger.data} nameOf={nameOf} />}
        {page === 'person' && (person
          ? <PersonDetail key={person.id} person={person} data={ledger.data} api={ledger} nameOf={nameOf} onBack={() => go(from)} onAddItem={openForm} />
          : <section className="card"><p className="empty">این شخص پیدا نشد. <button type="button" className="linkish" onClick={() => go('debtors')}>بازگشت</button></p></section>)}
        {page === 'backup' && <Backup data={ledger.raw} onImport={ledger.importData} />}
      </main>
    </div>

    <nav className="bottombar" aria-label="ناوبری موبایل">
      {MOBILE_MAIN.map(k => navBtn(k, true))}
      <button type="button" className="fab" aria-label="ثبت چک یا حساب جدید" onClick={() => openForm()}><Icon name="plus" size={26} /></button>
      {MOBILE_MAIN2.map(k => navBtn(k, true))}
      <button type="button" className={more || (!MOBILE_MAIN.concat(MOBILE_MAIN2).includes(current)) ? 'on' : ''} aria-expanded={more} onClick={() => setMore(v => !v)}>
        <Icon name="more" size={22} /><span className="nav-label">بیشتر</span>
      </button>
    </nav>
    {more && <div className="sheet-bg" onClick={() => setMore(false)}>
      <div className="sheet" role="menu" onClick={e => e.stopPropagation()}>
        {GROUPS.slice(1).map((g, gi) => {
          const rest = g.items.filter(([k]) => !MOBILE_MAIN.concat(MOBILE_MAIN2).includes(k))
          return rest.length > 0 && <div key={gi}><div className="grp-title">{g.title}</div>
            <div className="sheet-grid">{rest.map(([k]) => navBtn(k, true))}</div></div>
        })}
      </div>
    </div>}

    {form && <ItemForm people={people} initial={form.initial} onClose={() => setForm(null)} onSubmit={ledger.addItem} />}
    {toast && <div className="toast" role="status" key={toast.id}>
      <span>{toast.msg}</span>
      {toast.undo && <button type="button" onClick={() => { toast.undo(); setToast(null) }}>بازگردانی</button>}
    </div>}
  </>
}
