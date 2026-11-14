import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, CircleCheck, Plus, ReceiptText, Trash2 } from 'lucide-react';

type Expense = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  dateKey: string;
};

const STORAGE_KEY = 'everyday-ledger-expenses-v1';

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatRand(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(amount);
}

function readExpenses(): Expense[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Expense =>
      item && typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.amount === 'number' && Number.isFinite(item.amount) &&
      typeof item.createdAt === 'string' && typeof item.dateKey === 'string',
    );
  } catch {
    return [];
  }
}

function App() {
  const [expenses, setExpenses] = useState<Expense[]>(readExpenses);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [todayKey, setTodayKey] = useState(() => localDateKey(new Date()));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch {
      setError('Your browser could not save this entry. Check your available storage and try again.');
    }
  }, [expenses]);

  useEffect(() => {
    const timer = window.setInterval(() => setTodayKey(localDateKey(new Date())), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayExpenses = useMemo(
    () => expenses.filter((expense) => expense.dateKey === todayKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [expenses, todayKey],
  );
  const total = todayExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const todayLabel = new Intl.DateTimeFormat('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const numericAmount = Number(amount.replace(',', '.'));
    if (!trimmedName) {
      setError('Add a name for this expense.');
      return;
    }
    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than R 0,00.');
      return;
    }
    const createdAt = new Date().toISOString();
    setExpenses((current) => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: trimmedName,
      amount: Math.round((numericAmount + Number.EPSILON) * 100) / 100,
      createdAt,
      dateKey: localDateKey(new Date(createdAt)),
    }, ...current]);
    setName('');
    setAmount('');
    setError('');
    document.getElementById('expense-name')?.focus();
  }

  function removeExpense(id: string) {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
    setError('');
  }

  return (
    <main className="page-shell grain">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Daymark home" data-testid="link-home">
          <span className="brand-mark"><span /></span>
          <span>daymark<span className="brand-period">.</span></span>
        </a>
        <div className="local-note"><span className="local-dot" /> just for today</div>
      </header>

      <div className="content-wrap">
        <section className="intro" aria-labelledby="page-title">
          <div className="eyebrow"><span className="eyebrow-line" /> YOUR DAILY MONEY NOTE</div>
          <h1 id="page-title">A little more<br /><em>in the know.</em></h1>
          <p className="intro-copy">Keep a gentle eye on where today goes.<br className="desktop-break" /> No budgets, no fuss — just your day, accounted for.</p>
        </section>

        <section className="today-panel" aria-label="Today's spending">
          <div className="summary-top">
            <div>
              <p className="section-kicker">TODAY, IN RANDS</p>
              <p className="date-line" data-testid="text-today-date">{todayLabel}</p>
            </div>
            <div className="day-stamp" aria-hidden="true">
              <span className="stamp-day">{new Intl.DateTimeFormat('en-ZA', { day: '2-digit' }).format(new Date())}</span>
              <span className="stamp-month">{new Intl.DateTimeFormat('en-ZA', { month: 'short' }).format(new Date()).toUpperCase()}</span>
            </div>
          </div>
          <div className="total-row">
            <span className="total-amount" data-testid="text-today-total">{formatRand(total)}</span>
            <span className="total-caption">spent today</span>
          </div>
          <div className="summary-foot">
            <span className="summary-note"><span className="note-mark" /> {todayExpenses.length === 0 ? 'A fresh page.' : `${todayExpenses.length} ${todayExpenses.length === 1 ? 'thing' : 'things'} noted.`}</span>
            {todayExpenses.length > 0 && <span className="average-caption">LOCAL TIME · {todayExpenses.length} ENTRIES</span>}
          </div>
        </section>

        <section className="add-section" aria-labelledby="add-title">
          <div className="section-heading">
            <span className="heading-icon"><Plus size={17} strokeWidth={1.8} /></span>
            <div>
              <h2 id="add-title">Note a spend</h2>
              <p>Small or big, it all belongs here.</p>
            </div>
          </div>
          <form className="expense-form" onSubmit={addExpense} noValidate>
            <label className="field name-field">
              <span>WHAT WAS IT?</span>
              <input
                id="expense-name"
                type="text"
                value={name}
                onChange={(event) => { setName(event.target.value); if (error) setError(''); }}
                placeholder="e.g. Flat white"
                maxLength={80}
                autoComplete="off"
                aria-label="Expense name"
                aria-invalid={Boolean(error && !name.trim())}
                data-testid="input-expense-name"
              />
            </label>
            <label className="field amount-field">
              <span>HOW MUCH?</span>
              <div className="amount-input-wrap">
                <span className="currency-prefix" aria-hidden="true">R</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => { setAmount(event.target.value); if (error) setError(''); }}
                  placeholder="0,00"
                  aria-label="Amount in South African Rand"
                  aria-invalid={Boolean(error && amount && (!Number.isFinite(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0))}
                  data-testid="input-expense-amount"
                />
              </div>
            </label>
            <button className="add-button" type="submit" data-testid="button-add-expense">
              <span>Add to today</span><ArrowUpRight size={17} strokeWidth={1.8} />
            </button>
          </form>
          <div className="form-meta">
            <p className={`form-error ${error ? 'is-visible' : ''}`} role="alert" aria-live="polite" data-testid="text-form-error">{error}</p>
            <span className="private-note"><CircleCheck size={13} strokeWidth={1.8} /> Saved on this device only</span>
          </div>
        </section>

        <section className="entries-section" aria-labelledby="entries-title">
          <div className="entries-heading">
            <div className="entries-title-wrap">
              <h2 id="entries-title">Today’s list</h2>
              <span className="entry-count" data-testid="text-expense-count">{todayExpenses.length}</span>
            </div>
            <span className="entries-unit">ZAR <span>·</span> {todayExpenses.length === 1 ? '1 ENTRY' : `${todayExpenses.length} ENTRIES`}</span>
          </div>
          {todayExpenses.length > 0 ? (
            <ul className="expense-list" aria-label="Today's expenses" data-testid="list-today-expenses">
              {todayExpenses.map((expense) => (
                <li className="expense-row entry-appear" key={expense.id} data-testid={`row-expense-${expense.id}`}>
                  <span className="expense-symbol"><ReceiptText size={17} strokeWidth={1.65} /></span>
                  <div className="expense-details">
                    <span className="expense-name" data-testid={`text-expense-name-${expense.id}`}>{expense.name}</span>
                    <span className="expense-time">{new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit' }).format(new Date(expense.createdAt))}</span>
                  </div>
                  <span className="expense-amount" data-testid={`text-expense-amount-${expense.id}`}>{formatRand(expense.amount)}</span>
                  <button
                    className="remove-button"
                    type="button"
                    onClick={() => removeExpense(expense.id)}
                    aria-label={`Remove ${expense.name}`}
                    title="Remove this expense"
                    data-testid={`button-remove-expense-${expense.id}`}
                  ><Trash2 size={15} strokeWidth={1.8} /></button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state" data-testid="empty-today-expenses">
              <div className="empty-illustration" aria-hidden="true">
                <span className="empty-ring ring-one" /><span className="empty-ring ring-two" />
                <span className="empty-paper"><ReceiptText size={25} strokeWidth={1.35} /></span>
                <span className="empty-spark spark-a" /><span className="empty-spark spark-b" />
              </div>
              <p className="empty-title">Nothing to note. Yet.</p>
              <p className="empty-copy">Your first entry will find its place here.</p>
              <span className="empty-arrow"><ArrowDownLeft size={14} /> start above</span>
            </div>
          )}
        </section>

        <footer className="page-footer">
          <span>Made for the everyday bits.</span>
          <span className="footer-rule" />
          <span>YOUR MONEY, YOUR MOMENT</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
