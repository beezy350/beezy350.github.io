// ============================================
// Falcon Scan Reader: handwritten organizer pages -> Claude
// (viewer's plan, via the artifact `sample` capability) ->
// organizer field values -> review -> estimate.
// ============================================
(function () {
  const $ = (id) => document.getElementById(id);
  const FIELDS = window.ORGANIZER_FIELDS || [];
  const BY_NAME = Object.fromEntries(FIELDS.map((f) => [f.name, f]));
  const MAX_PAGES = 8;
  const money = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
  const STATUS_NAMES = { single: 'Single', mfj: 'Married filing jointly', hoh: 'Head of household', mfs: 'Married filing separately' };

  let sample = null;
  let imageLimit = 0;
  let pages = [];          // {id, name, blob, url, state, error}
  let read = {};           // field name -> value
  let unclear = new Set();
  let ctl = null;
  let pdfjs = null;

  // ---------- friendly labels ----------
  const SECTIONS = { dep: 'Dependent', job: 'W-2 job', se: 'Self-employment income', trip: 'Trip', pay: 'Estimated payment Q' };
  function label(name) {
    const f = BY_NAME[name];
    const base = (f && f.label) || name;
    const m = name.match(/^(dep|job|se|trip|pay)(\d+)_/);
    if (!m) return base;
    const col = base.replace(/, row \d+$/, '');
    return `${SECTIONS[m[1]]}${m[1] === 'pay' ? '' : ' '}${m[2]} · ${col}`;
  }
  const PAGE_TITLES = { 1: 'Household, dependents & checklist', 2: 'Paychecks, cash, tips & other income', 3: 'Business expenses', 4: 'Trips & payments' };

  // ---------- Claude availability ----------
  async function init() {
    if (!window.claude || !window.claude.use) { $('no-claude').hidden = false; return; }
    sample = await window.claude.use('sample');
    if (!sample) { $('no-claude').hidden = false; return; }
    const lim = await sample.limits().catch(() => null);
    imageLimit = lim && lim.images ? lim.images.maxCount : 0;
    if (!imageLimit) {
      $('no-claude').textContent = "This view can't send images to Claude. Open the page from claude.ai in a browser or the Claude app.";
      $('no-claude').hidden = false;
    }
    refresh();
  }

  // ---------- adding pages ----------
  function warn(msg) { $('upload-msg').textContent = msg; $('upload-msg').hidden = !msg; }

  async function toJpeg(source, maxW) {
    const scale = Math.min(1, maxW / source.width);
    const c = document.createElement('canvas');
    c.width = Math.round(source.width * scale);
    c.height = Math.round(source.height * scale);
    const g = c.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(source, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob((b) => res(b), 'image/jpeg', 0.9));
  }

  function loadPdfJs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdf.min.js';
      s.onload = () => {
        pdfjs = window.pdfjsLib;
        if (!pdfjs) return reject(new Error('pdf'));
        pdfjs.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
        resolve(pdfjs);
      };
      s.onerror = () => reject(new Error('pdf'));
      document.head.append(s);
    });
  }

  async function pdfPages(file) {
    const lib = await loadPdfJs();
    // isEvalSupported:false blocks font-program code execution (CVE-2024-4367)
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const out = [];
    for (let i = 1; i <= Math.min(doc.numPages, MAX_PAGES); i++) {
      const page = await doc.getPage(i);
      const v1 = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: 2000 / v1.width });
      const c = document.createElement('canvas');
      c.width = viewport.width; c.height = viewport.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport }).promise;
      out.push({ name: `${file.name} p.${i}`, blob: await toJpeg(c, 2000) });
    }
    return out;
  }

  async function addFiles(list) {
    warn('');
    for (const file of list) {
      if (pages.length >= MAX_PAGES) { warn(`Up to ${MAX_PAGES} pages at a time.`); break; }
      try {
        if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
          for (const p of await pdfPages(file)) {
            if (pages.length >= MAX_PAGES) break;
            pages.push(newPage(p.name, p.blob));
          }
        } else if (/^image\/(jpeg|png|webp)$/.test(file.type)) {
          const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
          pages.push(newPage(file.name, await toJpeg(bmp, 2400)));
        } else if (/heic|heif/i.test(file.type + file.name)) {
          warn(`${file.name} is an iPhone HEIC photo. In Photos, share it as JPG (or set Camera > Formats > Most Compatible) and add it again.`);
        } else {
          warn(`${file.name} isn't a photo or PDF.`);
        }
      } catch (e) {
        warn(`Couldn't open ${file.name}. Try a clearer photo or re-save the PDF.`);
      }
    }
    renderPages();
    refresh();
  }

  function newPage(name, blob) {
    return { id: Math.random().toString(36).slice(2), name, blob, url: URL.createObjectURL(blob), state: 'new', error: '' };
  }

  function renderPages() {
    const box = $('pages');
    box.innerHTML = '';
    pages.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'page';
      const img = document.createElement('img');
      img.src = p.url; img.alt = `Page ${i + 1}: ${p.name}`;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const nm = document.createElement('span'); nm.textContent = `Page ${i + 1}`;
      const st = document.createElement('span');
      st.className = 'state ' + ({ ok: 'ok', err: 'err', run: 'run' }[p.state] || '');
      st.textContent = { new: '', run: 'Reading…', ok: 'Read', err: 'Not read' }[p.state];
      meta.append(nm, st);
      const tools = document.createElement('div');
      tools.className = 'tools';
      const mk = (txt, aria, fn, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'icon'; b.textContent = txt; b.setAttribute('aria-label', aria); b.disabled = dis; b.onclick = fn; tools.append(b); };
      mk('↑', 'Move up', () => { [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]]; renderPages(); }, i === 0 || busy());
      mk('↓', 'Move down', () => { [pages[i + 1], pages[i]] = [pages[i], pages[i + 1]]; renderPages(); }, i === pages.length - 1 || busy());
      mk('Remove', `Remove page ${i + 1}`, () => { URL.revokeObjectURL(p.url); pages.splice(i, 1); renderPages(); refresh(); }, busy());
      card.append(img, meta, tools);
      if (p.error) { const e = document.createElement('p'); e.className = 'note'; e.textContent = p.error; card.append(e); }
      box.append(card);
    });
  }

  const busy = () => Boolean(ctl);
  function refresh() {
    $('read').disabled = !sample || !imageLimit || !pages.length || busy();
    $('stop').hidden = !busy();
  }

  // ---------- reading with Claude ----------
  function prompt() {
    const catalog = FIELDS.map((f) => `${f.name} | p${f.page} | ${f.kind === 'check' ? 'checkbox' : 'text'} | ${label(f.name)}`).join('\n');
    return `You are reading a photo of ONE page of the "Falcon Tax Solutions 2026 Tax Organizer", filled in by hand by a tax client. ` +
      `The images are parts of that same page, top to bottom (they may overlap slightly). Transcribe what the client wrote into the organizer's fields.

Rules:
- Use only field names from the catalog below. Leave out any field that is blank on this page.
- Money and counts: digits only, with a decimal point if written (no $ or commas). Example: "41,000.00" -> "41000".
- Dates: YYYY-MM-DD. Years like "84" are 1984 for birth years and 2026 for trip dates.
- Checkboxes: true if checked, crossed or filled in. Leave out unchecked boxes.
- Some editions come pre-marked for one filing type (a coloured label such as "SINGLE" or "HEAD OF HOUSEHOLD" in the header, with that status box already crossed). Report that status checkbox as true.
- State: the 2-letter code (Illinois -> "IL").
- Privacy: do not copy people's names, employer or payer names, or notes. For those text fields write "yes" if something is written there.
- If you cannot read a value with confidence, give your best reading AND list the field name in "unclear". Never guess silently.
- Rows are numbered top to bottom within each table (row 1 is the first row under the header).

Reply with only JSON in exactly this shape:
{"page": 1, "fields": {"field_name": "value"}, "unclear": ["field_name"]}
"page" is the organizer page number printed in the header (PAGE 1 OF 4 ... PAGE 4 OF 4), or 0 if this is not an organizer page.

Field catalog (name | page | type | meaning):
${catalog}`;
  }

  // Top and bottom halves (slight overlap) give each part more resolution
  async function partsOf(blob) {
    const per = Math.min(imageLimit, 2);
    if (per < 2) return [blob];
    const bmp = await createImageBitmap(blob);
    const cut = async (y0, y1) => {
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = Math.round((y1 - y0) * bmp.height);
      c.getContext('2d').drawImage(bmp, 0, -Math.round(y0 * bmp.height));
      return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.9));
    };
    return [await cut(0, 0.54), await cut(0.46, 1)];
  }

  function clean(result) {
    const out = { page: Number(result && result.page) || 0, fields: {}, unclear: [] };
    const f = result && typeof result.fields === 'object' && result.fields ? result.fields : {};
    for (const [k, v] of Object.entries(f)) {
      if (!BY_NAME[k] || v == null || v === '' || v === false) continue;
      out.fields[k] = BY_NAME[k].kind === 'check' ? true : String(v).slice(0, 40);
    }
    if (Array.isArray(result && result.unclear)) out.unclear = result.unclear.filter((k) => BY_NAME[k]);
    return out;
  }

  const ERRORS = {
    not_granted: 'Claude access was declined for this page. Reload and choose Allow to read handwriting.',
    sampling_disabled: "Claude isn't available on this account.",
    rate_limited: "You've reached your Claude usage limit for now. Try again later.",
    session_expired: 'Your claude.ai session expired. Sign in again and reload.',
    image_rejected: 'This photo was rejected (too large or unreadable). Take a new photo.',
    invalid_json: "Claude's answer couldn't be used. Try this page again.",
    refused: 'Claude declined to read this page.',
    images_unavailable: "This view can't send images to Claude.",
  };
  const STOP_ALL = new Set(['not_granted', 'sampling_disabled', 'session_expired', 'images_unavailable', 'rate_limited']);

  async function readAll() {
    ctl = new AbortController();
    refresh(); renderPages();
    read = {}; unclear = new Set();
    let done = 0;
    const seenPages = new Set();
    $('bar').style.width = '3%';
    for (const p of pages) {
      p.state = 'run'; p.error = ''; renderPages();
      $('read-status').textContent = `Reading page ${done + 1} of ${pages.length}… (usually 20–60 seconds a page)`;
      try {
        const res = clean(await sample.json(prompt(), {
          images: await partsOf(p.blob),
          signal: ctl.signal,
          modelTier: $('careful').checked ? 'complex' : 'default',
        }));
        if (res.page === 0 && !Object.keys(res.fields).length) {
          p.state = 'err'; p.error = "This doesn't look like an organizer page.";
        } else {
          Object.assign(read, res.fields);
          res.unclear.forEach((k) => unclear.add(k));
          if (res.page) seenPages.add(res.page);
          p.state = 'ok';
        }
      } catch (e) {
        if (e && e.code === 'cancelled') { p.state = 'new'; break; }
        p.state = 'err';
        p.error = ERRORS[e && e.code] || "Couldn't read this page. Try again.";
        if (e && STOP_ALL.has(e.code)) { $('read-status').textContent = p.error; break; }
      }
      done++;
      $('bar').style.width = `${Math.round((done / pages.length) * 100)}%`;
      renderPages();
    }
    ctl = null;
    refresh(); renderPages();
    const missing = [1, 2, 3, 4].filter((n) => !seenPages.has(n));
    const count = Object.keys(read).length;
    if (count) {
      $('read-status').textContent = `Read ${count} answers from ${pages.filter((p) => p.state === 'ok').length} page(s).`;
      $('review-note').textContent = (unclear.size ? `${unclear.size} line(s) are highlighted: compare them with the photo and correct if needed. ` : 'Everything was read clearly. ')
        + (missing.length ? `No ${missing.map((n) => `page ${n}`).join(', ')} found; blank pages are fine, missing ones are treated as empty.` : '');
      renderReview();
      $('review').hidden = false;
      $('review').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (!/limit|declined|expired|available/.test($('read-status').textContent)) {
      $('read-status').textContent = 'No answers were read. Check the photos are organizer pages and try again.';
    }
  }

  // ---------- review ----------
  function renderReview() {
    const body = $('review-table').querySelector('tbody');
    body.innerHTML = '';
    const only = $('only-unclear').checked;
    let lastPage = 0;
    for (const f of FIELDS) {
      if (!(f.name in read)) continue;
      if (only && !unclear.has(f.name)) continue;
      if (f.page !== lastPage) {
        lastPage = f.page;
        const g = body.insertRow(); g.className = 'group';
        const th = document.createElement('th'); th.colSpan = 3; th.textContent = `Page ${f.page} · ${PAGE_TITLES[f.page]}`; g.append(th);
      }
      const tr = body.insertRow();
      if (unclear.has(f.name)) tr.className = 'unclear';
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = label(f.name); tr.append(th);
      const td = tr.insertCell();
      const input = document.createElement('input');
      input.setAttribute('aria-label', label(f.name));
      if (f.kind === 'check') {
        input.type = 'checkbox'; input.checked = read[f.name] === true;
        input.onchange = () => { if (input.checked) read[f.name] = true; else delete read[f.name]; unclear.delete(f.name); tr.className = ''; tr.lastChild.textContent = ''; };
      } else {
        input.type = 'text'; input.value = read[f.name];
        input.oninput = () => { read[f.name] = input.value; };
        input.onchange = () => { unclear.delete(f.name); tr.className = ''; tr.lastChild.textContent = ''; };
      }
      td.append(input);
      tr.insertCell().textContent = unclear.has(f.name) ? 'Check this' : '';
    }
  }

  // ---------- estimate ----------
  function calculate() {
    const values = window.OrganizerMap.fromPdfFields(read, window.States.NAMES);
    const r = window.Tax2026.estimate(values);
    const st = window.States.estimateState(values.state, values, r);

    const fedRefund = r.result >= 0;
    $('fed-label').textContent = fedRefund ? 'Federal refund' : 'Federal amount due';
    $('fed-amount').textContent = money(Math.abs(r.result));
    $('fed-amount').className = 'big' + (fedRefund ? '' : ' owe');
    $('fed-sub').textContent = `${STATUS_NAMES[r.status]} · 2026 tax year`;

    let stLine = '';
    if (st.kind === 'supported' || st.kind === 'no-tax') {
      const sr = st.result >= 0;
      $('st-label').textContent = `${st.name} ${st.kind === 'no-tax' ? '(no income tax)' : sr ? 'refund' : 'amount due'}`;
      $('st-amount').textContent = money(Math.abs(st.result));
      $('st-amount').className = 'big' + (sr ? '' : ' owe');
      $('st-sub').textContent = st.kind === 'supported' ? `${st.rateLabel} · ${st.exemptionCount} exemption(s)` : '';
      const total = r.result + st.result;
      $('combined').textContent = `Federal and ${st.name} together: ${total >= 0 ? 'refund' : 'due'} ${money(Math.abs(total))}`;
      $('combined').hidden = false;
      stLine = `${st.name}: ${sr ? 'refund' : 'amount due'} of about ${money(Math.abs(st.result))}`;
    } else {
      $('st-label').textContent = st.kind === 'coming-soon' ? `${st.name}` : 'State';
      $('st-amount').textContent = '—';
      $('st-amount').className = 'big';
      $('st-sub').textContent = st.kind === 'coming-soon' ? 'State estimate coming soon; federal only.' : 'No state was read from page 1.';
      $('combined').hidden = true;
    }

    const rows = [
      ['Total income', r.totalIncome], ['Adjusted gross income', r.agi], ['Standard deduction', -r.standardDeduction],
      r.perDiemDeduction && ['Truck driver per diem (80%)', -r.perDiemDeduction],
      r.tipsDeduction && ['Tips deduction', -r.tipsDeduction], r.overtimeDeduction && ['Overtime deduction', -r.overtimeDeduction],
      r.seniorDeduction && ['Senior deduction', -r.seniorDeduction], r.qbiDeduction && ['Business income deduction', -r.qbiDeduction],
      ['Taxable income', r.taxableIncome, 'sum'], ['Income tax', r.incomeTax],
      r.childCredits && ['Child and dependent credits', -r.childCredits], r.seTax && ['Self-employment tax', r.seTax],
      ['Total federal tax', r.totalTax, 'sum'], ['Federal tax withheld', r.withheld],
      r.estimatedPayments && ['Estimated payments', r.estimatedPayments], r.refundableChildCredit && ['Refundable child credit', r.refundableChildCredit],
    ].filter(Boolean);
    const t = $('fed-table');
    t.innerHTML = '';
    for (const [n, v, cls] of rows) {
      const tr = t.insertRow(); if (cls) tr.className = cls;
      const th = document.createElement('th'); th.textContent = n; tr.append(th);
      tr.insertCell().textContent = money(v);
    }

    const flags = [...r.notes, ...(st.notes || [])];
    if (unclear.size) flags.unshift(`${unclear.size} handwritten line(s) were hard to read. Make sure you checked them against the photo.`);
    if (!values.wages && !values.seIncome) flags.unshift('No income was read. Check pages 2 and 3 were included.');
    const ul = $('flags');
    ul.innerHTML = '';
    (flags.length ? flags : ['Nothing unusual found.']).forEach((x) => { const li = document.createElement('li'); li.textContent = x; ul.append(li); });

    $('summary').textContent = [
      'Hello,',
      '',
      'Thank you for sending your 2026 Tax Organizer. Based on the information you provided, here is your estimate:',
      '',
      `Federal: ${fedRefund ? 'refund' : 'amount due'} of about ${money(Math.abs(r.result))}`,
      stLine,
      '',
      'This is an estimate, not a filed return or a promise of any refund. Your final numbers depend on your tax documents. ' +
        "We'll confirm everything when we prepare your return.",
      '',
      'Falcon Tax Solutions',
    ].filter((line, i, a) => !(line === '' && a[i - 1] === '')).join('\n');

    $('result').hidden = false;
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- wiring ----------
  $('file').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles([...e.dataTransfer.files]); });
  $('read').addEventListener('click', readAll);
  $('stop').addEventListener('click', () => ctl && ctl.abort());
  $('only-unclear').addEventListener('change', renderReview);
  $('calc').addEventListener('click', calculate);
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('summary').textContent); $('copy-status').textContent = 'Copied.'; }
    catch (e) {
      const range = document.createRange(); range.selectNodeContents($('summary'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
      $('copy-status').textContent = 'Selected. Press Ctrl+C (or ⌘C) to copy.';
    }
  });

  init();
})();
