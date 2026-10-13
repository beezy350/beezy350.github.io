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
    { taxableIncome: 850, childCredits: 85, refundableChildCredit: 3375, eitc: 7082, result: 11457 }],
  ['EITC: married rideshare driver, two kids, phased down above $31,160', { status: 'mfj', childrenUnder17: 2, seIncome: 90000, seExpenses: 43517.5 },
    { agi: 43199, eitc: 4781 }],
  ['no EITC married filing separately or without SSNs', { status: 'mfs', wages: 20000, childrenUnder17: 1 },
    { eitc: 0 }],
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
  ['EITC: a self-employment loss reduces earned income (Pub. 596)', { status: 'hoh', wages: 20000, seIncome: 5000, seExpenses: 20000, childrenUnder17: 2 },
    { eitc: 2000 }],
  ['EITC: none with investment income over $12,200', { status: 'hoh', wages: 15000, interest: 20000, childrenUnder17: 2 },
    { eitc: 0 }],
  ['car: costs without business miles are left out', { status: 'single', seIncome: 50000, carCosts: 5000, carMilesTotal: 10000 },
    { carDeduction: 0 }],
  ['car: costs and no miles at all are left out', { status: 'single', seIncome: 50000, carCosts: 8000 },
    { carDeduction: 0 }],
  ['Social Security: half taxable between the base amounts (Pub. 915)', { status: 'single', you65: true, socialSecurity: 24000, retirementIncome: 20000 },
    { taxableSocialSecurity: 3500, agi: 23500 }],
  ['Social Security: up to 85% above the second base amount', { status: 'mfj', wages: 50000, socialSecurity: 40000 },
    { taxableSocialSecurity: 28100 }],
  ['Social Security: none taxable at low income', { status: 'single', socialSecurity: 18000, interest: 2000 },
    { taxableSocialSecurity: 0, agi: 2000 }],
  ['IRA: full deduction without a workplace plan', { status: 'single', wages: 60000, iraYou: 7500 },
    { iraDeduction: 7500, agi: 52500 }],
  ['IRA: phased out with a workplace plan ($81k-$91k)', { status: 'single', wages: 86000, iraYou: 7500, iraCoveredYou: true },
    { iraDeduction: 3750 }],
  ['IRA: catch-up at 50+, limited to pay', { status: 'single', wages: 5000, iraYou: 8600, you50: true },
    { iraDeduction: 5000 }],
  ['IRA: spouse not covered, other spouse covered ($242k-$252k)', { status: 'mfj', wages: 200000, iraYou: 7500, iraSpouse: 7500, iraCoveredYou: true },
    { iraDeduction: 7500 }],
  ['HSA: family limit $8,750', { status: 'single', wages: 70000, hsaContribution: 9000, hsaFamily: true },
    { hsaDeduction: 8750 }],
  ['SEP: 20% of SE earnings after half the SE tax', { status: 'single', seIncome: 100000, sepContribution: 30000 },
    { sepDeduction: 18587 }],
  ['K-1 partnership: box 1 + guaranteed payments carry SE tax; QBI excludes guaranteed payments', { status: 'single', k1Partnership: 50000, k1Guaranteed: 20000 },
    { seTax: 9891, agi: 65055, qbiDeduction: 9011 }],
  ['K-1 S-corp: no SE tax on box 1; salary is W-2', { status: 'single', wages: 60000, k1SCorp: 40000 },
    { seTax: 0, totalIncome: 100000, qbiDeduction: 8000 }],
  ['K-1 limited partner: box 14A = 0 means no SE tax', { status: 'single', k1Partnership: 30000, k1Se: 0 },
    { seTax: 0, qbiDeduction: 2780 }],
  ['K-1 loss offsets other income', { status: 'single', wages: 80000, k1Partnership: -10000 },
    { totalIncome: 70000, seTax: 0 }],
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
const over = estimate({ status: 'single', seIncome: 50000, carMilesH1: 8000, carMilesH2: 8000, carMilesTotal: 10000, carCosts: 8000 });
assert.ok(over.notes.some((n) => /more than all the miles/.test(n)), 'warns when business miles exceed all miles');
const noBiz = estimate({ status: 'single', seIncome: 50000, carCosts: 5000, carMilesTotal: 10000 });
assert.ok(!noBiz.notes.some((n) => /larger deduction/.test(n)), 'no method note when nothing is deducted');
console.log(failed ? `${failed} check(s) failed` : `All ${cases.length} cases passed`);
process.exit(failed ? 1 : 0);
