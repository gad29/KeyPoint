'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { FinanceTransactionRow } from '@/lib/data';

type StaffRow = {
  recordId: string;
  email: string;
  fullName: string;
  active: boolean;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  advisor: 'יועץ',
  admin: 'אדמין',
  secretary: 'מזכירה',
  reception: 'קבלה',
  viewer: 'צפייה בלבד',
};

const VAT_RATE = 0.17;

type Summary = { incomeTotal: number; expenseTotal: number; net: number; count: number };

function formatMoney(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
}

function formatDate(ms: number) {
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short' }).format(new Date(ms));
}

function monthKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Intl.DateTimeFormat('he-IL', { month: 'long', year: 'numeric' }).format(new Date(Number(y), Number(m) - 1));
}

function buildMonthlyBreakdown(rows: FinanceTransactionRow[]) {
  const map = new Map<string, { income: number; expense: number }>();
  for (const r of rows) {
    const k = monthKey(r.dateMs);
    const entry = map.get(k) ?? { income: 0, expense: 0 };
    if (r.type === 'income') entry.income += r.amount;
    else if (r.type === 'expense') entry.expense += r.amount;
    map.set(k, entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12);
}

export function AdminDashboardClient({
  initialSummary,
  initialRows,
  sessionEmail,
  financeCategories,
}: {
  initialSummary: Summary;
  initialRows: FinanceTransactionRow[];
  sessionEmail: string;
  financeCategories: string[];
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'receipt' | 'add' | 'staff'>('summary');
  const [toast, setToast] = useState('');

  // Add staff worker form state
  const [worker, setWorker] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'secretary',
  });
  const [showWorkerPassword, setShowWorkerPassword] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [workerMessage, setWorkerMessage] = useState('');
  const [workerError, setWorkerError] = useState('');

  // Staff list + reset password
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [resetTarget, setResetTarget] = useState<StaffRow | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const loadStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await fetch('/api/admin/staff');
      const json = await res.json() as { ok: boolean; data?: StaffRow[] };
      if (json.ok && json.data) setStaffList(json.data);
    } finally {
      setLoadingStaff(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'staff') void loadStaff();
  }, [activeTab, loadStaff]);

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    setResetError('');
    setResetMessage('');
    if (resetPassword.length < 10) {
      setResetError('הסיסמה חייבת להכיל לפחות 10 תווים');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/staff/${resetTarget.recordId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setResetMessage(`הסיסמה של ${resetTarget.email} עודכנה ✓`);
        setResetPassword('');
        setTimeout(() => {
          setResetTarget(null);
          setResetMessage('');
        }, 1500);
      } else {
        setResetError(json.error || 'איפוס הסיסמה נכשל');
      }
    } catch {
      setResetError('שגיאה בחיבור לשרת');
    } finally {
      setResettingPassword(false);
    }
  }

  // Receipt form state
  const [receipt, setReceipt] = useState({
    clientName: '',
    clientId: '',
    service: 'ייעוץ משכנתאות',
    amountBeforeVat: '',
    paymentMethod: 'bank-transfer',
    caseId: '',
    notes: '',
    targetEmail: '',
  });
  const [sendingReceipt, setSendingReceipt] = useState(false);

  // Manual transaction form state
  const [tx, setTx] = useState({
    date: new Date().toISOString().slice(0, 10),
    type: 'income',
    amount: '',
    category: financeCategories[0] ?? '',
    description: '',
    caseId: '',
  });
  const [savingTx, setSavingTx] = useState(false);

  const amountBeforeVat = Number(receipt.amountBeforeVat.replace(/,/g, '')) || 0;
  const vatAmount = Math.round(amountBeforeVat * VAT_RATE);
  const totalWithVat = amountBeforeVat + vatAmount;

  const monthly = useMemo(() => buildMonthlyBreakdown(rows), [rows]);
  const currentMonthKey = monthKey(Date.now());

  async function refresh() {
    setLoading(true);
    setToast('');
    try {
      const res = await fetch('/api/admin/summary');
      const json = await res.json() as { ok: boolean; data?: { summary: Summary; transactions: FinanceTransactionRow[] } };
      if (json.ok && json.data) {
        setSummary(json.data.summary);
        setRows(json.data.transactions ?? []);
        setToast('הנתונים עודכנו ✓');
      }
    } finally {
      setLoading(false);
    }
  }

  async function sendReceipt() {
    if (!receipt.clientName || !receipt.amountBeforeVat) {
      setToast('יש למלא שם לקוח וסכום');
      return;
    }
    setSendingReceipt(true);
    setToast('');
    try {
      const res = await fetch('/api/admin/n8n/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'receipt',
          clientName: receipt.clientName,
          clientId: receipt.clientId,
          service: receipt.service,
          amountBeforeVat,
          vatAmount,
          totalWithVat,
          paymentMethod: receipt.paymentMethod,
          caseId: receipt.caseId || undefined,
          notes: receipt.notes || undefined,
          targetEmail: receipt.targetEmail || undefined,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setToast('חשבונית מס קבלה נשלחה ✓');
        setReceipt((r) => ({ ...r, clientName: '', clientId: '', amountBeforeVat: '', caseId: '', notes: '' }));
      } else {
        setToast(json.error ?? 'שגיאה בשליחה');
      }
    } finally {
      setSendingReceipt(false);
    }
  }

  async function addWorker(e: React.FormEvent) {
    e.preventDefault();
    setWorkerError('');
    setWorkerMessage('');
    if (!worker.email || !worker.password) {
      setWorkerError('יש למלא אימייל וסיסמה');
      return;
    }
    if (worker.password.length < 10) {
      setWorkerError('הסיסמה חייבת להכיל לפחות 10 תווים');
      return;
    }
    setSavingWorker(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: worker.email.trim().toLowerCase(),
          password: worker.password,
          fullName: worker.fullName.trim() || undefined,
          role: worker.role,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string; data?: { email: string; role: string } };
      if (json.ok && json.data) {
        const roleLabel = ROLE_LABELS[json.data.role] || json.data.role;
        setWorkerMessage(`המשתמש ${json.data.email} נוצר בהצלחה (${roleLabel}) ✓`);
        setWorker({ fullName: '', email: '', password: '', role: 'secretary' });
        void loadStaff();
      } else {
        setWorkerError(json.error || 'יצירת המשתמש נכשלה');
      }
    } catch {
      setWorkerError('שגיאה בחיבור לשרת');
    } finally {
      setSavingWorker(false);
    }
  }

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!tx.amount) { setToast('יש להזין סכום'); return; }
    setSavingTx(true);
    setToast('');
    try {
      const res = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: tx.date,
          type: tx.type,
          amount: Number(tx.amount.replace(/,/g, '')),
          category: tx.category,
          description: tx.description,
          caseId: tx.caseId || undefined,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (json.ok) {
        setToast('תנועה נוספה ✓');
        setTx((t) => ({ ...t, amount: '', description: '', caseId: '' }));
        void refresh();
      } else {
        setToast(json.error ?? 'שגיאה');
      }
    } finally {
      setSavingTx(false);
    }
  }

  return (
    <div className="grid" dir="rtl" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div className="hero product-hero hero-soft" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">Agency OS · לוח ניהול</p>
          <h2 style={{ margin: '8px 0 6px' }}>כספים ותזרים</h2>
          <p className="muted" style={{ fontSize: 13 }}>{sessionEmail}</p>
        </div>
        <button className="button button-secondary button-compact" type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? '…' : 'רענן נתונים'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid cols-3">
        <section className="card stat-card">
          <p className="eyebrow">הכנסות</p>
          <h3 style={{ color: 'var(--good)' }}>{formatMoney(summary.incomeTotal)}</h3>
        </section>
        <section className="card stat-card">
          <p className="eyebrow">הוצאות</p>
          <h3 style={{ color: 'var(--danger)' }}>{formatMoney(summary.expenseTotal)}</h3>
        </section>
        <section className="card stat-card">
          <p className="eyebrow">מאזן</p>
          <h3 style={{ color: summary.net >= 0 ? 'var(--good)' : 'var(--danger)' }}>{formatMoney(summary.net)}</h3>
          <p className="muted" style={{ fontSize: 12 }}>{summary.count} שורות</p>
        </section>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {([['summary', 'סיכום חודשי'], ['transactions', 'תנועות'], ['receipt', 'חשבונית מס קבלה'], ['add', 'הוספת תנועה'], ['staff', 'צוות']] as const).map(([id, label]) => (
          <button key={id} type="button" className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Monthly summary */}
      {activeTab === 'summary' && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: 16 }}>סיכום לפי חודש (12 חודשים אחרונים)</p>
          <div className="month-row month-header">
            <span>חודש</span><span>הכנסות</span><span>הוצאות</span><span>מאזן</span>
          </div>
          {monthly.length === 0 ? (
            <p className="muted" style={{ padding: '12px 0' }}>אין נתונים.</p>
          ) : (
            monthly.map(([key, data]) => (
              <div key={key} className={`month-row ${key === currentMonthKey ? 'current-month' : ''}`}>
                <span>{monthLabel(key)}</span>
                <span style={{ color: 'var(--good)', fontWeight: 600 }}>{formatMoney(data.income)}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{formatMoney(data.expense)}</span>
                <span style={{ fontWeight: 700, color: data.income - data.expense >= 0 ? 'var(--good)' : 'var(--danger)' }}>
                  {formatMoney(data.income - data.expense)}
                </span>
              </div>
            ))
          )}
        </section>
      )}

      {/* Tab: Recent transactions */}
      {activeTab === 'transactions' && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: 12 }}>תנועות אחרונות</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>תאריך</th>
                  <th>סוג</th>
                  <th>סכום</th>
                  <th>קטגוריה</th>
                  <th>תיק</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="muted">—</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.dateMs)}</td>
                    <td>
                      <span className={`badge ${r.type === 'income' ? 'good' : r.type === 'expense' ? 'danger' : ''}`} style={{ fontSize: 12 }}>
                        {r.type === 'income' ? 'הכנסה' : r.type === 'expense' ? 'הוצאה' : 'אחר'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(r.amount)}</td>
                    <td>{r.category || '—'}</td>
                    <td>{r.caseId ? <span className="case-id-badge">{r.caseId}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tab: Receipt generator */}
      {activeTab === 'receipt' && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>חשבונית מס קבלה</p>
          <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            הנתונים נשלחים ל-n8n ליצירת PDF ולשליחה ללקוח.
          </p>
          <div className="form-grid cols-2">
            <label className="field">
              <span>שם לקוח *</span>
              <input value={receipt.clientName} onChange={(e) => setReceipt((r) => ({ ...r, clientName: e.target.value }))} placeholder="ישראל ישראלי" />
            </label>
            <label className="field">
              <span>ת"ז לקוח</span>
              <input value={receipt.clientId} onChange={(e) => setReceipt((r) => ({ ...r, clientId: e.target.value }))} placeholder="000000000" />
            </label>
            <label className="field field-span-2">
              <span>תיאור שירות</span>
              <input value={receipt.service} onChange={(e) => setReceipt((r) => ({ ...r, service: e.target.value }))} />
            </label>
            <label className="field">
              <span>סכום לפני מע"מ (₪) *</span>
              <input
                value={receipt.amountBeforeVat}
                onChange={(e) => setReceipt((r) => ({ ...r, amountBeforeVat: e.target.value }))}
                placeholder="10,000"
                type="text"
                inputMode="numeric"
              />
            </label>
            <label className="field">
              <span>אמצעי תשלום</span>
              <select value={receipt.paymentMethod} onChange={(e) => setReceipt((r) => ({ ...r, paymentMethod: e.target.value }))}>
                <option value="bank-transfer">העברה בנקאית</option>
                <option value="cash">מזומן</option>
                <option value="credit">כרטיס אשראי</option>
                <option value="check">צ׳ק</option>
              </select>
            </label>
            <label className="field">
              <span>מספר תיק (אופציונלי)</span>
              <input value={receipt.caseId} onChange={(e) => setReceipt((r) => ({ ...r, caseId: e.target.value }))} placeholder="CASE-1024" />
            </label>
            <label className="field">
              <span>אימייל ללקוח (לשליחת הקבלה)</span>
              <input type="email" value={receipt.targetEmail} onChange={(e) => setReceipt((r) => ({ ...r, targetEmail: e.target.value }))} placeholder="client@example.com" />
            </label>
            <label className="field field-span-2">
              <span>הערות (אופציונלי)</span>
              <input value={receipt.notes} onChange={(e) => setReceipt((r) => ({ ...r, notes: e.target.value }))} placeholder="הערה נוספת…" />
            </label>
          </div>

          {amountBeforeVat > 0 && (
            <div className="receipt-calc">
              <div className="receipt-calc-row">
                <span>סכום לפני מע"מ</span>
                <span>{formatMoney(amountBeforeVat)}</span>
              </div>
              <div className="receipt-calc-row">
                <span>מע"מ (17%)</span>
                <span>{formatMoney(vatAmount)}</span>
              </div>
              <div className="receipt-calc-row total">
                <span>סה"כ לתשלום</span>
                <span>{formatMoney(totalWithVat)}</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="button" type="button" disabled={sendingReceipt} onClick={() => void sendReceipt()}>
              {sendingReceipt ? 'שולח…' : 'צור ושלח חשבונית מס קבלה'}
            </button>
            {toast && (
              <span className={toast.includes('שגיאה') ? 'text-feedback-error' : 'muted'} style={{ fontSize: 14 }}>{toast}</span>
            )}
          </div>
        </section>
      )}

      {/* Tab: Add transaction */}
      {activeTab === 'add' && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: 16 }}>הוספת תנועה ידנית</p>
          <form onSubmit={(e) => void addTransaction(e)}>
            <div className="form-grid cols-2">
              <label className="field">
                <span>תאריך</span>
                <input type="date" value={tx.date} onChange={(e) => setTx((t) => ({ ...t, date: e.target.value }))} required />
              </label>
              <label className="field">
                <span>סוג</span>
                <select value={tx.type} onChange={(e) => setTx((t) => ({ ...t, type: e.target.value }))}>
                  <option value="income">הכנסה</option>
                  <option value="expense">הוצאה</option>
                </select>
              </label>
              <label className="field">
                <span>סכום (₪) *</span>
                <input
                  value={tx.amount}
                  onChange={(e) => setTx((t) => ({ ...t, amount: e.target.value }))}
                  placeholder="5,000"
                  required
                  inputMode="numeric"
                />
              </label>
              <label className="field">
                <span>קטגוריה</span>
                <select value={tx.category} onChange={(e) => setTx((t) => ({ ...t, category: e.target.value }))}>
                  {financeCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="field field-span-2">
                <span>תיאור</span>
                <input value={tx.description} onChange={(e) => setTx((t) => ({ ...t, description: e.target.value }))} placeholder="תיאור קצר…" />
              </label>
              <label className="field">
                <span>מספר תיק (אופציונלי)</span>
                <input value={tx.caseId} onChange={(e) => setTx((t) => ({ ...t, caseId: e.target.value }))} placeholder="CASE-1024" />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <button className="button" type="submit" disabled={savingTx}>
                {savingTx ? 'שומר…' : 'הוסף תנועה'}
              </button>
              {toast && (
                <span className={toast.includes('שגיאה') ? 'text-feedback-error' : 'muted'} style={{ fontSize: 14 }}>{toast}</span>
              )}
            </div>
          </form>
        </section>
      )}

      {/* Tab: Add staff worker */}
      {activeTab === 'staff' && (
        <section className="card">
          <p className="eyebrow" style={{ marginBottom: 4 }}>הוספת איש צוות</p>
          <p className="muted" style={{ fontSize: 13, marginBottom: 20 }}>
            יצירת משתמש חדש למזכירה, יועץ או אדמין. המשתמש נשמר אוטומטית בטבלת Staff ב-Airtable עם תפקיד וסיסמה מוצפנת (bcrypt).
          </p>
          <form onSubmit={(e) => void addWorker(e)}>
            <div className="form-grid cols-2">
              <label className="field">
                <span>שם מלא</span>
                <input
                  value={worker.fullName}
                  onChange={(e) => setWorker((w) => ({ ...w, fullName: e.target.value }))}
                  placeholder="שרה כהן"
                />
              </label>
              <label className="field">
                <span>תפקיד *</span>
                <select value={worker.role} onChange={(e) => setWorker((w) => ({ ...w, role: e.target.value }))}>
                  <option value="secretary">מזכירה</option>
                  <option value="advisor">יועץ</option>
                  <option value="admin">אדמין</option>
                  <option value="reception">קבלה</option>
                  <option value="viewer">צפייה בלבד</option>
                </select>
              </label>
              <label className="field">
                <span>אימייל *</span>
                <input
                  type="email"
                  value={worker.email}
                  onChange={(e) => setWorker((w) => ({ ...w, email: e.target.value }))}
                  placeholder="sarah@example.com"
                  required
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>סיסמה (לפחות 10 תווים) *</span>
                <div className="password-input-wrap">
                  <input
                    type={showWorkerPassword ? 'text' : 'password'}
                    value={worker.password}
                    onChange={(e) => setWorker((w) => ({ ...w, password: e.target.value }))}
                    required
                    minLength={10}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowWorkerPassword((v) => !v)}
                    aria-label={showWorkerPassword ? 'הסתר' : 'הצג'}
                  >
                    {showWorkerPassword ? 'הסתר' : 'הצג'}
                  </button>
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
              <button className="button" type="submit" disabled={savingWorker}>
                {savingWorker ? 'יוצר…' : 'הוסף משתמש'}
              </button>
              {workerMessage && (
                <span className="text-feedback-success" style={{ fontSize: 14 }}>{workerMessage}</span>
              )}
              {workerError && (
                <span className="text-feedback-error" style={{ fontSize: 14 }}>{workerError}</span>
              )}
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
              הסיסמה מוצפנת לפני השמירה. המשתמש יוכל להתחבר מיד דרך מסך הכניסה הרגיל.
              <br />
              <strong>מזכירה</strong> מקבלת גישה ל-/office בלבד. <strong>יועץ/אדמין</strong> מקבלים גם /admin.
            </p>
          </form>

          {/* Existing staff list */}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 28, paddingTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <p className="eyebrow" style={{ margin: 0 }}>אנשי צוות קיימים</p>
              <button
                type="button"
                className="button button-secondary button-compact"
                onClick={() => void loadStaff()}
                disabled={loadingStaff}
              >
                {loadingStaff ? '…' : 'רענן'}
              </button>
            </div>

            {staffList.length === 0 && !loadingStaff && (
              <p className="muted" style={{ fontSize: 13 }}>
                אין משתמשים נוספים עדיין. הוסף איש צוות בטופס למעלה.
              </p>
            )}

            {staffList.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>שם</th>
                      <th>אימייל</th>
                      <th>תפקיד</th>
                      <th>סטטוס</th>
                      <th>פעולות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.map((s) => (
                      <tr key={s.recordId}>
                        <td>{s.fullName || '—'}</td>
                        <td style={{ direction: 'ltr', textAlign: 'right' }}>{s.email}</td>
                        <td>
                          <span className="badge" style={{ fontSize: 12 }}>
                            {ROLE_LABELS[s.role] || s.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.active ? 'good' : 'danger'}`} style={{ fontSize: 12 }}>
                            {s.active ? 'פעיל' : 'מושבת'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button button-secondary button-compact"
                            onClick={() => {
                              setResetTarget(s);
                              setResetPassword('');
                              setResetError('');
                              setResetMessage('');
                            }}
                          >
                            איפוס סיסמה
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reset password modal */}
          {resetTarget && (
            <div
              className="modal-backdrop"
              onClick={(e) => {
                if (e.target === e.currentTarget) setResetTarget(null);
              }}
            >
              <div className="modal-card">
                <p className="eyebrow" style={{ marginBottom: 4 }}>איפוס סיסמה</p>
                <h3 style={{ margin: '0 0 4px' }}>{resetTarget.fullName || resetTarget.email}</h3>
                <p className="muted" style={{ fontSize: 13, marginBottom: 16, direction: 'ltr', textAlign: 'right' }}>
                  {resetTarget.email}
                </p>

                <form onSubmit={(e) => void submitReset(e)} className="grid" style={{ gap: 12 }}>
                  <label className="field">
                    <span>סיסמה חדשה (לפחות 10 תווים) *</span>
                    <div className="password-input-wrap">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={10}
                        autoFocus
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowResetPassword((v) => !v)}
                        aria-label={showResetPassword ? 'הסתר' : 'הצג'}
                      >
                        {showResetPassword ? 'הסתר' : 'הצג'}
                      </button>
                    </div>
                  </label>

                  <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                    יש להעביר את הסיסמה החדשה לעובד באופן בטוח (וואטסאפ / שיחה). הוא יוכל לשנות אותה מ&quot;החשבון שלי&quot; אחרי הכניסה.
                  </p>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => setResetTarget(null)}
                      disabled={resettingPassword}
                    >
                      ביטול
                    </button>
                    <button className="button" type="submit" disabled={resettingPassword}>
                      {resettingPassword ? 'מאפס…' : 'איפוס סיסמה'}
                    </button>
                  </div>

                  {resetMessage && <p className="text-feedback-success" style={{ fontSize: 14, margin: 0 }}>{resetMessage}</p>}
                  {resetError && <p className="text-feedback-error" style={{ fontSize: 14, margin: 0 }}>{resetError}</p>}
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
