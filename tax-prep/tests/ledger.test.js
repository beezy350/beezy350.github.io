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
eq(out.split('\n')[1], '2026-01-01,expense,-5.00,Supplies,22,"A, B",x');

// Unsorted imports stay split by direction in the Schedule C summary
const mixed = L.scheduleC([
  { date: '2026-06-01', type: 'income', amount: 300, category: 'uncategorized' },
  { date: '2026-06-02', type: 'expense', amount: 20, category: 'uncategorized' },
], 2026);
eq(mixed.map((r) => [r.label, r.total]), [['Needs a category (money in)', 300], ['Needs a category (money out)', 20]]);

console.log(`All ${n} checks passed`);
