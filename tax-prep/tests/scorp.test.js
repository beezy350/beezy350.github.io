// Run: node tax-prep/tests/scorp.test.js
const assert = require('assert');
const S = require('../js/scorp.js');
const T = require('../js/tax2026.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const r = (v) => Math.round(v);

// Payroll taxes: 15.3% on the salary (both halves) plus FUTA 0.6% of $7,000
const c = S.compare({ status: 'single', state: 'TX', profit: 80000, salary: 40000, costs: 2000 });
eq(r(c.scorp.payrollTax), r(40000 * 0.153 + 42));
// K-1 = profit - salary - employer FICA - FUTA - costs
eq(r(c.scorp.k1), r(80000 - 40000 - 40000 * 0.0765 - 42 - 2000));
// Sole proprietor side matches the estimator exactly
const sp = T.estimate({ status: 'single', seIncome: 80000 });
eq(r(c.sole.total), r(-sp.result));
// Savings = difference of the totals; positive at $80k profit, half salary
eq(r(c.savings), r(c.sole.total - c.scorp.total));
assert.ok(c.savings > 0); n++;
// Low profit: costs outweigh savings
assert.ok(S.compare({ status: 'single', state: 'TX', profit: 20000, salary: 10000, costs: 2000 }).savings < 0); n++;
// Illinois adds the 1.5% replacement tax on S-corp income
const il = S.compare({ status: 'single', state: 'IL', profit: 80000, salary: 40000, costs: 2000 });
eq(r(il.scorp.replacementTax), r(il.scorp.k1 * 0.015));
// Salary is capped at the profit; low salary warns
eq(S.compare({ profit: 30000, salary: 90000 }).salary, 30000);
assert.ok(S.compare({ profit: 100000, salary: 10000 }).notes.some((x) => /reasonable salary/.test(x))); n++;
// Higher salary always saves less (more payroll tax)
const rows = S.salaryTable({ status: 'single', state: 'TX', profit: 100000, costs: 2000 });
assert.ok(rows.every((x, i) => i === 0 || x.savings < rows[i - 1].savings)); n++;
console.log(`All ${n} checks passed`);
