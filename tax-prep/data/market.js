// ============================================
// Freight market snapshot used by Falcon Books.
// Refresh this file to update the market check.
// All rates are U.S. national averages per mile.
// ============================================
window.FALCON_MARKET = {
  asOf: '2026-10-12',
  spot: {
    // DAT linehaul, excluding fuel (week beginning Sept. 20, 2026)
    linehaulWeek: '2026-09-20',
    linehaul: { van: 2.17, reefer: 2.71, flatbed: 2.59 },
    // DAT Trendlines all-in national rates, including fuel (October 2026)
    allInMonth: '2026-10',
    allIn: { van: 3.08, reefer: 3.62, flatbed: 3.62 },
  },
  diesel: {
    // EIA weekly U.S. on-highway diesel, week of Oct. 5, 2026
    week: '2026-10-05',
    national: 6.199,
    regions: { 'East Coast': 5.951, Midwest: 6.286, 'Gulf Coast': 5.819, 'Rocky Mountain': 6.267, 'West Coast': 7.229 },
    note: 'Down 18.3 cents from the prior week; record high $6.529 on Sept. 21, 2026.',
  },
  // IRS special M&IE rates for the transportation industry (Notice 2026-60),
  // Oct. 1, 2026 - Sept. 30, 2027; same as the prior year.
  perDiem: { conus: 80, oconus: 86, partialDay: 0.75, deductible: 0.8, period: 'Oct 1, 2026 – Sep 30, 2027', notice: 'IRS Notice 2026-60' },
  sources: [
    { label: 'DAT Trendlines', url: 'https://www.dat.com/trendlines' },
    { label: 'DAT weekly market report', url: 'https://www.ajot.com/news/dat-truckload-market-report-sept-1319-2026-spot-rates-climb-on-higher-diesel-prices' },
    { label: 'EIA diesel prices', url: 'https://www.eia.gov/dnav/pet/pet_pri_gnd_a_epd2d_pte_dpgal_w.htm' },
    { label: 'IRS Notice 2026-60', url: 'https://www.irs.gov/pub/irs-drop/n-26-60.pdf' },
  ],
};
