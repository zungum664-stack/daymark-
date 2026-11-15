import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, CircleCheck, Download, Moon, Plus, ReceiptText, Share2, Sun, Trash2, Pencil, TrendingUp } from 'lucide-react';
import { GrowRands } from './components/GrowRands';
import { ShareReceipt } from './components/ShareReceipt';
import { downloadCsv, downloadExcel, type Expense, formatDate, formatRand, localDateKey, normalizeName, QUICK_ADDS, readExpenses, STORAGE_KEY, THEME_KEY } from './lib/expenses';

type Tab = 'today' | 'grow';

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
  const selectedTotal = selectedExpenses.reduce((sum, item) => sum + item.amount, 0);
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
  const today = selectedDate === todayKey;

  function commitExpense(expense: Expense) {
    setExpenses((current) => [expense, ...current]);
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

  const formVisible = today || editing !== null;

  return (
    <main className="page-shell grain">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Daymark home" data-testid="link-home"><span className="brand-mark"><span /></span><span>daymark<span className="brand-period">.</span></span></a>
        <div className="top-actions">
          <span className="local-note"><span className="local-dot" /> just for today</span>
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
              <h1 id="page-title">Daymark<br /><em>Daily Rand Tracker</em></h1>
              <p className="intro-copy">Keep a gentle eye on where today goes.<br className="desktop-break" /> No budgets, no fuss — just your day, accounted for.</p>
            </section>

            <section className="today-panel" aria-label="Spending for selected day">
              <div className="summary-top">
                <div><p className="section-kicker">{today ? 'TODAY, IN RANDS' : 'YOUR DAY, IN RANDS'}</p>
                  <p className="date-line" data-testid="text-today-date">{formatDate(selectedDate)}</p></div>
                <div className="day-stamp" aria-hidden="true"><span className="stamp-day">{selectedDate.slice(-2)}</span><span className="stamp-month">{formatDate(selectedDate, { month: 'short' }).toUpperCase()}</span></div>
              </div>
              <div className="total-row"><span className="total-amount" data-testid="text-today-total">{formatRand(selectedTotal)}</span><span className="total-caption">{today ? 'spent today' : 'spent this day'}</span></div>
              <div className="summary-foot"><span className="summary-note"><span className="note-mark" /> {selectedExpenses.length === 0 ? 'A fresh page.' : `${selectedExpenses.length} ${selectedExpenses.length === 1 ? 'thing' : 'things'} noted.`}</span>
                {selectedExpenses.length > 0 && <span className="average-caption">LOCAL TIME · {selectedExpenses.length} ENTRIES</span>}</div>
            </section>

            <section className="date-filter" aria-label="Choose a day">
              <label htmlFor="date-filter-input"><CalendarDays size={16} /><span>Look back</span></label>
              <input id="date-filter-input" type="date" value={selectedDate} max={todayKey} onChange={(event) => setSelectedDate(event.target.value || todayKey)} data-testid="input-date-filter" />
              {!today && <button type="button" className="text-button" onClick={() => setSelectedDate(todayKey)} data-testid="button-return-today">Back to today</button>}
            </section>

            {formVisible && (
              <section className="add-section" aria-labelledby="add-title">
                <div className="section-heading"><span className="heading-icon"><Plus size={17} strokeWidth={1.8} /></span><div><h2 id="add-title">{editing ? 'Edit this note' : 'Note a spend'}</h2><p>{editing ? `Updating an entry from ${formatDate(editing.dateKey)}.` : 'Small or big, it all belongs here.'}</p></div></div>
                {!editing && <div className="quick-adds" aria-label="Quick add common expenses">{QUICK_ADDS.map((item) => <button type="button" key={item.name} className="quick-chip" onClick={() => quickAdd(item)} data-testid={`button-quick-${item.name.toLowerCase()}`}><span>{item.name}</span><strong>{formatRand(item.amount)}</strong><Plus size={13} /></button>)}</div>}
                <form className="expense-form" onSubmit={editing ? saveEdit : addExpense} noValidate>
                  <label className="field name-field"><span>WHAT WAS IT?</span><input id="expense-name" type="text" value={name} onChange={(event) => { setName(event.target.value); if (error) setError(''); }} placeholder="e.g. Flat white" maxLength={80} autoComplete="off" aria-label="Expense name" aria-invalid={Boolean(error && !name.trim())} data-testid="input-expense-name" /></label>
                  <label className="field amount-field"><span>HOW MUCH?</span><div className="amount-input-wrap"><span className="currency-prefix" aria-hidden="true">R</span><input type="text" inputMode="decimal" value={amount} onChange={(event) => { setAmount(event.target.value); if (error) setError(''); }} placeholder="0,00" aria-label="Amount in South African Rand" aria-invalid={Boolean(error && amount && (!Number.isFinite(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0))} data-testid="input-expense-amount" /></div></label>
                  <div className="form-buttons"><button className="add-button" type="submit" data-testid={editing ? 'button-save-edit' : 'button-add-expense'}><span>{editing ? 'Save changes' : 'Add to today'}</span>{editing ? <Check size={16} /> : <ArrowUpRight size={17} strokeWidth={1.8} />}</button>{editing && <button className="secondary-button cancel-edit" type="button" onClick={cancelEdit} data-testid="button-cancel-edit">Cancel</button>}</div>
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
              {selectedExpenses.length > 0 ? <ul className="expense-list" aria-label={`${formatDate(selectedDate)} expenses`} data-testid="list-today-expenses">
                {selectedExpenses.map((expense) => <li className="expense-row entry-appear" key={expense.id} data-testid={`row-expense-${expense.id}`}>
                  <span className="expense-symbol"><ReceiptText size={17} strokeWidth={1.65} /></span><div className="expense-details"><span className="expense-name" data-testid={`text-expense-name-${expense.id}`}>{expense.name}</span><span className="expense-time">{new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit' }).format(new Date(expense.createdAt))}</span></div>
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

            <section className="export-section" aria-labelledby="export-title"><div><h2 id="export-title">Keep a copy</h2><p>Download every entry saved on this device.</p></div><div className="export-buttons"><button className="secondary-button" type="button" onClick={() => downloadCsv(expenses)} data-testid="button-export-csv"><Download size={14} />CSV</button><button className="secondary-button" type="button" onClick={() => downloadExcel(expenses)} data-testid="button-export-xlsx"><Download size={14} />Excel</button></div></section>
            {notice && <p role="alert" className="storage-notice" data-testid="text-storage-error">{notice}</p>}
          </>
        ) : <GrowRands />}

        <footer className="page-footer"><span>Made for the everyday bits.</span><span className="footer-rule" /><span>YOUR MONEY, YOUR MOMENT</span></footer>
      </div>

      <nav className="bottom-nav" aria-label="Main navigation" data-testid="nav-bottom">
        <button type="button" className={tab === 'today' ? 'active' : ''} onClick={() => setTab('today')} aria-current={tab === 'today' ? 'page' : undefined} data-testid="nav-today"><span className="nav-mark" /><span>Today</span></button>
        <button type="button" className={tab === 'grow' ? 'active' : ''} onClick={() => setTab('grow')} aria-current={tab === 'grow' ? 'page' : undefined} data-testid="nav-grow-rands"><TrendingUp size={16} /><span>Grow Rands</span></button>
      </nav>
      {shareOpen && <ShareReceipt dateKey={selectedDate} expenses={selectedExpenses} total={selectedTotal} onClose={() => setShareOpen(false)} />}
    </main>
  );
}

export default App;
