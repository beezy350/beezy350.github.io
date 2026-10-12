// Run: node tax-prep/tests/pl.test.js
const assert = require('assert');
const PL = require('../js/pl.js');
const { estimate } = require('../js/tax2026.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

// 1. Simple two-column sheet (the shape of the user's sample PDF)
const simple = PL.parseCSV(`Item,Value
Gross income,90000
Gas,17000
Vehicle rent,14400
Phone & data,1800
Supplies & cleaning,3300
Meals (50%),1500
Driver tools & apps,2500
Car wash & fluids,1267.5
Tolls & permits,100
Office expense,1200
Legal fees,450
Total expenses,43517.5
Net business income,46482.5
Federal tax owed,2300
Federal tax withheld,6454.12
Federal refund,4154.12
Illinois tax owed,2154.12
Illinois tax withheld,5000
Illinois refund,2845.88
Estimated total tax refund,7000`);
const a = PL.analyze(simple);
eq(a.income, 90000);
eq(a.expenses, 43517.5);
eq(a.net, 46482.5);
eq(a.withheld, 6454.12, 'federal withheld captured, Illinois ignored');
eq(a.statedFederalTax, 2300);
eq(a.statedNet, 46482.5);
eq(a.lines.length, 11, 'tax summary and total rows excluded');
eq(a.flags.some((f) => f.startsWith('"Meals (50%)"')), true);
eq(a.flags.some((f) => f.includes('Vehicle costs (Gas, Vehicle rent, Car wash & fluids)')), true);
eq(a.flags.some((f) => f.includes('Phone & data')), true);
eq(a.flags.some((f) => f.includes("doesn't match")), false);

// The missing self-employment tax is caught
const est = estimate({ status: 'single', seIncome: a.income, seExpenses: a.expenses, withheld: a.withheld });
const check = PL.federalCheck(a.statedFederalTax, est);
eq(Boolean(check && check.includes('self-employment tax')), true);
eq(PL.federalCheck(est.totalTax, est), null, 'no flag when the file matches');

// 2. QuickBooks-style P&L with sections, account numbers and a two-column layout
const qb = [
  ['Falcon Client LLC'], ['Profit and Loss'], ['January - December 2026'],
  ['', 'Total'],
  ['Income'],
  ['   4000 Freight Revenue', '$120,500.00'],
  ['   Fuel Surcharge', '8,200.00'],
  ['Total Income', '$128,700.00'],
  ['Expenses'],
  ['   Fuel', '41,300.00'],
  ['   Repairs & Maintenance', '9,875.40'],
  ['   Insurance Expense', '12,000'],
  ['   Bank Charges', '(25.00)'],
  ['Total Expenses', '63,200.40'],
  ['Net Operating Income', '65,499.60'],
  ['Net Income', '$65,499.60'],
];
const b = PL.analyze(qb);
eq(b.lines.map((l) => [l.label, l.kind]), [
  ['4000 Freight Revenue', 'income'], ['Fuel Surcharge', 'income'],
  ['Fuel', 'expense'], ['Repairs & Maintenance', 'expense'], ['Insurance Expense', 'expense'], ['Bank Charges', 'expense'],
]);
eq(b.income, 128700);
eq(b.expenses, 63200.4, 'negative expense counted as positive cost');
eq(b.net, 65499.6);
eq(b.flags.some((f) => f.includes("doesn't match")), false);

// 3. Re-labeling a line updates totals
const c = PL.finish({ ...b, lines: b.lines.map((l) => l.label === 'Fuel Surcharge' ? { ...l, kind: 'ignore' } : l) });
eq(c.income, 120500);

// 4. Mismatched net is flagged
const d = PL.analyze([['Sales', '1000'], ['Supplies', '200'], ['Net income', '900']]);
eq(d.flags.some((f) => f.includes("doesn't match")), true);

// 5. Number formats
eq([PL.toNumber('$1,234.50'), PL.toNumber('(42.10)'), PL.toNumber('-5'), PL.toNumber('abc'), PL.toNumber(12)], [1234.5, -42.1, -5, NaN, 12]);

console.log(`All ${n} checks passed`);
