// ============================================
// Refund estimator interview: steps, results,
// and document checklist. Runs entirely in the
// browser; nothing is sent anywhere.
// ============================================
(function () {
  const form = document.getElementById('est-form');
  if (!form || !window.Tax2026) return;

  const steps = Array.from(form.querySelectorAll('.est-step'));
  const bar = document.getElementById('est-bar');
  const label = document.getElementById('est-step-label');
  const backBtn = document.getElementById('est-back');
  const nextBtn = document.getElementById('est-next');
  const nav = document.getElementById('est-nav');
  const spouseRow = document.getElementById('spouse65-row');
  let current = 0;

  const STATUS_NAMES = { single: 'Single', mfj: 'Married filing jointly', hoh: 'Head of household', mfs: 'Married filing separately' };
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');

  function read() {
    const fd = new FormData(form);
    const data = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    }
    data.status = fd.get('status') || 'single';
    return data;
  }

  function show(i, initial) {
    current = i;
    steps.forEach((s, n) => { s.hidden = n !== i; });
    const last = steps.length - 1;
    bar.style.width = `${Math.round((i / last) * 100)}%`;
    label.textContent = i < last ? `Step ${i + 1} of ${last}: ${steps[i].dataset.title}` : 'Your estimate';
    nav.hidden = i === last;
    backBtn.style.visibility = i === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = i === last - 1 ? 'See my estimate' : 'Next';
    if (i === last) renderResults();
    if (initial) return;
    const h = steps[i].querySelector('h2, .result-amount');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    label.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validStep() {
    const bad = Array.from(steps[current].querySelectorAll('input[type=number]')).find((el) => !el.checkValidity());
    if (bad) { bad.reportValidity(); return false; }
    return true;
  }

  function documents(d) {
    const docs = ['Photo ID for you (and your spouse)', 'Social Security cards or ITIN letters for everyone on the return', "Last year's tax return", 'Bank routing and account number for direct deposit'];
    const n = (v) => Number(v) > 0;
    if (n(d.wages)) docs.push('W-2 from every job');
    if (n(d.tips)) docs.push('Tip records (pay stubs or tip log)');
    if (n(d.overtimePremium)) docs.push('Final pay stub showing overtime hours');
    if (n(d.seIncome)) docs.push('1099-NEC / 1099-K forms and your business income records', 'Receipts or a list of business expenses', 'Mileage log for business driving');
    if (n(d.estimatedPayments)) docs.push('Dates and amounts of estimated tax payments');
    if (n(d.interest)) docs.push('1099-INT from your bank');
    if (n(d.unemployment)) docs.push('1099-G for unemployment');
    if (n(d.childrenUnder17) || n(d.otherDependents)) docs.push("Dependents' birth dates and Social Security numbers");
    if (d.childcare) docs.push("Childcare provider's name, address, tax ID, and amount paid");
    if (d.hasInvestments) docs.push('1099-B, 1099-DIV, or crypto exchange tax reports');
    if (d.mortgage) docs.push('1098 mortgage interest statement and property tax bill');
    if (d.studentLoan) docs.push('1098-E student loan interest statement');
    if (d.college) docs.push('1098-T tuition statement');
    if (d.marketplace) docs.push('1095-A Marketplace health insurance statement');
    if (d.retirement || n(d.otherIncome)) docs.push('1099-R for retirement withdrawals, plus records for any other income');
    if (d.noSsn) docs.push('Passport or other identity documents for an ITIN application (Form W-7)');
    if (d.irsLetter) docs.push('Any letters you received from the IRS');
    return docs;
  }

  function renderResults() {
    const d = read();
    const r = window.Tax2026.estimate(d);

    const refund = r.result >= 0;
    document.getElementById('res-label').textContent = refund ? 'Estimated federal refund' : 'Estimated amount you would owe';
    const amountEl = document.getElementById('res-amount');
    amountEl.textContent = money(Math.abs(r.result));
    amountEl.classList.toggle('owe', !refund);
    document.getElementById('res-sub').textContent =
      `${STATUS_NAMES[r.status]} · ${r.taxYear} tax year · ${Math.round(r.marginalRate * 100)}% top bracket`;

    const rows = [
      ['Total income', r.totalIncome],
      ['Adjusted gross income', r.agi],
      ['Standard deduction', -r.standardDeduction],
      r.tipsDeduction && ['Tips deduction', -r.tipsDeduction],
      r.overtimeDeduction && ['Overtime deduction', -r.overtimeDeduction],
      r.seniorDeduction && ['Senior deduction', -r.seniorDeduction],
      r.qbiDeduction && ['Business income deduction', -r.qbiDeduction],
      ['Taxable income', r.taxableIncome, 'sum'],
      ['Income tax', r.incomeTax],
      r.childCredits && ['Child and dependent credits', -r.childCredits],
      r.seTax && ['Self-employment tax', r.seTax],
      ['Total tax', r.totalTax, 'sum'],
      ['Tax withheld', r.withheld],
      r.estimatedPayments && ['Estimated payments', r.estimatedPayments],
      r.refundableChildCredit && ['Refundable child credit', r.refundableChildCredit],
    ].filter(Boolean);

    const table = document.getElementById('res-table');
    table.innerHTML = '';
    for (const [name, value, cls] of rows) {
      const tr = document.createElement('tr');
      if (cls) tr.className = cls;
      const th = document.createElement('th'); th.textContent = name;
      const td = document.createElement('td'); td.textContent = money(value);
      tr.append(th, td);
      table.append(tr);
    }

    const docList = document.getElementById('res-docs');
    docList.innerHTML = '';
    for (const doc of documents(d)) {
      const li = document.createElement('li');
      li.textContent = doc;
      docList.append(li);
    }

    const notesBox = document.getElementById('res-notes');
    const notesList = document.getElementById('res-notes-list');
    notesList.innerHTML = '';
    const notes = [...r.notes];
    if (d.noSsn) notes.push('Anyone without an SSN may need an ITIN, and some credits require an SSN.');
    if (d.childcare) notes.push('Childcare costs may qualify for the Child and Dependent Care Credit, not included here.');
    if (d.college) notes.push('Tuition may qualify for an education credit, not included here.');
    if (d.marketplace) notes.push('Marketplace insurance must be reconciled on Form 8962 and can change your refund.');
    // Review flags from an uploaded profit & loss file
    const pl = window.falconPL;
    if (pl && window.PL) {
      const check = window.PL.federalCheck(pl.statedFederalTax, r);
      if (check) notes.unshift(check);
      for (const f of pl.flags) notes.push(`From ${pl.fileName}: ${f}`);
    }
    for (const note of notes) {
      const li = document.createElement('li');
      li.textContent = note;
      notesList.append(li);
    }
    notesBox.hidden = notes.length === 0;

    // Hand a short summary to the consultation form (same tab only)
    const filingType = Number(d.seIncome) > 0 ? 'Self-employed / 1099' : d.noSsn ? 'ITIN application' : 'Individual (W-2)';
    const summary = `From the refund estimator: ${STATUS_NAMES[r.status]}, ` +
      `${Number(d.childrenUnder17) || 0} child(ren) under 17. ` +
      `Estimated ${refund ? 'refund' : 'amount owed'}: ${money(Math.abs(r.result))}.`;
    try { sessionStorage.setItem('falconIntake', JSON.stringify({ summary, filingType, status: STATUS_NAMES[r.status] })); } catch (e) { /* storage blocked */ }
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'status') {
      spouseRow.hidden = e.target.value !== 'mfj';
      if (spouseRow.hidden) document.getElementById('spouse65').checked = false;
    }
  });

  nextBtn.addEventListener('click', () => { if (validStep()) show(current + 1); });
  backBtn.addEventListener('click', () => show(Math.max(0, current - 1)));
  document.getElementById('res-restart').addEventListener('click', () => {
    form.reset();
    spouseRow.hidden = true;
    try { sessionStorage.removeItem('falconIntake'); } catch (e) { /* ignore */ }
    window.falconPL = null;
    show(0);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  show(0, true);
})();
