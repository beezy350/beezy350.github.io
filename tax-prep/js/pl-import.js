// ============================================
// P&L upload for the refund estimator. Reads CSV
// directly and .xlsx through the bundled
// read-excel-file library (loaded only when needed).
// Nothing is uploaded.
// ============================================
(function () {
  const PL = window.PL;
  const fileInput = document.getElementById('pl-file');
  if (!PL || !fileInput) return;

  const XLSX_READER = 'vendor/read-excel-file.min.js';
  const $ = (id) => document.getElementById(id);
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let current = null;
  let fileName = '';

  // Shared with interview.js for the results page
  window.falconPL = null;

  function status(msg, isError) {
    const el = $('pl-status');
    el.textContent = msg;
    el.classList.toggle('error', Boolean(isError));
  }

  function loadXlsxReader() {
    if (window.readXlsxFile) return Promise.resolve(window.readXlsxFile);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = XLSX_READER;
      s.onload = () => (window.readXlsxFile ? resolve(window.readXlsxFile) : reject(new Error('Excel reader did not load')));
      s.onerror = () => reject(new Error('Excel reader did not load'));
      document.head.append(s);
    });
  }

  async function readRows(file) {
    if (/\.csv$/i.test(file.name) || file.type === 'text/csv') return PL.parseCSV(await file.text());
    if (/\.xls$/i.test(file.name)) throw new Error('old-xls');
    const read = await loadXlsxReader();
    const result = await read(file);
    // v9 returns every sheet as { sheet, data }; older versions return rows
    const sheets = Array.isArray(result) && result.length && result[0] && Array.isArray(result[0].data)
      ? result.map((s) => s.data)
      : [result];
    // Use the first sheet that has numbers in it
    return sheets.find((rows) => rows.some((r) => r.some((c) => typeof c === 'number'))) || [];
  }

  function render() {
    const table = $('pl-table');
    table.innerHTML = '';
    const head = table.insertRow();
    head.className = 'head';
    for (const h of ['Line', 'Amount', 'Read as']) { const th = document.createElement('th'); th.textContent = h; head.append(th); }
    current.lines.forEach((line, i) => {
      const r = table.insertRow();
      if (line.kind === 'ignore') r.className = 'muted-row';
      const th = document.createElement('th'); th.textContent = line.label;
      r.append(th);
      r.insertCell().textContent = money(line.amount);
      const sel = document.createElement('select');
      sel.setAttribute('aria-label', `How to read ${line.label}`);
      for (const [v, t] of [['income', 'Income'], ['expense', 'Expense'], ['ignore', 'Skip']]) {
        const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o);
      }
      sel.value = line.kind;
      sel.addEventListener('change', () => {
        current.lines[i] = { ...line, kind: sel.value };
        current = PL.finish(current);
        render();
      });
      r.insertCell().append(sel);
    });

    const totals = $('pl-totals');
    totals.innerHTML = '';
    for (const [label, value] of [['Income', current.income], ['Expenses', current.expenses], ['Net profit', current.net]]) {
      const d = document.createElement('div');
      const l = document.createElement('span'); l.textContent = label;
      const v = document.createElement('strong'); v.textContent = money(value);
      d.append(l, v);
      totals.append(d);
    }
    const extra = [];
    if (current.withheld) extra.push(`Federal tax withheld found: ${money(current.withheld)}`);
    if (current.estimatedPayments) extra.push(`Estimated payments found: ${money(current.estimatedPayments)}`);

    const flags = $('pl-flags');
    flags.innerHTML = '';
    for (const f of [...extra.map((t) => ({ t, info: true })), ...current.flags.map((t) => ({ t }))]) {
      const li = document.createElement('li');
      li.textContent = f.t;
      if (f.info) li.className = 'info';
      flags.append(li);
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    fileName = file.name;
    status(`Reading ${file.name}…`);
    try {
      const rows = await readRows(file);
      const result = PL.analyze(rows);
      if (!result.lines.length) {
        status("Couldn't find income or expense lines in that file. Use a sheet with a label column and an amount column.", true);
        $('pl-review').hidden = true;
      } else {
        current = result;
        status(`Read ${result.lines.length} lines from ${file.name}.`);
        $('pl-review').hidden = false;
        render();
      }
    } catch (err) {
      status(err.message === 'old-xls'
        ? 'That is an older .xls file. Open it in Excel or Google Sheets and save it as .xlsx or CSV, then upload again.'
        : "Couldn't read that file. Save it as .xlsx or .csv and try again.", true);
    }
    fileInput.value = '';
  });

  $('pl-cancel').addEventListener('click', () => {
    current = null;
    $('pl-review').hidden = true;
    status('');
  });

  $('pl-apply').addEventListener('click', () => {
    if (!current) return;
    $('seIncome').value = Math.max(0, Math.round(current.income));
    $('seExpenses').value = Math.max(0, Math.round(current.expenses));
    const filled = ['business income and expenses'];
    const withheld = $('withheld');
    if (current.withheld && withheld && !Number(withheld.value)) { withheld.value = Math.round(current.withheld); filled.push('federal tax withheld (Jobs step)'); }
    const est = $('estimatedPayments');
    if (current.estimatedPayments && est && !Number(est.value)) { est.value = Math.round(current.estimatedPayments); filled.push('estimated payments'); }
    window.falconPL = { fileName, flags: current.flags.slice(), statedFederalTax: current.statedFederalTax };
    $('pl-review').hidden = true;
    status(`Filled in ${filled.join(', ')} from ${fileName}. You can still edit the numbers.`);
  });
})();
