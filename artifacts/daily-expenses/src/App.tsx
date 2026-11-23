import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, CircleCheck, Download, Flame, Moon, Plus, ReceiptText, Share2, Sun, Search, Smartphone, Tag, Upload, Target, Trash2, X, Pencil, TrendingUp } from 'lucide-react';
import { GrowRands } from './components/GrowRands';
import { ShareReceipt } from './components/ShareReceipt';
import { CURRENCIES, CURRENCY_KEY, downloadCsv, downloadExcel, getCurrency, type Expense, formatDate, formatRand, localDateKey, normalizeName, QUICK_ADDS, readExpenses, STORAGE_KEY, THEME_KEY } from './lib/expenses';

type Tab = 'today' | 'grow';
const BUDGET_KEY="daymark_daily_budget_v1",CAT_MAP_KEY="daymark_cats_v1",CUSTOM_QUICK_KEY="daymark_custom_quick_v1",CATEGORIES=["Food","Transport","Airtime/Data","Bills","Shopping","Other"];

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(readExpenses);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [todayKey, setTodayKey] = useState(() => localDateKey(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [tab, setTab] = useState<Tab>('today');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [notice, setNotice] = useState('');
  const [currencyCode, setCurrencyCode] = useState(() => getCurrency().code);
  const [bills, setBills] = useState<Array<{ name: string; amount: number }>>(() => {
    try { return JSON.parse(localStorage.getItem(BILLS_KEY) || "[]"); } catch { return []; }
  });
  const [addingBill, setAddingBill] = useState(false);
  const [billName, setBillName] = useState("");
  const [billAmt, setBillAmt] = useState("");
  const [paydayData, setPaydayData] = useState<{ date: string; cash: number } | null>(() => {
    try { return JSON.parse(localStorage.getItem(PAYDAY_KEY) || "null"); } catch { return null; }
  });
  const [editingPayday, setEditingPayday] = useState(false);
  const [payDateInput, setPayDateInput] = useState("");
  const [payCashInput, setPayCashInput] = useState("");
  const [dailyBudget, setDailyBudget] = useState<number | null>(() => {
    try { const v = Number(localStorage.getItem(BUDGET_KEY)); return Number.isFinite(v) && v > 0 ? v : null; } catch { return null; }
  });
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput,setBudgetInput]=useState(""),[category,setCategory]=useState("Food"),[catMap,setCatMap]=useState(()=>{try{return JSON.parse(localStorage.getItem(CAT_MAP_KEY)||"{}")}catch{return{}}}),[customQuicks,setCustomQuicks]=useState(()=>{try{return JSON.parse(localStorage.getItem(CUSTOM_QUICK_KEY)||"[]")}catch{return[]}}),[addingQ,setAddingQ]=useState(false),[qName,setQName]=useState(""),[qAmt,setQAmt]=useState(""),[listSearch,setListSearch]=useState(""),[filterCat,setFilterCat]=useState("All");

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      setNotice('');
    } catch {
      setNotice('This device could not save your entries. Check available storage and try again.');
    }
  }, [expenses]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme still applies for this visit. */ }
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const key = localDateKey(new Date());
      if (todayKey !== key) {
        setTodayKey(key);
        setSelectedDate(key);
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [todayKey]);

  const selectedExpenses = useMemo(
    () => expenses.filter((item) => item.dateKey === selectedDate).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses, selectedDate],
  );
  const selectedTotal = selectedExpenses.reduce((sum, item) => sum + item.amount, 0);const filteredExpenses = useMemo(() => selectedExpenses.filter(i => (filterCat === "All" || (catMap[i.id] || "Other") === filterCat) && (!listSearch.trim() || i.name.toLowerCase().includes(listSearch.trim().toLowerCase()))), [selectedExpenses, filterCat, listSearch, catMap]);
  const streakCount = useMemo(() => {
    const dates = new Set(expenses.map((i) => i.dateKey));
    if (!dates.size) return 0;
    let streak = 0; const cur = new Date(`${todayKey}T12:00:00`);
    if (!dates.has(todayKey)) cur.setDate(cur.getDate() - 1);
    while (dates.has(localDateKey(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
    return streak;
  }, [expenses, todayKey]);
  const sevenDayInsight = useMemo(() => {
    const today = new Date(`${todayKey}T12:00:00`);
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - 6);
    const fromKey = localDateKey(firstDay);
    const rolling = expenses.filter((item) => item.dateKey >= fromKey && item.dateKey <= todayKey);
    const totals = new Map<string, { name: string; amount: number }>();
    rolling.forEach((item) => {
      const key = normalizeName(item.name);
      const existing = totals.get(key);
      totals.set(key, { name: existing?.name ?? item.name.trim(), amount: (existing?.amount ?? 0) + item.amount });
    });
    const highest = [...totals.values()].sort((a, b) => b.amount - a.amount)[0];
    return { total: rolling.reduce((sum, item) => sum + item.amount, 0), count: rolling.length, highest, fromKey };
  }, [expenses, todayKey]);
  const monthInsight=useMemo(()=>{const mp=selectedDate.slice(0,7),it=expenses.filter(i=>i.dateKey.startsWith(mp)),tot=it.reduce((a,b)=>a+b.amount,0),days=new Set(it.map(i=>i.dateKey)).size,byCat=CATEGORIES.map(c=>({cat:c,sum:it.filter(i=>(catMap[i.id]||"Other")===c).reduce((a,b)=>a+b.amount,0)})).filter(x=>x.sum>0).sort((a,b)=>b.sum-a.sum);return{label:formatDate(mp+"-01",{month:"long",year:"numeric"}),tot,count:it.length,avg:days?tot/days:0,catBreakdown:byCat};},[expenses,selectedDate,catMap]);const today=selectedDate===todayKey;

  function downloadBackup() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses,
      catMap,
      customQuicks,
      bills,
      dailyBudget,
      paydayData,
      currencyCode,
      goal: (() => { try { return JSON.parse(localStorage.getItem("daymark_savings_goal_v1") || "null"); } catch { return null; } })()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daymark-backup-${todayKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (Array.isArray(data.expenses)) setExpenses(data.expenses);
        if (data.catMap && typeof data.catMap === "object") { setCatMap(data.catMap); localStorage.setItem(CAT_MAP_KEY, JSON.stringify(data.catMap)); }
        if (Array.isArray(data.customQuicks)) { setCustomQuicks(data.customQuicks); localStorage.setItem(CUSTOM_QUICK_KEY, JSON.stringify(data.customQuicks)); }
        if (Array.isArray(data.bills)) { setBills(data.bills); localStorage.setItem(BILLS_KEY, JSON.stringify(data.bills)); }
        if (typeof data.dailyBudget === "number") { setDailyBudget(data.dailyBudget); localStorage.setItem(BUDGET_KEY, String(data.dailyBudget)); }
        if (data.paydayData) { setPaydayData(data.paydayData); localStorage.setItem(PAYDAY_KEY, JSON.stringify(data.paydayData)); }
        if (data.goal) localStorage.setItem("daymark_savings_goal_v1", JSON.stringify(data.goal));
        setNotice("Backup restored cleanly!");
      } catch {
        setNotice("Could not read that backup file. Choose a valid Daymark JSON backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }
  function commitExpense(expense: Expense) {
    setCatMap(prev=>{const n={...prev,[expense.id]:category};try{localStorage.setItem(CAT_MAP_KEY,JSON.stringify(n))}catch{}return n;});setExpenses((current)=>[expense,...current]);
    setError('');
    setName('');
    setAmount('');
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const numericAmount = Number(amount.replace(',', '.'));
    if (!trimmedName) { setError('Add a name for this expense.'); return; }
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) { setError('Enter an amount greater than R 0,00.'); return; }
    const createdAt = new Date().toISOString();
    commitExpense({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      amount: Math.round((numericAmount + Number.EPSILON) * 100) / 100,
      createdAt,
      dateKey: localDateKey(new Date(createdAt)),
    });
    document.getElementById('expense-name')?.focus();
  }

  function quickAdd(item: typeof QUICK_ADDS[number]) {
    const createdAt = new Date().toISOString();
    commitExpense({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ...item, createdAt, dateKey: localDateKey(new Date(createdAt)) });
  }

  function beginEdit(expense: Expense) {
    setEditing(expense);
    setName(expense.name);
    setAmount(String(expense.amount).replace('.', ','));
    setError('');
    window.setTimeout(() => document.getElementById('expense-name')?.focus(), 0);
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const numericAmount = Number(amount.replace(',', '.'));
    if (!trimmedName) { setError('Add a name for this expense.'); return; }
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) { setError('Enter an amount greater than R 0,00.'); return; }
    if (!editing) return;
    setExpenses((current) => current.map((item) => item.id === editing.id ? {
      ...item,
      name: trimmedName,
      amount: Math.round((numericAmount + Number.EPSILON) * 100) / 100,
    } : item));
    setEditing(null);
    setName('');
    setAmount('');
    setError('');
  }

  function cancelEdit() {
    setEditing(null); setName(''); setAmount(''); setError('');
  }

  function removeExpense(expense: Expense) {
    if (!window.confirm(`Remove “${expense.name}” from ${formatDate(expense.dateKey)}? This cannot be undone.`)) return;
    setExpenses((current) => current.filter((item) => item.id !== expense.id));
    if (editing?.id === expense.id) cancelEdit();
  }

  const paydayInfo = useMemo(() => {
    if (!paydayData || !paydayData.date) return null;
    const now = new Date(`${todayKey}T12:00:00`);
    const target = new Date(`${paydayData.date}T12:00:00`);
    const diffDays = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 86400000));
    const spentToday = expenses.filter((i) => i.dateKey === todayKey).reduce((a, b) => a + b.amount, 0);
    const remainingCash = Math.max(0, paydayData.cash - spentToday);
    return { diffDays, remainingCash, safePerDay: remainingCash / diffDays, date: paydayData.date };
  }, [paydayData, todayKey, expenses]);
  const paceNote = useMemo(() => {
    if (!today || selectedTotal === 0 || !monthInsight.avg) return "";
    if (selectedTotal < monthInsight.avg * 0.85) return " · Lighter than usual";
    if (selectedTotal > monthInsight.avg * 1.25) return " · Heavier than usual";
    return " · Steady pace";
  }, [today, selectedTotal, monthInsight.avg]);
  const formVisible = today || editing !== null;

  return (
    <main className="page-shell grain">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Daymark home" data-testid="link-home"><span className="brand-mark"><span /></span><span>daymark<span className="brand-period">.</span></span></a>
        <div className="top-actions">
          {streakCount > 0 ? <span className="local-note" style={{ fontWeight: 600 }}><Flame size={14} style={{ color: "#ea580c", marginRight: 4 }} />{streakCount}-day streak</span> : <span className="local-note"><span className="local-dot" /> just for today</span>}
          <select aria-label="Choose currency" value={currencyCode} onChange={(e) => { setCurrencyCode(e.target.value); try { localStorage.setItem(CURRENCY_KEY, e.target.value); } catch {} }} style={{ padding: "5px 8px", borderRadius: 999, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{CURRENCIES.map((c) => <option key={c.code} value={c.code} style={{ color: "#111" }}>{c.label}</option>)}</select>
          <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} data-testid="button-theme-toggle">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}<span>{theme === 'light' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      <div className="content-wrap">
        {tab === 'today' ? (
          <>
            <section className="intro" aria-labelledby="page-title">
              <div className="eyebrow"><span className="eyebrow-line" /> YOUR DAILY MONEY NOTE</div>
              <h1 id="page-title">Daymark<br /><em>{currencyCode === "ZAR" ? "Daily Rand Tracker" : "Daily Spend Tracker"}</em></h1>
              <p className="intro-copy">Keep a gentle eye on where today goes.<br className="desktop-break" /> No budgets, no fuss — just your day, accounted for.</p>
            </section>

            <section className="today-panel" aria-label="Spending for selected day">
              <div className="summary-top">
                <div><p className="section-kicker">{today ? 'TODAY, SPENT' : 'THIS DAY, SPENT'}</p>
                  <p className="date-line" data-testid="text-today-date">{formatDate(selectedDate)}</p></div>
                <div className="day-stamp" aria-hidden="true"><span className="stamp-day">{selectedDate.slice(-2)}</span><span className="stamp-month">{formatDate(selectedDate, { month: 'short' }).toUpperCase()}</span></div>
              </div>
              <div className="total-row"><span className="total-amount" data-testid="text-today-total">{formatRand(selectedTotal)}</span><span className="total-caption">{today ? 'spent today' : 'spent this day'}</span></div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.28)", color: "#ffffff" }}>
  {editingBudget ? (
    <form onSubmit={(e) => { e.preventDefault(); const n = Number(budgetInput.replace(",", ".")); const val = Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null; setDailyBudget(val); try { val ? localStorage.setItem(BUDGET_KEY, String(val)) : localStorage.removeItem(BUDGET_KEY); } catch {} setEditingBudget(false); }} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <input type="text" inputMode="decimal" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} placeholder="e.g. 150" style={{ width: 110, padding: "5px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.6)", background: "rgba(255,255,255,0.14)", color: "#ffffff", fontSize: 13 }} autoFocus />
      <button type="submit" style={{ color: "#14532d", background: "#ffffff", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Save</button>
      <button type="button" onClick={() => setEditingBudget(false)} style={{ color: "#ffffff", background: "transparent", border: "1px solid rgba(255,255,255,0.45)", borderRadius: 8, padding: "5px 10px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
    </form>
  ) : dailyBudget ? (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, marginBottom: 6 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600, color: "#ffffff" }}><Target size={14} />{dailyBudget - selectedTotal >= 0 ? `${formatRand(dailyBudget - selectedTotal)} left of ${formatRand(dailyBudget)}` : `${formatRand(selectedTotal - dailyBudget)} over ${formatRand(dailyBudget)}`}</span>
        <button type="button" onClick={() => { setBudgetInput(String(dailyBudget)); setEditingBudget(true); }} style={{ color: "#ffffff", background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 6, padding: "2px 8px", fontSize: 12, cursor: "pointer" }}>Edit</button>
      </div>
      <div style={{ width: "100%", height: 7, borderRadius: 99, background: "rgba(255,255,255,0.25)", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, Math.round((selectedTotal / dailyBudget) * 100))}%`, height: "100%", background: selectedTotal > dailyBudget ? "#fca5a5" : selectedTotal / dailyBudget >= 0.8 ? "#fde047" : "#86efac", transition: "width 0.3s ease" }} />
      </div>
    </div>
  ) : (
    <button type="button" onClick={() => { setBudgetInput(""); setEditingBudget(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#ffffff", background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.38)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}><Target size={14} /> Set daily limit</button>
  )}
</div><div className="summary-foot"><span className="summary-note"><span className="note-mark" /> {selectedExpenses.length === 0 ? 'A fresh page.' : `${selectedExpenses.length} ${selectedExpenses.length === 1 ? 'thing' : 'things'} noted.`}</span>
                {selectedExpenses.length > 0 && <span className="average-caption">{selectedExpenses.length} ENTRIES{paceNote}</span>}</div>
            </section>

            <section className="date-filter" aria-label="Choose a day">
              <label htmlFor="date-filter-input"><CalendarDays size={16} /><span>Look back</span></label>
              <input id="date-filter-input" type="date" value={selectedDate} max={todayKey} onChange={(event) => setSelectedDate(event.target.value || todayKey)} data-testid="input-date-filter" />
              {!today && <button type="button" className="text-button" onClick={() => setSelectedDate(todayKey)} data-testid="button-return-today">Back to today</button>}
            </section>

            {formVisible && (
              <section className="add-section" aria-labelledby="add-title">
                <div className="section-heading"><span className="heading-icon"><Plus size={17} strokeWidth={1.8} /></span><div><h2 id="add-title">{editing ? 'Edit this note' : 'Note a spend'}</h2><p>{editing ? `Updating an entry from ${formatDate(editing.dateKey)}.` : 'Small or big, it all belongs here.'}</p></div></div>
                {!editing && <div style={{marginBottom:14}}><div className="quick-adds">{QUICK_ADDS.map(item=><button type="button" key={item.name} className="quick-chip" onClick={()=>quickAdd(item)}><span>{item.name}</span><strong>{formatRand(item.amount)}</strong><Plus size={13}/></button>)}{customQuicks.map(item=><span key={item.name} className="quick-chip" style={{display:"inline-flex",alignItems:"center",gap:6,paddingRight:6}}><button type="button" onClick={()=>quickAdd(item)} style={{display:"inline-flex",alignItems:"center",gap:5,background:"none",border:"none",color:"inherit",padding:0,cursor:"pointer",font:"inherit"}}><span>{item.name}</span><strong>{formatRand(item.amount)}</strong><Plus size={13}/></button><button type="button" onClick={()=>{const n=customQuicks.filter(i=>i.name!==item.name);setCustomQuicks(n);try{localStorage.setItem(CUSTOM_QUICK_KEY,JSON.stringify(n))}catch{}}} style={{background:"rgba(128,128,128,0.2)",border:"none",borderRadius:999,padding:2,color:"inherit",cursor:"pointer"}}><X size={11}/></button></span>)}{!addingQ && <button type="button" className="quick-chip" onClick={()=>setAddingQ(true)} style={{borderStyle:"dashed"}}><Plus size={13}/><span>Custom</span></button>}</div>{addingQ && <form onSubmit={e=>{e.preventDefault();const a=Number(qAmt.replace(",","."));if(!qName.trim()||!Number.isFinite(a)||a<=0)return;const n=[...customQuicks.filter(i=>i.name.toLowerCase()!==qName.trim().toLowerCase()),{name:qName.trim(),amount:Math.round(a*100)/100}];setCustomQuicks(n);try{localStorage.setItem(CUSTOM_QUICK_KEY,JSON.stringify(n))}catch{}setQName("");setQAmt("");setAddingQ(false);}} style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}><input type="text" value={qName} onChange={e=>setQName(e.target.value)} placeholder="Name e.g. Data" style={{width:120,padding:"5px 8px",borderRadius:7,border:"1px solid rgba(128,128,128,0.4)",background:"transparent",color:"inherit",fontSize:13}} autoFocus/><input type="text" inputMode="decimal" value={qAmt} onChange={e=>setQAmt(e.target.value)} placeholder="R amount" style={{width:85,padding:"5px 8px",borderRadius:7,border:"1px solid rgba(128,128,128,0.4)",background:"transparent",color:"inherit",fontSize:13}}/><button type="submit" className="text-button" style={{fontWeight:700}}>Add</button><button type="button" className="text-button" onClick={()=>setAddingQ(false)}>Cancel</button></form>}</div>}
                <form className="expense-form" onSubmit={editing ? saveEdit : addExpense} noValidate>
                  <label className="field name-field"><span>WHAT WAS IT?</span><input id="expense-name" type="text" value={name} onChange={(event) => { setName(event.target.value); if (error) setError(''); }} placeholder="e.g. Flat white" maxLength={80} autoComplete="off" aria-label="Expense name" aria-invalid={Boolean(error && !name.trim())} data-testid="input-expense-name" /></label>
                  <label className="field amount-field"><span>HOW MUCH?</span><div className="amount-input-wrap"><span className="currency-prefix" aria-hidden="true">{getCurrency().symbol}</span><input type="text" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); if (error) setError(''); }} placeholder="0,00" aria-label="Amount in South African Rand" aria-invalid={Boolean(error && amount && (!Number.isFinite(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0))} data-testid="input-expense-amount" /></div></label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",width:"100%",marginTop:4}}><span style={{fontSize:11,fontWeight:700,opacity:0.7,display:"inline-flex",alignItems:"center",gap:4}}><Tag size={12}/>CATEGORY:</span>{CATEGORIES.map(c=><button type="button" key={c} onClick={()=>setCategory(c)} style={{padding:"4px 10px",borderRadius:999,fontSize:12,fontWeight:category===c?700:500,border:category===c?"1.5px solid currentColor":"1px solid rgba(128,128,128,0.32)",background:category===c?"rgba(22,163,74,0.14)":"transparent",color:"inherit",cursor:"pointer"}}>{c}</button>)}</div><div className="form-buttons"><button className="add-button" type="submit" data-testid={editing ? 'button-save-edit' : 'button-add-expense'}><span>{editing ? 'Save changes' : 'Add to today'}</span>{editing ? <Check size={16} /> : <ArrowUpRight size={17} strokeWidth={1.8} />}</button>{editing && <button className="secondary-button cancel-edit" type="button" onClick={cancelEdit} data-testid="button-cancel-edit">Cancel</button>}</div>
                </form>
                <div className="form-meta"><p className={`form-error ${error ? 'is-visible' : ''}`} role="alert" aria-live="polite" data-testid="text-form-error">{error}</p><span className="private-note"><CircleCheck size={13} strokeWidth={1.8} /> Saved on this device only</span></div>
              </section>
            )}

            {!today && !editing && <p className="past-day-note">Past entries are read-only for new notes. You can still edit or remove an entry below.</p>}

            <section className="entries-section" aria-labelledby="entries-title">
              <div className="entries-heading"><div className="entries-title-wrap"><h2 id="entries-title">{today ? 'Today’s list' : 'This day’s list'}</h2><span className="entry-count" data-testid="text-expense-count">{selectedExpenses.length}</span></div>
                <div className="entry-actions"><span className="entries-unit">ZAR <span>·</span> {selectedExpenses.length === 1 ? '1 ENTRY' : `${selectedExpenses.length} ENTRIES`}</span>
                  <button className="share-button" type="button" onClick={() => setShareOpen(true)} data-testid="button-share-day"><Share2 size={14} />Share My Day</button></div>
              </div>
              {selectedExpenses.length > 0 && <div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:8}}><div style={{position:"relative",display:"flex",alignItems:"center"}}><Search size={14} style={{position:"absolute",left:10,opacity:0.6}}/><input type="text" value={listSearch} onChange={e=>setListSearch(e.target.value)} placeholder="Search entries..." style={{width:"100%",padding:"6px 10px 6px 30px",borderRadius:8,border:"1px solid rgba(128,128,128,0.3)",background:"transparent",color:"inherit",fontSize:13}}/></div><div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>{["All",...CATEGORIES].map(c=><button key={c} type="button" onClick={()=>setFilterCat(c)} style={{padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:filterCat===c?700:500,border:filterCat===c?"1.5px solid currentColor":"1px solid rgba(128,128,128,0.3)",background:filterCat===c?"rgba(22,163,74,0.14)":"transparent",color:"inherit",whiteSpace:"nowrap",cursor:"pointer"}}>{c}</button>)}</div></div>}{filteredExpenses.length > 0 ? <ul className="expense-list" aria-label={`${formatDate(selectedDate)} expenses`} data-testid="list-today-expenses">
                {filteredExpenses.map((expense) => <li className="expense-row entry-appear" key={expense.id} data-testid={`row-expense-${expense.id}`}>
                  <span className="expense-symbol"><ReceiptText size={17} strokeWidth={1.65} /></span><div className="expense-details"><span className="expense-name" data-testid={`text-expense-name-${expense.id}`}>{expense.name}</span><span className="expense-time">{new Intl.DateTimeFormat("en-ZA",{hour:"2-digit",minute:"2-digit"}).format(new Date(expense.createdAt))} · <b>{catMap[expense.id]||"Other"}</b></span></div>
                  <span className="expense-amount" data-testid={`text-expense-amount-${expense.id}`}>{formatRand(expense.amount)}</span>
                  <button className="remove-button" type="button" onClick={() => beginEdit(expense)} aria-label={`Edit ${expense.name}`} title="Edit this expense" data-testid={`button-edit-expense-${expense.id}`}><Pencil size={15} strokeWidth={1.8} /></button>
                  <button className="remove-button delete-button" type="button" onClick={() => removeExpense(expense)} aria-label={`Delete ${expense.name}`} title="Delete this expense" data-testid={`button-remove-expense-${expense.id}`}><Trash2 size={15} strokeWidth={1.8} /></button>
                </li>)}
              </ul> : <div className="empty-state" data-testid="empty-today-expenses"><div className="empty-illustration" aria-hidden="true"><span className="empty-ring ring-one" /><span className="empty-ring ring-two" /><span className="empty-paper"><ReceiptText size={25} strokeWidth={1.35} /></span><span className="empty-spark spark-a" /><span className="empty-spark spark-b" /></div><p className="empty-title">{today ? 'Nothing to note. Yet.' : 'A quiet day.'}</p><p className="empty-copy">{today ? 'Your first entry will find its place here.' : 'There are no entries saved for this date.'}</p>{today && <span className="empty-arrow"><ArrowDownLeft size={14} /> start above</span>}</div>}
            </section>

            <section className="insight-panel" aria-labelledby="insight-title">
              <div className="insight-icon"><TrendingUp size={18} /></div>
              <div className="insight-content"><span className="section-kicker">A GENTLE LOOK BACK</span><h2 id="insight-title">Your last seven days</h2><p className="insight-period">{formatDate(sevenDayInsight.fromKey, { day: 'numeric', month: 'short' })} – {formatDate(todayKey, { day: 'numeric', month: 'short' })} · local days</p>
                {sevenDayInsight.count ? <><strong className="insight-total" data-testid="text-seven-day-total">{formatRand(sevenDayInsight.total)}</strong><p className="insight-detail" data-testid="text-seven-day-highlight">Across {sevenDayInsight.count} {sevenDayInsight.count === 1 ? 'entry' : 'entries'}{sevenDayInsight.highest ? <> · Highest item: <b>{sevenDayInsight.highest.name}</b> ({formatRand(sevenDayInsight.highest.amount)})</> : null}</p></> : <p className="insight-detail" data-testid="text-seven-day-empty">No spending noted in the last seven days yet. It will show up here when you do.</p>}
              </div>
            </section>

            <section className="insight-panel" style={{marginTop:14}}><div className="insight-icon"><CalendarDays size={18}/></div><div className="insight-content"><span className="section-kicker">MONTHLY SUMMARY</span><h2>{monthInsight.label}</h2><p className="insight-period">{monthInsight.count} entries this month</p>{monthInsight.count?<><strong className="insight-total">{formatRand(monthInsight.tot)}</strong><p className="insight-detail">Daily average: <b>{formatRand(monthInsight.avg)}</b></p>{monthInsight.catBreakdown?.length>0&&<div style={{marginTop:10,display:"flex",flexDirection:"column",gap:6}}>{monthInsight.catBreakdown.map(x=><div key={x.cat}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2}}><span>{x.cat}</span><b>{formatRand(x.sum)} ({Math.round(x.sum/monthInsight.tot*100)}%)</b></div><div style={{height:5,borderRadius:99,background:"rgba(128,128,128,0.2)",overflow:"hidden"}}><div style={{width:`${Math.round(x.sum/monthInsight.tot*100)}%`,height:"100%",background:"#16a34a"}}/></div></div>)}</div>}</>:<p className="insight-detail">No expenses logged this month yet.</p>}</div></section><section className="insight-panel" style={{ marginTop: 14, flexDirection: "column", alignItems: "stretch" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div>
        <span className="section-kicker">RECURRING MONTHLY BILLS</span>
        <h2 style={{ margin: "2px 0 0" }}>Fixed bills & subscriptions</h2>
      </div>
      <button type="button" className="text-button" style={{ fontWeight: 700, fontSize: 13 }} onClick={() => setAddingBill(!addingBill)}>
        {addingBill ? "Close" : "+ Add bill"}
      </button>
    </div>
    {addingBill && (
      <form onSubmit={(e) => {
        e.preventDefault();
        const a = Number(billAmt.replace(",", "."));
        if (!billName.trim() || !Number.isFinite(a) || a <= 0) return;
        const next = [...bills.filter((b) => b.name.toLowerCase() !== billName.trim().toLowerCase()), { name: billName.trim(), amount: Math.round(a * 100) / 100 }];
        setBills(next);
        try { localStorage.setItem(BILLS_KEY, JSON.stringify(next)); } catch {}
        setBillName(""); setBillAmt(""); setAddingBill(false);
      }} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <input type="text" value={billName} onChange={(e) => setBillName(e.target.value)} placeholder="Bill name (e.g. Wi-Fi, Rent)" style={{ flex: "1 1 130px", padding: "6px 9px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 13 }} autoFocus />
        <input type="text" inputMode="decimal" value={billAmt} onChange={(e) => setBillAmt(e.target.value)} placeholder="Amount" style={{ width: 90, padding: "6px 9px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 13 }} />
        <button type="submit" className="text-button" style={{ fontWeight: 700 }}>Save</button>
      </form>
    )}
    {bills.length > 0 ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
        {bills.map((b) => {
          const monthPrefix = todayKey.slice(0, 7);
          const paidThisMonth = expenses.some((ex) => ex.dateKey.startsWith(monthPrefix) && ex.name.toLowerCase() === b.name.toLowerCase());
          return (
            <div key={b.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(128,128,128,0.22)" }}>
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>{b.name}</strong>
                <span style={{ fontSize: 12, opacity: 0.75 }}>{formatRand(b.amount)} / month {paidThisMonth ? "· ✓ Paid this month" : ""}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" onClick={() => {
                  const now = new Date().toISOString();
                  commitExpense({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: b.name, amount: b.amount, createdAt: now, dateKey: localDateKey(new Date(now)) });
                }} style={{ padding: "5px 10px", borderRadius: 8, background: paidThisMonth ? "rgba(22,163,74,0.14)" : "#16a34a", color: paidThisMonth ? "inherit" : "#fff", border: paidThisMonth ? "1px solid rgba(22,163,74,0.4)" : "none", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {paidThisMonth ? "Log again" : "Log paid"}
                </button>
                <button type="button" onClick={() => {
                  const next = bills.filter((item) => item.name !== b.name);
                  setBills(next);
                  try { localStorage.setItem(BILLS_KEY, JSON.stringify(next)); } catch {}
                }} aria-label={`Delete ${b.name}`} style={{ background: "none", border: "none", color: "inherit", opacity: 0.6, cursor: "pointer", padding: 4 }}>
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    ) : !addingBill ? (
      <p className="insight-detail" style={{ marginTop: 6 }}>Save regular bills like Rent, Wi-Fi, or Electricity to log them in one tap each month.</p>
    ) : null}
  </section>
  <section className="insight-panel" style={{ marginTop: 14, flexDirection: "column", alignItems: "stretch" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <div>
        <span className="section-kicker">PAYDAY COUNTDOWN</span>
        <h2 style={{ margin: "2px 0 0" }}>Safe-to-spend per day</h2>
      </div>
      <button type="button" className="text-button" style={{ fontWeight: 700, fontSize: 13 }} onClick={() => {
        setPayDateInput(paydayData?.date || "");
        setPayCashInput(paydayData ? String(paydayData.cash) : "");
        setEditingPayday(!editingPayday);
      }}>
        {editingPayday ? "Close" : paydayData ? "Edit" : "+ Set payday"}
      </button>
    </div>
    {editingPayday ? (
      <form onSubmit={(e) => {
        e.preventDefault();
        const c = Number(payCashInput.replace(",", "."));
        if (!payDateInput || !Number.isFinite(c) || c <= 0) {
          setPaydayData(null);
          try { localStorage.removeItem(PAYDAY_KEY); } catch {}
        } else {
          const next = { date: payDateInput, cash: Math.round(c * 100) / 100 };
          setPaydayData(next);
          try { localStorage.setItem(PAYDAY_KEY, JSON.stringify(next)); } catch {}
        }
        setEditingPayday(false);
      }} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
        <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Next payday</span>
          <input type="date" value={payDateInput} min={todayKey} onChange={(e) => setPayDateInput(e.target.value)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 13 }} />
        </label>
        <label style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
          <span>Cash left ({getCurrency().symbol})</span>
          <input type="text" inputMode="decimal" value={payCashInput} onChange={(e) => setPayCashInput(e.target.value)} placeholder="e.g. 1200" style={{ width: 105, padding: "5px 8px", borderRadius: 8, border: "1px solid rgba(128,128,128,0.35)", background: "transparent", color: "inherit", fontSize: 13 }} />
        </label>
        <button type="submit" className="text-button" style={{ fontWeight: 700, marginTop: 14 }}>Save</button>
      </form>
    ) : paydayInfo ? (
      <div style={{ marginTop: 8 }}>
        <strong className="insight-total">{formatRand(paydayInfo.safePerDay)} <span style={{ fontSize: 14, fontWeight: 500 }}>/ day</span></strong>
        <p className="insight-detail">
          <b>{paydayInfo.diffDays} {paydayInfo.diffDays === 1 ? "day" : "days"}</b> until {formatDate(paydayInfo.date, { day: "numeric", month: "short" })} · {formatRand(paydayInfo.remainingCash)} left to stretch
        </p>
      </div>
    ) : (
      <p className="insight-detail" style={{ marginTop: 6 }}>Enter your next payday and cash left to see how much you can safely spend each day.</p>
    )}
  </section>
  <section className="export-section" aria-labelledby="export-title"><div><h2 id="export-title">Keep a copy</h2><p>Download every entry saved on this device.</p></div><div className="export-buttons"><button className="secondary-button" type="button" onClick={() => downloadCsv(expenses)} data-testid="button-export-csv"><Download size={14} />CSV</button><button className="secondary-button" type="button" onClick={() => downloadExcel(expenses)} data-testid="button-export-xlsx"><Download size={14} />Excel</button>
    <button className="secondary-button" type="button" onClick={downloadBackup}><Download size={14} />Backup</button>
    <label className="secondary-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><Upload size={14} />Restore<input type="file" accept=".json,application/json" onChange={handleRestore} style={{ display: "none" }} /></label>
    </div></section>
    <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, border: "1px dashed rgba(128,128,128,0.32)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8, opacity: 0.85 }}>
      <Smartphone size={16} style={{ flexShrink: 0 }} />
      <span><strong>Use as a phone app:</strong> Tap your browser Share or Menu icon and choose <strong>Add to Home Screen</strong> for instant 1-tap access.</span>
    </div>
            {notice && <p role="alert" className="storage-notice" data-testid="text-storage-error">{notice}</p>}
          </>
        ) : <GrowRands />}

        <footer className="page-footer"><span>Made for the everyday bits.</span><span className="footer-rule" /><span>YOUR MONEY, YOUR MOMENT</span></footer>
      </div>

      <nav style={{position:"fixed",bottom:64,left:0,right:0,zIndex:50,display:"flex",justifyContent:"space-around",padding:"10px",background:"#fff"}} className="bottom-nav" aria-label="Main navigation" data-testid="nav-bottom">
        <button type="button" className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')} aria-current={tab === 'today' ? 'page' : undefined} data-testid="nav-today"><span className="nav-mark" /><span>Today</span></button>
        <button type="button" className={tab === 'grow' ? 'active' : ''} onClick={() => setTab('grow')} aria-current={tab === 'grow' ? 'page' : undefined} data-testid="nav-grow-rands"><TrendingUp size={16} /><span>{currencyCode === "ZAR" ? "Grow Rands" : "Grow Money"}</span></button>
      </nav>
      {shareOpen && <ShareReceipt dateKey={selectedDate} expenses={selectedExpenses} total={selectedTotal} streak={streakCount} budget={dailyBudget} categories={catMap} onClose={() => setShareOpen(false)} />}
    </main>
  );
}

export default App;
