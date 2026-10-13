// Run: node tax-prep/tests/organizer-map.test.js
const assert = require('assert');
const M = require('../js/organizer-map.js');
const St = require('../js/states.js');
let n = 0;
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

eq([M.money('$1,234.50'), M.money('(20)'), M.money(''), M.money('abc')], [1234.5, -20, 0, 0]);
eq(M.day('2026-03-09') - M.day('2026-03-02'), 7);
eq(M.day('3/9/2026') - M.day('03-02-26'), 7, 'US date formats');
eq(M.day('next week'), null);

// Single, no dependents, W-2 only, state typed as a code
const a = M.fromPdfFields({ status_single: true, state: 'tx', birth_you: '1990', job1_wages: '50,000', job1_fed: '5000' }, St.NAMES);
eq([a.status, a.state, a.hasDeps, a.wages, a.withheld, a.isTrucker, a.seExpenses], ['single', 'TX', 'no', 50000, 5000, 0, 0]);

// No status checked defaults to single; spouse 65 counts only on joint returns
eq(M.fromPdfFields({}, St.NAMES).status, 'single');
eq(M.fromPdfFields({ status_mfs: true, birth_spouse: '1950' }, St.NAMES).spouse65, 0);
eq(M.fromPdfFields({ status_mfj: true, birth_spouse: '1950' }, St.NAMES).spouse65, 1);

// Dependents: a row without a name is ignored; 2010+ counts as a child
const deps = M.fromPdfFields({ dep1_name: 'A', dep1_year: '2012', dep2_name: 'B', dep2_year: '1950', dep3_year: '2015' }, St.NAMES);
eq([deps.childrenUnder17, deps.otherDependents, deps.hasDeps], [1, 1, 'yes']);

// Meals field carries 50% in its name; cash tips count as wages and tips
const ex = M.fromPdfFields({ exp_business_meals_enter_full_amount_50: '1000', exp_fuel_diesel_100: '200', income_cashtips: '300' }, St.NAMES);
eq([ex.seExpenses, ex.wages, ex.tips], [700, 300, 300]);

// Trip: 7 nights with 2 Canada days -> 4 U.S. + 2 Canada full days, 2 travel days
const t = M.fromPdfFields({ trip1_leave: '2026-03-02', trip1_return: '3/9/2026', trip1_canada: '2', trip2_leave: '2026-04-01', trip2_return: '2026-04-01' }, St.NAMES);
eq([t.isTrucker, t.perDiemFull, t.perDiemCanada, t.perDiemPartial], [1, 6, 2, 2], 'same-day trip ignored');

eq([M.money('$-500'), M.money('1e5'), M.money('41,000.00')], [-500, 100000, 41000]);
eq(M.day('2/30/2026'), null, 'impossible date');

// Overlapping trips count each day once
const ov = M.fromPdfFields({ trip1_leave: '2026-03-01', trip1_return: '2026-03-31', trip2_leave: '2026-03-10', trip2_return: '2026-03-20' }, St.NAMES);
eq([ov.perDiemFull, ov.perDiemPartial], [29, 2], 'overlap merged');
// Only 2026 days count
const yr = M.fromPdfFields({ trip1_leave: '2025-12-30', trip1_return: '2026-01-03' }, St.NAMES);
eq([yr.perDiemFull, yr.perDiemPartial], [2, 1], 'clipped to 2026');
const big = M.fromPdfFields({ trip1_leave: '2025-01-01', trip1_return: '2027-12-31' }, St.NAMES);
eq([big.perDiemFull, big.perDiemPartial], [365, 0], 'never more than a year');
// Excel rows arrive as Date objects
eq(M.perDiemDays([{ leave: new Date(Date.UTC(2026, 2, 2)), back: new Date(Date.UTC(2026, 2, 9)), canada: 2 }]), { full: 6, canada: 2, travel: 2 });

// Business car: miles stay separate, every other car_ field is a cost
const car = M.fromPdfFields({ car_miles_h1: '12,000', car_miles_h2: '8000', car_miles_total: '30000', car_gas: '4000', car_rent: '$7,200', car_wash: '300' }, St.NAMES);
eq([car.usesCar, car.carMilesH1, car.carMilesH2, car.carMilesTotal, car.carCosts], [1, 12000, 8000, 30000, 11500]);
eq(M.fromPdfFields({}, St.NAMES).usesCar, 0);

// Social Security, retirement and savings fields; ages from birth years
const ss = M.fromPdfFields({ status_mfj: true, birth_you: '1958', birth_spouse: '1974', income_socialsecurity: '30,000', income_retirement: '12000',
  income_other: '500', income_withheld: '1500', job1_fed: '100', ira_you: '8600', ira_covered_spouse: true, hsa_amount: '5000', hsa_family: true }, St.NAMES);
eq([ss.socialSecurity, ss.retirementIncome, ss.otherIncome, ss.withheld, ss.iraYou, ss.iraCoveredSpouse, ss.hsaFamily, ss.you50, ss.spouse50, ss.you55],
  [30000, 12000, 500, 1600, 8600, 1, 1, 1, 1, 1]);

eq(M.isOrganizer(['status_single', 'exp_fuel_diesel_100']), true);
eq(M.isOrganizer(['Text1', 'Check2']), false);
console.log(`All ${n} checks passed`);
