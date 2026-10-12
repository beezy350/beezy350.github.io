// ============================================
// Falcon Books UI. Two separate sets of books
// (tax practice, trucking company), each kept in
// this browser's localStorage. Backups are JSON.
// ============================================
(function () {
  const L = window.Ledger;
  if (!L) return;

  const PROFILES = {
    tax: { key: 'falconBooks.v1', name: 'Tax practice', file: 'tax-practice' },
    trucking: { key: 'falconBooks.trucking.v1', name: 'Trucking company', file: 'trucking' },
  };
  const PROFILE_KEY = 'falconBooks.profile';
  const MAX_TRUCKS = 20;

  const $ = (id) => document.getElementById(id);
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyShort = (n) => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  const num = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  const today = () => new Date().toISOString().slice(0, 10);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------- state ----------
  let profile = 'tax';
  let state = { transactions: [], trucks: [], milesLog: [] };
  let storageOk = true;

  function sampleTax() {
    const y = new Date().getFullYear();
    const d = (m, day) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      trucks: [], milesLog: [],
      transactions: [
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
      ].map((t) => ({ ...t, id: newId(), sample: true })),
    };
  }

  function sampleTrucking() {
    const y = new Date().getFullYear();
    const d = (m, day) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const trucks = [
      { id: newId(), unit: '101', desc: '2021 Freightliner Cascadia', sample: true },
      { id: newId(), unit: '102', desc: '2019 Volvo VNL 760', sample: true },
      { id: newId(), unit: '103', desc: '2022 Kenworth T680', sample: true },
    ];
    const [a, b, c] = trucks.map((t) => t.id);
    const tx = [
      { date: d(1, 8), type: 'income', amount: 18400, category: 't_freight', truck: a, payee: 'Broker: Midwest Logistics', note: '6 loads' },
      { date: d(1, 9), type: 'income', amount: 15200, category: 't_freight', truck: b, payee: 'Broker: Lone Star Freight', note: '5 loads' },
      { date: d(1, 10), type: 'income', amount: 17100, category: 't_freight', truck: c, payee: 'Shipper direct', note: 'Dedicated lane' },
      { date: d(1, 12), type: 'income', amount: 1450, category: 't_fsc', truck: a, payee: 'Broker: Midwest Logistics', note: '' },
      { date: d(1, 22), type: 'income', amount: 375, category: 't_accessorial', truck: b, payee: 'Broker: Lone Star Freight', note: 'Detention 5 hrs' },
      { date: d(1, 5), type: 'expense', amount: 1424.5, category: 't_fuel', truck: a, payee: "Love's #512", gallons: 370, state: 'TX', note: '' },
      { date: d(1, 14), type: 'expense', amount: 1250.7, category: 't_fuel', truck: a, payee: 'Pilot #331', gallons: 330, state: 'OK', note: '' },
      { date: d(1, 6), type: 'expense', amount: 1317.9, category: 't_fuel', truck: b, payee: 'TA #77', gallons: 345, state: 'TX', note: '' },
      { date: d(1, 20), type: 'expense', amount: 1125.75, category: 't_fuel', truck: b, payee: 'Flying J #640', gallons: 285, state: 'NM', note: '' },
      { date: d(1, 7), type: 'expense', amount: 1484, category: 't_fuel', truck: c, payee: "Love's #208", gallons: 400, state: 'AR', note: '' },
      { date: d(1, 18), type: 'expense', amount: 1065.9, category: 't_fuel', truck: c, payee: 'Pilot #118', gallons: 285, state: 'TN', note: '' },
      { date: d(1, 16), type: 'expense', amount: 389, category: 't_repairs', sub: 'pm', truck: a, payee: 'Rush Truck Center', note: 'PM-A service' },
      { date: d(1, 23), type: 'expense', amount: 1240, category: 't_repairs', sub: 'brakes', truck: b, payee: 'Local diesel shop', note: 'Rear brake shoes + drums' },
      { date: d(1, 25), type: 'expense', amount: 2860, category: 't_repairs', sub: 'tires_new', truck: c, payee: 'Tire shop', note: '4 drive tires' },
      { date: d(1, 28), type: 'expense', amount: 3150, category: 't_repairs', sub: 'emissions', truck: b, payee: 'Dealer', note: 'DPF clean + sensor' },
      { date: d(1, 29), type: 'expense', amount: 189, category: 't_repairs', sub: 'def_fluid', truck: a, payee: "Love's #512", note: 'DEF bulk' },
      { date: d(1, 30), type: 'expense', amount: 145, category: 't_repairs', sub: 'dot_inspection', truck: c, payee: 'Inspection station', note: 'Annual DOT' },
      { date: d(1, 30), type: 'expense', amount: 65, category: 't_repairs', sub: 'wash', truck: a, payee: 'Blue Beacon', note: '' },
      { date: d(1, 2), type: 'expense', amount: 4850, category: 't_insurance', truck: '', payee: 'Insurance co.', note: 'Monthly fleet premium' },
      { date: d(1, 3), type: 'expense', amount: 105, category: 't_eld', truck: '', payee: 'ELD provider', note: '3 units' },
      { date: d(1, 3), type: 'expense', amount: 164.95, category: 't_loadboards', truck: '', payee: 'DAT', note: 'Load board, monthly' },
      { date: d(1, 3), type: 'expense', amount: 149, category: 't_loadboards', truck: '', payee: 'Truckstop', note: 'Load board, monthly' },
      { date: d(1, 4), type: 'expense', amount: 138, category: 't_ucr', truck: '', payee: 'UCR', note: '3-5 trucks bracket' },
      { date: d(1, 4), type: 'expense', amount: 30, category: 't_ifta_license', truck: '', payee: 'State IFTA office', note: 'Decals, 3 trucks' },
      { date: d(1, 11), type: 'expense', amount: 75, category: 't_permits', truck: b, payee: 'Permit service', note: 'Trip permit' },
      { date: d(1, 26), type: 'expense', amount: 212.4, category: 't_road_tax', truck: a, payee: 'NY Dept of Taxation', note: 'NY HUT' },
      { date: d(1, 13), type: 'expense', amount: 239, category: 't_electronics', truck: c, payee: 'Electronics store', note: 'Dash cam' },
      { date: d(1, 13), type: 'expense', amount: 59, category: 't_software_sub', truck: '', payee: 'TMS software', note: 'Dispatch, monthly' },
      { date: d(1, 15), type: 'expense', amount: 1150, category: 't_dispatch', truck: '', payee: 'Factoring co.', note: '2.5% factoring fee' },
      { date: d(1, 19), type: 'expense', amount: 312.5, category: 't_tolls', truck: b, payee: 'PrePass / tolls', note: '' },
      { date: d(1, 31), type: 'expense', amount: 6800, category: 't_contract', truck: c, payee: 'Driver: R. Lopez', note: '1099 driver, January' },
      { date: d(1, 31), type: 'expense', amount: 480, category: 't_perdiem', truck: '', payee: 'Per diem', note: 'Owner, 6 days on road' },
      { date: d(1, 24), type: 'expense', amount: 75, category: 't_compliance', truck: '', payee: 'Testing consortium', note: 'Random drug test' },
      { date: d(1, 27), type: 'expense', amount: 92.4, category: 'uncategorized', truck: '', payee: 'CAT SCALE 4410', note: 'Imported' },
    ].map((t) => ({ ...t, id: newId(), sample: true }));
    const miles = [
      [a, 'TX', 1850], [a, 'OK', 1420], [a, 'KS', 880], [a, 'MO', 640],
      [b, 'TX', 1960], [b, 'NM', 1210], [b, 'AZ', 930],
      [c, 'AR', 1580], [c, 'TN', 1340], [c, 'MS', 760], [c, 'AL', 520],
    ].map(([truck, st, m]) => ({ id: newId(), year: y, quarter: 1, truck, state: st, miles: m, sample: true }));
    return { trucks, milesLog: miles, transactions: tx };
  }

  function normalize(data) {
    return {
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      trucks: Array.isArray(data.trucks) ? data.trucks : [],
      milesLog: Array.isArray(data.milesLog) ? data.milesLog : [],
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(PROFILES[profile].key);
      if (raw) { const data = JSON.parse(raw); if (data && Array.isArray(data.transactions)) { state = normalize(data); return; } }
    } catch (e) { storageOk = false; }
    state = profile === 'trucking' ? sampleTrucking() : sampleTax();
  }

  function save() {
    try { localStorage.setItem(PROFILES[profile].key, JSON.stringify(state)); storageOk = true; }
    catch (e) { storageOk = false; }
  }

  const truckName = (id) => { const t = state.trucks.find((x) => x.id === id); return t ? `Unit ${t.unit}` : ''; };

  // ---------- selects ----------
  function fillCategories(select, type, selected) {
    select.innerHTML = '';
    for (const c of L.CATEGORIES) {
      if (c.profile !== profile && c.profile !== 'all') continue;
      if (c.type !== type && c.type !== 'any') continue;
      const o = el('option', null, c.line ? `${c.label} (line ${c.line})` : c.label);
      o.value = c.id;
      select.append(o);
    }
    if (selected && [...select.options].some((o) => o.value === selected)) select.value = selected;
    else select.selectedIndex = 0;
  }

  function fillTrucks(select, { withOverhead = true, withAll = false, selected = '' } = {}) {
    select.innerHTML = '';
    if (withAll) { const o = el('option', null, 'All trucks'); o.value = '*'; select.append(o); }
    if (withOverhead) { const o = el('option', null, 'Company / overhead'); o.value = ''; select.append(o); }
    for (const t of state.trucks) { const o = el('option', null, `Unit ${t.unit}${t.desc ? ' · ' + t.desc : ''}`); o.value = t.id; select.append(o); }
    if ([...select.options].some((o) => o.value === selected)) select.value = selected;
  }

  function fillStates(select, placeholder) {
    select.innerHTML = '';
    if (placeholder) { const o = el('option', null, placeholder); o.value = ''; select.append(o); }
    for (const st of L.IFTA_JURISDICTIONS) { const o = el('option', null, st); o.value = st; select.append(o); }
  }

  function fillRepairs() {
    const sel = $('f-repair');
    sel.innerHTML = '';
    for (const r of L.REPAIR_ITEMS) { const o = el('option', null, r.label); o.value = r.id; sel.append(o); }
  }

  // ---------- entry form ----------
  const form = $('entry-form');
  const catSelect = $('f-category');
  let editingId = null;

  const currentType = () => form.querySelector('input[name=type]:checked').value;

  function syncFields() {
    const cat = L.BY_ID[catSelect.value] || {};
    $('cat-hint').hidden = !cat.hint;
    $('cat-hint').textContent = cat.hint || '';
    $('miles-field').hidden = catSelect.value !== 'car';
    $('repair-field').hidden = !cat.itemized;
    $('fuel-field').hidden = !cat.fuel;
  }

  function milesToAmount() {
    const miles = Number($('f-miles').value);
    const rate = Number($('f-rate').value);
    if (miles > 0 && rate > 0) {
      $('f-amount').value = (Math.round(miles * rate * 100) / 100).toFixed(2);
      if (!$('f-note').value) $('f-note').value = `${miles} business miles`;
    }
  }

  function setStatus(target, msg, isError) {
    target.textContent = msg;
    target.classList.toggle('error', Boolean(isError));
  }

  function resetForm(keepType) {
    editingId = null;
    const keepTruck = $('f-truck').value;
    form.reset();
    if (keepType) form.querySelector(`input[name=type][value=${keepType}]`).checked = true;
    $('f-date').value = today();
    $('f-rate').value = '0.725';
    fillCategories(catSelect, currentType());
    fillTrucks($('f-truck'), { selected: keepTruck });
    $('f-payee').placeholder = profile === 'trucking' ? "e.g. broker, Love's #512, tire shop" : 'e.g. J. Smith or Office Depot';
    syncFields();
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
    fillTrucks($('f-truck'), { selected: t.truck || '' });
    $('f-date').value = t.date;
    $('f-amount').value = t.amount;
    $('f-payee').value = t.payee || '';
    $('f-note').value = t.note || '';
    $('f-repair').value = t.sub || 'other';
    $('f-gallons').value = t.gallons || '';
    $('f-state').value = t.state || '';
    syncFields();
    $('form-title').textContent = 'Edit transaction';
    $('save-btn').textContent = 'Save changes';
    $('cancel-edit').hidden = false;
    setStatus($('entry-status'), '');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('f-amount').focus({ preventScroll: true });
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'type') { fillCategories(catSelect, currentType()); syncFields(); }
    if (e.target === catSelect) syncFields();
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
    const cat = L.BY_ID[catSelect.value] || {};
    const entry = {
      date, amount, type: currentType(), category: catSelect.value,
      payee: $('f-payee').value.trim(), note: $('f-note').value.trim(),
    };
    if (profile === 'trucking') entry.truck = $('f-truck').value;
    if (cat.itemized) entry.sub = $('f-repair').value;
    if (cat.fuel) {
      const gal = Number($('f-gallons').value);
      if (gal > 0) entry.gallons = Math.round(gal * 1000) / 1000;
      if ($('f-state').value) entry.state = $('f-state').value;
    }
    if (editingId) {
      const i = state.transactions.findIndex((x) => x.id === editingId);
      if (i >= 0) {
        const prev = state.transactions[i];
        const merged = { id: prev.id, sample: prev.sample, ...entry };
        state.transactions[i] = merged;
      }
      setStatus($('entry-status'), 'Saved.');
    } else {
      state.transactions.push({ id: newId(), ...entry });
      const extra = cat.fuel && !entry.gallons ? ' Add gallons and state so it counts for IFTA.' : '';
      setStatus($('entry-status'), `Added ${money(amount)} ${entry.type === 'income' ? 'income' : 'expense'}.${extra}`);
    }
    save();
    resetForm(entry.type);
    if (cat.id && entry.type === 'expense') { catSelect.value = cat.id; syncFields(); }
    $('year').value = date.slice(0, 4);
    render();
  });

  // ---------- rendering ----------
  function years() {
    const set = new Set(state.transactions.map((t) => t.date.slice(0, 4)));
    state.milesLog.forEach((m) => set.add(String(m.year)));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }

  function fillYears() {
    const sel = $('year');
    const prev = sel.value;
    sel.innerHTML = '';
    for (const y of years()) { const o = el('option', null, y); o.value = y; sel.append(o); }
    sel.value = prev && [...sel.options].some((o) => o.value === prev) ? prev : sel.options[0].value;
  }

  function fillMonths() {
    const sel = $('month-filter');
    const all = el('option', null, 'All months'); all.value = ''; sel.append(all);
    MONTHS.forEach((m, i) => { const o = el('option', null, m); o.value = String(i + 1).padStart(2, '0'); sel.append(o); });
  }

  function renderTiles(s) {
    $('t-income').textContent = moneyShort(s.income);
    $('t-expenses').textContent = moneyShort(s.deductibleExpenses);
    $('t-profit').textContent = moneyShort(s.profit);
    $('t-profit').classList.toggle('neg', s.profit < 0);
    $('t-setaside').textContent = moneyShort(s.setAside);
  }

  function describe(t) {
    const parts = [];
    const [y, m, d] = t.date.split('-');
    parts.push(`${MONTHS[Number(m) - 1]} ${Number(d)}, ${y}`);
    if (profile === 'trucking') parts.push(truckName(t.truck) || 'Overhead');
    if (t.category === 't_repairs' && L.REPAIR_BY_ID[t.sub]) parts.push(L.REPAIR_BY_ID[t.sub].label);
    if (t.category === 't_fuel' && (t.gallons || t.state)) parts.push(`${t.gallons ? num(t.gallons, 1) + ' gal' : ''}${t.state ? ' in ' + t.state : ''}`.trim());
    if (t.note) parts.push(t.note);
    return parts.join(' · ');
  }

  function renderList() {
    const year = $('year').value;
    const month = $('month-filter').value;
    const truck = $('truck-filter').value;
    const onlyNeeds = $('needs-filter').checked;
    const rows = state.transactions
      .filter((t) => t.date.startsWith(year)
        && (!month || t.date.slice(5, 7) === month)
        && (profile !== 'trucking' || truck === '*' || (t.truck || '') === truck)
        && (!onlyNeeds || t.category === 'uncategorized'))
      .sort((a, b) => b.date.localeCompare(a.date));

    const list = $('tx-list');
    list.innerHTML = '';
    for (const t of rows) {
      const li = el('li', 'tx' + (t.category === 'uncategorized' ? ' needs' : ''));
      const main = el('div', 'tx-main');
      main.append(el('p', 'tx-payee', t.payee || (t.type === 'income' ? 'Income' : 'Expense')), el('p', 'tx-meta', describe(t)));

      const cat = el('select', 'tx-cat');
      cat.setAttribute('aria-label', 'Category');
      fillCategories(cat, t.type, t.category);
      cat.addEventListener('change', () => {
        t.category = cat.value;
        if (L.BY_ID[cat.value] && L.BY_ID[cat.value].itemized && !t.sub) t.sub = 'other';
        save(); render();
      });

      const amt = el('p', 'tx-amt ' + t.type, (t.type === 'income' ? '+' : '-') + money(t.amount));

      const actions = el('div', 'tx-actions');
      const edit = el('button', 'link-btn', 'Edit'); edit.type = 'button';
      edit.addEventListener('click', () => { switchTab('tx'); startEdit(t.id); });
      const del = el('button', 'link-btn danger-text', 'Delete'); del.type = 'button';
      armDelete(del, () => { state.transactions = state.transactions.filter((x) => x.id !== t.id); save(); render(); });
      actions.append(edit, del);

      li.append(main, cat, amt, actions);
      list.append(li);
    }
    $('tx-empty').hidden = rows.length > 0;
  }

  // Two-tap delete, no browser dialogs
  function armDelete(btn, onConfirm, label = 'Delete') {
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) { onConfirm(); return; }
      btn.dataset.armed = '1'; btn.textContent = 'Tap again to delete';
      setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = label; } }, 3000);
    });
  }

  function table(target, head, rows, opts = {}) {
    target.innerHTML = '';
    const h = target.insertRow(); h.className = 'head';
    head.forEach((x) => h.append(el('th', null, x)));
    if (!rows.length) { const r = target.insertRow(); const td = r.insertCell(); td.colSpan = head.length; td.className = 'empty-cell'; td.textContent = opts.empty || 'Nothing yet.'; return; }
    for (const row of rows) {
      const r = target.insertRow();
      if (row.cls) r.className = row.cls;
      row.cells.forEach((c, i) => { if (i === 0) r.append(el('th', null, c)); else r.insertCell().textContent = c; });
    }
  }

  function renderReports(s) {
    const year = $('year').value;
    // monthly bars
    const max = Math.max(1, ...s.months.flatMap((m) => [m.income, m.expenses]));
    const bars = $('bars');
    bars.innerHTML = '';
    s.months.forEach((m, i) => {
      const col = el('div', 'bar-col');
      col.title = `${MONTHS[i]}: income ${money(m.income)}, expenses ${money(m.expenses)}`;
      const pair = el('div', 'bar-pair');
      for (const [cls, v] of [['in', m.income], ['out', m.expenses]]) { const b = el('span', 'bar ' + cls); b.style.height = `${(v / max) * 100}%`; pair.append(b); }
      col.append(pair, el('span', 'bar-label', MONTHS[i].slice(0, 1)));
      bars.append(col);
    });

    // schedule C
    const lines = L.scheduleC(state.transactions, year);
    const schedRows = lines.map((l) => ({
      cls: l.id === 'uncategorized' ? 'needs' : '',
      cells: [l.line || '–', l.label + (l.type === 'income' && l.id !== 'uncategorized' ? ' (income)' : ''), money(l.deductible)],
    }));
    table($('sched'), ['Line', 'Category', 'Deductible'], schedRows, { empty: 'No transactions this year.' });
    const tot = $('sched').insertRow(); tot.className = 'sum';
    const t1 = el('th', null, 'Net profit (line 31)'); t1.colSpan = 2; tot.append(t1); tot.insertCell().textContent = money(s.profit);
    $('sched-help').textContent = profile === 'trucking'
      ? 'Totals by IRS Schedule C line. Meals on the road count at 80% (DOT hours-of-service rule). Truck depreciation (line 13) is figured at tax time.'
      : 'Totals by IRS Schedule C line. Meals count at 50%.';

    // quarters
    table($('quarters'), ['Quarter', 'Due', 'Profit', 'Set aside'], L.quarterly(state.transactions, year).map((q) => {
      const [yy, mm, dd] = q.due.split('-');
      return { cells: [q.q, `${MONTHS[Number(mm) - 1]} ${Number(dd)}, ${yy}`, money(q.profit), money(q.setAside)] };
    }));
    $('se-note').textContent = `Estimated self-employment tax on this year's profit: ${money(s.seTax)}. Income tax depends on your other income; the 25% set-aside is a rough guide, not an exact figure.`;

    if (profile !== 'trucking') return;
    // per truck
    const pt = L.perTruck(state.transactions, year, state.trucks, state.milesLog)
      .filter((r) => r.id || r.income || r.expenses);
    table($('per-truck'), ['Truck', 'Income', 'Fuel', 'Repairs', 'Other', 'Profit', 'Miles', 'Cost / mile'],
      pt.map((r) => ({ cls: r.profit < 0 ? 'neg-row' : '', cells: [r.id ? `Unit ${r.unit}` : r.unit, moneyShort(r.income), moneyShort(r.fuel), moneyShort(r.repairs), moneyShort(r.other), moneyShort(r.profit), r.miles ? num(r.miles) : '–', r.costPerMile != null ? money(r.costPerMile) : '–'] })),
      { empty: 'Add trucks on the Fleet & IFTA tab.' });
    // repairs
    const rep = L.repairsBreakdown(state.transactions, year);
    table($('repairs-table'), ['Item', 'Total'], rep.map((r) => ({ cells: [r.label, money(r.total)] })), { empty: 'No repairs recorded this year.' });
    if (rep.length) {
      const r = $('repairs-table').insertRow(); r.className = 'sum';
      r.append(el('th', null, 'All repairs & maintenance (line 21)'));
      r.insertCell().textContent = money(rep.reduce((a, x) => a + x.total, 0));
    }
  }

  function renderFleet() {
    if (profile !== 'trucking') return;
    const year = $('year').value;
    // trucks
    $('truck-count').textContent = `${state.trucks.length} of ${MAX_TRUCKS}`;
    const list = $('truck-list');
    list.innerHTML = '';
    for (const t of state.trucks) {
      const li = el('li', 'truck-item');
      const info = el('div');
      info.append(el('p', 'tx-payee', `Unit ${t.unit}`), el('p', 'tx-meta', t.desc || 'No description'));
      const del = el('button', 'link-btn danger-text', 'Remove'); del.type = 'button';
      armDelete(del, () => {
        state.trucks = state.trucks.filter((x) => x.id !== t.id);
        state.transactions.forEach((x) => { if (x.truck === t.id) x.truck = ''; });
        state.milesLog = state.milesLog.filter((m) => m.truck !== t.id);
        save(); render();
      }, 'Remove');
      li.append(info, del);
      list.append(li);
    }
    if (!state.trucks.length) list.append(el('li', 'empty-state', 'No trucks yet. Add your first unit above.'));

    // IFTA
    const q = Number($('ifta-quarter').value);
    const r = L.iftaQuarter(state.transactions, state.milesLog, year, q);
    const [dy, dm, dd] = r.due.split('-');
    const stats = $('ifta-stats');
    stats.innerHTML = '';
    for (const [label, value] of [['Total miles', num(r.totalMiles)], ['Gallons bought', num(r.totalGallons, 1)], ['Fleet MPG', r.mpg ? num(r.mpg, 2) : '–'], ['Return due', `${MONTHS[Number(dm) - 1]} ${Number(dd)}, ${dy}`]]) {
      const box = el('div', 'stat');
      box.append(el('p', 'tile-label', label), el('p', 'stat-value', value));
      stats.append(box);
    }
    table($('ifta-table'), ['State', 'Miles', 'Taxable gal', 'Tax-paid gal', 'Net gal'],
      r.rows.map((x) => ({ cls: x.netGallons > 0 ? 'owe-row' : '', cells: [x.state, num(x.miles), num(x.taxableGallons, 1), num(x.paidGallons, 1), (x.netGallons > 0 ? '+' : '') + num(x.netGallons, 1)] })),
      { empty: 'No miles or fuel recorded for this quarter yet.' });

    const entries = state.milesLog.filter((m) => String(m.year) === String(year) && Number(m.quarter) === q)
      .sort((a, b) => (truckName(a.truck) + a.state).localeCompare(truckName(b.truck) + b.state));
    $('miles-count').textContent = entries.length;
    const ml = $('miles-list');
    ml.innerHTML = '';
    for (const m of entries) {
      const li = el('li');
      li.append(el('span', null, `${truckName(m.truck) || 'Truck'} · ${m.state} · ${num(m.miles)} mi`));
      const del = el('button', 'link-btn danger-text', 'Delete'); del.type = 'button';
      armDelete(del, () => { state.milesLog = state.milesLog.filter((x) => x.id !== m.id); save(); render(); });
      li.append(del);
      ml.append(li);
    }
  }

  function render() {
    document.body.classList.toggle('is-trucking', profile === 'trucking');
    fillYears();
    const truckSel = $('truck-filter').value || '*';
    fillTrucks($('truck-filter'), { withAll: true, selected: truckSel });
    const mTruck = $('m-truck').value;
    fillTrucks($('m-truck'), { withOverhead: false, selected: mTruck });
    if (!editingId) fillTrucks($('f-truck'), { selected: $('f-truck').value });
    const s = L.summarize(state.transactions, $('year').value);
    renderTiles(s);
    renderList();
    renderReports(s);
    renderFleet();
    $('sample-banner').hidden = !(state.transactions.some((t) => t.sample) || state.trucks.some((t) => t.sample));
    if (!storageOk) setStatus($('backup-status'), 'This browser is blocking storage, so entries will be lost when you close the page. Download a backup before leaving.', true);
  }

  // ---------- tabs ----------
  function switchTab(name) {
    if (name === 'fleet' && profile !== 'trucking') name = 'tx';
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    for (const p of ['tx', 'reports', 'fleet', 'backup']) $('panel-' + p).hidden = p !== name;
    try { sessionStorage.setItem('falconBooks.tab', name); } catch (e) { /* ignore */ }
  }
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // ---------- profile ----------
  function setProfile(p) {
    profile = PROFILES[p] ? p : 'tax';
    try { localStorage.setItem(PROFILE_KEY, profile); } catch (e) { /* ignore */ }
    document.querySelector(`input[name=profile][value=${profile}]`).checked = true;
    load();
    ['entry-status', 'import-status', 'backup-status', 'truck-status', 'miles-status'].forEach((id) => setStatus($(id), ''));
    $('wipe-confirm').hidden = true;
    resetForm();
    render();
    const active = document.querySelector('.tab[aria-selected=true]');
    switchTab(active ? active.dataset.tab : 'tx');
  }
  document.querySelectorAll('input[name=profile]').forEach((r) => r.addEventListener('change', () => setProfile(r.value)));

  // ---------- fleet forms ----------
  $('truck-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const unit = $('tr-unit').value.trim();
    if (!unit) { setStatus($('truck-status'), 'Enter a unit number.', true); $('tr-unit').focus(); return; }
    if (state.trucks.length >= MAX_TRUCKS) { setStatus($('truck-status'), `You can track up to ${MAX_TRUCKS} trucks.`, true); return; }
    if (state.trucks.some((t) => t.unit.toLowerCase() === unit.toLowerCase())) { setStatus($('truck-status'), `Unit ${unit} is already in your fleet.`, true); return; }
    state.trucks.push({ id: newId(), unit, desc: $('tr-desc').value.trim() });
    save();
    $('truck-form').reset();
    setStatus($('truck-status'), `Added unit ${unit}.`);
    render();
  });

  $('miles-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const truck = $('m-truck').value;
    const st = $('m-state').value;
    const miles = Math.round(Number($('m-miles').value));
    if (!truck) { setStatus($('miles-status'), 'Add a truck first.', true); return; }
    if (!st) { setStatus($('miles-status'), 'Choose a state or province.', true); return; }
    if (!(miles > 0)) { setStatus($('miles-status'), 'Enter miles greater than 0.', true); $('m-miles').focus(); return; }
    const year = Number($('year').value);
    const quarter = Number($('m-quarter').value);
    const existing = state.milesLog.find((m) => m.truck === truck && m.state === st && Number(m.year) === year && Number(m.quarter) === quarter);
    if (existing) existing.miles += miles;
    else state.milesLog.push({ id: newId(), year, quarter, truck, state: st, miles });
    save();
    $('m-miles').value = '';
    $('ifta-quarter').value = String(quarter);
    setStatus($('miles-status'), `${existing ? 'Added to' : 'Logged'} ${num(miles)} miles in ${st} for ${truckName(truck)}, Q${quarter} ${year}.`);
    render();
    $('m-miles').focus();
  });

  $('ifta-quarter').addEventListener('change', renderFleet);

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
    const result = L.importBankCSV(await file.text());
    if (result.error) { setStatus($('import-status'), result.error, true); e.target.value = ''; return; }
    const seen = new Set(state.transactions.map((t) => `${t.date}|${t.type}|${t.amount}|${t.payee}`));
    const fresh = result.transactions.filter((t) => !seen.has(`${t.date}|${t.type}|${t.amount}|${t.payee}`));
    state.transactions.push(...fresh.map((t) => ({ id: newId(), ...t, ...(profile === 'trucking' ? { truck: '' } : {}) })));
    save();
    const dupes = result.transactions.length - fresh.length;
    setStatus($('import-status'),
      `Imported ${fresh.length} transaction${fresh.length === 1 ? '' : 's'} into ${PROFILES[profile].name.toLowerCase()} books` +
      (dupes ? `, skipped ${dupes} already in your books` : '') +
      (result.skipped ? `, skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} without a date or amount` : '') +
      '. Open Transactions and tick "Needs a category only" to sort them.');
    e.target.value = '';
    render();
  });

  $('backup-btn').addEventListener('click', () => {
    download(`falcon-books-${PROFILES[profile].file}-${today()}.json`,
      JSON.stringify({ app: 'Falcon Books', version: 2, profile, saved: new Date().toISOString(), ...state }, null, 2), 'application/json');
    setStatus($('backup-status'), 'Backup downloaded. Keep it somewhere safe, like a cloud drive.');
  });

  $('export-btn').addEventListener('click', () => {
    const year = $('year').value;
    const names = Object.fromEntries(state.trucks.map((t) => [t.id, `Unit ${t.unit}`]));
    download(`falcon-books-${PROFILES[profile].file}-${year}.csv`, L.toCSV(state.transactions.filter((t) => t.date.startsWith(year)), names), 'text/csv');
    setStatus($('backup-status'), `Exported ${year} as CSV.`);
  });

  $('restore-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.transactions)) throw new Error('bad file');
      if (data.profile && data.profile !== profile) {
        setStatus($('backup-status'), `That backup is for the ${PROFILES[data.profile] ? PROFILES[data.profile].name.toLowerCase() : 'other'} books. Switch to those books first, then restore.`, true);
        e.target.value = '';
        return;
      }
      const clean = data.transactions.filter((t) => t && t.date && t.type && Number(t.amount) > 0).map((t) => ({
        id: t.id || newId(), date: String(t.date), type: t.type === 'income' ? 'income' : 'expense', amount: Number(t.amount),
        category: L.BY_ID[t.category] ? t.category : 'uncategorized', payee: String(t.payee || ''), note: String(t.note || ''),
        ...(t.truck ? { truck: String(t.truck) } : {}), ...(t.sub ? { sub: String(t.sub) } : {}),
        ...(t.gallons ? { gallons: Number(t.gallons) } : {}), ...(t.state ? { state: String(t.state) } : {}),
        ...(t.sample ? { sample: true } : {}),
      }));
      state = { transactions: clean, trucks: Array.isArray(data.trucks) ? data.trucks.slice(0, MAX_TRUCKS) : [], milesLog: Array.isArray(data.milesLog) ? data.milesLog : [] };
      save();
      setStatus($('backup-status'), `Restored ${clean.length} transactions from ${file.name}.`);
      render();
    } catch (err) {
      setStatus($('backup-status'), "That file isn't a Falcon Books backup. Choose the .json file you downloaded with \"Download backup file\".", true);
    }
    e.target.value = '';
  });

  $('wipe-btn').addEventListener('click', () => { $('wipe-count').textContent = state.transactions.length; $('wipe-confirm').hidden = false; });
  $('wipe-no').addEventListener('click', () => { $('wipe-confirm').hidden = true; });
  $('wipe-yes').addEventListener('click', () => {
    state = { transactions: [], trucks: state.trucks.filter((t) => !t.sample), milesLog: [] };
    save();
    $('wipe-confirm').hidden = true;
    setStatus($('backup-status'), 'All transactions deleted.');
    render();
  });

  $('clear-samples').addEventListener('click', () => {
    state.transactions = state.transactions.filter((t) => !t.sample);
    state.trucks = state.trucks.filter((t) => !t.sample);
    state.milesLog = state.milesLog.filter((m) => !m.sample);
    save();
    resetForm();
    render();
    $('f-amount').focus();
  });

  $('year').addEventListener('change', render);
  $('month-filter').addEventListener('change', renderList);
  $('truck-filter').addEventListener('change', renderList);
  $('needs-filter').addEventListener('change', renderList);

  // ---------- start ----------
  fillMonths();
  fillRepairs();
  fillStates($('f-state'), 'State');
  fillStates($('m-state'), 'Choose');
  $('m-quarter').value = String(Math.floor(new Date().getMonth() / 3) + 1);
  let start = 'tax';
  try { start = localStorage.getItem(PROFILE_KEY) || 'tax'; } catch (e) { /* ignore */ }
  setProfile(start);
  let startTab = 'tx';
  try { startTab = sessionStorage.getItem('falconBooks.tab') || 'tx'; } catch (e) { /* ignore */ }
  switchTab(startTab);
})();
