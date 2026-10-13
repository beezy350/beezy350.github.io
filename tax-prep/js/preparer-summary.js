// ============================================
// Preparer summary: one page a tax preparer can work from.
// Schedule C by line, vehicle (Part IV), per diem, the federal
// and state estimate, and questions to confirm with the client.
// Built from estimator answers plus, when an organizer was
// uploaded or scanned, its itemized expense lines.
// model() has no DOM and runs in Node tests; render() and
// toText() turn the model into a page or plain text.
// ============================================
(function (root) {
  const LINES = {
    8: 'Advertising', 9: 'Car and truck expenses', 10: 'Commissions and fees', 11: 'Contract labor',
    15: 'Insurance (other than health)', '16b': 'Interest (other)', 17: 'Legal and professional services',
    18: 'Office expense', '20a': 'Rent or lease: vehicles, machinery, equipment', '20b': 'Rent or lease: other business property',
    21: 'Repairs and maintenance', 22: 'Supplies', 23: 'Taxes and licenses', '24a': 'Travel', '24b': 'Deductible meals',
    25: 'Utilities', 26: 'Wages', '27b': 'Other expenses (list in Part V)', 30: 'Business use of home (Form 8829)',
  };
  const ORDER = ['8', '9', '10', '11', '15', '16b', '17', '18', '20a', '20b', '21', '22', '23', '24a', '24b', '25', '26', '27b'];
  const STATUS = { single: 'Single', mfj: 'Married filing jointly', mfs: 'Married filing separately', hoh: 'Head of household' };
  // same limits as the tax engine: amounts 0..1e9, business income may be negative
  const finite = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(-1e9, Math.min(1e9, n)) : 0; };
  const num = (v) => Math.max(0, finite(v));
  const round2 = (v) => Math.round(v * 100) / 100;

  // Itemized lines from fillable-PDF / Scan Reader fields (name -> value)
  function itemsFromFields(fields, catalog, money) {
    const items = [];
    for (const [name, v] of Object.entries(fields || {})) {
      const c = catalog.expenses[name];
      const amount = money(v);
      if (c && amount) items.push({ label: c.label, line: c.line, share: c.share, group: c.group, amount });
      else if (catalog.car[name] && amount) items.push({ label: catalog.car[name], car: name.slice(4), amount });
    }
    return items;
  }

  // Itemized lines from the Excel organizer's Expenses tab rows
  // (A label, B Schedule C line, C amount paid, D deductible share)
  // Car tab rows (A label, B amount) -> car items, matched by label
  function carItemsFromSheet(rows, catalog) {
    const byLabel = {};
    for (const [k, lab] of Object.entries(catalog.car)) byLabel[lab] = k.slice(4);
    const items = [];
    for (const r of rows || []) {
      const key = byLabel[r[0] == null ? '' : String(r[0]).trim()];
      const amount = num(r[1]);
      if (key && amount) items.push({ label: String(r[0]).trim(), car: key, amount });
    }
    return items;
  }

  function itemsFromSheet(rows) {
    const items = [];
    let group = '';
    for (const r of rows || []) {
      const label = r[0] == null ? '' : String(r[0]).trim();
      const line = r[1] == null ? '' : String(r[1]).trim();
      if (label && !line && r[2] == null) { group = label; continue; }
      const amount = num(r[2]);
      if (!line || !amount || /^example/i.test(label) || /^total/i.test(label)) continue;
      items.push({ label: label || 'Other expense', line, share: num(r[3]), group, amount });
    }
    return items;
  }

  function model({ d, r, st, items, source }) {
    const seIncome = finite(d.seIncome);
    const all = (items || []).filter((i) => i.amount);
    const list = all.filter((i) => !i.car);
    const carParts = all.filter((i) => i.car);
    const deductible = (i) => i.amount * i.share;
    const itemTotal = round2(list.reduce((a, i) => a + deductible(i), 0));
    const itemized = list.length > 0 && Math.abs(itemTotal - num(d.seExpenses)) < 0.005;

    // Schedule C lines
    const byLine = {};
    const add = (line, label, amount, note) => {
      if (!amount) return;
      // older organizers used 27a for other expenses; anything unknown lands there too
      if (!ORDER.includes(line)) { note = [note, `listed as line ${line}`].filter(Boolean).join('; '); line = '27b'; }
      (byLine[line] = byLine[line] || { line, name: LINES[line] || 'Other', amount: 0, detail: [] });
      byLine[line].amount += amount;
      byLine[line].detail.push({ label, amount: round2(amount), note });
    };
    let homeOffice = 0;
    if (itemized) {
      for (const i of list) {
        if (String(i.line) === '30') { homeOffice += i.amount; continue; }
        add(String(i.line), i.label, deductible(i), i.share && i.share < 1 ? `${Math.round(i.share * 100)}% of ${round2(i.amount)}` : '');
      }
    }
    if (r.carDeduction && r.carMethod === 'actual') {
      // Line 9 instructions: lease or rental payments go on 20a, interest on 16b
      const share = r.carShare || 0;
      const part = (key) => carParts.filter((i) => i.car === key).reduce((a, i) => a + i.amount, 0) * share;
      const rent = part('rent'), interest = part('interest');
      add('20a', 'Vehicle lease or rental (business share)', rent);
      add('16b', 'Car loan interest (business share)', interest);
      add('9', 'Vehicle: actual costs x business share', r.carDeduction - rent - interest);
      if (!carParts.length && num(d.carCosts) && byLine['9']) {
        byLine['9'].detail[byLine['9'].detail.length - 1].note = 'move lease payments to 20a and loan interest to 16b';
      }
    } else if (r.carDeduction) {
      add('9', 'Vehicle: standard mileage', r.carDeduction);
    }
    if (r.perDiemDeduction) add('24b', 'Truck driver per diem (80% under DOT hours rules)', r.perDiemDeduction);
    const lines = ORDER.filter((l) => byLine[l]).map((l) => ({ ...byLine[l], amount: round2(byLine[l].amount) }));
    const unitemized = itemized ? 0 : num(d.seExpenses);
    const totalExpenses = round2(lines.reduce((a, l) => a + l.amount, 0) + unitemized);
    const netProfit = round2(seIncome - totalExpenses);

    const vehicle = r.carDeduction || (seIncome && (num(d.carCosts) || num(d.carMilesH1) || num(d.carMilesH2))) ? {
      milesH1: num(d.carMilesH1), milesH2: num(d.carMilesH2), totalMiles: num(d.carMilesTotal), costs: num(d.carCosts),
      standard: r.carStandard, actual: r.carActual, share: r.carShare, method: r.carMethod, deduction: r.carDeduction,
    } : null;

    return {
      source: source || 'Refund estimator answers',
      status: STATUS[r.status] || r.status,
      kids: Math.floor(num(d.childrenUnder17)), otherDeps: Math.floor(num(d.otherDependents)),
      income: [
        ['W-2 wages (incl. unreported cash tips)', num(d.wages)], ['Federal tax withheld (W-2)', num(d.withheld)], ['Federal tax withheld (SSA-1099 / 1099-R / 1099-G)', num(d.otherWithheld)],
        ['State tax withheld', num(d.stateWithheld)], ['Tips (for the tips deduction)', num(d.tips)],
        ['Overtime premium', num(d.overtimePremium)], ['Self-employment gross receipts', seIncome],
        ['Interest', num(d.interest)], ['Unemployment', num(d.unemployment)], ['Retirement withdrawals (1099-R, taxable)', num(d.retirementIncome)],
        ['Social Security benefits (SSA-1099 box 5)', num(d.socialSecurity)], ['Other income', num(d.otherIncome)],
        ['Traditional IRA contributions', num(d.iraYou) + num(d.iraSpouse)], ['HSA contributions (own)', num(d.hsaContribution)],
        ['SEP / solo 401(k) contributions', num(d.sepContribution)],
        ['K-1 partnership / LLC box 1', finite(d.k1Partnership)], ['K-1 guaranteed payments (box 4c)', num(d.k1Guaranteed)],
        ['K-1 S-corp box 1', finite(d.k1SCorp)], ['K-1 self-employment earnings (box 14A)', r.k1Se || 0],
        ['Federal estimated payments', num(d.estimatedPayments)], ['State estimated payments', num(d.stateEstimated)],
      ].filter(([, v]) => v),
      scheduleC: seIncome || totalExpenses ? { grossReceipts: seIncome, lines, unitemized, totalExpenses, netProfit, homeOffice: round2(homeOffice),
        itemized, itemsChanged: list.length > 0 && !itemized } : null,
      vehicle,
      perDiem: r.perDiemDeduction ? { full: num(d.perDiemFull), canada: num(d.perDiemCanada), travel: num(d.perDiemPartial), deduction: r.perDiemDeduction } : null,
      federal: [
        r.taxableSocialSecurity && [`Taxable Social Security (of ${$(r.socialSecurity)})`, r.taxableSocialSecurity],
        ['Total income', r.totalIncome], r.halfSeTax && ['Half of self-employment tax', -r.halfSeTax],
        r.sepDeduction && ['SEP / solo 401(k) deduction', -r.sepDeduction], r.hsaDeduction && ['HSA deduction (Form 8889)', -r.hsaDeduction],
        r.iraDeduction && ['IRA deduction', -r.iraDeduction], ['Adjusted gross income', r.agi, 'sum'],
        ['Standard deduction', r.standardDeduction], r.tipsDeduction && ['Tips deduction', r.tipsDeduction],
        r.overtimeDeduction && ['Overtime deduction', r.overtimeDeduction], r.seniorDeduction && ['Senior deduction', r.seniorDeduction],
        r.qbiDeduction && ['Qualified business income deduction', r.qbiDeduction], ['Taxable income', r.taxableIncome, 'sum'],
        ['Income tax', r.incomeTax], r.childCredits && ['Child tax credit / other dependents (nonrefundable)', -r.childCredits],
        r.seTax && ['Self-employment tax (Schedule SE)', r.seTax], ['Total tax', r.totalTax, 'sum'],
        ['Withholding', r.withheld], r.estimatedPayments && ['Estimated payments', r.estimatedPayments],
        r.refundableChildCredit && ['Additional child tax credit (refundable)', r.refundableChildCredit],
        r.eitc && ['Earned income credit', r.eitc],
        [r.result >= 0 ? 'Estimated federal refund' : 'Estimated federal amount owed', Math.abs(r.result), 'sum'],
      ].filter(Boolean),
      state: st && st.kind === 'supported' ? { name: st.name, rows: [
        ['Federal AGI', st.agi], ['Social Security and retirement subtraction', -(st.retireSubtraction || 0)],
        [`${st.name} base income`, st.base], ['Exemptions', st.exemptions], ['Taxable', st.taxable, 'sum'],
        [`Tax (${st.rateLabel})`, st.tax], ['Earned income credit (20% of federal)', st.eic || 0], ['Paid', st.paid],
        [st.result >= 0 ? 'Estimated refund' : 'Estimated amount owed', Math.abs(st.result), 'sum']] }
        : st && st.kind === 'no-tax' ? { name: st.name, note: `${st.name} has no tax on wages or business income.` }
        : st && st.kind === 'coming-soon' ? { name: st.name, note: `${st.name} estimate not available yet; prepare the state return separately.` } : null,
      questions: questions(d, r, st, list, itemized),
      notes: r.notes,
    };
  }

  function questions(d, r, st, items, itemized) {
    const q = [];
    const has = (re) => items.some((i) => re.test(i.label));
    const wages = num(d.wages), se = num(d.seIncome);
    if (num(d.withheld) && !wages) q.push(`Federal withholding of $${num(d.withheld).toLocaleString('en-US')} with no W-2 wages entered. Where did it come from: unemployment (1099-G), a retirement withdrawal (1099-R), a spouse's W-2 (wages missing), backup withholding on a 1099, or estimated payments?`);
    if (num(d.stateWithheld) && !wages) q.push('State withholding with no W-2 wages entered. Confirm the source and any missing W-2.');
    if (se) q.push('Match gross receipts to every 1099-NEC / 1099-K and the app or bank records. 1099-K gross includes platform fees, which go on line 10.');
    if (r.carDeduction) {
      q.push('Vehicle, Schedule C Part IV: date placed in service, business / commuting / other miles, and whether written mileage records exist.');
      q.push(r.carMethod === 'actual'
        ? 'Actual car costs chosen: confirm standard mileage was not required (owned car first used with standard mileage; leased car must keep its first method).'
        : 'Standard mileage chosen: confirm it was used in the first year this car was used for business (or for the whole lease).');
    }
    if (has(/meal/i) && (d.usesCar || r.carDeduction) && !d.isTrucker) q.push('Meals entered for a rideshare/delivery driver. Meals are deductible only when away from home overnight on business; usually remove.');
    if (d.isTrucker) q.push('Per diem: get the ELD or logbook for days away, confirm the driver is under DOT hours-of-service rules (80%), and that meals were not also entered.');
    if (has(/home office/i)) q.push('Home office (Form 8829): home and office square footage, regular and exclusive use, rent or mortgage interest, utilities, insurance.');
    if (has(/electronics|tools & equipment|software purchase/i)) q.push('Equipment and electronics: any item over $2,500 needs depreciation or the de minimis safe harbor election.');
    if (num(d.childrenUnder17) || num(d.otherDependents)) q.push("Each dependent: SSN or ITIN, date of birth, relationship, months lived in the home. Children 17-18 or students under 24 also count for the earned income credit.");
    if (r.eitc || r.refundableChildCredit || r.childCredits || d.status === 'hoh' || d.college) q.push('Paid-preparer due diligence: complete Form 8867 (EITC, child tax credit / ODC, American opportunity credit, head of household) and keep the documents you relied on.');
    if (d.status === 'hoh') q.push('Head of household: who is the qualifying person, and did the client pay more than half the cost of keeping up the home?');
    if (d.status === 'mfs') q.push("Married filing separately: spouse's name and SSN, and compare with filing jointly.");
    if (num(d.estimatedPayments)) q.push('Estimated payments: confirm dates and amounts against the IRS online account.');
    if (d.hasInvestments) q.push('Investments: get 1099-B / 1099-DIV / crypto reports. Not in this estimate; also counts toward the $12,200 EITC investment limit.');
    if (d.noSsn) q.push('Someone without an SSN: ITIN application (Form W-7) and which credits are lost without an SSN.');
    if (d.marketplace) q.push('Form 1095-A: reconcile the premium tax credit on Form 8962.');
    if (d.childcare) q.push("Childcare: provider's name, address, tax ID and amount paid (Form 2441).");
    if (d.college) q.push('Form 1098-T for education credits.');
    if (d.mortgage || d.studentLoan) q.push('Form 1098 / 1098-E: compare itemizing with the standard deduction; student loan interest is an adjustment.');
    if (r.k1Income || r.k1Se) {
      q.push('K-1s: get every page, including box 20 code Z (1065) or box 17 code V (1120-S) for the QBI deduction, and any state K-1. Check basis and at-risk limits (Form 7203 for S-corp shareholders) and passive-activity rules for losses.');
      if (finite(d.k1SCorp) > 0 && !num(d.wages)) q.push('S-corp income with no W-2 wages entered: confirm the owner took a reasonable salary. Distributions with no salary are an IRS audit flag.');
      if (finite(d.k1Partnership) && (d.k1Se == null || d.k1Se === '')) q.push('Partnership SE earnings were assumed to be box 1 + guaranteed payments (general partner / active LLC member). Use box 14 code A; limited partners usually owe SE tax only on guaranteed payments.');
    }
    if (d.irsLetter) q.push('Get a copy of the IRS or state letter.');
    if (num(d.socialSecurity)) q.push('SSA-1099 for each person: confirm box 5 and any withholding (box 6); Medicare premiums matter only if itemizing.');
    if (num(d.retirementIncome)) q.push('1099-R: check the distribution code (box 7). Early withdrawals before 59 1/2 may owe a 10% additional tax (Form 5329) not in this estimate; rollovers are not taxable.');
    if (num(d.iraYou) || num(d.iraSpouse)) q.push('IRA: confirm traditional (not Roth), contributed by April 15, 2027, and workplace-plan coverage (W-2 box 13). File Form 8606 for any nondeductible part.');
    if (num(d.hsaContribution) && (d.you65 || d.spouse65)) q.push('HSA after 65: once enrolled in Medicare (Part A), no new HSA contributions are allowed. Check Medicare start dates.');
    if (num(d.hsaContribution)) q.push('HSA (Form 8889): months covered by a high-deductible plan, coverage type, employer contributions (W-2 code W) and any withdrawals (1099-SA).');
    if (num(d.sepContribution)) q.push('SEP / solo 401(k): confirm the plan exists and the contribution is made by the return due date (including extensions).');
    if (st && st.kind === 'coming-soon') q.push(`${st.name} return is not in this estimate.`);
    if (se && !itemized && num(d.seExpenses)) q.push('Business expenses were entered as one total. Get the itemized list and receipts.');
    return q;
  }

  // ---------- text (copy / email / notes) ----------
  const $ = (v) => (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString('en-US');
  function toText(m) {
    const out = [];
    const row = (label, v) => out.push(`${label.padEnd(52, '.')} ${$(v).padStart(10)}`);
    out.push('PREPARER SUMMARY - 2026 TAX YEAR (PLANNING ESTIMATE, NOT A RETURN)', '');
    out.push(`Source: ${m.source}`, `Filing status: ${m.status}`, `State: ${m.state && m.state.name ? m.state.name : m.state || '-'}`,
      `Dependents: ${m.kids} child(ren) under 17, ${m.otherDeps} other`, '');
    if (m.income.length) { out.push('INCOME AND PAYMENTS'); m.income.forEach(([l, v]) => row(l, v)); out.push(''); }
    if (m.scheduleC) {
      const c = m.scheduleC;
      out.push('SCHEDULE C');
      row('Line 1  Gross receipts', c.grossReceipts);
      for (const l of c.lines) {
        row(`Line ${l.line}  ${l.name}`, l.amount);
        if (l.detail.length > 1 || l.detail[0].label !== l.name) l.detail.forEach((x) => out.push(`          - ${x.label}: ${$(x.amount)}${x.note ? ` (${x.note})` : ''}`));
      }
      if (c.unitemized) row('Expenses entered as a total (not itemized)', c.unitemized);
      row('Line 28 Total expenses', c.totalExpenses);
      row(c.homeOffice ? 'Line 29 Tentative profit (before home office)' : 'Line 31 Net profit', c.netProfit);
      if (c.homeOffice) out.push(`Home office costs entered: ${$(c.homeOffice)} total (figure the business part on Form 8829, line 30).`);
      if (c.itemsChanged) out.push('Note: expenses were changed after the organizer was loaded; the itemized list was left out.');
      out.push('');
    }
    if (m.vehicle) {
      const v = m.vehicle;
      out.push('VEHICLE (SCHEDULE C PART IV)');
      out.push(`Business miles Jan-Jun ${v.milesH1.toLocaleString('en-US')} (72.5c), Jul-Dec ${v.milesH2.toLocaleString('en-US')} (76c); all miles ${v.totalMiles.toLocaleString('en-US')}`);
      out.push(`Standard mileage ${$(v.standard)} | actual costs ${$(v.costs)}${v.share != null ? ` x ${Math.round(v.share * 100)}% = ${$(v.actual)}` : ''} | used: ${v.method || '-'} ${$(v.deduction)}`, '');
    }
    if (m.perDiem) out.push('PER DIEM', `Full days ${m.perDiem.full} (Canada ${m.perDiem.canada}), travel days ${m.perDiem.travel}: deductible ${$(m.perDiem.deduction)}`, '');
    out.push('FEDERAL ESTIMATE'); m.federal.forEach(([l, v]) => row(l, v)); out.push('');
    if (m.state) { out.push(m.state.name.toUpperCase()); if (m.state.rows) m.state.rows.forEach(([l, v]) => row(l, v)); else out.push(m.state.note); out.push(''); }
    if (m.questions.length) { out.push('CONFIRM WITH THE CLIENT'); m.questions.forEach((q, i) => out.push(`${i + 1}. ${q}`)); out.push(''); }
    if (m.notes.length) { out.push('ESTIMATE NOTES'); m.notes.forEach((n) => out.push(`- ${n}`)); out.push(''); }
    out.push('Prepared with the Falcon Tax Solutions estimator. Verify every figure on the official IRS and state forms before filing.');
    return out.join('\n');
  }

  // ---------- page ----------
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function table(rows, opts = {}) {
    const t = el('table', 'ps-table');
    for (const r of rows) {
      const tr = t.insertRow();
      if (r.cls) tr.className = r.cls;
      const th = el('th', '', r.label); th.scope = 'row'; tr.append(th);
      if (opts.line) tr.insertCell().textContent = r.line || '';
      const td = tr.insertCell(); td.textContent = r.value == null ? '' : $(r.value);
    }
    return t;
  }
  function section(parent, title) { const s = el('section', 'ps-sec'); s.append(el('h3', '', title)); parent.append(s); return s; }

  function render(m) {
    const root = el('div', 'ps');
    root.append(el('p', 'ps-kicker', 'Falcon Tax Solutions · Preparer summary · 2026 tax year'));
    root.append(el('h2', '', 'Planning estimate, not a filed return'));
    const meta = el('p', 'ps-meta');
    meta.textContent = `${m.status} · ${m.state && m.state.name ? m.state.name : m.state || 'No state'} · ${m.kids} child(ren) under 17, ${m.otherDeps} other dependent(s) · Source: ${m.source}`;
    root.append(meta);

    if (m.income.length) section(root, 'Income and payments').append(table(m.income.map(([label, value]) => ({ label, value }))));
    if (m.scheduleC) {
      const c = m.scheduleC;
      const s = section(root, 'Schedule C');
      const rows = [{ label: 'Gross receipts', line: '1', value: c.grossReceipts }];
      for (const l of c.lines) {
        rows.push({ label: l.name, line: l.line, value: l.amount, cls: 'ps-line' });
        if (l.detail.length > 1 || l.detail[0].label !== l.name) {
          l.detail.forEach((x) => rows.push({ label: `${x.label}${x.note ? ` (${x.note})` : ''}`, value: x.amount, cls: 'ps-detail' }));
        }
      }
      if (c.unitemized) rows.push({ label: 'Expenses entered as a total (not itemized)', line: '', value: c.unitemized });
      rows.push({ label: 'Total expenses', line: '28', value: c.totalExpenses, cls: 'ps-sum' });
      rows.push(c.homeOffice ? { label: 'Tentative profit (before home office)', line: '29', value: c.netProfit, cls: 'ps-sum' }
        : { label: 'Net profit', line: '31', value: c.netProfit, cls: 'ps-sum' });
      s.append(table(rows, { line: true }));
      if (c.homeOffice) s.append(el('p', 'ps-note', `Home office costs entered: ${$(c.homeOffice)} total. Figure the business part on Form 8829 (line 30).`));
      if (c.itemsChanged) s.append(el('p', 'ps-note', 'Expenses were changed after the organizer was loaded, so the itemized list was left out.'));
    }
    if (m.vehicle) {
      const v = m.vehicle;
      const s = section(root, 'Vehicle (Schedule C Part IV)');
      s.append(table([
        { label: 'Business miles Jan 1 - Jun 30 (72.5 cents)', value: null, line: v.milesH1.toLocaleString('en-US') },
        { label: 'Business miles Jul 1 - Dec 31 (76 cents)', value: null, line: v.milesH2.toLocaleString('en-US') },
        { label: 'All miles driven in 2026', value: null, line: v.totalMiles.toLocaleString('en-US') },
        { label: 'Standard mileage', value: v.standard },
        { label: `Actual costs ${$(v.costs)}${v.share != null ? ` x ${Math.round(v.share * 100)}% business` : ' (no business share)'}`, value: v.actual },
        { label: `Used: ${v.method === 'actual' ? 'actual costs' : 'standard mileage'}`, value: v.deduction, cls: 'ps-sum' },
      ], { line: true }));
    }
    if (m.perDiem) {
      section(root, 'Per diem').append(el('p', '', `Full days ${m.perDiem.full} (Canada ${m.perDiem.canada}), travel days ${m.perDiem.travel}. Deductible ${$(m.perDiem.deduction)} on line 24b.`));
    }
    section(root, 'Federal estimate').append(table(m.federal.map(([label, value, cls]) => ({ label, value, cls: cls === 'sum' ? 'ps-sum' : '' }))));
    if (m.state) {
      const s = section(root, m.state.name);
      if (m.state.rows) s.append(table(m.state.rows.map(([label, value, cls]) => ({ label, value, cls: cls === 'sum' ? 'ps-sum' : '' }))));
      else s.append(el('p', '', m.state.note));
    }
    if (m.questions.length) {
      const s = section(root, 'Confirm with the client');
      const ol = el('ol', 'ps-q');
      m.questions.forEach((q) => ol.append(el('li', '', q)));
      s.append(ol);
    }
    if (m.notes.length) {
      const s = section(root, 'Estimate notes');
      const ul = el('ul', 'ps-q');
      m.notes.forEach((n) => ul.append(el('li', '', n)));
      s.append(ul);
    }
    root.append(el('p', 'ps-foot', 'Prepared with the Falcon Tax Solutions estimator. Verify every figure on the official IRS and state forms before filing.'));
    return root;
  }

  const CSS = `
.ps-dialog{border:0;padding:0;margin:auto;inset:0;width:min(860px,100vw - 24px);max-height:calc(100dvh - 24px);overflow:auto;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.ps-dialog::backdrop{background:rgba(15,20,30,.55)}
.ps-bar{position:sticky;top:0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:flex-end;padding:10px 14px;background:#F4F5F7;border-bottom:1px solid #D9DEE6;z-index:1}
.ps-bar button{font:600 14px system-ui,sans-serif;min-height:40px;padding:6px 14px;border-radius:8px;border:2px solid #1D3557;background:#fff;color:#1D3557;cursor:pointer}
.ps-bar button.primary{background:#1D3557;color:#fff}
.ps-bar span{margin-right:auto;font:13px system-ui,sans-serif;color:#2F6F62}
.ps{font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;color:#1B2230;background:#fff;padding:18px 20px 24px}
.ps h2{font:700 20px Georgia,serif;color:#1D3557;margin:2px 0 4px}
.ps h3{font:700 14px system-ui,sans-serif;color:#1D3557;margin:0 0 6px;padding-bottom:3px;border-bottom:2px solid #C8963E}
.ps-kicker{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9A6F22;margin:0}
.ps-meta{color:#5A6475;margin:0 0 12px}
.ps-sec{margin:0 0 14px;break-inside:avoid}
.ps-table{width:100%;border-collapse:collapse}
.ps-table th,.ps-table td{padding:4px 6px;border-bottom:1px solid #E4E8EE;text-align:left;font-weight:400;vertical-align:top}
.ps-table td:last-child{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.ps-table td:nth-child(2):not(:last-child){width:56px;color:#5A6475;white-space:nowrap}
.ps-table tr.ps-line th{font-weight:600}
.ps-table tr.ps-detail th{padding-left:22px;color:#5A6475;font-size:12px}
.ps-table tr.ps-detail td{color:#5A6475;font-size:12px}
.ps-table tr.ps-sum th,.ps-table tr.ps-sum td{font-weight:700;color:#1D3557;border-top:1.5px solid #9AA6B8}
.ps-note{color:#A3472B;margin:6px 0 0}
.ps-q{margin:0;padding-left:20px}.ps-q li{margin-bottom:4px}
.ps-foot{color:#5A6475;font-size:11px;margin:12px 0 0}
@media print{body.ps-printing>*:not(.ps-dialog){display:none!important}
body.ps-printing .ps-dialog{position:absolute;inset:0 auto auto 0;margin:0;display:block;width:100%;max-width:none;max-height:none;overflow:visible;box-shadow:none;border-radius:0}
body.ps-printing .ps-dialog::backdrop{display:none}
body.ps-printing .ps{padding:0}
body.ps-printing .ps-bar{display:none}}`;

  // Opens the summary in a dialog with Print and Copy buttons
  function open(m) {
    if (!document.getElementById('ps-style')) {
      const s = el('style'); s.id = 'ps-style'; s.textContent = CSS; document.head.append(s);
    }
    let dlg = document.getElementById('ps-dialog');
    if (dlg) dlg.remove();
    dlg = el('dialog', 'ps-dialog'); dlg.id = 'ps-dialog';
    dlg.setAttribute('aria-label', 'Preparer summary');
    const bar = el('div', 'ps-bar');
    const status = el('span', '', ''); status.setAttribute('role', 'status');
    const copy = el('button', '', 'Copy as text'); copy.type = 'button';
    const print = el('button', 'primary', 'Print / Save as PDF'); print.type = 'button';
    const close = el('button', '', 'Close'); close.type = 'button';
    bar.append(status, copy, print, close);
    dlg.append(bar, render(m));
    document.body.append(dlg);
    copy.onclick = async () => {
      const text = toText(m);
      try { await navigator.clipboard.writeText(text); status.textContent = 'Copied.'; }
      catch (e) { status.textContent = "Couldn't copy here. Use Print / Save as PDF instead."; }
    };
    print.onclick = () => {
      document.body.classList.add('ps-printing');
      const done = () => { document.body.classList.remove('ps-printing'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
      setTimeout(done, 1000);
    };
    close.onclick = () => dlg.close();
    // Ctrl+P / the browser menu print the summary too while it is open
    const before = () => document.body.classList.add('ps-printing');
    const after = () => document.body.classList.remove('ps-printing');
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    dlg.addEventListener('close', () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
      after();
      dlg.remove();
    });
    dlg.showModal();
    close.focus();
    return dlg;
  }

  const api = { model, toText, render, open, itemsFromFields, itemsFromSheet, carItemsFromSheet, LINES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PreparerSummary = api;
})(typeof window !== 'undefined' ? window : globalThis);
