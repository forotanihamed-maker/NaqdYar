import { balance, isLate, isOpen, sumBy } from '../domain/ledger.js'
import { daysTo, fmt, lastBackup, rial, shamsi, today } from '../utils.js'
import ItemRow from '../components/ItemRow.jsx'
import { Badge, Stat } from '../components/ui.jsx'

const LIMIT = 5

// A list block that shows the first few rows and a "see all" link instead of an endless page.
function Block({ title, count, tone, children, onAll, allLabel }) {
  return <section className="card block">
    <div className="block-head">
      <h2>{title} {count > 0 && <Badge tone={tone}>{fmt(count)}</Badge>}</h2>
      {onAll && count > LIMIT && <button type="button" className="btn sm ghost" onClick={onAll}>{allLabel || 'مشاهده همه'} ({fmt(count)})</button>}
    </div>
    {children}
  </section>
}

export default function Home({ items, people, nameOf, api, onAdd, payments = [], followUps = [], go, onPerson }) {
  const open = items.filter(i => isOpen(i, payments))
  const ins = open.filter(i => i.dir === 'in'), outs = open.filter(i => i.dir === 'out')
  const bal = i => balance(i, payments)
  const lateIn = ins.filter(i => isLate(i, payments)), lateOut = outs.filter(i => isLate(i, payments))
  const late = [...lateIn, ...lateOut].sort((a, b) => a.due.localeCompare(b.due))
  const soon = open.filter(i => daysTo(i.due) >= 0 && daysTo(i.due) <= 7).sort((a, b) => a.due.localeCompare(b.due))
  const within30 = list => sumBy(list.filter(i => daysTo(i.due) <= 30), bal)
  const net = within30(ins) - within30(outs)
  const dueFollow = followUps.filter(f => f.nextFollowUpDate && f.nextFollowUpDate <= today()).sort((a, b) => a.nextFollowUpDate.localeCompare(b.nextFollowUpDate))
  const sumIn = sumBy(ins, bal), sumOut = sumBy(outs, bal)
  const max = Math.max(1, sumIn, sumOut)
  const needsAction = late.length + soon.length + dueFollow.length

  if (!items.length && !people.length) {
    return <>
      <div className="head"><div><h1>به نقدیار خوش آمدید</h1><p className="sub">دفتر چک‌ها و مطالبات شما؛ همه‌چیز فقط روی همین دستگاه ذخیره می‌شود.</p></div></div>
      <section className="card welcome">
        <h2>با سه قدم شروع کنید</h2>
        <ol>
          <li><b>ثبت چک یا حساب:</b> مبلغ، شخص و تاریخ سررسید را وارد کنید.</li>
          <li><b>هر روز نمای کلی را ببینید:</b> معوق‌ها و سررسیدهای نزدیک همین‌جا بالا می‌آیند.</li>
          <li><b>پشتیبان بگیرید:</b> اطلاعات فقط روی همین گوشی ذخیره می‌شود؛ حذف برنامه یا عوض‌کردن گوشی آن را از بین می‌برد، پس هر چند وقت یک‌بار فایل پشتیبان بگیرید.</li>
        </ol>
        <button type="button" className="btn p lg" onClick={onAdd}>+ ثبت اولین چک یا حساب</button>
      </section>
    </>
  }

  const last = lastBackup()
  const backupAge = last ? -daysTo(last) : null
  const staleBackup = !last || backupAge > 7

  return <>
    <div className="head"><div><h1>نمای کلی</h1><p className="sub">امروز {shamsi(today())} · وضعیت نقدینگی، سررسیدها و پیگیری‌ها</p></div></div>

    {staleBackup && <div className="banner" role="note">
      <span>{last ? `آخرین پشتیبان ${fmt(backupAge)} روز پیش گرفته شده.` : 'هنوز از اطلاعات پشتیبان نگرفته‌اید.'} اگر برنامه را حذف کنید، اطلاعات برنامه را پاک کنید یا گوشی را عوض کنید، این اطلاعات از بین می‌رود.</span>
      <button type="button" className="btn sm" onClick={() => go('backup')}>پشتیبان‌گیری</button>
    </div>}

    <section className="cards">
      <Stat label="دریافتنی باز" value={rial(sumIn)} tone="in-t" hint={`${fmt(ins.length)} سند باز`} />
      <Stat label="پرداختنی باز" value={rial(sumOut)} tone="out-t" hint={`${fmt(outs.length)} سند باز`} />
      <Stat label="خالص ۳۰ روز آینده" value={rial(net)} tone={net < 0 ? 'bad' : 'in-t'} hint="دریافتنی منهای پرداختنی؛ شامل معوق‌ها" />
      <Stat label="معوق دریافتنی" value={rial(sumBy(lateIn, bal))} tone={lateIn.length ? 'bad' : ''}
        hint={`${fmt(lateIn.length)} مورد · معوق پرداختنی: ${rial(sumBy(lateOut, bal))}`} />
    </section>

    {needsAction === 0 && <div className="allgood" role="status">✓ موردی برای اقدام امروز نیست؛ معوقی ندارید و تا ۷ روز آینده سررسیدی در راه نیست.</div>}

    {late.length > 0 && <Block title="معوق‌ها" count={late.length} tone="bad" onAll={() => go('cheques')} allLabel="همه معوق‌ها">
      {late.slice(0, LIMIT).map(i => <ItemRow key={i.id} item={i} name={nameOf(i.personId)} api={api} payments={payments} onPerson={onPerson} />)}
    </Block>}

    {soon.length > 0 && <Block title="سررسید ۷ روز آینده" count={soon.length} tone="info" onAll={() => go('cheques')}>
      {soon.slice(0, LIMIT).map(i => <ItemRow key={i.id} item={i} name={nameOf(i.personId)} api={api} payments={payments} onPerson={onPerson} />)}
    </Block>}

    {dueFollow.length > 0 && <Block title="پیگیری‌های امروز و عقب‌افتاده" count={dueFollow.length} tone="warn" onAll={() => go('followups')}>
      {dueFollow.slice(0, LIMIT).map(f => <div className="payment-row" key={f.id}>
        <button type="button" className="linkish" onClick={() => onPerson(f.personId)}>{nameOf(f.personId)}</button>
        <span>{shamsi(f.nextFollowUpDate)}</span>
        <span>{f.note || f.result}</span>
      </div>)}
    </Block>}

    <section className="card">
      <h2>مقایسه مانده‌ها</h2>
      <div className="barrow"><span>دریافتنی</span><div className="bartrack"><div className="barfill inbar" style={{ width: `${Math.max(2, sumIn / max * 100)}%` }} /></div><strong>{rial(sumIn)}</strong></div>
      <div className="barrow"><span>پرداختنی</span><div className="bartrack"><div className="barfill outbar" style={{ width: `${Math.max(2, sumOut / max * 100)}%` }} /></div><strong>{rial(sumOut)}</strong></div>
    </section>
  </>
}
