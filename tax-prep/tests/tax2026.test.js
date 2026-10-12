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
console.log(failed ? `${failed} check(s) failed` : `All ${cases.length} cases passed`);
process.exit(failed ? 1 : 0);
