// ============================================
// Turns the typed answers of the fillable PDF organizer
// (field name -> value) into estimator inputs. Mirrors the
// formulas on the Excel organizer's Data tab.
// No DOM; runs in the browser or in Node tests.
// ============================================
(function (root) {
  const PER_DIEM = { us: 80, canada: 86 }; // IRS Notice 2026-60

  function money(v) {
    if (v == null) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    const paren = /^\(.*\)$/.test(s);
    const plain = s.replace(/[()$,\s]/g, '');
    let n = plain ? Number(plain) : NaN;
    if (!Number.isFinite(n)) n = (s.includes('-') ? -1 : 1) * (Number(s.replace(/[^0-9.]/g, '')) || 0);
    return paren ? -Math.abs(n) : n;
  }

  // 2026-03-02, 3/2/2026, 3/2/26, 03-02-2026 -> UTC day number
  function day(v) {
    const s = String(v || '').trim();
    let y, m, d;
    let r = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (r) [, y, m, d] = r;
    else if ((r = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/))) {
      [, m, d, y] = r;
      if (y.length === 2) y = `20${y}`;
    } else return null;
    const t = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    // reject dates that roll over, like 2/30/2026
    if (t.getUTCMonth() !== Number(m) - 1 || t.getUTCDate() !== Number(d)) return null;
    return Math.round(t.getTime() / 86400000);
  }

  const yes = (v) => v === true || /^(y|yes|true|x|1|on)$/i.test(String(v || '').trim());
  const text = (v) => String(v == null ? '' : v).trim();

  function stateCode(v, names) {
    const s = text(v);
    if (!s) return '';
    const up = s.toUpperCase();
    if (names[up]) return up;
    const hit = Object.entries(names).find(([, n]) => n.toLowerCase() === s.toLowerCase());
    return hit ? hit[0] : '';
  }

  function fromPdfFields(f, stateNames) {
    const get = (k) => f[k];
    const rows = (prefix, max) => Array.from({ length: max }, (_, i) => i + 1).filter((i) =>
      Object.keys(f).some((k) => k.startsWith(`${prefix}${i}_`) && text(f[k]) !== '' && f[k] !== false));

    const status = ['single', 'mfj', 'mfs', 'hoh'].find((s) => yes(get(`status_${s}`))) || 'single';
    const by = money(get('birth_you'));
    const bs = money(get('birth_spouse'));

    let children = 0, others = 0;
    for (const i of rows('dep', 20)) {
      if (!text(get(`dep${i}_name`))) continue;
      const year = money(get(`dep${i}_year`));
      if (year >= 2010) children++; else others++;
    }

    const sum = (prefix, key, max) => rows(prefix, max).reduce((a, i) => a + money(get(`${prefix}${i}_${key}`)), 0);
    const cashTips = money(get('income_cashtips'));

    let expenses = 0;
    for (const [k, v] of Object.entries(f)) {
      const m = k.match(/^exp_.+_(\d{1,3})$/);
      if (m) expenses += money(v) * Number(m[1]) / 100;
    }

    // Only 2026 days count, and a day on two overlapping trips counts once
    // (a full day away beats a travel day).
    const Y0 = day('2026-01-01'), Y1 = day('2026-12-31');
    const days = new Map(); // day number -> 'full' | 'travel'
    let fullCanada = 0;
    for (const i of rows('trip', 60)) {
      const a = day(get(`trip${i}_leave`)), b = day(get(`trip${i}_return`));
      if (a == null || b == null || b <= a) continue;
      let tripFull = 0;
      for (let d = Math.max(a, Y0); d <= Math.min(b, Y1); d++) {
        if (d > a && d < b) { days.set(d, 'full'); tripFull++; } else if (!days.has(d)) days.set(d, 'travel');
      }
      fullCanada += Math.min(tripFull, Math.max(0, Math.floor(money(get(`trip${i}_canada`)))));
    }
    let full = 0, travel = 0;
    for (const t of days.values()) if (t === 'full') full++; else travel++;
    fullCanada = Math.min(fullCanada, full);
    const fullUs = full - fullCanada;

    const retirement = money(get('income_retirement'));
    const out = {
      status,
      state: stateCode(get('state'), stateNames || {}),
      you65: by > 0 && by <= 1961 ? 1 : 0,
      spouse65: status === 'mfj' && bs > 0 && bs <= 1961 ? 1 : 0,
      childrenUnder17: children,
      otherDependents: others,
      hasDeps: children + others > 0 ? 'yes' : 'no',
      childcare: yes(get('childcare')) ? 1 : 0,
      wages: sum('job', 'wages', 20) + cashTips,
      withheld: sum('job', 'fed', 20),
      stateWithheld: sum('job', 'state', 20),
      tips: sum('job', 'tips', 20) + cashTips,
      overtimePremium: sum('job', 'ot', 20),
      seIncome: sum('se', 'amount', 40),
      seExpenses: Math.round(expenses * 100) / 100,
      estimatedPayments: sum('pay', 'fed', 4),
      stateEstimated: sum('pay', 'state', 4),
      isTrucker: fullUs + fullCanada + travel > 0 ? 1 : 0,
      perDiemFull: Math.round((fullUs + fullCanada * PER_DIEM.canada / PER_DIEM.us) * 100) / 100,
      perDiemPartial: travel,
      interest: money(get('income_interest')),
      unemployment: money(get('income_unemployment')),
      otherIncome: retirement + money(get('income_other')),
      retirement: retirement > 0 ? 1 : 0,
    };
    for (const k of ['hasInvestments', 'mortgage', 'studentLoan', 'college', 'marketplace', 'noSsn', 'irsLetter']) {
      out[k] = yes(get(`chk_${k}`)) ? 1 : 0;
    }
    return out;
  }

  // True when the field list belongs to the Falcon organizer PDF
  const isOrganizer = (names) => names.includes('status_single') && names.some((n) => /^exp_fuel_diesel_100$/.test(n));

  const api = { fromPdfFields, isOrganizer, money, day };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OrganizerMap = api;
})(typeof window !== 'undefined' ? window : globalThis);
