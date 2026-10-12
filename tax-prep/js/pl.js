// ============================================
// Profit & loss reader for the refund estimator.
// Turns spreadsheet rows (from CSV or Excel) into
// business income, expenses and review flags.
// No DOM; runs in the browser or in Node tests.
// ============================================
(function (root) {
  const round2 = (n) => Math.round(n * 100) / 100;

  function toNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
    if (value == null) return NaN;
    let v = String(value).trim();
    if (!v || !/\d/.test(v)) return NaN;
    const negative = /^\(.*\)$/.test(v) || /^-/.test(v) || /^\$\s*-/.test(v);
    v = v.replace(/[()$,\s-]/g, '');
    if (!/^\d*\.?\d+$/.test(v)) return NaN;
    const n = Number(v);
    return negative ? -n : n;
  }

  function parseCSV(text) {
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
        rows.push(row); row = [];
      } else field += ch;
    }
    row.push(field);
    rows.push(row);
    return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
  }

  // Label = first cell with letters; amount = last numeric cell (the total column)
  function splitRow(cells) {
    let label = '', amount = NaN;
    for (const c of cells) {
      const s = String(c ?? '').trim();
      if (!label && /[a-z]/i.test(s) && Number.isNaN(toNumber(s))) label = s;
    }
    for (let i = cells.length - 1; i >= 0; i--) {
      const n = toNumber(cells[i]);
      if (!Number.isNaN(n)) { amount = n; break; }
    }
    return { label, amount };
  }

  const RE = {
    incomeHeader: /^(income|revenue|revenues|ordinary income|sales|other income)$/i,
    expenseHeader: /^(expenses?|operating expenses|cost of goods sold|cogs|other expenses?)$/i,
    summary: /^(total\b|net\b|gross profit|grand total)/i,
    statedNet: /^net\s*(business|operating)?\s*(income|profit)/i,
    fedWithheld: /federal.*withh?eld|withh?eld.*federal/i,
    estPayments: /estimated\s*(tax\s*)?payments?/i,
    statedFedTax: /^federal\s*(income\s*)?tax(\s*owed|\s*due|\s*liability)?$/i,
    taxSummary: /withh?eld|refund|tax\s*owed|tax\s*due|state\s*tax|balance\s*due|amount\s*owed/i,
    incomeWord: /gross|revenue|sales|receipts|fares|earnings|income|1099|tips|commissions?\s*(received|earned)?$/i,
    meals: /meal|food|restaurant|lunch|dinner|per\s*diem/i,
    vehicle: /\bgas\b|fuel|vehicle|\bcar\b|auto|truck|mileage|lease|rental|insurance.*(car|auto|vehicle)/i,
    phone: /phone|cell|mobile|internet|data plan|\bdata\b/i,
    home: /home office|rent.*home|utilities/i,
  };

  function analyze(rows) {
    let section = null;
    let sawSections = false;
    const lines = [];
    let withheld = 0, estimatedPayments = 0, statedFederalTax = null, statedNet = null;

    for (const cells of rows) {
      const { label, amount } = splitRow(cells);
      if (!label) continue;
      const clean = label.replace(/\s+/g, ' ').trim();

      if (Number.isNaN(amount)) {
        if (RE.incomeHeader.test(clean)) { section = 'income'; sawSections = true; }
        else if (RE.expenseHeader.test(clean)) { section = 'expense'; sawSections = true; }
        continue;
      }
      if (/^(item|description|account|category)$/i.test(clean)) continue;

      // Tax summary rows are captured, never counted as business lines
      if (RE.fedWithheld.test(clean)) { withheld += Math.abs(amount); continue; }
      if (RE.estPayments.test(clean) && !/state|illinois|california|new york/i.test(clean)) { estimatedPayments += Math.abs(amount); continue; }
      if (RE.statedFedTax.test(clean)) { statedFederalTax = Math.abs(amount); continue; }
      if (RE.taxSummary.test(clean)) continue;

      if (RE.summary.test(clean)) {
        if (RE.statedNet.test(clean) && statedNet === null) statedNet = amount;
        continue;
      }

      let kind;
      if (sawSections && section) kind = section;
      else kind = RE.incomeWord.test(clean) ? 'income' : 'expense';
      lines.push({ label: clean, amount: round2(amount), kind });
    }
    return finish({ lines, withheld: round2(withheld), estimatedPayments: round2(estimatedPayments), statedFederalTax, statedNet });
  }

  // Totals and review flags; called again after the user re-labels a line
  function finish(result) {
    let income = 0, expenses = 0;
    for (const l of result.lines) {
      if (l.kind === 'income') income += l.amount;
      else if (l.kind === 'expense') expenses += Math.abs(l.amount);
    }
    const net = income - expenses;
    const flags = [];
    const exp = result.lines.filter((l) => l.kind === 'expense');
    const meal = exp.find((l) => RE.meals.test(l.label));
    if (meal) flags.push(`"${meal.label}": everyday meals while working locally are generally not deductible. Meals are only deductible when traveling overnight away from home (50%, or 80% for drivers under DOT hours rules).`);
    const veh = exp.filter((l) => RE.vehicle.test(l.label));
    if (veh.length) flags.push(`Vehicle costs (${veh.map((l) => l.label).join(', ')}): only the business-use share is deductible, backed by a mileage log. Gas can't be combined with the standard mileage rate.`);
    const ph = exp.find((l) => RE.phone.test(l.label));
    if (ph) flags.push(`"${ph.label}": deduct only the business-use percentage if the phone or plan is also personal.`);
    const home = exp.find((l) => RE.home.test(l.label));
    if (home) flags.push(`"${home.label}": home costs need the home office rules (Form 8829 or the simplified method).`);
    if (result.statedNet !== null && Math.abs(result.statedNet - net) > 1) {
      flags.push(`The file's net income ($${result.statedNet.toLocaleString('en-US')}) doesn't match income minus expenses ($${round2(net).toLocaleString('en-US')}). Check for a missing or double-counted line.`);
    }
    if (!result.lines.some((l) => l.kind === 'income')) flags.push('No income lines were found. Mark the income rows below as "Income".');
    return { ...result, income: round2(income), expenses: round2(expenses), net: round2(net), flags };
  }

  // Compare the file's own federal tax figure with the estimator's total
  function federalCheck(statedFederalTax, estimate) {
    if (!(statedFederalTax > 0) || !estimate) return null;
    const gap = estimate.totalTax - statedFederalTax;
    if (gap <= Math.max(500, estimate.totalTax * 0.15)) return null;
    const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
    if (estimate.seTax > 0 && Math.abs(gap - estimate.seTax) <= estimate.seTax * 0.35) {
      return `Your file shows federal tax of ${money(statedFederalTax)}, but this estimate is ${money(estimate.totalTax)}. The gap is close to the self-employment tax (${money(estimate.seTax)}), which the file appears to leave out.`;
    }
    return `Your file shows federal tax of ${money(statedFederalTax)}, well below this estimate of ${money(estimate.totalTax)}. Have a preparer check how it was figured.`;
  }

  const api = { analyze, finish, federalCheck, parseCSV, toNumber, splitRow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PL = api;
})(typeof window !== 'undefined' ? window : globalThis);
