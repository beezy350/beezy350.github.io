// ============================================
// Falcon Books: ledger logic (no DOM).
// Categories follow IRS Schedule C (Form 1040) lines so the
// year-end summary maps straight onto the return.
// ============================================
(function (root) {
  const CATEGORIES = [
    // income
    { id: 'tax_fees', label: 'Tax prep fees', type: 'income', line: '1' },
    { id: 'bk_fees', label: 'Bookkeeping fees', type: 'income', line: '1' },
    { id: 'other_income', label: 'Other business income', type: 'income', line: '6' },
    // expenses
    { id: 'advertising', label: 'Advertising & marketing', type: 'expense', line: '8' },
    { id: 'car', label: 'Car & mileage', type: 'expense', line: '9' },
    { id: 'fees', label: 'Bank & payment fees', type: 'expense', line: '10' },
    { id: 'contract', label: 'Contract labor', type: 'expense', line: '11' },
    { id: 'insurance', label: 'Business insurance', type: 'expense', line: '15' },
    { id: 'legal', label: 'Legal & professional', type: 'expense', line: '17' },
    { id: 'office', label: 'Office expense', type: 'expense', line: '18' },
    { id: 'rent', label: 'Rent (office space)', type: 'expense', line: '20b' },
    { id: 'supplies', label: 'Supplies', type: 'expense', line: '22' },
    { id: 'licenses', label: 'Taxes & licenses (PTIN, LLC)', type: 'expense', line: '23' },
    { id: 'travel', label: 'Travel', type: 'expense', line: '24a' },
    { id: 'meals', label: 'Business meals (50%)', type: 'expense', line: '24b', deductible: 0.5 },
    { id: 'utilities', label: 'Phone & internet', type: 'expense', line: '25' },
    { id: 'software', label: 'Software & subscriptions', type: 'expense', line: '27a' },
    { id: 'education', label: 'Courses & CE (AFSP)', type: 'expense', line: '27a' },
    { id: 'other_expense', label: 'Other expense', type: 'expense', line: '27a' },
    // imported, not yet sorted
    { id: 'uncategorized', label: 'Needs a category', type: 'any', line: '' },
  ];
  const BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

  // 2026 federal estimated tax due dates (Form 1040-ES)
  const QUARTERS = [
    { q: 'Q1', months: [1, 2, 3], due: '2026-04-15' },
    { q: 'Q2', months: [4, 5], due: '2026-06-15' },
    { q: 'Q3', months: [6, 7, 8], due: '2026-09-15' },
    { q: 'Q4', months: [9, 10, 11, 12], due: '2027-01-15' },
  ];

  const round2 = (n) => Math.round(n * 100) / 100;

  // Signed amount: income positive, expense negative
  function signed(t) {
    return t.type === 'income' ? Math.abs(t.amount) : -Math.abs(t.amount);
  }

  function inYear(list, year) {
    return list.filter((t) => String(t.date).slice(0, 4) === String(year));
  }

  function deductibleAmount(t) {
    const cat = BY_ID[t.category];
    return Math.abs(t.amount) * (cat && cat.deductible ? cat.deductible : 1);
  }

  function summarize(list, year) {
    const rows = inYear(list, year);
    let income = 0, expenses = 0, deductible = 0, uncategorized = 0;
    const months = Array.from({ length: 12 }, () => ({ income: 0, expenses: 0 }));
    for (const t of rows) {
      const m = Number(String(t.date).slice(5, 7)) - 1;
      if (t.type === 'income') {
        income += Math.abs(t.amount);
        if (months[m]) months[m].income += Math.abs(t.amount);
      } else {
        expenses += Math.abs(t.amount);
        deductible += deductibleAmount(t);
        if (months[m]) months[m].expenses += Math.abs(t.amount);
      }
      if (t.category === 'uncategorized') uncategorized++;
    }
    const profit = income - deductible;
    // Rough self-employment tax (Schedule SE): 15.3% of 92.35% of profit
    const seTax = profit > 400 ? profit * 0.9235 * 0.153 : 0;
    return {
      year: Number(year),
      count: rows.length,
      income: round2(income),
      expenses: round2(expenses),
      deductibleExpenses: round2(deductible),
      profit: round2(profit),
      seTax: round2(seTax),
      setAside: round2(Math.max(0, profit) * 0.25),
      uncategorized,
      months: months.map((m) => ({ income: round2(m.income), expenses: round2(m.expenses) })),
    };
  }

  // Totals by Schedule C line for the year
  function scheduleC(list, year) {
    const lines = new Map();
    for (const t of inYear(list, year)) {
      const cat = BY_ID[t.category] || BY_ID.uncategorized;
      // unsorted rows stay split by direction so income and expenses never mix
      const unsorted = cat.id === 'uncategorized';
      const key = unsorted ? `${cat.id}:${t.type}` : cat.id;
      const label = unsorted ? `${cat.label} (${t.type === 'income' ? 'money in' : 'money out'})` : cat.label;
      const entry = lines.get(key) || { id: cat.id, label, line: cat.line, type: t.type, total: 0, deductible: 0 };
      entry.total += Math.abs(t.amount);
      entry.deductible += t.type === 'income' ? Math.abs(t.amount) : deductibleAmount(t);
      lines.set(key, entry);
    }
    const order = CATEGORIES.map((c) => c.id);
    return [...lines.values()]
      .map((e) => ({ ...e, total: round2(e.total), deductible: round2(e.deductible) }))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id) || (a.type === 'income' ? -1 : 1));
  }

  function quarterly(list, year) {
    const rows = inYear(list, year);
    return QUARTERS.map(({ q, months, due }) => {
      const sub = rows.filter((t) => months.includes(Number(String(t.date).slice(5, 7))));
      const s = summarize(sub, year);
      return { q, due: due.replace('2026', String(year)).replace('2027', String(Number(year) + 1)), profit: s.profit, setAside: s.setAside };
    });
  }

  // ---------- CSV ----------
  function parseCSVText(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quoted) {
        if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') quoted = false;
        else field += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some((v) => v.trim() !== '')) rows.push(row);
        row = [];
      } else field += ch;
    }
    row.push(field);
    if (row.some((v) => v.trim() !== '')) rows.push(row);
    return rows;
  }

  function toISODate(value) {
    const v = String(value).trim();
    let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    }
    return null;
  }

  function toNumber(value) {
    if (value == null) return NaN;
    let v = String(value).trim();
    if (!v) return NaN;
    const negative = /^\(.*\)$/.test(v) || v.startsWith('-');
    v = v.replace(/[()$,\s-]/g, '');
    const n = Number(v);
    return Number.isFinite(n) ? (negative ? -n : n) : NaN;
  }

  // Reads a typical bank export: Date, Description, Amount (or Debit/Credit columns)
  function importBankCSV(text) {
    const rows = parseCSVText(text);
    if (rows.length < 2) return { transactions: [], skipped: 0, error: 'The file has no rows.' };
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const find = (re) => header.findIndex((h) => re.test(h));
    const iDate = find(/date/);
    const iDesc = find(/desc|memo|payee|name|details|merchant/);
    const iAmt = find(/^amount$|amount/);
    const iDebit = find(/debit|withdraw/);
    const iCredit = find(/credit|deposit/);
    if (iDate < 0 || (iAmt < 0 && iDebit < 0 && iCredit < 0)) {
      return { transactions: [], skipped: rows.length - 1, error: 'Could not find Date and Amount columns. Export a CSV with Date, Description and Amount.' };
    }
    const out = [];
    let skipped = 0;
    for (const r of rows.slice(1)) {
      const date = toISODate(r[iDate]);
      let amount;
      if (iAmt >= 0) amount = toNumber(r[iAmt]);
      else {
        const credit = toNumber(r[iCredit]);
        const debit = toNumber(r[iDebit]);
        amount = (Number.isFinite(credit) ? Math.abs(credit) : 0) - (Number.isFinite(debit) ? Math.abs(debit) : 0);
      }
      if (!date || !Number.isFinite(amount) || amount === 0) { skipped++; continue; }
      out.push({
        date,
        type: amount > 0 ? 'income' : 'expense',
        amount: round2(Math.abs(amount)),
        category: 'uncategorized',
        payee: iDesc >= 0 ? String(r[iDesc]).trim() : '',
        note: 'Imported',
      });
    }
    return { transactions: out, skipped, error: null };
  }

  function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function toCSV(list) {
    const head = ['Date', 'Type', 'Amount', 'Category', 'Schedule C line', 'Payee / client', 'Note'];
    const lines = [head.join(',')];
    for (const t of [...list].sort((a, b) => a.date.localeCompare(b.date))) {
      const cat = BY_ID[t.category] || BY_ID.uncategorized;
      lines.push([t.date, t.type, signed(t).toFixed(2), cat.label, cat.line, t.payee, t.note].map(csvCell).join(','));
    }
    return lines.join('\n');
  }

  const api = { CATEGORIES, BY_ID, summarize, scheduleC, quarterly, importBankCSV, toCSV, parseCSVText, toISODate, toNumber };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ledger = api;
})(typeof window !== 'undefined' ? window : globalThis);
