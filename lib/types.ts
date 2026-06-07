export interface CloserKPIs {
  cashCollected: number;
  totalRevenue: number;
  commissionsPaid: number;
  dealsClosed: number;
  noShows: number;
  cancellations: number;
  showRate: number;
  bookedToClose: number;
  showToClose: number;
  offerToClose: number;
  cashPerBookedCall: number;
  closeRate: number;
}

export interface SetterKPIs {
  totalCallsSet: number;
  totalShows: number;
  noShows: number;
  phoneSetRate: number;
  phoneShowRate: number;
  dmBookRate: number;
  dmShowRate: number;
  revenueGenerated: number;
  cashCollected: number;
}

export interface CloserRep {
  id: string;
  name: string;
  rank: number;
  cashCollected: number;
  bookedToClose: number | null;
  avgDealValue: number | null;
}

export interface SetterRep {
  id: string;
  name: string;
  rank: number;
  callsSet: number;
  revenueGenerated: number;
}

export interface Offer {
  id: string;
  name: string;
  closerSheetUrl: string;
  phoneSetterSheetUrl: string;
  dmSetterSheetUrl: string;
  lastSynced: string | null;
}

export interface DashboardData {
  period: string;
  closerKPIs: CloserKPIs;
  setterKPIs: SetterKPIs;
  closers: CloserRep[];
  setters: SetterRep[];
  deltas: {
    totalRevenue: number;
    cashCollected: number;
    dealsClosed: number;
    closeRate: number;
  };
  trends: {
    totalRevenue: number[];
    cashCollected: number[];
    dealsClosed: number[];
    closeRate: number[];
  };
}
