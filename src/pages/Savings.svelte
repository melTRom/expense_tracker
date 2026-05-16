<script>
  import { fmt, pct } from '../lib/storage.js';
  let { data, onsave } = $props();
  let s = $state({ ...data.savings });

  const efTarget = $derived(s.monthlyEssentials * 6);
  const efProg = $derived(pct(s.hysa, efTarget));

  const tiers = [
    { id: 1, label: 'Tier 1 — Starter EF', target: '$2,000–$2,500', desc: 'One-month cushion + buffer for one vet emergency. Ramsey\'s $1K too low for senior pug.', color: 'green' },
    { id: 2, label: 'Tier 2 — Working EF', target: '1 month essentials', desc: 'Housing + utilities + groceries + insurance + min debt + transport. Build while attacking high-interest debt.', color: 'accent' },
    { id: 3, label: 'Tier 3 — Full EF', target: `6 months (~${fmt(efTarget)})`, desc: '6 months (not 3): single-income risk, 3 vehicles, senior pet, mortgage, dependent kids.', color: 'amber' },
    { id: 4, label: 'Tier 4 — Sinking Funds', target: 'Sub-accounts', desc: 'Pug emergency ($3K–$5K), vehicle repair ($1K–$2K), home repair fund.', color: 'red' },
  ];

  const hysas = [
    { name: 'Varo', rate: '5.00%' }, { name: 'SoFi', rate: '4.50%' }, { name: 'Axos', rate: '4.21%' },
    { name: 'Amex HYSA', rate: '~4%' }, { name: 'Marcus', rate: '~4%' }, { name: 'Capital One 360', rate: '~4%' },
    { name: 'Ally', rate: '~4%' }, { name: 'Bread Savings', rate: '~4%' },
  ];

  function save() { data.savings = s; onsave?.(data); }
</script>

<div class="sav fade-in">
  <div class="top-row">
    <div class="card prog-card">
      <h3 class="ct">Emergency Fund Progress</h3>
      <div class="big-prog">
        <span class="big-val">{efProg}%</span>
        <span class="big-sub">{fmt(s.hysa)} of {fmt(efTarget)}</span>
      </div>
      <div class="track"><div class="fill" class:green={efProg>=100} class:accent={efProg>=50 && efProg<100} class:amber={efProg<50} style="width:{Math.min(efProg,100)}%"></div></div>
      <div class="fg" style="margin-top:1rem;"><label class="fl">Monthly Essential Expenses</label><input type="number" bind:value={s.monthlyEssentials} /></div>
      <div class="fg"><label class="fl">Current EF Tier</label>
        <select bind:value={s.efTier}>{#each [1,2,3,4] as t}<option value={t}>Tier {t}</option>{/each}</select>
      </div>
    </div>
    <div class="card">
      <h3 class="ct">EF Tier Targets</h3>
      {#each tiers as tier}
        <div class="tier-row" class:active-tier={s.efTier === tier.id}>
          <div class="tier-badge {tier.color}">{tier.label}</div>
          <div class="tier-target">{tier.target}</div>
          <p class="tier-desc">{tier.desc}</p>
        </div>
      {/each}
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3 class="ct">Account Balances</h3>
      <div class="fields">
        <div class="fg"><label class="fl">Checking</label><input type="number" bind:value={s.checking} /></div>
        <div class="fg"><label class="fl">HYSA (Emergency Fund)</label><input type="number" bind:value={s.hysa} /></div>
        <div class="fg"><label class="fl">Pug Emergency Fund</label><input type="number" bind:value={s.pugEmergency} /></div>
        <div class="fg"><label class="fl">Vehicle Repair Fund</label><input type="number" bind:value={s.vehicleRepair} /></div>
        <div class="fg"><label class="fl">Home Repair Fund</label><input type="number" bind:value={s.homeRepair} /></div>
        <div class="fg"><label class="fl">Tax Holding Sub-Account</label><input type="number" bind:value={s.taxHolding} /></div>
      </div>
    </div>
    <div class="card">
      <h3 class="ct">HYSA Options (May 2026)</h3>
      <p class="desc">Top HYSAs: 4.00–5.00% APY. National avg: ~0.38%. Fed cut 3x since late 2025. EF stays liquid. All FDIC/NCUA $250K.</p>
      <table>
        <thead><tr><th>Provider</th><th>APY</th></tr></thead>
        <tbody>{#each hysas as h}<tr><td>{h.name}</td><td class="rate">{h.rate}</td></tr>{/each}</tbody>
      </table>
      <div class="alert-info" style="margin-top:0.8rem;">💡 Consider 12-month CD for funds untouched 12+ months to lock in rates.</div>
    </div>
  </div>
  <button class="btn-primary" onclick={save}>Save Savings Data</button>
</div>

<style>
  .sav { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .ct { font-size: 1rem; font-weight: 700; margin-bottom: 0.8rem; }
  .desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.8rem; }
  .top-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .big-prog { text-align: center; margin-bottom: 0.8rem; }
  .big-val { font-size: 2.5rem; font-weight: 800; color: var(--accent-light); display: block; }
  .big-sub { font-size: 0.85rem; color: var(--text-muted); }
  .track { width: 100%; height: 10px; background: var(--bg-primary); border-radius: 99px; overflow: hidden; }
  .fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .fill.green { background: linear-gradient(90deg,#22c55e,#4ade80); }
  .fill.accent { background: linear-gradient(90deg,var(--accent),var(--accent-light)); }
  .fill.amber { background: linear-gradient(90deg,#f59e0b,#fbbf24); }
  .tier-row { padding: 0.6rem; margin-bottom: 0.5rem; border-radius: var(--radius-sm); border-left: 3px solid var(--border); background: var(--bg-primary); }
  .active-tier { border-left-color: var(--accent-light); background: var(--accent-glow); }
  .tier-badge { font-size: 0.78rem; font-weight: 700; margin-bottom: 0.2rem; }
  .tier-badge.green { color: var(--green); }
  .tier-badge.accent { color: var(--accent-light); }
  .tier-badge.amber { color: var(--amber); }
  .tier-badge.red { color: var(--red); }
  .tier-target { font-size: 0.85rem; font-weight: 600; }
  .tier-desc { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.15rem; }
  .fields { display: flex; flex-direction: column; gap: 0.6rem; }
  .fg { display: flex; flex-direction: column; gap: 0.3rem; }
  .fl { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
  .rate { color: var(--green); font-weight: 600; }
  .alert-info { font-size: 0.82rem; color: var(--accent-light); background: var(--accent-glow); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--accent); }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; align-self: flex-start; }
  @media (max-width: 768px) { .top-row, .two-col { grid-template-columns: 1fr; } }
</style>
