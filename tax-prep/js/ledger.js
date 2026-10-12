// ============================================
// Falcon Books: ledger logic (no DOM).
// Categories follow IRS Schedule C (Form 1040) lines so the
// year-end summary maps straight onto the return.
// ============================================
(function (root) {
  const TAX_CATEGORIES = [
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
  ].map((c) => ({ ...c, profile: 'tax' }));

  // Trucking company (owner-operator to ~20 trucks)
  const TRUCKING_CATEGORIES = [
    // income
    { id: 't_freight', label: 'Freight / linehaul revenue', type: 'income', line: '1' },
    { id: 't_fsc', label: 'Fuel surcharge', type: 'income', line: '1' },
    { id: 't_accessorial', label: 'Detention, layover & accessorials', type: 'income', line: '1' },
    { id: 't_other_income', label: 'Other income', type: 'income', line: '6' },
    // expenses
    { id: 't_fuel', label: 'Fuel', type: 'expense', line: '9', fuel: true },
    { id: 't_repairs', label: 'Repairs & maintenance', type: 'expense', line: '21', itemized: true },
    { id: 't_insurance', label: 'Truck insurance (liability, cargo, physical damage)', type: 'expense', line: '15' },
    { id: 't_lease', label: 'Truck or trailer lease / rent', type: 'expense', line: '20a' },
    { id: 't_loan_interest', label: 'Truck loan interest', type: 'expense', line: '16b' },
    { id: 't_hvut', label: 'Heavy vehicle use tax (Form 2290)', type: 'expense', line: '23' },
    { id: 't_ifta', label: 'IFTA fuel tax paid', type: 'expense', line: '23' },
    { id: 't_ifta_license', label: 'IFTA license & decals', type: 'expense', line: '23' },
    { id: 't_irp', label: 'IRP plates & registration', type: 'expense', line: '23' },
    { id: 't_ucr', label: 'UCR registration', type: 'expense', line: '23' },
    { id: 't_permits', label: 'Permits (trip, fuel, oversize / overweight)', type: 'expense', line: '23' },
    { id: 't_road_tax', label: 'State road taxes (NY HUT, KYU, NM WDT, OR weight-mile)', type: 'expense', line: '23' },
    { id: 't_tolls', label: 'Tolls, scales & parking', type: 'expense', line: '27a' },
    { id: 't_dispatch', label: 'Dispatch & factoring fees', type: 'expense', line: '10' },
    { id: 't_wages', label: 'Driver wages (W-2)', type: 'expense', line: '26' },
    { id: 't_contract', label: 'Contract drivers (1099)', type: 'expense', line: '11' },
    { id: 't_perdiem', label: 'Meals on the road (80%, DOT hours)', type: 'expense', line: '24b', deductible: 0.8 },
    { id: 't_eld', label: 'ELD subscription', type: 'expense', line: '27a' },
    { id: 't_loadboards', label: 'Load boards (DAT, Truckstop, 123Loadboard)', type: 'expense', line: '27a' },
    { id: 't_software_sub', label: 'Software subscriptions (TMS, dispatch, accounting)', type: 'expense', line: '27a' },
    { id: 't_software_buy', label: 'Software purchase, one-time', type: 'expense', line: '27a',
      hint: 'Off-the-shelf software is usually deductible in the year bought. Items over $2,500 each may need Section 179 or depreciation (line 13).' },
    { id: 't_electronics', label: 'Electronics (tablet, dash cam, GPS, ELD device)', type: 'expense', line: '22',
      hint: 'Items up to $2,500 each can be expensed under the de minimis safe harbor (elect it on the return). More expensive items may need Section 179 or depreciation (line 13).' },
    { id: 't_compliance', label: 'Drug tests, DOT physicals & compliance', type: 'expense', line: '27a' },
    { id: 't_lumper', label: 'Lumper fees', type: 'expense', line: '27a' },
    { id: 't_office', label: 'Office, phone & supplies', type: 'expense', line: '18' },
    { id: 't_legal', label: 'Accounting & legal', type: 'expense', line: '17' },
    { id: 't_other_expense', label: 'Other expense', type: 'expense', line: '27a' },
  ].map((c) => ({ ...c, profile: 'trucking' }));

  // Itemized repair & maintenance work, name by name
  const REPAIR_ITEMS = [
    ['pm', 'Preventive maintenance (PM) service'],
    ['oil', 'Oil & filter change'],
    ['tires_new', 'Tires (new or retread)'],
    ['tire_repair', 'Tire repair & balancing'],
    ['alignment', 'Wheel alignment'],
    ['brakes', 'Brakes (pads, shoes, drums, chambers)'],
    ['engine', 'Engine repair'],
    ['transmission', 'Transmission & clutch'],
    ['emissions', 'DPF, DEF & emissions system'],
    ['def_fluid', 'DEF fluid'],
    ['cooling', 'Coolant, radiator & water pump'],
    ['electrical', 'Electrical, batteries & alternator'],
    ['lights', 'Lights & wiring'],
    ['suspension', 'Suspension & air bags'],
    ['steering', 'Steering & front end'],
    ['ac_heat', 'A/C & heating'],
    ['apu', 'APU service'],
    ['reefer', 'Reefer unit service'],
    ['trailer', 'Trailer repair'],
    ['glass', 'Windshield & glass'],
    ['body', 'Body work & paint'],
    ['dot_inspection', 'DOT annual inspection'],
    ['towing', 'Roadside service & towing'],
    ['wash', 'Truck wash'],
    ['parts', 'Parts & shop supplies'],
    ['labor', 'Shop labor'],
    ['other', 'Other repair'],
  ].map(([id, label]) => ({ id, label }));
  const REPAIR_BY_ID = Object.fromEntries(REPAIR_ITEMS.map((r) => [r.id, r]));

  // IFTA member jurisdictions (48 contiguous US states + 10 Canadian provinces)
  const IFTA_JURISDICTIONS = ['AL','AR','AZ','CA','CO','CT','DE','FL','GA','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY','AB','BC','MB','NB','NL','NS','ON','PE','QC','SK'];

  const CATEGORIES = [
    ...TAX_CATEGORIES,
    ...TRUCKING_CATEGORIES,
    // imported, not yet sorted (both profiles)
    { id: 'uncategorized', label: 'Needs a category', type: 'any', line: '', profile: 'all' },
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
    // Schedule C order: by line number (1, 6, 8 ... 24a, 24b ... 27a); unsorted rows last
    const order = CATEGORIES.map((c) => c.id);
    const lineKey = (l) => (l ? parseInt(l, 10) * 10 + (l.replace(/^\d+/, '').charCodeAt(0) - 96 || 0) : 9999);
    return [...lines.values()]
      .map((e) => ({ ...e, total: round2(e.total), deductible: round2(e.deductible) }))
      .sort((a, b) => lineKey(a.line) - lineKey(b.line) || order.indexOf(a.id) - order.indexOf(b.id) || (a.type === 'income' ? -1 : 1));
  }

  function quarterly(list, year) {
    const rows = inYear(list, year);
    return QUARTERS.map(({ q, months, due }) => {
      const sub = rows.filter((t) => months.includes(Number(String(t.date).slice(5, 7))));
      const s = summarize(sub, year);
      return { q, due: due.replace('2026', String(year)).replace('2027', String(Number(year) + 1)), profit: s.profit, setAside: s.setAside };
    });
  }


  // ---------- trucking ----------
  function quarterOf(date) { return Math.floor((Number(String(date).slice(5, 7)) - 1) / 3) + 1; }

  // Repairs & maintenance totals, item by item
  function repairsBreakdown(list, year) {
    const totals = new Map();
    for (const t of inYear(list, year)) {
      if (t.category !== 't_repairs') continue;
      const item = REPAIR_BY_ID[t.sub] || REPAIR_BY_ID.other;
      totals.set(item.id, (totals.get(item.id) || 0) + Math.abs(t.amount));
    }
    return [...totals.entries()]
      .map(([id, total]) => ({ id, label: REPAIR_BY_ID[id].label, total: round2(total) }))
      .sort((a, b) => b.total - a.total);
  }

  // Profit and cost per mile for each truck; '' = company overhead
  function perTruck(list, year, trucks, milesLog) {
    const rows = new Map([['', { id: '', unit: 'Company / overhead', income: 0, fuel: 0, repairs: 0, other: 0, miles: 0 }]]);
    for (const tr of trucks || []) rows.set(tr.id, { id: tr.id, unit: tr.unit, income: 0, fuel: 0, repairs: 0, other: 0, miles: 0 });
    for (const t of inYear(list, year)) {
      const r = rows.get(t.truck || '') || rows.get('');
      const amt = Math.abs(t.amount);
      if (t.type === 'income') r.income += amt;
      else if (t.category === 't_fuel') r.fuel += amt;
      else if (t.category === 't_repairs') r.repairs += amt;
      else r.other += deductibleAmount(t);
    }
    for (const m of milesLog || []) {
      if (String(m.year) !== String(year)) continue;
      const r = rows.get(m.truck);
      if (r) r.miles += Number(m.miles) || 0;
    }
    return [...rows.values()].map((r) => {
      const expenses = r.fuel + r.repairs + r.other;
      return {
        ...r,
        income: round2(r.income), fuel: round2(r.fuel), repairs: round2(r.repairs), other: round2(r.other),
        expenses: round2(expenses), profit: round2(r.income - expenses),
        costPerMile: r.miles > 0 ? round2(expenses / r.miles) : null,
      };
    });
  }

  // IFTA quarter: miles and tax-paid gallons by jurisdiction.
  // Taxable gallons = miles / fleet MPG. The IFTA portal applies each
  // jurisdiction's rate, so no tax rates are hard-coded here.
  function iftaQuarter(list, milesLog, year, quarter) {
    const states = new Map();
    const get = (st) => states.get(st) || states.set(st, { state: st, miles: 0, paidGallons: 0 }).get(st);
    let totalMiles = 0, totalGallons = 0;
    for (const m of milesLog || []) {
      if (String(m.year) !== String(year) || Number(m.quarter) !== Number(quarter)) continue;
      const miles = Number(m.miles) || 0;
      get(m.state).miles += miles;
      totalMiles += miles;
    }
    for (const t of inYear(list, year)) {
      if (t.category !== 't_fuel' || quarterOf(t.date) !== Number(quarter)) continue;
      const gal = Number(t.gallons) || 0;
      totalGallons += gal;
      if (t.state) get(t.state).paidGallons += gal;
    }
    const mpg = totalGallons > 0 ? totalMiles / totalGallons : 0;
    const rows = [...states.values()].map((r) => {
      const taxable = mpg > 0 ? r.miles / mpg : 0;
      return { state: r.state, miles: round2(r.miles), taxableGallons: round2(taxable), paidGallons: round2(r.paidGallons), netGallons: round2(taxable - r.paidGallons) };
    }).sort((a, b) => a.state.localeCompare(b.state));
    const dueMonth = { 1: `${year}-04-30`, 2: `${year}-07-31`, 3: `${year}-10-31`, 4: `${Number(year) + 1}-01-31` }[quarter];
    return { year: Number(year), quarter: Number(quarter), totalMiles: round2(totalMiles), totalGallons: round2(totalGallons), mpg: round2(mpg), rows, due: dueMonth };
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

  function toCSV(list, truckNames) {
    const head = ['Date', 'Type', 'Amount', 'Category', 'Schedule C line', 'Payee / client', 'Note', 'Repair item', 'Truck', 'Gallons', 'State'];
    const lines = [head.join(',')];
    for (const t of [...list].sort((a, b) => a.date.localeCompare(b.date))) {
      const cat = BY_ID[t.category] || BY_ID.uncategorized;
      const item = t.category === 't_repairs' && REPAIR_BY_ID[t.sub] ? REPAIR_BY_ID[t.sub].label : '';
      lines.push([t.date, t.type, signed(t).toFixed(2), cat.label, cat.line, t.payee, t.note, item, truckNames && t.truck ? truckNames[t.truck] || '' : '', t.gallons || '', t.state || ''].map(csvCell).join(','));
    }
    return lines.join('\n');
  }

  const api = { CATEGORIES, BY_ID, REPAIR_ITEMS, REPAIR_BY_ID, IFTA_JURISDICTIONS, repairsBreakdown, perTruck, iftaQuarter, quarterOf, summarize, scheduleC, quarterly, importBankCSV, toCSV, parseCSVText, toISODate, toNumber };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ledger = api;
})(typeof window !== 'undefined' ? window : globalThis);
