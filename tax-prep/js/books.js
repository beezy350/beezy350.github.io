// ============================================
// Falcon Books UI. Data lives in this browser's
// localStorage only; backups are JSON files.
// ============================================
(function () {
  const L = window.Ledger;
  if (!L) return;

  const KEY = 'falconBooks.v1';
  const $ = (id) => document.getElementById(id);
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyShort = (n) => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- storage ----------
  let state = { transactions: [] };
  let storageOk = true;

  function sampleData() {
    const y = new Date().getFullYear();
    const d = (m, day) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return [
      { date: d(1, 6), type: 'expense', amount: 18.75, category: 'licenses', payee: 'IRS', note: 'PTIN renewal' },
      { date: d(1, 9), type: 'expense', amount: 249, category: 'education', payee: 'CE provider', note: 'AFSP course bundle' },
      { date: d(1, 15), type: 'expense', amount: 1200, category: 'software', payee: 'Tax software', note: 'Pro software, e-file + portal' },
      { date: d(1, 20), type: 'expense', amount: 420, category: 'insurance', payee: 'Insurance co.', note: 'E&O policy' },
      { date: d(2, 3), type: 'income', amount: 225, category: 'tax_fees', payee: 'Client A', note: 'Individual return' },
      { date: d(2, 5), type: 'income', amount: 350, category: 'tax_fees', payee: 'Client B', note: 'Schedule C return' },
      { date: d(2, 11), type: 'expense', amount: 120, category: 'advertising', payee: 'Print shop', note: 'Flyers' },
      { date: d(2, 18), type: 'income', amount: 275, category: 'tax_fees', payee: 'Client C', note: 'Return + ITIN' },
      { date: d(3, 2), type: 'income', amount: 225, category: 'tax_fees', payee: 'Client D', note: '' },
      { date: d(3, 9), type: 'expense', amount: 46.4, category: 'meals', payee: 'Cafe', note: 'Client meeting' },
      { date: d(3, 14), type: 'expense', amount: 21.75, category: 'car', payee: 'Mileage', note: '30 mi to client office' },
      { date: d(3, 28), type: 'income', amount: 400, category: 'tax_fees', payee: 'Client E', note: 'Married + rental' },
      { date: d(3, 30), type: 'income', amount: 300, category: 'tax_fees', payee: 'Client G', note: 'Return + quarterly plan' },
      { date: d(4, 2), type: 'income', amount: 250, category: 'tax_fees', payee: 'Client H', note: '' },
      { date: d(4, 8), type: 'income', amount: 450, category: 'tax_fees', payee: 'Client I', note: 'Self-employed + state' },
      { date: d(4, 10), type: 'income', amount: 225, category: 'tax_fees', payee: 'Client F', note: '' },
      { date: d(4, 14), type: 'income', amount: 325, category: 'tax_fees', payee: 'Client J', note: 'Head of household + EITC' },
      { date: d(4, 12), type: 'expense', amount: 64.99, category: 'utilities', payee: 'Phone carrier', note: 'Business line' },
      { date: d(5, 6), type: 'income', amount: 150, category: 'bk_fees', payee: 'Client B', note: 'Monthly bookkeeping' },
      { date: d(5, 7), type: 'expense', amount: 32.5, category: 'uncategorized', payee: 'OFFICE DEPOT #221', note: 'Imported' },
    ].map((t) => ({ ...t, id: newId(), sample: true }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.transactions)) { state = data; return; }
      }
    } catch (e) { storageOk = false; }
    state = { transactions: sampleData() };
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; }
    catch (e) { storageOk = false; }
  }

  // ---------- form ----------
  const form = $('entry-form');
  const catSelect = $('f-category');
  let editingId = null;

  function currentType() { return form.querySelector('input[name=type]:checked').value; }

  function fillCategories(select, type, selected) {
    select.innerHTML = '';
    for (const c of L.CATEGORIES) {
      if (c.type !== type && c.type !== 'any') continue;
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = c.line ? `${c.label} (line ${c.line})` : c.label;
      select.append(o);
    }
    if (selected) select.value = selected;
    else select.selectedIndex = 0;
  }

  function syncMiles() {
    const isCar = catSelect.value === 'car';
    $('miles-field').hidden = !isCar;
  }

  function milesToAmount() {
    const miles = Number($('f-miles').value);
    const rate = Number($('f-rate').value);
    if (miles > 0 && rate > 0) {
      $('f-amount').value = (Math.round(miles * rate * 100) / 100).toFixed(2);
      if (!$('f-note').value) $('f-note').value = `${miles} business miles`;
    }
  }

  function setStatus(el, msg, isError) {
    el.textContent = msg;
    el.classList.toggle('error', Boolean(isError));
  }

  function resetForm() {
    editingId = null;
    form.reset();
    $('f-date').value = today();
    $('f-rate').value = '0.725';
    fillCategories(catSelect, 'income');
    syncMiles();
    $('form-title').textContent = 'Add a transaction';
    $('save-btn').textContent = 'Add transaction';
    $('cancel-edit').hidden = true;
  }

  function startEdit(id) {
    const t = state.transactions.find((x) => x.id === id);
    if (!t) return;
    editingId = id;
    form.querySelector(`input[name=type][value=${t.type}]`).checked = true;
    fillCategories(catSelect, t.type, t.category);
    $('f-date').value = t.date;
    $('f-amount').value = t.amount;
    $('f-payee').value = t.payee || '';
    $('f-note').value = t.note || '';
    syncMiles();
    $('form-title').textContent = 'Edit transaction';
    $('save-btn').textContent = 'Save changes';
    $('cancel-edit').hidden = false;
    setStatus($('entry-status'), '');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('f-amount').focus({ preventScroll: true });
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') { fillCategories(catSelect, currentType()); syncMiles(); }
    if (e.target === catSelect) syncMiles();
  });
  $('f-miles').addEventListener('input', milesToAmount);
  $('f-rate').addEventListener('input', milesToAmount);
  $('cancel-edit').addEventListener('click', () => { resetForm(); setStatus($('entry-status'), ''); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = $('f-date').value;
    const amount = Math.round(Number($('f-amount').value) * 100) / 100;
    if (!date) { setStatus($('entry-status'), 'Choose a date.', true); $('f-date').focus(); return; }
    if (!(amount > 0)) { setStatus($('entry-status'), 'Enter an amount greater than $0.', true); $('f-amount').focus(); return; }
    const entry = {
      date, amount, type: currentType(), category: catSelect.value,
      payee: $('f-payee').value.trim(), note: $('f-note').value.trim(),
    };
    if (editingId) {
      const i = state.transactions.findIndex((x) => x.id === editingId);
      if (i >= 0) state.transactions[i] = { ...state.transactions[i], ...entry, sample: state.transactions[i].sample };
      setStatus($('entry-status'), 'Saved.');
    } else {
      state.transactions.push({ id: newId(), ...entry });
      setStatus($('entry-status'), `Added ${money(amount)} ${entry.type === 'income' ? 'income' : 'expense'}.`);
    }
    save();
    const keepType = entry.type;
    resetForm();
    form.querySelector(`input[name=type][value=${keepType}]`).checked = true;
    fillCategories(catSelect, keepType);
    $('year').value = date.slice(0, 4);
    render();
  });

  // ---------- rendering ----------
  function years() {
    const set = new Set(state.transactions.map((t) => t.date.slice(0, 4)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }

  function fillYears() {
    const sel = $('year');
    const prev = sel.value;
    sel.innerHTML = '';
    for (const y of years()) { const o = document.createElement('option'); o.value = y; o.textContent = y; sel.append(o); }
    sel.value = prev && [...sel.options].some((o) => o.value === prev) ? prev : sel.options[0].value;
  }

  function fillMonths() {
    const sel = $('month-filter');
    if (sel.options.length) return;
    const all = document.createElement('option'); all.value = ''; all.textContent = 'All months'; sel.append(all);
    MONTHS.forEach((m, i) => { const o = document.createElement('option'); o.value = String(i + 1).padStart(2, '0'); o.textContent = m; sel.append(o); });
  }

  function renderTiles(s) {
    $('t-income').textContent = moneyShort(s.income);
    $('t-expenses').textContent = moneyShort(s.deductibleExpenses);
    $('t-profit').textContent = moneyShort(s.profit);
    $('t-profit').classList.toggle('neg', s.profit < 0);
    $('t-setaside').textContent = moneyShort(s.setAside);
  }

  function renderList() {
    const year = $('year').value;
    const month = $('month-filter').value;
    const onlyNeeds = $('needs-filter').checked;
    const rows = state.transactions
      .filter((t) => t.date.startsWith(year) && (!month || t.date.slice(5, 7) === month) && (!onlyNeeds || t.category === 'uncategorized'))
      .sort((a, b) => b.date.localeCompare(a.date));

    const list = $('tx-list');
    list.innerHTML = '';
    for (const t of rows) {
      const li = document.createElement('li');
      li.className = 'tx' + (t.category === 'uncategorized' ? ' needs' : '');

      const main = document.createElement('div');
      main.className = 'tx-main';
      const title = document.createElement('p');
      title.className = 'tx-payee';
      title.textContent = t.payee || (t.type === 'income' ? 'Income' : 'Expense');
      const meta = document.createElement('p');
      meta.className = 'tx-meta';
      const [y, m, d] = t.date.split('-');
      meta.textContent = `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}` + (t.note ? ` · ${t.note}` : '');
      main.append(title, meta);

      const cat = document.createElement('select');
      cat.className = 'tx-cat';
      cat.setAttribute('aria-label', 'Category');
      fillCategories(cat, t.type, t.category);
      cat.addEventListener('change', () => { t.category = cat.value; save(); render(); });

      const amt = document.createElement('p');
      amt.className = 'tx-amt ' + t.type;
      amt.textContent = (t.type === 'income' ? '+' : '-') + money(t.amount);

      const actions = document.createElement('div');
      actions.className = 'tx-actions';
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'link-btn'; edit.textContent = 'Edit';
      edit.addEventListener('click', () => { switchTab('tx'); startEdit(t.id); });
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'link-btn danger-text'; del.textContent = 'Delete';
      del.addEventListener('click', () => {
        if (del.dataset.armed) {
          state.transactions = state.transactions.filter((x) => x.id !== t.id);
          save(); render();
        } else {
          del.dataset.armed = '1'; del.textContent = 'Tap again to delete';
          setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Delete'; } }, 3000);
        }
      });
      actions.append(edit, del);

      li.append(main, cat, amt, actions);
      list.append(li);
    }
    $('tx-empty').hidden = rows.length > 0;
  }

  function renderReports(s) {
    const year = $('year').value;
    // bars
    const max = Math.max(1, ...s.months.flatMap((m) => [m.income, m.expenses]));
    const bars = $('bars');
    bars.innerHTML = '';
    s.months.forEach((m, i) => {
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.title = `${MONTHS[i]}: income ${money(m.income)}, expenses ${money(m.expenses)}`;
      const pair = document.createElement('div');
      pair.className = 'bar-pair';
      for (const [cls, v] of [['in', m.income], ['out', m.expenses]]) {
        const b = document.createElement('span');
        b.className = 'bar ' + cls;
        b.style.height = `${(v / max) * 100}%`;
        pair.append(b);
      }
      const lab = document.createElement('span');
      lab.className = 'bar-label';
      lab.textContent = MONTHS[i].slice(0, 1);
      col.append(pair, lab);
      bars.append(col);
    });

    // schedule C
    const sched = $('sched');
    sched.innerHTML = '';
    const head = sched.insertRow();
    head.className = 'head';
    for (const h of ['Line', 'Category', 'Deductible']) { const th = document.createElement('th'); th.textContent = h; head.append(th); }
    const lines = L.scheduleC(state.transactions, year);
    if (!lines.length) {
      const r = sched.insertRow(); const td = r.insertCell(); td.colSpan = 3; td.textContent = 'No transactions this year.';
    }
    for (const l of lines) {
      const r = sched.insertRow();
      if (l.id === 'uncategorized') r.className = 'needs';
      const a = document.createElement('th'); a.textContent = l.line || '–';
      const b = document.createElement('th'); b.textContent = l.label + (l.type === 'income' && l.id !== 'uncategorized' ? ' (income)' : '');
      const c = r.insertCell(); c.textContent = money(l.deductible);
      r.prepend(a, b);
    }
    const tot = sched.insertRow(); tot.className = 'sum';
    const t1 = document.createElement('th'); t1.colSpan = 2; t1.textContent = 'Net profit (line 31)';
    const t2 = tot.insertCell(); t2.textContent = money(s.profit);
    tot.prepend(t1);

    // quarters
    const qt = $('quarters');
    qt.innerHTML = '';
    const qh = qt.insertRow(); qh.className = 'head';
    for (const h of ['Quarter', 'Due', 'Profit', 'Set aside']) { const th = document.createElement('th'); th.textContent = h; qh.append(th); }
    for (const q of L.quarterly(state.transactions, year)) {
      const r = qt.insertRow();
      const a = document.createElement('th'); a.textContent = q.q;
      const [yy, mm, dd] = q.due.split('-');
      r.append(a);
      r.insertCell().textContent = `${MONTHS[Number(mm) - 1]} ${Number(dd)}, ${yy}`;
      r.insertCell().textContent = money(q.profit);
      r.insertCell().textContent = money(q.setAside);
    }
    $('se-note').textContent = `Estimated self-employment tax on this year's profit: ${money(s.seTax)}. Income tax depends on your other income; the 25% set-aside is a rough guide, not an exact figure.`;
  }

  function render() {
    fillYears();
    const s = L.summarize(state.transactions, $('year').value);
    renderTiles(s);
    renderList();
    renderReports(s);
    $('sample-banner').hidden = !state.transactions.some((t) => t.sample);
    if (!storageOk) setStatus($('backup-status'), 'This browser is blocking storage, so entries will be lost when you close the page. Download a backup before leaving.', true);
  }

  // ---------- tabs ----------
  function switchTab(name) {
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    for (const p of ['tx', 'reports', 'backup']) $('panel-' + p).hidden = p !== name;
    try { sessionStorage.setItem('falconBooks.tab', name); } catch (e) { /* ignore */ }
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // ---------- import / export ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  $('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = L.importBankCSV(text);
    if (result.error) { setStatus($('import-status'), result.error, true); e.target.value = ''; return; }
    // skip exact duplicates (same date, amount, type, payee)
    const seen = new Set(state.transactions.map((t) => `${t.date}|${t.type}|${t.amount}|${t.payee}`));
    const fresh = result.transactions.filter((t) => !seen.has(`${t.date}|${t.type}|${t.amount}|${t.payee}`));
    state.transactions.push(...fresh.map((t) => ({ id: newId(), ...t })));
    save();
    const dupes = result.transactions.length - fresh.length;
    setStatus($('import-status'),
      `Imported ${fresh.length} transaction${fresh.length === 1 ? '' : 's'}` +
      (dupes ? `, skipped ${dupes} already in your books` : '') +
      (result.skipped ? `, skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} without a date or amount` : '') +
      '. Open Transactions and tick "Needs a category only" to sort them.');
    e.target.value = '';
    render();
  });

  $('backup-btn').addEventListener('click', () => {
    download(`falcon-books-backup-${today()}.json`, JSON.stringify({ app: 'Falcon Books', version: 1, saved: new Date().toISOString(), ...state }, null, 2), 'application/json');
    setStatus($('backup-status'), 'Backup downloaded. Keep it somewhere safe, like a cloud drive.');
  });

  $('export-btn').addEventListener('click', () => {
    const year = $('year').value;
    download(`falcon-books-${year}.csv`, L.toCSV(state.transactions.filter((t) => t.date.startsWith(year))), 'text/csv');
    setStatus($('backup-status'), `Exported ${year} as CSV.`);
  });

  $('restore-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.transactions)) throw new Error('bad file');
      const clean = data.transactions.filter((t) => t && t.date && t.type && Number(t.amount) > 0)
        .map((t) => ({ id: t.id || newId(), date: String(t.date), type: t.type === 'income' ? 'income' : 'expense', amount: Number(t.amount), category: L.BY_ID[t.category] ? t.category : 'uncategorized', payee: String(t.payee || ''), note: String(t.note || ''), sample: Boolean(t.sample) }));
      state = { transactions: clean };
      save();
      setStatus($('backup-status'), `Restored ${clean.length} transactions from ${file.name}.`);
      render();
    } catch (err) {
      setStatus($('backup-status'), "That file isn't a Falcon Books backup. Choose the .json file you downloaded with \"Download backup file\".", true);
    }
    e.target.value = '';
  });

  $('wipe-btn').addEventListener('click', () => {
    $('wipe-count').textContent = state.transactions.length;
    $('wipe-confirm').hidden = false;
  });
  $('wipe-no').addEventListener('click', () => { $('wipe-confirm').hidden = true; });
  $('wipe-yes').addEventListener('click', () => {
    state = { transactions: [] }; save();
    $('wipe-confirm').hidden = true;
    setStatus($('backup-status'), 'All transactions deleted.');
    render();
  });

  $('clear-samples').addEventListener('click', () => {
    state.transactions = state.transactions.filter((t) => !t.sample);
    save(); render();
    $('f-amount').focus();
  });

  $('year').addEventListener('change', render);
  $('month-filter').addEventListener('change', renderList);
  $('needs-filter').addEventListener('change', renderList);

  // ---------- start ----------
  load();
  fillMonths();
  resetForm();
  render();
  let startTab = 'tx';
  try { startTab = sessionStorage.getItem('falconBooks.tab') || 'tx'; } catch (e) { /* ignore */ }
  switchTab(startTab);
})();
