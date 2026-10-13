// ============================================
// State income tax estimates, tax year 2026.
// Each state is added here as its own entry; states
// without an entry show "coming soon" in the estimator.
// ============================================
(function (root) {
  const NAMES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
    DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
    IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
    NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
    RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
    VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  };

  // No state income tax on wages or business income
  const NO_WAGE_TAX = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];

  // Illinois: flat 4.95% of base income (federal AGI with Illinois changes)
  // minus exemptions. Exemption is the latest amount the Illinois Department
  // of Revenue has published ($2,850, tax year 2025); update when the 2026
  // IL-1040 instructions confirm the indexed figure.
  const IL = {
    rate: 0.0495,
    exemption: 2850,
    seniorExtra: 1000,
    exemptionIncomeLimit: { single: 250000, hoh: 250000, mfs: 250000, mfj: 500000 },
    eicRate: 0.20, // Illinois earned income credit: 20% of the federal credit, refundable
  };

  const num = (v) => Math.max(0, Number(v) || 0);
  const round = (v) => Math.round(v);

  function status(code) {
    if (!code || !NAMES[code]) return 'none';
    if (NO_WAGE_TAX.includes(code)) return 'no-tax';
    if (code === 'IL') return 'supported';
    return 'coming-soon';
  }

  function illinois(input, fed) {
    const s = fed.status;
    const married = s === 'mfj';
    const notes = [];
    const dependents = Math.floor(num(input.childrenUnder17)) + Math.floor(num(input.otherDependents));
    let count = 1 + (married ? 1 : 0) + dependents;
    let exemptions = count * IL.exemption;
    const seniors = (input.you65 ? 1 : 0) + (married && input.spouse65 ? 1 : 0);
    exemptions += seniors * IL.seniorExtra;
    if (fed.agi > IL.exemptionIncomeLimit[s]) {
      exemptions = 0;
      count = 0;
      notes.push('Illinois exemptions are not allowed at this income level.');
    }
    // Illinois does not tax Social Security or qualified retirement income
    const retireSubtraction = Math.min(fed.agi, (fed.taxableSocialSecurity || 0) + (fed.retirementIncome || 0));
    const base = fed.agi - retireSubtraction;
    const taxable = Math.max(0, base - exemptions);
    const tax = taxable * IL.rate;
    const eic = (fed.eitc || 0) * IL.eicRate;
    const paid = num(input.stateWithheld) + num(input.stateEstimated);
    if (retireSubtraction) notes.push('Social Security and retirement income were subtracted: Illinois does not tax them.');
    if (input.mortgage) notes.push('Illinois gives a credit of 5% of property tax paid on your main home, not included here.');
    if (eic) notes.push('Includes the Illinois Earned Income Credit (20% of the federal credit).');
    if (num(input.childrenUnder17) && eic) notes.push('Illinois also has a child tax credit for children under 12, not included here.');
    return {
      code: 'IL', name: NAMES.IL, kind: 'supported',
      agi: round(fed.agi), retireSubtraction: round(retireSubtraction), base: round(base), exemptions: round(exemptions),
      exemptionCount: count, taxable: round(taxable), tax: round(tax), eic: round(eic), paid: round(paid),
      result: round(paid + eic - tax),
      rateLabel: '4.95% flat rate', notes,
    };
  }

  function estimateState(code, input, fed) {
    const kind = status(code);
    if (kind === 'none') return { code: '', kind };
    if (kind === 'no-tax') {
      const paid = num(input.stateWithheld) + num(input.stateEstimated);
      return { code, name: NAMES[code], kind, tax: 0, paid: round(paid), result: round(paid),
        notes: code === 'WA' ? ['Washington taxes some large capital gains, but not wages or business income.'] : [] };
    }
    if (kind === 'coming-soon') return { code, name: NAMES[code], kind };
    return illinois(input, fed);
  }

  const api = { NAMES, NO_WAGE_TAX, status, estimateState, IL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.States = api;
})(typeof window !== 'undefined' ? window : globalThis);
