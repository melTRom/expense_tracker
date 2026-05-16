<script>
  import { fmt } from '../lib/storage.js';
  let { data, onsave } = $props();
  let vehicles = $state([...(data.household?.vehicles || []).map(v => ({...v}))]);

  function tco(v) {
    return (v.loanPayment || 0) + (v.insurance || 0) + (v.fuel || 0) + (v.maintenance || 0) + ((v.repairs || 0) / 12);
  }

  function save() {
    data.household.vehicles = vehicles;
    onsave?.(data);
  }
</script>

<div class="veh fade-in">
  <div class="alert-warn">⚠ Three vehicles for one driver is structurally expensive. Insurance alone likely $250–$500+/month. Ask: are all three driven weekly?</div>

  <div class="grid">
    {#each vehicles as v, i}
      <div class="card">
        <h3 class="ct">{v.name}</h3>
        <span class="badge" class:bg-amber={v.status==='loan'} class:bg-green={v.status!=='loan'}>{v.status === 'loan' ? 'Under Loan' : 'Paid Off'}</span>
        <div class="fields">
          <div class="fg"><label class="fl">Status</label><select bind:value={v.status}><option value="paid_off">Paid Off</option><option value="loan">Under Loan</option></select></div>
          <div class="fg"><label class="fl">Market Value (KBB)</label><input type="number" bind:value={v.value} /></div>
          {#if v.status === 'loan'}
            <div class="fg"><label class="fl">Loan Balance</label><input type="number" bind:value={v.loanBalance} /></div>
            <div class="fg"><label class="fl">Loan Rate (%)</label><input type="number" step="0.1" bind:value={v.loanRate} /></div>
            <div class="fg"><label class="fl">Monthly Payment</label><input type="number" bind:value={v.loanPayment} /></div>
          {/if}
          <div class="fg"><label class="fl">Monthly Insurance</label><input type="number" bind:value={v.insurance} /></div>
          <div class="fg"><label class="fl">Monthly Fuel</label><input type="number" bind:value={v.fuel} /></div>
          <div class="fg"><label class="fl">Monthly Maintenance</label><input type="number" bind:value={v.maintenance} /></div>
          <div class="fg"><label class="fl">Annual Repairs Est.</label><input type="number" bind:value={v.repairs} /></div>
        </div>
        <div class="tco-box">
          <span class="tco-label">Monthly TCO</span>
          <span class="tco-val">{fmt(tco(v))}</span>
        </div>
        {#if v.status === 'loan' && v.loanRate > 6}
          <div class="alert-tip">💡 Loan rate >{v.loanRate}% — consider accelerated payoff after 401(k) match / Roth.</div>
        {/if}
        {#if v.status === 'paid_off' && v.value > 0 && v.value < 4000}
          <div class="alert-info">💡 Value under $4K — consider dropping comprehensive/collision. Raise deductible to $1K if EF supports it.</div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="card">
    <h3 class="ct">Insurance Optimization</h3>
    <ul class="notes">
      <li>Shop full quotes every 12 months from 3+ carriers (GEICO, Progressive, State Farm, USAA if eligible, + local)</li>
      <li>Raise deductibles to $1,000 if EF supports it</li>
      <li>Drop comprehensive/collision on vehicles worth under ~$4,000</li>
      <li>Bundle with homeowner's insurance</li>
      <li>Pull KBB/Edmunds values quarterly for net-worth tracking</li>
    </ul>
  </div>

  <div class="card">
    <h3 class="ct">Keep vs. Sell Decision Logic</h3>
    <p class="desc">For older paid-off vehicles, run annually: (annual repair + insurance + registration) vs. (sale value + insurance savings + reduced maintenance)</p>
    <div class="alert-warn">Sell trigger: when a single repair exceeds 50% of the vehicle's market value.</div>
  </div>

  <button class="btn-primary" onclick={save}>Save Vehicle Data</button>
</div>

<style>
  .veh { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .ct { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
  .desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem; }
  .grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
  .badge { display: inline-flex; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 99px; margin-bottom: 0.8rem; }
  .bg-amber { color: var(--amber); background: var(--amber-glow); }
  .bg-green { color: var(--green); background: var(--green-glow); }
  .fields { display: flex; flex-direction: column; gap: 0.5rem; }
  .fg { display: flex; flex-direction: column; gap: 0.2rem; }
  .fl { font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); }
  .tco-box { margin-top: 1rem; padding: 0.8rem; background: var(--accent-glow); border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; }
  .tco-label { font-size: 0.82rem; color: var(--accent-light); font-weight: 600; }
  .tco-val { font-size: 1.3rem; font-weight: 800; color: var(--accent-light); }
  .alert-warn { font-size: 0.82rem; color: var(--amber); background: var(--amber-glow); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border-left: 3px solid var(--amber); }
  .alert-tip { font-size: 0.78rem; color: var(--green); background: var(--green-glow); padding: 0.5rem; border-radius: var(--radius-sm); border-left: 3px solid var(--green); margin-top: 0.5rem; }
  .alert-info { font-size: 0.78rem; color: var(--accent-light); background: var(--accent-glow); padding: 0.5rem; border-radius: var(--radius-sm); border-left: 3px solid var(--accent); margin-top: 0.5rem; }
  .notes { list-style: disc; padding-left: 1.2rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.3rem; }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; align-self: flex-start; }
  @media (max-width: 1024px) { .grid { grid-template-columns: 1fr; } }
</style>
