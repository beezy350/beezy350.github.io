// ============================================
// Federal income tax estimate, tax year 2026
// (returns filed in early 2027).
//
// Sources: IRS Rev. Proc. 2025-32 (brackets, standard deduction),
// One Big Beautiful Bill Act (child tax credit, tips, overtime,
// senior deduction), SSA 2026 wage base.
//
// This is a planning estimate. It leaves out capital gains rates,
// itemized deductions, EITC, education credits, AMT, and the
// additional Medicare tax. Update the numbers every tax year.
// ============================================
(function (root) {
  const TY = 2026;

  const BRACKETS = {
    single: [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]],
    mfj:    [[24800, 0.10], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]],
    mfs:    [[12400, 0.10], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [384350, 0.35], [Infinity, 0.37]],
    hoh:    [[17700, 0.10], [67450, 0.12], [105700, 0.22], [201750, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]],
  };

  const STANDARD_DEDUCTION = { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150 };
  // Extra standard deduction per person aged 65+
  const AGE65_EXTRA = { single: 2050, hoh: 2050, mfj: 1650, mfs: 1650 };

  const SENIOR_DEDUCTION = 6000;           // per person 65+, phases out 6% of MAGI over threshold
  const SENIOR_PHASEOUT = { single: 75000, hoh: 75000, mfj: 150000 };

  const TIPS_MAX = 25000;                   // per return
  const OVERTIME_MAX = { single: 12500, hoh: 12500, mfj: 25000 };
  const TIPS_OT_PHASEOUT = { single: 150000, hoh: 150000, mfj: 300000 }; // $100 per $1,000 over

  const CTC_PER_CHILD = 2200;
  const ACTC_MAX_PER_CHILD = 1700;          // refundable part
  const ODC_PER_DEPENDENT = 500;
  const CTC_PHASEOUT = { single: 200000, hoh: 200000, mfs: 200000, mfj: 400000 };

  // Earned income tax credit, 2026 (Rev. Proc. 2025-32), by qualifying children 0-3+
  const EITC = {
    max: [664, 4427, 7316, 8231],
    phaseInRate: [0.0765, 0.34, 0.40, 0.45],
    phaseOutRate: [0.0765, 0.1598, 0.2106, 0.2106],
    threshold: { mfj: [18140, 31160, 31160, 31160], other: [10860, 23890, 23890, 23890] },
  };

  const SS_WAGE_BASE = 184500;
  // Transportation-industry per diem (IRS Notice 2026-60): $80/day in the U.S.,
  // travel days at 75%, 80% deductible for drivers under DOT hours rules.
  const PER_DIEM = { rate: 80, canadaRate: 86, partialDay: 0.75, deductible: 0.8 };
  // Business standard mileage: 72.5 cents through June 30, 76 cents from
  // July 1, 2026 (IRS Notice 2026-10, Announcement 2026-11)
  const MILEAGE = { h1: 0.725, h2: 0.76 };
  const QBI_RATE = 0.20;
  // QBI threshold (Rev. Proc. 2025-32) and OBBBA phase-in range
  const QBI_THRESHOLD = { single: 201750, hoh: 201750, mfs: 201750, mfj: 403500 };
  const QBI_PHASE_IN = { single: 75000, hoh: 75000, mfs: 75000, mfj: 150000 };
  const MAX_AMOUNT = 1e9;
  const YEAR_DAYS = 365;

  const finite = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.max(-MAX_AMOUNT, Math.min(MAX_AMOUNT, n)) : 0; };
  const num = (v) => Math.max(0, finite(v));
  const round = (v) => Math.round(v);

  function bracketTax(taxable, status) {
    let tax = 0;
    let lower = 0;
    for (const [upper, rate] of BRACKETS[status]) {
      if (taxable <= lower) break;
      tax += (Math.min(taxable, upper) - lower) * rate;
      lower = upper;
    }
    return tax;
  }

  function marginalRate(taxable, status) {
    for (const [upper, rate] of BRACKETS[status]) {
      if (taxable <= upper) return rate;
    }
    return 0.37;
  }

  // $100 reduction per $1,000 (or part) over the threshold
  function phaseDown(amount, magi, threshold) {
    if (magi <= threshold) return amount;
    return Math.max(0, amount - Math.ceil((magi - threshold) / 1000) * 100);
  }

  function estimate(input) {
    const status = BRACKETS[input.status] ? input.status : 'single';
    const married = status === 'mfj';
    const mfs = status === 'mfs';
    const notes = [];

    const wages = num(input.wages);
    const withheld = num(input.withheld);
    const tips = Math.min(num(input.tips), wages);
    const overtime = Math.min(num(input.overtimePremium), wages);
    // Truck driver per diem is a business deduction for the self-employed only
    const seIncome = finite(input.seIncome); // a business loss can be negative
    const hasBusiness = seIncome !== 0;
    // a year has 365 days: full days first, then travel days.
    // perDiemCanada = how many of the full days were in Canada ($86).
    const pdFull = Math.min(num(input.perDiemFull), YEAR_DAYS);
    const pdCanada = Math.min(num(input.perDiemCanada), pdFull);
    const pdPartial = Math.min(num(input.perDiemPartial), YEAR_DAYS - pdFull);
    const perDiemDeduction = hasBusiness
      ? ((pdFull - pdCanada) * PER_DIEM.rate + pdCanada * PER_DIEM.canadaRate +
         pdPartial * PER_DIEM.rate * PER_DIEM.partialDay) * PER_DIEM.deductible
      : 0;
    if (!hasBusiness && (pdFull || pdPartial)) {
      notes.push('Per diem was left out: employee drivers cannot deduct unreimbursed travel meals on their federal return. Ask your employer about a per diem reimbursement plan.');
    }
    // Business car: the larger of standard mileage and actual costs x the
    // business share of all miles. Self-employed only.
    const milesH1 = num(input.carMilesH1), milesH2 = num(input.carMilesH2);
    const bizMiles = milesH1 + milesH2;
    const totalMiles = num(input.carMilesTotal);
    const carCosts = num(input.carCosts);
    let carStandard = 0, carActual = 0, carShare = null, carDeduction = 0, carMethod = '';
    if (hasBusiness && (bizMiles || carCosts)) {
      carStandard = milesH1 * MILEAGE.h1 + milesH2 * MILEAGE.h2;
      if (totalMiles > 0) carShare = Math.min(1, bizMiles / totalMiles);
      else if (!bizMiles) carShare = 1; // costs but no miles at all
      carActual = carShare == null ? 0 : carCosts * carShare;
      carMethod = carActual > carStandard ? 'actual' : 'standard';
      carDeduction = Math.max(carStandard, carActual);
      if (!bizMiles) notes.push('Car costs were counted in full because no business miles were entered. The IRS requires a mileage log, and only the business share of car costs is deductible.');
      else if (carCosts && !totalMiles) notes.push('Add the total miles you drove in 2026 so we can compare your actual car costs with the mileage rate. Standard mileage was used for now.');
      notes.push(carMethod === 'actual'
        ? 'Car: actual costs gave the larger deduction. If you used standard mileage for this car in an earlier year, a preparer will confirm which method you can use.'
        : 'Car: the IRS mileage rate gave the larger deduction. Keep your mileage log or app trip history.');
    } else if (!hasBusiness && (bizMiles || carCosts)) {
      notes.push('Car costs were left out: they count only against self-employment income.');
    }
    const seNet = seIncome - num(input.seExpenses) - perDiemDeduction - carDeduction; // can be a loss
    const interest = num(input.interest);
    const unemployment = num(input.unemployment);
    const otherIncome = num(input.otherIncome);
    const estPayments = num(input.estimatedPayments);
    const kids = Math.floor(num(input.childrenUnder17));
    const otherDeps = Math.floor(num(input.otherDependents));
    const seniors = (input.you65 ? 1 : 0) + (married && input.spouse65 ? 1 : 0);

    // Self-employment tax (Schedule SE)
    let seTax = 0;
    if (seNet * 0.9235 >= 400) {
      const base = seNet * 0.9235;
      const ssRoom = Math.max(0, SS_WAGE_BASE - wages);
      seTax = Math.min(base, ssRoom) * 0.124 + base * 0.029;
    }
    const halfSeTax = seTax / 2;

    const totalIncome = wages + seNet + interest + unemployment + otherIncome;
    const agi = Math.max(0, totalIncome - halfSeTax);

    // Standard deduction (+ age 65 add-on)
    const standard = STANDARD_DEDUCTION[status] + AGE65_EXTRA[status] * seniors;

    // 2025 law deductions, not available married filing separately
    let tipsDeduction = 0, overtimeDeduction = 0, seniorDeduction = 0;
    if (mfs) {
      if (tips || overtime || input.you65) notes.push('Tips, overtime and senior deductions are not allowed when married filing separately.');
    } else {
      tipsDeduction = phaseDown(Math.min(tips, TIPS_MAX), agi, TIPS_OT_PHASEOUT[status]);
      overtimeDeduction = phaseDown(Math.min(overtime, OVERTIME_MAX[status]), agi, TIPS_OT_PHASEOUT[status]);
      const seniorBase = SENIOR_DEDUCTION * seniors;
      seniorDeduction = Math.max(0, seniorBase - Math.max(0, agi - SENIOR_PHASEOUT[status]) * 0.06);
    }

    const beforeQbi = Math.max(0, agi - standard - tipsDeduction - overtimeDeduction - seniorDeduction);

    // Qualified business income deduction, simple case only
    let qbi = 0;
    const qbiBase = seNet - halfSeTax;
    if (qbiBase > 0) {
      // Above the threshold the deduction phases down to zero over the
      // phase-in range (sole proprietor with no W-2 payroll or property).
      const over = Math.max(0, beforeQbi - QBI_THRESHOLD[status]);
      const keep = Math.max(0, 1 - over / QBI_PHASE_IN[status]);
      qbi = Math.min(qbiBase * QBI_RATE * keep, beforeQbi * QBI_RATE);
      if (over > 0) {
        notes.push('Your income is above the limit for the full 20% business income deduction, so it is reduced here. Paying wages or owning business property can change this; a preparer will check.');
      }
    }

    const taxable = Math.max(0, beforeQbi - qbi);
    const incomeTax = bracketTax(taxable, status);

    // Child tax credit + credit for other dependents
    // phases out at $50 per $1,000 (or part) of income over the threshold
    const ctcFull = kids * CTC_PER_CHILD + otherDeps * ODC_PER_DEPENDENT;
    const over = Math.max(0, agi - CTC_PHASEOUT[status]);
    const ctcAllowed = Math.max(0, ctcFull - Math.ceil(over / 1000) * 50);

    const nonrefundableUsed = Math.min(ctcAllowed, incomeTax);
    const unused = ctcAllowed - nonrefundableUsed;

    // Refundable additional child tax credit
    const earned = wages + Math.max(0, seNet - halfSeTax);
    const kidsShare = Math.min(ctcAllowed, kids * CTC_PER_CHILD);
    const actc = Math.min(
      unused,
      kidsShare,
      kids * ACTC_MAX_PER_CHILD,
      Math.max(0, earned - 2500) * 0.15
    );

    // Earned income tax credit (refundable). Counted only with qualifying
    // children; childless workers must be 25-64, which we don't ask.
    let eitc = 0;
    const eitcKids = Math.min(3, kids);
    if (eitcKids > 0 && !mfs && !input.noSsn && earned > 0) {
      const th = EITC.threshold[married ? 'mfj' : 'other'][eitcKids];
      const phasedIn = Math.min(EITC.max[eitcKids], earned * EITC.phaseInRate[eitcKids]);
      eitc = Math.max(0, phasedIn - Math.max(0, Math.max(agi, earned) - th) * EITC.phaseOutRate[eitcKids]);
    }

    const totalTax = incomeTax - nonrefundableUsed + seTax;
    const payments = withheld + estPayments + actc + eitc;
    const result = payments - totalTax; // positive = refund

    // Flags for things a preparer should check
    if (eitc > 0) {
      notes.push('Includes the Earned Income Tax Credit. It needs valid SSNs for everyone on the return, children who lived with you over half the year, and investment income under the IRS limit; a preparer will confirm.');
    } else if (kids === 0 && !mfs && earned > 0 && agi < (married ? 26820 : 19540)) {
      notes.push('If you are 25 to 64, you may qualify for a small Earned Income Tax Credit (up to $664), not included here.');
    }
    if (agi > (married ? 250000 : 200000)) {
      notes.push('High earners may owe an additional 0.9% Medicare tax or 3.8% investment tax, not included here.');
    }
    if (input.hasInvestments) {
      notes.push('Stock sales and dividends can be taxed at lower capital gains rates. They are not included in this estimate.');
    }

    return {
      taxYear: TY,
      status,
      totalIncome: round(totalIncome),
      agi: round(agi),
      standardDeduction: standard,
      tipsDeduction: round(tipsDeduction),
      overtimeDeduction: round(overtimeDeduction),
      seniorDeduction: round(seniorDeduction),
      qbiDeduction: round(qbi),
      perDiemDeduction: round(perDiemDeduction),
      carDeduction: round(carDeduction),
      carMethod,
      carStandard: round(carStandard),
      carActual: round(carActual),
      carShare,
      taxableIncome: round(taxable),
      incomeTax: round(incomeTax),
      childCredits: round(nonrefundableUsed),
      refundableChildCredit: round(actc),
      eitc: round(eitc),
      seTax: round(seTax),
      totalTax: round(totalTax),
      withheld: round(withheld),
      estimatedPayments: round(estPayments),
      result: round(result),
      marginalRate: marginalRate(taxable, status),
      notes,
    };
  }

  const api = { estimate, bracketTax, TY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tax2026 = api;
})(typeof window !== 'undefined' ? window : globalThis);
