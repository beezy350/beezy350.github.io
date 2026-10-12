// ============================================
// Falcon Tax Organizer upload. Reads the "Data" tab
// of a filled-in organizer (.xlsx) on this device and
// sends every answer to the estimator. Nothing is uploaded.
// ============================================
(function () {
  const input = document.getElementById('org-file');
  if (!input) return;

  const XLSX_READER = 'vendor/read-excel-file.min.js';
  const status = document.getElementById('org-status');
  const KEYS = ['status', 'state', 'you65', 'spouse65', 'hasDeps', 'childrenUnder17', 'otherDependents', 'childcare',
    'wages', 'withheld', 'stateWithheld', 'tips', 'overtimePremium', 'seIncome', 'seExpenses', 'estimatedPayments',
    'stateEstimated', 'isTrucker', 'perDiemFull', 'perDiemPartial', 'interest', 'unemployment', 'otherIncome',
    'retirement', 'hasInvestments', 'mortgage', 'studentLoan', 'college', 'marketplace', 'noSsn', 'irsLetter'];

  function say(msg, isError) {
    status.textContent = msg;
    status.classList.toggle('error', Boolean(isError));
  }

  function loadReader() {
    if (window.readXlsxFile) return Promise.resolve(window.readXlsxFile);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = XLSX_READER;
      s.onload = () => (window.readXlsxFile ? resolve(window.readXlsxFile) : reject(new Error('reader')));
      s.onerror = () => reject(new Error('reader'));
      document.head.append(s);
    });
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
    if (!/\.xlsx$/i.test(file.name)) {
      say('Upload the organizer as an Excel .xlsx file. In Google Sheets use File → Download → Microsoft Excel.', true);
      return;
    }
    say(`Reading ${file.name}…`);
    try {
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
      const income = ['wages', 'seIncome', 'interest', 'unemployment', 'otherIncome'].reduce((a, k) => a + (Number(data[k]) || 0), 0);
      if (!income) {
        say('No income was entered in the organizer yet. Fill in the Jobs or Income tab, save, and upload it again.', true);
        return;
      }
      const values = {};
      for (const k of KEYS) if (k in data) values[k] = data[k] == null ? '' : data[k];
      if (window.FalconEstimator) window.FalconEstimator.load(values);
      say(`Loaded your answers from ${file.name}. Your estimate is below; you can go back to any step to change an answer.`);
    } catch (err) {
      say(err.message === 'reader'
        ? "The Excel reader couldn't load. Refresh the page and try again."
        : "Couldn't read that file. Save it as .xlsx and try again.", true);
    }
  });
})();
