// Run: node tax-prep/tests/pl.test.js
const assert = require('assert');
const PL = require('../js/pl.js');
const { estimate } = require('../js/tax2026.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

// 1. Simple two-column sheet (an illustrative hand-made summary, made-up numbers)
const simple = PL.parseCSV(`Item,Value
Gross income,85000
Gas,15000
Vehicle rent,12000
Phone & data,1500
Supplies & cleaning,2800
Meals (50%),1200
Driver tools & apps,2000
Car wash & fluids,1100
Tolls & permits,150
Office expense,900
Legal fees,400
Total expenses,37050
Net business income,47950
Federal tax owed,2100
Federal tax withheld,5800
Federal refund,3700
Illinois tax owed,2000
Illinois tax withheld,4000
Illinois refund,2000
Estimated total tax refund,5700`);
const a = PL.analyze(simple);
eq(a.income, 85000);
eq(a.expenses, 37050);
eq(a.net, 47950);
eq(a.withheld, 5800, 'federal withheld captured, Illinois ignored');
eq(a.statedFederalTax, 2100);
eq(a.statedNet, 47950);
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

// 6. Trucking P&L: missing IFTA and permits are flagged; trucking meals use the 80% rule
const truckBare = PL.analyze([['Freight revenue', '150000'], ['Fuel', '52000'], ['Repairs', '9000'], ['Meals on the road', '2400'], ['Total expenses', '63400']]);
const missingFlag = truckBare.flags.find((f) => f.startsWith('This looks like a trucking P&L'));
eq(Boolean(missingFlag && missingFlag.includes('IFTA fuel tax') && missingFlag.includes('permits and registration')), true);
eq(truckBare.flags.some((f) => f.includes('80% of meals')), true);
eq(truckBare.flags.some((f) => f.startsWith('Vehicle costs')), false, 'no rideshare vehicle note for trucking');

const truckFull = PL.analyze([
  ['Freight revenue', '150000'], ['Fuel', '52000'], ['IFTA fuel tax', '1200'], ['UCR registration', '46'],
  ['Form 2290 HVUT', '550'], ['Trip permits', '150'], ['DAT load board', '1980'], ['Truckstop subscription', '1788'],
  ['ELD subscription', '420'], ['Dash cam (electronics)', '249'], ['Tablet and GPS electronics', '3100'],
]);
eq(truckFull.flags.some((f) => f.startsWith('This looks like a trucking P&L')), false, 'nothing missing');
eq(truckFull.flags.some((f) => f.includes('"Tablet and GPS electronics"') && f.includes('de minimis')), true, 'big electronics flagged');
eq(truckFull.flags.some((f) => f.includes('Dash cam')), false, 'small electronics not flagged');
eq(truckFull.expenses, 52000 + 1200 + 46 + 550 + 150 + 1980 + 1788 + 420 + 249 + 3100);

// Rideshare sample is not mistaken for trucking
eq(a.flags.some((f) => f.startsWith('This looks like a trucking P&L')), false);

console.log(`All ${n} checks passed`);
