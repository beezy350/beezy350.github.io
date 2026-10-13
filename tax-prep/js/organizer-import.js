// ============================================
// Falcon Tax Organizer upload. Reads a filled-in organizer
// on this device, either the Excel file (its "Data" tab) or
// the fillable PDF (its typed form fields), and sends every
// answer to the estimator. Nothing is uploaded.
// ============================================
(function () {
  const input = document.getElementById('org-file');
  if (!input) return;

  const XLSX_READER = 'vendor/read-excel-file.min.js';
  const PDF_READER = 'vendor/pdf-lib.min.js';
  const status = document.getElementById('org-status');
  const KEYS = ['status', 'state', 'you65', 'spouse65', 'hasDeps', 'childrenUnder17', 'otherDependents', 'childcare',
    'wages', 'withheld', 'stateWithheld', 'tips', 'overtimePremium', 'seIncome', 'seExpenses', 'estimatedPayments',
    'stateEstimated', 'isTrucker', 'perDiemFull', 'perDiemCanada', 'perDiemPartial',
    'usesCar', 'carMilesH1', 'carMilesH2', 'carMilesTotal', 'carCosts', 'interest', 'unemployment', 'otherIncome',
    'retirement', 'retirementIncome', 'socialSecurity', 'iraYou', 'iraSpouse', 'iraCoveredYou', 'iraCoveredSpouse',
    'hsaContribution', 'hsaFamily', 'sepContribution', 'you50', 'spouse50', 'you55', 'hasInvestments', 'mortgage', 'studentLoan', 'college', 'marketplace', 'noSsn', 'irsLetter'];

  function say(msg, isError) {
    status.textContent = msg;
    status.classList.toggle('error', Boolean(isError));
  }

  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => (window[globalName] ? resolve(window[globalName]) : reject(new Error('reader')));
      s.onerror = () => reject(new Error('reader'));
      document.head.append(s);
    });
  }
  const loadReader = () => loadScript(XLSX_READER, 'readXlsxFile');

  // items: itemized expense lines kept for the Preparer summary (only when the upload is used)
  function finish(values, fileName, items) {
    const income = ['wages', 'seIncome', 'interest', 'unemployment', 'otherIncome'].reduce((a, k) => a + (Number(values[k]) || 0), 0);
    if (!income) {
      say('No income was entered in the organizer yet. Fill in the jobs or income section, save, and upload it again.', true);
      return;
    }
    if (window.FalconEstimator) window.FalconEstimator.load(values);
    window.falconOrganizer = { fileName, items: items || [] };
    say(`Loaded your answers from ${fileName}. Your estimate is below; you can go back to any step to change an answer.`);
  }

  // Fillable PDF: read the typed form fields
  async function readPdf(file) {
    const PDFLib = await loadScript(PDF_READER, 'PDFLib');
    let doc;
    try {
      doc = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    } catch (e) {
      say("Couldn't open that PDF. Save it again from your PDF app and upload it.", true);
      return;
    }
    let fields = [];
    try { fields = doc.getForm().getFields(); } catch (e) { fields = []; }
    const map = {};
    for (const f of fields) {
      const name = f.getName();
      if (f instanceof PDFLib.PDFCheckBox) map[name] = f.isChecked();
      else if (f instanceof PDFLib.PDFTextField) map[name] = f.getText() || '';
    }
    const names = Object.keys(map);
    if (!names.length) {
      say('This PDF has no typed answers we can read. It may be a scan or a printed copy. Type your answers into the PDF form (Adobe Reader, Preview, Chrome or Edge) or use the Excel organizer.', true);
      return;
    }
    if (!window.OrganizerMap || !window.OrganizerMap.isOrganizer(names)) {
      say("That PDF isn't the Falcon Tax Organizer. Download the organizer below, fill it in, and upload it again.", true);
      return;
    }
    const items = window.PreparerSummary && window.ExpenseCatalog
      ? window.PreparerSummary.itemsFromFields(map, window.ExpenseCatalog, window.OrganizerMap.money) : [];
    finish(window.OrganizerMap.fromPdfFields(map, window.States ? window.States.NAMES : {}), file.name, items);
  }

  // Key/value pairs from the Data tab: key in column A, value in column C
  function readDataSheet(sheets) {
    const sheet = sheets.find((s) => String(s.sheet).trim().toLowerCase() === 'data');
    if (!sheet) return null;
    const values = {};
    for (const row of sheet.data) {
      const key = row[0] == null ? '' : String(row[0]).trim();
      if (key) values[key] = row[2];
    }
    return values;
  }

  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    input.value = '';
    const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
    if (!isPdf && !/\.xlsx$/i.test(file.name)) {
      say('Upload the organizer as the Excel .xlsx file or the fillable PDF. In Google Sheets use File → Download → Microsoft Excel.', true);
      return;
    }
    say(`Reading ${file.name}…`);
    try {
      if (isPdf) { await readPdf(file); return; }
      const read = await loadReader();
      const result = await read(file);
      const sheets = Array.isArray(result) && result[0] && Array.isArray(result[0].data) ? result : [{ sheet: 'Sheet1', data: result }];
      const data = readDataSheet(sheets);
      if (!data || !('format' in data)) {
        say("That doesn't look like the Falcon Tax Organizer. Download the organizer below, fill it in, and upload it again.", true);
        return;
      }
      // Formula results are cached only after Excel, Google Sheets or Numbers saves the file
      if (data.format == null || data.status == null) {
        say('The organizer has no calculated values yet. Open it in Excel or Google Sheets, save it, then upload it again.', true);
        return;
      }
      if (data.format !== 'falcon-organizer-2026') {
        say('This organizer is for a different tax year. Download the 2026 organizer below.', true);
        return;
      }
      const values = {};
      for (const k of KEYS) if (k in data) values[k] = data[k] == null ? '' : data[k];
      // Count trip days from the Trips tab the same way as the PDF (overlaps merged)
      const trips = sheets.find((s) => String(s.sheet).trim().toLowerCase() === 'trips');
      if (trips && window.OrganizerMap) {
        const rows = trips.data.slice(5, 35).map((r) => ({ leave: r[0], back: r[1], canada: r[2] }));
        const t = window.OrganizerMap.perDiemDays(rows);
        Object.assign(values, { perDiemFull: t.full, perDiemCanada: t.canada, perDiemPartial: t.travel,
          isTrucker: t.full + t.travel > 0 ? 1 : 0 });
      }
      const tab = (name) => sheets.find((s) => String(s.sheet).trim().toLowerCase() === name);
      const P = window.PreparerSummary;
      const items = P ? [
        ...(tab('expenses') ? P.itemsFromSheet(tab('expenses').data.slice(5)) : []),
        ...(tab('car') && window.ExpenseCatalog ? P.carItemsFromSheet(tab('car').data, window.ExpenseCatalog) : []),
      ] : [];
      finish(values, file.name, items);
    } catch (err) {
      say(err.message === 'reader'
        ? "The file reader couldn't load. Refresh the page and try again."
        : "Couldn't read that file. Save it again as .xlsx or PDF and try again.", true);
    }
  });
})();
