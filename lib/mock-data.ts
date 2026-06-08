import type { DashboardData } from "@/lib/types";

export const MOCK_DASHBOARD: DashboardData = {
  period: "Last Month",
  closerKPIs: {
    cashCollected: 16000,
    totalRevenue: 20000,
    commissionsPaid: 1600,
    dealsClosed: 4,
    noShows: 40,
    cancellations: 15,
    showRate: 29,
    bookedToClose: 5,
    showToClose: 16,
    offerToClose: 24,
    cashPerBookedCall: 186,
    closeRate: 10,
  },
  setterKPIs: {
    totalCallsSet: 89,
    totalShows: 26,
    noShows: 32,
    phoneSetRate: 15,
    phoneShowRate: 30,
    dmBookRate: 1,
    dmShowRate: 0,
    revenueGenerated: 0,
    cashCollected: 0,
  },
  closers: [
    { id: "1", name: "Lucio", rank: 1, cashCollected: 10000, dealsClosed: 2, bookedToClose: 2, avgDealValue: 5000 },
    { id: "2", name: "Adamo", rank: 2, cashCollected: 6000, dealsClosed: 1, bookedToClose: null, avgDealValue: 5000 },
    { id: "3", name: "Charlie", rank: 3, cashCollected: 0, dealsClosed: 0, bookedToClose: null, avgDealValue: null },
  ],
  setters: [
    { id: "1", name: "Fahima", rank: 1, callsSet: 39, revenueGenerated: 0 },
    { id: "2", name: "Joshua", rank: 2, callsSet: 18, revenueGenerated: 0 },
    { id: "3", name: "Charlie", rank: 3, callsSet: 29, revenueGenerated: 0 },
  ],
  deltas: {
    totalRevenue: 12,
    cashCollected: 8,
    dealsClosed: 33,
    closeRate: 5,
  },
  trends: {
    totalRevenue: [14000, 15200, 13800, 16500, 17200, 18000, 19100, 20000],
    cashCollected: [10000, 11500, 12200, 13000, 14100, 14800, 15500, 16000],
    dealsClosed: [1, 2, 1, 3, 2, 3, 4, 4],
    closeRate: [6, 7, 6, 8, 9, 8, 9, 10],
  },
};
