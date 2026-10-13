// Run: node tax-prep/tests/tax2026.test.js
// Expected values are worked out by hand from the 2026 tables.
const assert = require('assert');
const { estimate, bracketTax } = require('../js/tax2026.js');

const cases = [
  ['single W-2 earner', { status: 'single', wages: 50000, withheld: 5000 },
    { taxableIncome: 33900, incomeTax: 3820, result: 1180 }],
  ['married, two kids, child credit wipes out most tax', { status: 'mfj', wages: 80000, withheld: 4000, childrenUnder17: 2 },
    { taxableIncome: 47800, incomeTax: 5240, childCredits: 4400, totalTax: 840, result: 3160 }],
  ['head of household, refundable child credit capped by earnings', { status: 'hoh', wages: 25000, withheld: 1000, childrenUnder17: 2 },
    { taxableIncome: 850, childCredits: 85, refundableChildCredit: 3375, result: 4375 }],
  ['self-employed $60k net', { status: 'single', seIncome: 70000, seExpenses: 10000 },
    { seTax: 8478, agi: 55761, qbiDeduction: 7932, taxableIncome: 31729, totalTax: 12037, result: -12037 }],
  ['single senior, extra deductions', { status: 'single', wages: 40000, you65: true },
    { standardDeduction: 18150, seniorDeduction: 6000, taxableIncome: 15850, incomeTax: 1654 }],
  ['tips deduction', { status: 'single', wages: 60000, tips: 10000 },
    { tipsDeduction: 10000, taxableIncome: 33900 }],
  ['tips not allowed married filing separately', { status: 'mfs', wages: 60000, tips: 10000 },
    { tipsDeduction: 0, taxableIncome: 43900 }],
  ['child credit phase-out at $50 per $1,000', { status: 'single', wages: 210500, childrenUnder17: 1 },
    { agi: 210500, childCredits: 1650 }],
  ['zero income', { status: 'single' }, { totalTax: 0, result: 0 }],
  ['trucker per diem: 200 full + 40 travel days, 80% deductible', { status: 'single', seIncome: 100000, seExpenses: 40000, perDiemFull: 200, perDiemPartial: 40 },
    { perDiemDeduction: 14720, agi: Math.round(45280 - 45280 * 0.9235 * 0.153 / 2) }],
  ['per diem ignored for W-2 drivers', { status: 'single', wages: 60000, perDiemFull: 100 },
    { perDiemDeduction: 0, taxableIncome: 43900 }],
  ['SE tax only when net earnings (92.35%) reach $400', { status: 'single', seIncome: 420 },
    { seTax: 0 }],
  ['per diem capped at 365 days', { status: 'single', seIncome: 500000, perDiemFull: 5000, perDiemPartial: 10 },
    { perDiemDeduction: 365 * 80 * 0.8 }],
  ['a full year in Canada keeps the $86 rate', { status: 'single', seIncome: 500000, perDiemFull: 400, perDiemCanada: 400 },
    { perDiemDeduction: Math.round(365 * 86 * 0.8) }],
  ['car: mileage rate split at July 1 beats actual costs', { status: 'single', seIncome: 90000, carMilesH1: 20000, carMilesH2: 20000, carMilesTotal: 45000, carCosts: 32667.5 },
    { carStandard: 29700, carActual: 29038, carDeduction: 29700, carMethod: 'standard' }],
  ['car: actual costs x business share when larger', { status: 'single', seIncome: 90000, carMilesH1: 5000, carMilesH2: 5000, carMilesTotal: 12500, carCosts: 20000 },
    { carStandard: 7425, carActual: 16000, carDeduction: 16000, carMethod: 'actual' }],
  ['car: no total miles means mileage rate only', { status: 'single', seIncome: 90000, carMilesH2: 1000, carCosts: 20000 },
    { carDeduction: 760, carMethod: 'standard' }],
  ['car ignored without self-employment income', { status: 'single', wages: 50000, carMilesH1: 10000 },
    { carDeduction: 0, taxableIncome: 33900 }],
  ['self-employment loss lowers total income', { status: 'single', wages: 40000, seIncome: -5000 },
    { totalIncome: 35000 }],
];

let failed = 0;
for (const [name, input, expected] of cases) {
  const out = estimate(input);
  for (const [k, v] of Object.entries(expected)) {
    try { assert.strictEqual(out[k], v); }
    catch { failed++; console.log(`FAIL ${name}: ${k} = ${out[k]}, expected ${v}`); }
  }
}
// bracket boundaries
assert.strictEqual(Math.round(bracketTax(12400, 'single')), 1240);
assert.strictEqual(Math.round(bracketTax(24800, 'mfj')), 2480);
assert.strictEqual(Math.round(bracketTax(210000, 'hoh')), 41847, 'HoH 24% bracket ends at 201,750');
// QBI phases down over $75k above the $201,750 threshold instead of dropping off a cliff
const q = (se) => estimate({ status: 'single', seIncome: se });
assert.ok(q(236000).qbiDeduction > 0, 'QBI still partly allowed inside the phase-in');
assert.ok(q(236000).totalTax - q(230000).totalTax < 3000, 'no tax cliff at the QBI threshold');
assert.strictEqual(q(400000).qbiDeduction, 0, 'QBI gone above threshold + phase-in');
console.log(failed ? `${failed} check(s) failed` : `All ${cases.length} cases passed`);
process.exit(failed ? 1 : 0);
