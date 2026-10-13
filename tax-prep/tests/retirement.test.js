// Run: node tax-prep/tests/retirement.test.js  (QA regression cases for IRA/HSA)
// Expected values from IRS Pub. 590-A Worksheet 1-2 (phase-out reduces the LIMIT,
// deduction = smaller of reduced limit and contribution) and Pub. 969 (HSA catch-up at 55+).
const assert = require('assert');
const path = require('path');
const { estimate } = require(process.env.TAX_JS || path.join(__dirname, '../js/tax2026.js'));
const cases = [
  ['IRA phase-out: small contribution at midpoint keeps full $2,000', { status: 'single', wages: 86000, iraYou: 2000, iraCoveredYou: true }, { iraDeduction: 2000 }],
  ['IRA phase-out: full contribution at midpoint', { status: 'single', wages: 86000, iraYou: 7500, iraCoveredYou: true }, { iraDeduction: 3750 }],
  ['IRA MFS covered, MAGI 5,000: reduced limit 3,750', { status: 'mfs', wages: 5000, iraYou: 5000, iraCoveredYou: true }, { iraDeduction: 3750 }],
  ['IRA MFS spouse covered, MAGI 5,000', { status: 'mfs', wages: 5000, iraYou: 4000, iraCoveredSpouse: true }, { iraDeduction: 3750 }],
  ['IRA MFS spouse covered, MAGI 50,000: none', { status: 'mfs', wages: 50000, iraYou: 7500, iraCoveredSpouse: true }, { iraDeduction: 0 }],
  ['HSA catch-up applies at 65 too', { status: 'single', wages: 50000, hsaContribution: 6000, you65: true }, { hsaDeduction: 5400 }],
];
let fails = 0;
for (const [name, input, exp] of cases) {
  const r = estimate(input);
  for (const k of Object.keys(exp)) {
    try { assert.ok(Math.abs(r[k] - exp[k]) <= 1, `${name}: ${k} expected ${exp[k]}, got ${r[k]}`); }
    catch (e) { fails++; console.error('FAIL', e.message); }
  }
}
if (fails) { console.error(`${fails} failed`); process.exit(1); }
console.log(`All ${cases.length} cases passed`);
