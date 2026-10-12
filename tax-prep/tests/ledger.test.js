// Run: node tax-prep/tests/ledger.test.js
const assert = require('assert');
const L = require('../js/ledger.js');

const tx = [
  { date: '2026-02-10', type: 'income', amount: 250, category: 'tax_fees' },
  { date: '2026-02-12', type: 'income', amount: 400, category: 'tax_fees' },
  { date: '2026-03-01', type: 'expense', amount: 100, category: 'software' },
  { date: '2026-03-05', type: 'expense', amount: 80, category: 'meals' },      // 50% deductible
  { date: '2026-05-20', type: 'income', amount: 150, category: 'bk_fees' },
  { date: '2026-05-21', type: 'expense', amount: 18.75, category: 'licenses' },
  { date: '2025-12-30', type: 'income', amount: 999, category: 'tax_fees' },   // other year
];

let n = 0;
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

const s = L.summarize(tx, 2026);
eq(s.count, 6, 'only 2026 rows');
eq(s.income, 800);
eq(s.expenses, 198.75);
eq(s.deductibleExpenses, 158.75, 'meals counted at 50%');
eq(s.profit, 641.25);
eq(s.seTax, Math.round(641.25 * 0.9235 * 0.153 * 100) / 100);
eq(s.months[1].income, 650);
eq(s.months[2].expenses, 180);

const c = L.scheduleC(tx, 2026);
eq(c.find((r) => r.id === 'tax_fees').total, 650);
eq(c.find((r) => r.id === 'meals').deductible, 40);
eq(c[0].id, 'tax_fees', 'income lines first');

const q = L.quarterly(tx, 2026);
eq(q[0].profit, 650 - 100 - 40);
eq(q[1].profit, 150 - 18.75);
eq(q[3].due, '2027-01-15');

// Bank CSV: single amount column, quotes, parentheses negatives, US dates
const csv1 = 'Date,Description,Amount\n01/15/2026,"Client, Jane",250.00\n01/16/2026,Office Depot,(42.10)\n01/17/2026,Bad row,\n2026-01-18,Zoom,-15.99\n';
const r1 = L.importBankCSV(csv1);
eq(r1.transactions.length, 3);
eq(r1.skipped, 1);
eq(r1.transactions[0], { date: '2026-01-15', type: 'income', amount: 250, category: 'uncategorized', payee: 'Client, Jane', note: 'Imported' });
eq(r1.transactions[1].type, 'expense');
eq(r1.transactions[1].amount, 42.1);
eq(r1.transactions[2].date, '2026-01-18');

// Bank CSV: separate Debit / Credit columns
const csv2 = 'Posting Date,Payee,Debit,Credit\r\n2/1/26,Deposit,,300\r\n2/2/26,Staples,25.5,\r\n';
const r2 = L.importBankCSV(csv2);
eq(r2.transactions.map((t) => [t.date, t.type, t.amount]), [['2026-02-01', 'income', 300], ['2026-02-02', 'expense', 25.5]]);

// Missing columns
eq(Boolean(L.importBankCSV('Foo,Bar\n1,2').error), true);

// Export round trip keeps commas safe
const out = L.toCSV([{ date: '2026-01-01', type: 'expense', amount: 5, category: 'supplies', payee: 'A, B', note: 'x' }]);
eq(out.split('\n')[1], '2026-01-01,expense,-5.00,Supplies,22,"A, B",x,,,,');

// Unsorted imports stay split by direction in the Schedule C summary
const mixed = L.scheduleC([
  { date: '2026-06-01', type: 'income', amount: 300, category: 'uncategorized' },
  { date: '2026-06-02', type: 'expense', amount: 20, category: 'uncategorized' },
], 2026);
eq(mixed.map((r) => [r.label, r.total]), [['Needs a category (money in)', 300], ['Needs a category (money out)', 20]]);

// ---------- trucking ----------
const trucks = [{ id: 'T1', unit: 'Unit 101' }, { id: 'T2', unit: 'Unit 102' }];
const ttx = [
  { date: '2026-02-01', type: 'expense', amount: 1000, category: 't_fuel', truck: 'T1', gallons: 250, state: 'TX' },
  { date: '2026-03-01', type: 'expense', amount: 800, category: 't_fuel', truck: 'T1', gallons: 200, state: 'OK' },
  { date: '2026-04-02', type: 'expense', amount: 300, category: 't_fuel', truck: 'T2', gallons: 75, state: 'TX' }, // Q2
  { date: '2026-02-10', type: 'expense', amount: 600, category: 't_repairs', sub: 'brakes', truck: 'T1' },
  { date: '2026-02-11', type: 'expense', amount: 250, category: 't_repairs', sub: 'oil', truck: 'T1' },
  { date: '2026-05-01', type: 'expense', amount: 400, category: 't_repairs', sub: 'brakes', truck: 'T2' },
  { date: '2026-05-02', type: 'expense', amount: 100, category: 't_repairs', truck: 'T2' }, // no item -> Other repair
  { date: '2026-02-20', type: 'income', amount: 10000, category: 't_freight', truck: 'T1' },
  { date: '2026-05-20', type: 'income', amount: 5000, category: 't_freight', truck: 'T2' },
  { date: '2026-03-15', type: 'expense', amount: 100, category: 't_perdiem' }, // overhead, 80%
];
const milesLog = [
  { year: 2026, quarter: 1, truck: 'T1', state: 'TX', miles: 1500 },
  { year: 2026, quarter: 1, truck: 'T1', state: 'OK', miles: 1200 },
  { year: 2026, quarter: 1, truck: 'T1', state: 'NM', miles: 300 },
  { year: 2026, quarter: 2, truck: 'T2', state: 'TX', miles: 1000 },
];

eq(L.repairsBreakdown(ttx, 2026).map((r) => [r.label, r.total]),
  [['Brakes (pads, shoes, drums, chambers)', 1000], ['Oil & filter change', 250], ['Other repair', 100]]);

const pt = Object.fromEntries(L.perTruck(ttx, 2026, trucks, milesLog).map((r) => [r.id || 'overhead', r]));
eq([pt.T1.income, pt.T1.fuel, pt.T1.repairs, pt.T1.expenses, pt.T1.profit, pt.T1.miles, pt.T1.costPerMile], [10000, 1800, 850, 2650, 7350, 3000, 0.88]);
eq([pt.T2.expenses, pt.T2.costPerMile], [800, 0.8]);
eq([pt.overhead.other, pt.overhead.costPerMile], [80, null]);

const q1 = L.iftaQuarter(ttx, milesLog, 2026, 1);
eq([q1.totalMiles, q1.totalGallons, q1.mpg, q1.due], [3000, 450, 6.67, '2026-04-30']);
eq(q1.rows.map((r) => [r.state, r.miles, r.taxableGallons, r.paidGallons, r.netGallons]),
  [['NM', 300, 45, 0, 45], ['OK', 1200, 180, 200, -20], ['TX', 1500, 225, 250, -25]]);
eq(L.iftaQuarter(ttx, milesLog, 2026, 4).due, '2027-01-31');

// Trucking rows feed the same Schedule C summary (per diem at 80%)
eq(L.scheduleC(ttx, 2026).find((r) => r.id === 't_perdiem').deductible, 80);

// Schedule C rows run in IRS line order
const ordered = L.scheduleC([
  { date: '2026-01-01', type: 'expense', amount: 1, category: 't_loadboards' },
  { date: '2026-01-01', type: 'expense', amount: 1, category: 't_electronics' },
  { date: '2026-01-01', type: 'expense', amount: 1, category: 't_perdiem' },
  { date: '2026-01-01', type: 'expense', amount: 1, category: 't_ucr' },
  { date: '2026-01-01', type: 'income', amount: 1, category: 't_freight' },
  { date: '2026-01-01', type: 'expense', amount: 1, category: 'uncategorized' },
], 2026).map((r) => r.line || '-');
eq(ordered, ['1', '22', '23', '24b', '27a', '-']);

// Per diem: 20 full + 4 partial days in the US, 3 full + 1 partial in Canada
const pd = L.perDiem({ fullConus: 20, partialConus: 4, fullOconus: 3, partialOconus: 1 });
eq(pd, { days: 28, total: 20 * 80 + 4 * 60 + 3 * 86 + 64.5, deductible: Math.round((20 * 80 + 4 * 60 + 3 * 86 + 64.5) * 0.8 * 100) / 100 });
eq(L.perDiem({ fullConus: -3, partialConus: 'x' }).total, 0, 'bad input is zero');

// Market check: revenue and cost per mile vs the market rate
const mc = L.marketCheck(L.perTruck(ttx, 2026, trucks, milesLog), { spot: { allIn: { van: 3.08 } } }, 'van');
eq(mc.map((r) => [r.unit, r.revenuePerMile, r.costPerMile, r.vsMarket]), [['Unit 101', 3.33, 0.88, 0.25], ['Unit 102', 5, 0.8, 1.92]]);
eq(L.marketCheck(L.perTruck(ttx, 2026, trucks, milesLog), null, 'van')[0].vsMarket, null);

console.log(`All ${n} checks passed`);
