<script>
  import { fmt, pct } from '../lib/storage.js';
  let { data } = $props();

  const totalDebt = $derived((data.debts || []).reduce((s, d) => s + (d.balance || 0), 0));
  const totalSavings = $derived((data.savings?.hysa || 0) + (data.savings?.checking || 0) + (data.savings?.pugEmergency || 0) + (data.savings?.vehicleRepair || 0) + (data.savings?.homeRepair || 0));
  const totalInvested = $derived((data.investments?.roth1 || 0) + (data.investments?.roth2 || 0) + (data.investments?.k401 || 0) + (data.investments?.hsa || 0) + (data.investments?.child529_1 || 0) + (data.investments?.child529_2 || 0) + (data.investments?.taxable || 0));
  const netWorth = $derived(totalSavings + totalInvested - totalDebt);
  const efTarget = $derived((data.savings?.monthlyEssentials || 5000) * 6);
  const efProg = $derived(pct(data.savings?.hysa || 0, efTarget));
  const util = $derived(data.credit?.aggregateUtilization || 0);
  const fico = $derived(data.credit?.ficoScore || 0);
</script>

<div class="dash fade-in">
  <div class="kpi-grid">
    <div class="card kpi">
      <span class="kpi-label">Net Worth</span>
      <span class="kpi-value" class:positive={netWorth >= 0} class:negative={netWorth < 0}>{fmt(netWorth)}</span>
      <span class="badge" class:bg-green={netWorth >= 0} class:bg-red={netWorth < 0}>{netWorth >= 0 ? '↑ Positive' : '↓ Negative'}</span>
    </div>
    <div class="card kpi">
      <span class="kpi-label">Total Debt</span>
      <span class="kpi-value negative">{fmt(totalDebt)}</span>
      <span class="badge bg-red">{(data.debts || []).length} accounts</span>
    </div>
    <div class="card kpi">
      <span class="kpi-label">Total Savings</span>
      <span class="kpi-value positive">{fmt(totalSavings)}</span>
      <span class="badge bg-green">HYSA + Sinking</span>
    </div>
    <div class="card kpi">
      <span class="kpi-label">FICO Score</span>
      <span class="kpi-value" class:positive={fico >= 670} class:warn={fico > 0 && fico < 670}>{fico || '---'}</span>
      <span class="badge" class:bg-green={fico >= 670} class:bg-amber={fico > 0 && fico < 670} class:bg-red={fico === 0}>{data.credit?.ficoDate || 'No data'}</span>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <div class="card-head"><span class="card-title">Emergency Fund Progress</span><span class="badge bg-accent">Tier {data.savings?.efTier || 1}</span></div>
      <div class="progress-info"><span>{fmt(data.savings?.hysa)} of {fmt(efTarget)}</span><span class="bold">{efProg}%</span></div>
      <div class="track"><div class="fill" class:green={efProg >= 100} class:accent={efProg >= 50 && efProg < 100} class:amber={efProg < 50} style="width:{Math.min(efProg,100)}%"></div></div>
      <div class="tiers">
        <div class="tier t1"><span class="tl">Tier 1</span><span class="td">Starter EF: $2,000–$2,500</span></div>
        <div class="tier t2"><span class="tl">Tier 2</span><span class="td">Working EF: 1 month essentials</span></div>
        <div class="tier t3"><span class="tl">Tier 3</span><span class="td">Full EF: 6 months (~{fmt(efTarget)})</span></div>
        <div class="tier t4"><span class="tl">Tier 4</span><span class="td">Sinking funds layer</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span class="card-title">Priority Scoreboard</span></div>
      <div class="priorities">
        <div class="pri"><span class="dot red"></span><div><strong>1. Debt Elimination & Credit Repair</strong><span class="sub">Total debt: {fmt(totalDebt)} | FICO: {fico || '---'}</span></div></div>
        <div class="pri"><span class="dot amber"></span><div><strong>2. Emergency Fund Build</strong><span class="sub">Progress: {efProg}% of Tier 3 target</span></div></div>
        <div class="pri"><span class="dot accent"></span><div><strong>3. College Funding</strong><span class="sub">529s: {fmt((data.investments?.child529_1 || 0) + (data.investments?.child529_2 || 0))}</span></div></div>
        <div class="pri"><span class="dot teal"></span><div><strong>4. Retirement Savings</strong><span class="sub">401(k): {fmt(data.investments?.k401)} | Roth: {fmt((data.investments?.roth1 || 0) + (data.investments?.roth2 || 0))}</span></div></div>
      </div>
    </div>
  </div>

  <div class="three-col">
    <div class="card">
      <div class="card-head"><span class="card-title">Credit Utilization</span><span class="badge" class:bg-green={util <= 10} class:bg-amber={util > 10 && util <= 30} class:bg-red={util > 30}>{util.toFixed(1)}%</span></div>
      <div class="track tall"><div class="fill" class:green={util <= 10} class:amber={util > 10 && util <= 30} class:red={util > 30} style="width:{Math.min(util,100)}%"></div></div>
      <div class="range-labels"><span>Target: &lt;10%</span><span>Danger: &gt;30%</span></div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Pet Sinking Funds</span><span>♥</span></div>
      <p class="pet-line">Pug Emergency: <strong>{fmt(data.pets?.pugSinkingFund)}</strong> <span class="muted">/ $3K–$5K</span></p>
      <div class="track"><div class="fill teal" style="width:{Math.min(pct(data.pets?.pugSinkingFund || 0, 4000),100)}%"></div></div>
      <p class="pet-line" style="margin-top:0.6rem;">Kitten 1st Year: <strong>{fmt(data.pets?.kittenFirstYear)}</strong> <span class="muted">/ $1K–$2K</span></p>
      <div class="track"><div class="fill accent" style="width:{Math.min(pct(data.pets?.kittenFirstYear || 0, 1500),100)}%"></div></div>
    </div>
    <div class="card">
      <div class="card-head"><span class="card-title">Vehicles</span><span class="badge bg-amber">{data.household?.vehicles?.length || 3} active</span></div>
      {#each (data.household?.vehicles || []) as v}
        <div class="veh-row"><span>{v.name}</span><span class="badge" class:bg-amber={v.status==='loan'} class:bg-green={v.status!=='loan'}>{v.status === 'loan' ? 'Loan' : 'Paid off'}</span></div>
      {/each}
      <div class="alert-warn">⚠ Three vehicles for one driver is structurally expensive</div>
    </div>
  </div>
</div>

<style>
  .dash { display: flex; flex-direction: column; gap: 1.5rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; transition: all var(--transition); }
  .card:hover { border-color: rgba(99,102,241,0.3); box-shadow: 0 0 20px var(--accent-glow); }
  .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .card-title { font-size: 0.95rem; font-weight: 600; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; }
  .kpi { display: flex; flex-direction: column; gap: 0.3rem; }
  .kpi-label { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .kpi-value { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em; }
  .positive { color: var(--green); }
  .negative { color: var(--red); }
  .warn { color: var(--amber); }
  .badge { display: inline-flex; align-items: center; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 99px; }
  .bg-green { color: var(--green); background: var(--green-glow); }
  .bg-red { color: var(--red); background: var(--red-glow); }
  .bg-amber { color: var(--amber); background: var(--amber-glow); }
  .bg-accent { color: var(--accent-light); background: var(--accent-glow); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .three-col { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
  .progress-info { display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.4rem; }
  .bold { font-weight: 600; }
  .track { width: 100%; height: 8px; background: var(--bg-primary); border-radius: 99px; overflow: hidden; }
  .track.tall { height: 10px; }
  .fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .fill.green { background: linear-gradient(90deg,#22c55e,#4ade80); }
  .fill.accent { background: linear-gradient(90deg,var(--accent),var(--accent-light)); }
  .fill.amber { background: linear-gradient(90deg,#f59e0b,#fbbf24); }
  .fill.red { background: linear-gradient(90deg,#ef4444,#f87171); }
  .fill.teal { background: linear-gradient(90deg,#14b8a6,#2dd4bf); }
  .tiers { display: flex; flex-direction: column; gap: 0.4rem; margin-top: 1rem; }
  .tier { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); border-left: 3px solid; }
  .t1 { border-color: var(--green); background: var(--green-glow); }
  .t2 { border-color: var(--accent); background: var(--accent-glow); }
  .t3 { border-color: var(--amber); background: var(--amber-glow); }
  .t4 { border-color: var(--red); background: var(--red-glow); }
  .tl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; min-width: 3rem; }
  .td { font-size: 0.8rem; color: var(--text-secondary); }
  .priorities { display: flex; flex-direction: column; gap: 0.7rem; }
  .pri { display: flex; align-items: flex-start; gap: 0.8rem; }
  .pri div { display: flex; flex-direction: column; }
  .pri strong { font-size: 0.85rem; }
  .sub { font-size: 0.75rem; color: var(--text-muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 0.35rem; }
  .dot.red { background: var(--red); }
  .dot.amber { background: var(--amber); }
  .dot.accent { background: var(--accent); }
  .dot.teal { background: var(--teal); }
  .range-labels { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.5rem; }
  .pet-line { font-size: 0.85rem; margin-bottom: 0.3rem; }
  .muted { color: var(--text-muted); }
  .veh-row { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .alert-warn { margin-top: 0.8rem; font-size: 0.78rem; color: var(--amber); background: var(--amber-glow); padding: 0.5rem 0.7rem; border-radius: var(--radius-sm); border-left: 3px solid var(--amber); }
  @media (max-width: 1024px) { .kpi-grid, .three-col { grid-template-columns: repeat(2,1fr); } }
  @media (max-width: 768px) { .kpi-grid, .two-col, .three-col { grid-template-columns: 1fr; } }
</style>
