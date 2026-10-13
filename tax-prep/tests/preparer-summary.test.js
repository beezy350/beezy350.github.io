// Run: node tax-prep/tests/preparer-summary.test.js
const assert = require('assert');
const P = require('../js/preparer-summary.js');
const T = require('../js/tax2026.js');
const S = require('../js/states.js');
const C = require('../js/expense-catalog.js');
const M = require('../js/organizer-map.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const field = (label) => Object.keys(C.expenses).find((k) => C.expenses[k].label === label);

// Married rideshare driver: itemized lines land on the right Schedule C lines
const f = { status_mfj: true, state: 'IL', dep1_name: 'yes', dep1_year: '2016', se1_amount: '90000', job1_fed: '6454.12',
  car_miles_h1: '20000', car_miles_h2: '20000', car_miles_total: '45000', car_gas: '17000', car_rent: '14400' };
f[field('Legal & professional fees')] = '450';
f[field('Business meals (enter full amount)')] = '3000';
f[field('Tolls & parking for business trips')] = '100';
f[field('Uber/Lyft/DoorDash service & booking fees')] = '2000';
const d = M.fromPdfFields(f, S.NAMES);
const r = T.estimate(d);
const m = P.model({ d, r, st: S.estimateState(d.state, d, r), items: P.itemsFromFields(f, C, M.money), source: 't.pdf' });
const line = (l) => m.scheduleC.lines.find((x) => x.line === l);
eq(line('17').amount, 450, 'legal fees on line 17');
eq(line('24b').amount, 1500, 'meals at 50% on line 24b');
eq(line('10').amount, 2000, 'app fees on line 10');
eq(line('9').amount, 100 + r.carDeduction, 'tolls plus the car deduction on line 9');
eq(m.scheduleC.netProfit, r.totalIncome, 'Schedule C net profit ties to the estimate');
eq(m.scheduleC.itemized, true);
assert.ok(m.questions.some((q) => /withholding of \$6,454\.12 with no W-2 wages/.test(q)), 'asks where withholding came from'); n++;
assert.ok(m.questions.some((q) => /Meals entered for a rideshare/.test(q)), 'flags rideshare meals'); n++;
assert.ok(m.questions.some((q) => /Form 8867/.test(q)), 'due diligence for EITC/CTC'); n++;
assert.ok(/Line 31 Net profit/.test(P.toText(m)), 'text version'); n++;

// Totals entered by hand: one unitemized line; edited totals drop stale items
const manual = { status: 'single', seIncome: 50000, seExpenses: 8000 };
const mm = P.model({ d: manual, r: T.estimate(manual), st: null, items: [] });
eq([mm.scheduleC.unitemized, mm.scheduleC.netProfit, mm.scheduleC.itemized], [8000, 42000, false]);
const stale = P.model({ d: manual, r: T.estimate(manual), st: null, items: [{ label: 'Fuel', line: '9', share: 1, amount: 100 }] });
eq([stale.scheduleC.itemsChanged, stale.scheduleC.unitemized], [true, 8000]);

// Excel Expenses tab rows: group headers skipped, share applied, example/total rows ignored
const rows = [['GENERAL BUSINESS', null, null], ['Legal & professional fees', '17', 450, 1, 450], ['Business meals', '24b', 1000, 0.5, 500],
  ['Example: Fuel', '9', 1250, 1], ['Home office', '30', 6000, 0, 0], ['Total deductible business expenses', null, 7450, null, 950]];
eq(P.itemsFromSheet(rows).map((i) => [i.line, i.amount, i.share]), [['17', 450, 1], ['24b', 1000, 0.5], ['30', 6000, 0]]);
const hm = P.model({ d: { status: 'single', seIncome: 20000, seExpenses: 950 }, r: T.estimate({ status: 'single', seIncome: 20000, seExpenses: 950 }), st: null, items: P.itemsFromSheet(rows) });
eq([hm.scheduleC.homeOffice, hm.scheduleC.totalExpenses], [6000, 950], 'home office listed for Form 8829, not deducted');
console.log(`All ${n} checks passed`);
