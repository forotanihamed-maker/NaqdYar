import { useEffect, useMemo, useState } from 'react'
import { useLedger } from './hooks/useLedger'
import ItemForm from './components/ItemForm'
import Home from './pages/Home'
import Cheques from './pages/Cheques'
import Parties from './pages/Parties'
import Backup from './pages/Backup'
import Payments from './pages/Payments'
import FollowUps from './pages/FollowUps'
import Promises from './pages/Promises'
import Reports from './pages/Reports'
import PersonDetail from './pages/PersonDetail'
const NAV=[['home','نمای کلی'],['cheques','چک‌ها و حساب‌ها'],['debtors','بدهکاران'],['creditors','طلبکاران'],['payments','پرداخت‌ها'],['followups','پیگیری‌ها'],['promises','وعده‌ها و وصول'],['reports','گزارش‌ها'],['backup','پشتیبان']]
export default function App(){
 const [page,setPage]=useState('home'),[personId,setPersonId]=useState(null),[showForm,setShowForm]=useState(false),[toast,setToast]=useState('');const ledger=useLedger(setToast);const {people,items}=ledger.data
 const names=useMemo(()=>Object.fromEntries(people.map(p=>[p.id,p.name])),[people]);const nameOf=id=>names[id]||'شخص حذف‌شده';const onAdd=()=>setShowForm(true)
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),2600);return()=>clearTimeout(t)},[toast])
 const openPerson=id=>{setPersonId(id);setPage('person')}
 return <><header className="top"><span className="brand">نقدیار</span><span className="sub">دفتر چک و مطالبات</span></header><div className="layout"><nav className="side">{NAV.map(([k,t])=><button key={k} className={page===k?'on':''} onClick={()=>{setPage(k);setPersonId(null)}}>{t}</button>)}</nav><main>
 {page==='home'&&<Home items={items} nameOf={nameOf} api={ledger} onAdd={onAdd} payments={ledger.data.payments} followUps={ledger.data.followUps}/>}
 {page==='cheques'&&<Cheques items={items} nameOf={nameOf} api={ledger} onAdd={onAdd} payments={ledger.data.payments}/>}
 {page==='debtors'&&<Parties dir="in" items={items} people={people} api={ledger} payments={ledger.data.payments} onPerson={openPerson}/>}
 {page==='creditors'&&<Parties dir="out" items={items} people={people} api={ledger} payments={ledger.data.payments} onPerson={openPerson}/>}
 {page==='payments'&&<Payments data={ledger.data} api={ledger} nameOf={nameOf}/>}
 {page==='followups'&&<FollowUps data={ledger.data} api={ledger} nameOf={nameOf}/>}
 {page==='promises'&&<Promises data={ledger.data} api={ledger} nameOf={nameOf} onPerson={openPerson}/>}
 {page==='reports'&&<Reports data={ledger.data} nameOf={nameOf}/>}
 {page==='person'&&personId&&people.find(p=>p.id===personId)&&<PersonDetail person={people.find(p=>p.id===personId)} data={ledger.data} api={ledger} onBack={()=>setPage('debtors')} nameOf={nameOf}/>}
 {page==='backup'&&<Backup data={ledger.raw} onImport={ledger.importData}/>}
 </main></div>{showForm&&<ItemForm people={people} onClose={()=>setShowForm(false)} onSubmit={ledger.addItem}/>} {toast&&<div className="toast" role="status">{toast}</div>}</>
}
