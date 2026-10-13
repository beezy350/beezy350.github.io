// ============================================
// S-corp savings calculator: the same business profit taxed as a
// sole proprietor / single-member LLC (Schedule C) versus an S-corp
// that pays the owner a salary. Uses the 2026 federal engine
// (js/tax2026.js) and state estimates (js/states.js) for both.
// compare() has no DOM and runs in Node tests.
// ============================================
(function (root) {
  const T = root.Tax2026 || (typeof require !== 'undefined' ? require('./tax2026.js') : null);
  const St = root.States || (typeof require !== 'undefined' ? require('./states.js') : null);

  const SS_WAGE_BASE = 184500; // 2026
  const FUTA = { rate: 0.006, base: 7000 }; // after the standard state credit
  const IL_REPLACEMENT_TAX = 0.015; // Illinois personal property replacement tax on S-corp income

  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.min(1e9, n)) : 0; };

  function compare(input) {
    const profit = num(input.profit);
    const salary = Math.min(num(input.salary), profit);
    const costs = num(input.costs);
    const household = {
      status: input.status || 'single', state: input.state || '',
      childrenUnder17: num(input.kids), wages: num(input.otherWages),
    };
    const owed = (r) => -r.result; // no withholding entered, so -result is the tax for the year
    const stateOwed = (st) => (st && st.kind === 'supported' ? -st.result : 0);

    // Sole proprietor / single-member LLC
    const sp = T.estimate({ ...household, seIncome: profit });
    const spState = St ? St.estimateState(household.state, household, sp) : null;
    const sole = {
      federalIncomeTax: owed(sp) - sp.seTax,
      seTax: sp.seTax,
      stateTax: stateOwed(spState),
    };
    sole.total = sole.federalIncomeTax + sole.seTax + sole.stateTax;

    // S-corp: salary through payroll, the rest passes through on a K-1
    const employerFica = Math.min(salary, SS_WAGE_BASE) * 0.062 + salary * 0.0145;
    const employeeFica = employerFica; // same rates on the owner's side
    const futa = salary > 0 ? Math.min(salary, FUTA.base) * FUTA.rate : 0;
    const k1 = profit - salary - employerFica - futa - costs;
    const sc = T.estimate({ ...household, wages: household.wages + salary, k1SCorp: k1 });
    const scState = St ? St.estimateState(household.state, { ...household, wages: household.wages + salary }, sc) : null;
    const replacement = household.state === 'IL' ? Math.max(0, k1) * IL_REPLACEMENT_TAX : 0;
    const scorp = {
      federalIncomeTax: owed(sc),
      payrollTax: employeeFica + employerFica + futa,
      stateTax: stateOwed(scState) + replacement,
      replacementTax: replacement,
      costs,
      k1,
    };
    scorp.total = scorp.federalIncomeTax + scorp.payrollTax + scorp.stateTax + scorp.costs;

    const notes = [];
    if (profit && salary < profit * 0.3) notes.push('This salary is low for the profit. The IRS requires a reasonable salary for the work you do; a salary that is too low is a common audit issue.');
    if (k1 < 0) notes.push('Salary and costs are more than the profit, so the S-corp shows a loss.');
    if (sp.qbiDeduction > sc.qbiDeduction + 1) notes.push('The S-corp lowers the 20% business income deduction because salary does not count as business income. This is included above.');
    if ((sp.eitc || 0) !== (sc.eitc || 0) || (sp.refundableChildCredit || 0) !== (sc.refundableChildCredit || 0)) {
      notes.push('Family credits (earned income credit, child credit) change between the two set-ups. This is included above.');
    }
    if (household.state === 'IL') notes.push('Illinois S-corps also pay a 1.5% replacement tax on their income. This is included above.');
    if (household.state && St && St.status(household.state) === 'coming-soon') notes.push('State income tax is not included for this state.');

    return {
      profit, salary, sole, scorp,
      savings: sole.total - scorp.total,
      qbi: { sole: sp.qbiDeduction, scorp: sc.qbiDeduction },
      notes,
    };
  }

  // Savings across a range of salaries, for the "what salary?" table
  function salaryTable(input, shares) {
    return (shares || [0.3, 0.4, 0.5, 0.6, 0.7]).map((share) => {
      const salary = Math.round((num(input.profit) * share) / 1000) * 1000;
      return { share, salary, savings: compare({ ...input, salary }).savings };
    });
  }

  // ---------- page ----------
  function initPage() {
    const $ = (id) => document.getElementById(id);
    const form = $('sc-form');
    if (!form) return;
    const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
    const stateSel = $('sc-state');
    if (St && stateSel.options.length <= 1) {
      Object.entries(St.NAMES).sort((a, b) => a[1].localeCompare(b[1])).forEach(([code, name]) => {
        const o = document.createElement('option'); o.value = code; o.textContent = name; stateSel.append(o);
      });
      stateSel.value = 'IL';
    }
    let salaryTouched = false;
    const read = () => ({
      status: form.elements.status.value, state: stateSel.value, kids: $('sc-kids').value,
      profit: $('sc-profit').value, otherWages: $('sc-wages').value, salary: $('sc-salary').value, costs: $('sc-costs').value,
    });

    function render() {
      const v = read();
      if (!salaryTouched) $('sc-salary').value = String(Math.round((num(v.profit) * 0.5) / 1000) * 1000);
      const c = compare(read());
      const box = $('sc-result');
      box.hidden = !num(v.profit);
      if (box.hidden) return;
      const save = c.savings;
      $('sc-headline').textContent = save > 0
        ? `An S-corp could save about ${money(save)} a year`
        : `An S-corp would likely cost about ${money(-save)} more a year`;
      $('sc-headline').className = 'sc-headline ' + (save > 0 ? 'good' : 'bad');
      $('sc-sub').textContent = `${money(c.profit)} profit · ${money(c.salary)} salary · ${money(num(v.costs))} extra yearly costs`;
      const rows = [
        ['Federal income tax', c.sole.federalIncomeTax, c.scorp.federalIncomeTax],
        ['Self-employment tax', c.sole.seTax, null],
        ['Payroll taxes', null, c.scorp.payrollTax],
        ['State tax', c.sole.stateTax, c.scorp.stateTax],
        ['Extra S-corp costs', null, c.scorp.costs],
        ['Total', c.sole.total, c.scorp.total, 'sum'],
      ];
      const t = $('sc-table');
      t.innerHTML = '';
      const head = t.createTHead().insertRow();
      ['', 'Sole prop / LLC', 'S-corp'].forEach((h) => { const th = document.createElement('th'); th.textContent = h; head.append(th); });
      const body = t.createTBody();
      for (const [label, a, b, cls] of rows) {
        const tr = body.insertRow(); if (cls) tr.className = cls;
        const th = document.createElement('th'); th.scope = 'row'; th.textContent = label; tr.append(th);
        tr.insertCell().textContent = a == null ? '—' : money(a);
        tr.insertCell().textContent = b == null ? '—' : money(b);
      }
      const st = $('sc-salaries');
      st.innerHTML = '';
      const sh = st.createTHead().insertRow();
      ['Salary', 'Share of profit', 'Yearly savings'].forEach((h) => { const th = document.createElement('th'); th.textContent = h; sh.append(th); });
      const sb = st.createTBody();
      for (const r of salaryTable(read())) {
        const tr = sb.insertRow();
        tr.insertCell().textContent = money(r.salary);
        tr.insertCell().textContent = `${Math.round(r.share * 100)}%`;
        const td = tr.insertCell(); td.textContent = money(r.savings); td.className = r.savings > 0 ? 'good' : 'bad';
      }
      const ul = $('sc-notes');
      ul.innerHTML = '';
      c.notes.forEach((n) => { const li = document.createElement('li'); li.textContent = n; ul.append(li); });
      try {
        sessionStorage.setItem('falconIntake', JSON.stringify({
          summary: `From the S-corp calculator: ${money(c.profit)} business profit, ${money(c.salary)} salary. Estimated ${save > 0 ? 'savings' : 'extra cost'} as an S-corp: ${money(Math.abs(save))} a year.`,
          filingType: 'Self-employed / 1099',
        }));
      } catch (e) { /* storage blocked */ }
    }
    form.addEventListener('input', (e) => { if (e.target.id === 'sc-salary') salaryTouched = true; render(); });
    form.addEventListener('change', render);
    form.addEventListener('submit', (e) => e.preventDefault());
    $('sc-reset-salary').addEventListener('click', () => { salaryTouched = false; render(); });
    render();
  }

  const api = { compare, salaryTable };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    root.SCorp = api;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPage); else initPage();
  }
})(typeof window !== 'undefined' ? window : globalThis);
