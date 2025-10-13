const dashboard = require('../../dashboard/index.service');

describe('dashboard service exports', () => {
  it('matches expected surface', () => {
    expect(Object.keys(dashboard).sort()).toMatchInlineSnapshot(`
[
  "getCustomerCLV",
  "getEmergencyAccess",
  "getFacilityHeatmap",
  "getIncidentAnalytics",
  "getOccupancy",
  "getParentCommunication",
  "getRevenueOptimizer",
  "getShiftHandoff",
  "getSocialCompatibility",
  "getStaffingIntelligence",
  "getStats",
  "getUpcomingVaccinations",
  "getWellnessMonitoring",
  "metrics",
  "reports",
  "widgets",
]
`);
  });

  it('provides namespace helpers', () => {
    expect(Object.keys(dashboard.metrics)).toEqual([
      'getStats',
      'getOccupancy',
      'getUpcomingVaccinations',
    ]);
    expect(Object.keys(dashboard.reports)).toEqual([
      'getRevenueOptimizer',
      'getStaffingIntelligence',
      'getCustomerCLV',
      'getIncidentAnalytics',
    ]);
    expect(Object.keys(dashboard.widgets)).toEqual([
      'getShiftHandoff',
      'getEmergencyAccess',
      'getWellnessMonitoring',
      'getParentCommunication',
      'getFacilityHeatmap',
      'getSocialCompatibility',
    ]);
  });
});
