const STORAGE_KEY = 'hfi_data';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : getDefaults();
  } catch { return getDefaults(); }
}

export function saveData(data) {
  data.lastUpdated = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDefaults() {
  return {
    lastUpdated: null,
    household: {
      adults: 2, kids: 2,
      pets: { pug: { name: 'Pug', age: 9, type: 'dog' }, kitten: { name: 'Kitten', age: 0.25, type: 'cat' } },
      vehicles: [
        { name: 'Van', status: 'paid_off', value: 0, loanBalance: 0, loanRate: 0, loanPayment: 0, insurance: 0, fuel: 0, maintenance: 0, repairs: 0 },
        { name: 'Chrysler', status: 'paid_off', value: 0, loanBalance: 0, loanRate: 0, loanPayment: 0, insurance: 0, fuel: 0, maintenance: 0, repairs: 0 },
        { name: '2022 Nissan Sentra SR', status: 'loan', value: 0, loanBalance: 0, loanRate: 0, loanPayment: 0, insurance: 0, fuel: 0, maintenance: 0, repairs: 0 }
      ]
    },
    income: {
      salary: 0, sideIncomeHistory: [], taxSetAside: 0.27,
      surgeAllocation: { debt: 0.50, ef: 0.20, roth: 0.15, college529: 0.10, fun: 0.05 }
    },
    budget: { month: new Date().toISOString().slice(0, 7), categories: {} },
    debts: [],
    credit: { ficoScore: 0, ficoDate: '', aggregateUtilization: 0, cards: [], autopayAll: false, missedPayments: false, dti: 0 },
    savings: { checking: 0, hysa: 0, pugEmergency: 0, vehicleRepair: 0, homeRepair: 0, taxHolding: 0, efTier: 1, monthlyEssentials: 5000 },
    investments: { roth1: 0, roth2: 0, k401: 0, hsa: 0, child529_1: 0, child529_2: 0, taxable: 0, employerMatch: false, matchPercent: 0 },
    pets: { pugSinkingFund: 0, pugAnnualBudget: 1500, pugInsurance: 0, kittenFirstYear: 0, kittenInsurance: 0, kittenVaccines: false, kittenSpayNeuter: false },
    monthlySnapshots: [],
    lifeEvents: []
  };
}

export function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);
}

export function pct(v, t) {
  return t ? Math.round((v / t) * 100) : 0;
}
