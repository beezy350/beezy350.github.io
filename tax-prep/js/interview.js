// ============================================
// Refund estimator interview: steps, results,
// and document checklist. Runs entirely in the
// browser; nothing is sent anywhere.
// ============================================
(function () {
  const form = document.getElementById('est-form');
  if (!form || !window.Tax2026) return;

  const $ = (id) => document.getElementById(id);
  const steps = Array.from(form.querySelectorAll('.est-step'));
  const resultsStep = steps.length - 1;
  const bar = $('est-bar');
  const label = $('est-step-label');
  const backBtn = $('est-back');
  const nextBtn = $('est-next');
  const nav = $('est-nav');
  const spouseRow = $('spouse65-row');
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
    // Answers on skipped steps never count
    if (data.hasDeps !== 'yes') { data.childrenUnder17 = 0; data.otherDependents = 0; data.childcare = false; }
    if (data.status !== 'mfj') data.spouse65 = false;
    if (!data.isTrucker) { data.perDiemFull = 0; data.perDiemCanada = 0; data.perDiemPartial = 0; }
    return data;
  }

  // ---------- which steps apply ----------
  function applies(i) {
    const when = steps[i].dataset.when;
    if (when === 'deps') return read().hasDeps === 'yes';
    return true;
  }
  const order = () => steps.map((_, i) => i).filter((i) => i !== resultsStep && applies(i));

  function show(i, initial) {
    current = i;
    steps.forEach((s, n) => { s.hidden = n !== i; });
    const seq = order();
    const pos = seq.indexOf(i);
    bar.style.width = i === resultsStep ? '100%' : `${Math.round((pos / seq.length) * 100)}%`;
    label.textContent = i === resultsStep ? 'Your estimate' : `Step ${pos + 1}: ${steps[i].dataset.title}`;
    nav.hidden = i === resultsStep;
    backBtn.style.visibility = pos <= 0 && i !== resultsStep ? 'hidden' : 'visible';
    nextBtn.textContent = pos === seq.length - 1 ? 'See my estimate' : 'Next';
    if (i === resultsStep) renderResults();
    if (initial) return;
    const h = steps[i].querySelector('h2, .result-amount');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    label.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function next() {
    const seq = order();
    const pos = seq.indexOf(current);
    show(pos === seq.length - 1 ? resultsStep : seq[pos + 1]);
  }
  function back() {
    const seq = order();
    if (current === resultsStep) { show(seq[seq.length - 1]); return; }
    const pos = seq.indexOf(current);
    show(seq[Math.max(0, pos - 1)]);
  }

  function validStep() {
    const bad = Array.from(steps[current].querySelectorAll('input[type=number]')).find((el) => !el.closest('[hidden]') && !el.checkValidity());
    if (bad) { bad.reportValidity(); return false; }
    return true;
  }

  // ---------- answers that change the questions ----------
  function syncQuestions() {
    const d = read();
    const s = d.status;
    spouseRow.hidden = s !== 'mfj';
    if (spouseRow.hidden) $('spouse65').checked = false;
    $('note-mfj').hidden = s !== 'mfj';
    $('note-mfs').hidden = s !== 'mfs';
    $('note-hoh').hidden = !(s === 'hoh' && d.hasDeps !== 'yes');
    $('note-single-deps').hidden = !(s === 'single' && d.hasDeps === 'yes');
    $('jobs-scope').textContent = s === 'mfj'
      ? "Add up all jobs for both you and your spouse."
      : s === 'mfs' ? 'Enter only your own jobs, not your spouse’s.' : 'Add up all your jobs.';

    const St = window.States;
    const kind = St ? St.status(d.state) : 'none';
    const taxed = kind === 'supported' || kind === 'coming-soon';
    form.querySelectorAll('.state-tax-only').forEach((el) => { el.hidden = !taxed; });
    form.querySelectorAll('.state-name').forEach((el) => { el.textContent = St && d.state ? St.NAMES[d.state] : 'State'; });

    $('perdiem-box').hidden = !$('isTrucker').checked;
    const full = Math.max(0, Math.floor(Number($('perDiemFull').value) || 0));
    const canada = Math.min(full, Math.max(0, Math.floor(Number($('perDiemCanada').value) || 0)));
    const part = Math.max(0, Math.floor(Number($('perDiemPartial').value) || 0));
    const total = (full - canada) * 80 + canada * 86 + part * 60;
    $('perdiem-preview').textContent = total
      ? `Per diem ${money(total)}; deductible ${money(total * 0.8)}.${Number($('seIncome').value) > 0 ? '' : ' Enter your business income above for it to count.'}`
      : '';
  }

  function documents(d) {
    const docs = ['Photo ID for you' + (d.status === 'mfj' ? ' and your spouse' : ''), 'Social Security cards or ITIN letters for everyone on the return', "Last year's tax return", 'Bank routing and account number for direct deposit'];
    const n = (v) => Number(v) > 0;
    if (n(d.wages)) docs.push('W-2 from every job' + (d.status === 'mfj' ? ' (both spouses)' : ''));
    if (n(d.tips)) docs.push('Tip records (pay stubs or tip log)');
    if (n(d.overtimePremium)) docs.push('Final pay stub showing overtime hours');
    if (n(d.seIncome)) docs.push('1099-NEC / 1099-K forms and your business income records', 'Receipts or a list of business expenses', 'Mileage log for business driving');
    if (d.isTrucker) docs.push('Logbook or ELD records showing days away from home');
    if (n(d.estimatedPayments)) docs.push('Dates and amounts of estimated tax payments');
    if (n(d.interest)) docs.push('1099-INT from your bank');
    if (n(d.unemployment)) docs.push('1099-G for unemployment');
    if (n(d.childrenUnder17) || n(d.otherDependents)) docs.push("Dependents' birth dates and Social Security numbers");
    if (d.childcare) docs.push("Childcare provider's name, address, tax ID, and amount paid");
    if (d.status === 'mfs') docs.push("Your spouse's name and Social Security number");
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

  function renderState(d, r) {
    const box = $('state-result');
    box.innerHTML = '';
    const St = window.States;
    const st = St ? St.estimateState(d.state, d, r) : { kind: 'none' };
    box.hidden = false;
    const add = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = text; box.append(e); return e; };

    if (st.kind === 'none') {
      add('p', 'state-msg', 'Choose your state in step 1 to add a state estimate.');
      return null;
    }
    if (st.kind === 'coming-soon') {
      add('p', 'state-msg', `${st.name} estimates are coming soon. This estimate covers federal tax only; we'll prepare your ${st.name} return with it.`);
      return null;
    }
    const refund = st.result >= 0;
    const head = document.createElement('div');
    head.className = 'state-head';
    const t = document.createElement('p'); t.className = 'eyebrow'; t.textContent = st.kind === 'no-tax' ? `${st.name}` : `${st.name} ${refund ? 'refund' : 'amount owed'}`;
    const v = document.createElement('p'); v.className = 'state-amount' + (refund ? '' : ' owe'); v.textContent = money(Math.abs(st.result));
    head.append(t, v);
    box.append(head);
    if (st.kind === 'no-tax') {
      add('p', 'state-msg', `${st.name} has no state income tax on wages or business income.${st.paid ? ' Any state tax withheld should come back to you.' : ''}`);
    } else {
      const tbl = document.createElement('table');
      tbl.className = 'breakdown';
      for (const [name, value, cls] of [
        ['Illinois base income (federal AGI)', st.base],
        [`Exemptions (${st.exemptionCount} × $2,850${st.exemptions > st.exemptionCount * 2850 ? ' + age 65' : ''})`, -st.exemptions],
        ['Taxable income', st.taxable, 'sum'],
        [`Illinois tax (${st.rateLabel})`, st.tax],
        ['Illinois tax paid', st.paid],
      ]) {
        const tr = tbl.insertRow(); if (cls) tr.className = cls;
        const th = document.createElement('th'); th.textContent = name; tr.append(th);
        tr.insertCell().textContent = money(value);
      }
      box.append(tbl);
    }
    const combined = r.result + st.result;
    const c = add('p', 'combined', '');
    c.textContent = `Federal and ${st.name} together: ${combined >= 0 ? 'refund' : 'owe'} ${money(Math.abs(combined))}`;
    return st;
  }

  function renderResults() {
    const d = read();
    const r = window.Tax2026.estimate(d);

    const refund = r.result >= 0;
    $('res-label').textContent = refund ? 'Estimated federal refund' : 'Estimated federal amount you would owe';
    const amountEl = $('res-amount');
    amountEl.textContent = money(Math.abs(r.result));
    amountEl.classList.toggle('owe', !refund);
    $('res-sub').textContent = `${STATUS_NAMES[r.status]} · ${r.taxYear} tax year · ${Math.round(r.marginalRate * 100)}% top bracket`;

    const rows = [
      r.perDiemDeduction && ['Truck per diem (80%), already taken out of business income', r.perDiemDeduction, 'info'],
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
      [refund ? 'Estimated refund' : 'Estimated amount you owe', Math.abs(r.result), 'sum'],
    ].filter(Boolean);

    const table = $('res-table');
    table.innerHTML = '';
    for (const [name, value, cls] of rows) {
      const tr = document.createElement('tr');
      if (cls) tr.className = cls;
      const th = document.createElement('th'); th.textContent = name;
      const td = document.createElement('td'); td.textContent = money(value);
      tr.append(th, td);
      table.append(tr);
    }

    const st = renderState(d, r);

    const docList = $('res-docs');
    docList.innerHTML = '';
    for (const doc of documents(d)) {
      const li = document.createElement('li');
      li.textContent = doc;
      docList.append(li);
    }

    const notesBox = $('res-notes');
    const notesList = $('res-notes-list');
    notesList.innerHTML = '';
    const notes = [...r.notes];
    if (d.status === 'single' && d.hasDeps === 'yes') notes.unshift('You have dependents but chose Single. Head of household usually lowers your tax if you paid most of the cost of your home.');
    if (d.status === 'mfs') notes.push('Married filing separately usually costs more than filing jointly. A preparer can compare both.');
    if (d.noSsn) notes.push('Anyone without an SSN may need an ITIN, and some credits require an SSN.');
    if (d.childcare) notes.push('Childcare costs may qualify for the Child and Dependent Care Credit, not included here.');
    if (d.college) notes.push('Tuition may qualify for an education credit, not included here.');
    if (d.marketplace) notes.push('Marketplace insurance must be reconciled on Form 8962 and can change your refund.');
    if (st && st.notes) notes.push(...st.notes);
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
    const filingType = d.isTrucker && Number(d.seIncome) > 0 ? 'Trucking bookkeeping / IFTA'
      : Number(d.seIncome) > 0 ? 'Self-employed / 1099' : d.noSsn ? 'ITIN application' : 'Individual (W-2)';
    const kids = Number(d.childrenUnder17) || 0;
    const summary = `From the refund estimator: ${STATUS_NAMES[r.status]}${kids ? `, ${kids} child(ren) under 17` : ''}` +
      `${d.state && window.States ? `, ${window.States.NAMES[d.state]}` : ''}. ` +
      `Estimated federal ${refund ? 'refund' : 'amount owed'}: ${money(Math.abs(r.result))}` +
      `${st && st.kind === 'supported' ? `; ${st.name} ${st.result >= 0 ? 'refund' : 'owed'}: ${money(Math.abs(st.result))}` : ''}.`;
    try { sessionStorage.setItem('falconIntake', JSON.stringify({ summary, filingType, status: STATUS_NAMES[r.status] })); } catch (e) { /* storage blocked */ }
  }

  form.addEventListener('change', (e) => {
    syncQuestions();
    // Step count changes when the dependents answer changes
    if (e.target.name === 'hasDeps' && current !== resultsStep) show(current, true);
  });
  form.addEventListener('input', (e) => { if (/perDiem|seIncome/.test(e.target.id)) syncQuestions(); });
  nextBtn.addEventListener('click', () => { if (validStep()) next(); });
  backBtn.addEventListener('click', back);
  $('res-edit').addEventListener('click', back);
  $('res-restart').addEventListener('click', () => {
    form.reset();
    try { sessionStorage.removeItem('falconIntake'); } catch (e) { /* ignore */ }
    window.falconPL = null;
    syncQuestions();
    show(0);
  });
  form.addEventListener('submit', (e) => e.preventDefault());

  // Fill every answer at once (used by the Tax Organizer upload), then show results
  window.FalconEstimator = {
    load(values) {
      form.reset();
      for (const [name, raw] of Object.entries(values)) {
        const field = form.elements[name];
        if (!field) continue;
        if (field instanceof RadioNodeList) {
          for (const r of field) r.checked = r.value === String(raw);
        } else if (field.type === 'checkbox') {
          field.checked = raw === true || raw === 1 || raw === '1' || /^(true|yes)$/i.test(String(raw));
        } else if (field.tagName === 'SELECT') {
          field.value = String(raw || '');
        } else {
          const n = Number(raw);
          field.value = Number.isFinite(n) && n !== 0 ? String(Math.round(n * 100) / 100) : '';
        }
      }
      syncQuestions();
      show(resultsStep);
    },
  };

  syncQuestions();
  show(0, true);
})();
