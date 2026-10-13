// Run: node tax-prep/tests/states.test.js
const assert = require('assert');
const { estimate } = require('../js/tax2026.js');
const St = require('../js/states.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

// Single, W-2 $50,000, Illinois withheld $2,400
const in1 = { status: 'single', wages: 50000, stateWithheld: 2400 };
const il1 = St.estimateState('IL', in1, estimate(in1));
eq([il1.base, il1.exemptions, il1.taxable, il1.tax, il1.result], [50000, 2850, 47150, Math.round(47150 * 0.0495), 2400 - Math.round(47150 * 0.0495)]);

// Married filing jointly, 2 kids, both 65+: 4 exemptions + 2 senior extras
const in2 = { status: 'mfj', wages: 120000, childrenUnder17: 2, you65: true, spouse65: true };
const il2 = St.estimateState('IL', in2, estimate(in2));
eq([il2.exemptionCount, il2.exemptions], [4, 4 * 2850 + 2000]);

// Married filing separately: only your own exemption, spouse 65 ignored
const in3 = { status: 'mfs', wages: 40000, spouse65: true };
eq(St.estimateState('IL', in3, estimate(in3)).exemptions, 2850);

// Exemptions lost above the income limit
const in4 = { status: 'single', wages: 260000 };
eq(St.estimateState('IL', in4, estimate(in4)).exemptions, 0);

// Self-employed: Illinois starts from AGI after half of SE tax
const in5 = { status: 'single', seIncome: 88000, seExpenses: 42000 };
const f5 = estimate(in5);
eq(St.estimateState('IL', in5, f5).base, f5.agi);

// No-tax states refund any state withholding; others are coming soon
eq(St.estimateState('TX', { stateWithheld: 0 }, estimate({ status: 'single' })).tax, 0);
eq(St.estimateState('FL', { stateWithheld: 100 }, estimate({ status: 'single' })).result, 100);
eq(St.estimateState('CA', {}, estimate({ status: 'single' })).kind, 'coming-soon');
eq(St.estimateState('', {}, estimate({ status: 'single' })).kind, 'none');
// Illinois does not tax Social Security or retirement income
const ret = { status: 'single', you65: true, socialSecurity: 24000, retirementIncome: 20000, interest: 1000 };
const rf = estimate(ret);
const ri = St.estimateState('IL', ret, rf);
eq([ri.retireSubtraction, ri.base], [rf.taxableSocialSecurity + 20000, 1000]);
// Illinois earned income credit: 20% of the federal credit, refundable
const ek = { status: 'mfj', childrenUnder17: 2, seIncome: 88000, seExpenses: 42000 };
const ef = estimate(ek);
eq(St.estimateState('IL', ek, ef).eic, Math.round(ef.eitc * 0.2));

eq(Object.keys(St.NAMES).length, 51, '50 states + DC');
eq(St.NO_WAGE_TAX.length, 9);

console.log(`All ${n} checks passed`);
