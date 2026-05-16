<script>
  import { fmt } from '../lib/storage.js';
  let { data, onsave } = $props();

  let salary = $state(data.income?.salary || 0);
  let taxRate = $state(data.income?.taxSetAside || 0.27);
  let sideHistory = $state(data.income?.sideIncomeHistory || []);
  let surge = $state(data.income?.surgeAllocation || { debt:0.50, ef:0.20, roth:0.15, college529:0.10, fun:0.05 });
  let newSide = $state(0);

  const baseline25 = $derived(() => {
    if (sideHistory.length === 0) return 0;
    const sorted = [...sideHistory].sort((a,b) => a - b);
    const idx = Math.floor(sorted.length * 0.25);
    return sorted[idx] || 0;
  });

  const totalBaseline = $derived(salary + baseline25());
  const surgeAmount = $derived((newSide || 0) - baseline25());

  function addSideIncome() {
    if (newSide > 0) { sideHistory = [...sideHistory, newSide]; newSide = 0; }
  }

  function save() {
    data.income = { salary, sideIncomeHistory: sideHistory, taxSetAside: taxRate, surgeAllocation: surge };
    onsave?.(data);
  }
</script>

<div class="income fade-in">
  <div class="card">
    <h3 class="ct">Two-Tier Baseline Income Model</h3>
    <p class="desc">Budget built around Tier 1 (baseline) only. Surge income pre-allocated by percentage before it arrives.</p>
    <div class="form-row">
      <div class="fg"><label class="fl">W-2 Salary (monthly net)</label><input type="number" bind:value={salary} placeholder="0" /></div>
      <div class="fg"><label class="fl">SE Tax Set-Aside Rate</label><input type="number" bind:value={taxRate} step="0.01" min="0" max="1" /><span class="hint">{(taxRate*100).toFixed(0)}% — hold in separate tax sub-account</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3 class="ct">Side Income History</h3>
      <div class="add-row">
        <input type="number" bind:value={newSide} placeholder="Side income amount" />
        <button class="btn-primary" onclick={addSideIncome}>Add</button>
      </div>
      <div class="history">
        {#each sideHistory as amount, i}
          <div class="hist-item"><span>Month {i+1}: {fmt(amount)}</span><span class="muted">Net: {fmt(amount * (1 - taxRate))}</span></div>
        {/each}
        {#if sideHistory.length === 0}<p class="muted">No side income recorded yet.</p>{/if}
      </div>
      <div class="baseline-box">
        <span class="bl">25th Percentile (Baseline Floor):</span>
        <strong>{fmt(baseline25())}</strong>
      </div>
    </div>

    <div class="card">
      <h3 class="ct">Surge Allocation</h3>
      <p class="desc">Pre-allocate anything above baseline before it arrives.</p>
      <div class="alloc">
        <div class="alloc-row"><span>High-Interest Debt</span><span class="pct">{(surge.debt*100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.05" bind:value={surge.debt} /></div>
        <div class="alloc-row"><span>Emergency Fund</span><span class="pct">{(surge.ef*100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.05" bind:value={surge.ef} /></div>
        <div class="alloc-row"><span>Roth IRA</span><span class="pct">{(surge.roth*100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.05" bind:value={surge.roth} /></div>
        <div class="alloc-row"><span>529 College</span><span class="pct">{(surge.college529*100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.05" bind:value={surge.college529} /></div>
        <div class="alloc-row"><span>Guilt-Free Spending</span><span class="pct">{(surge.fun*100).toFixed(0)}%</span><input type="range" min="0" max="1" step="0.05" bind:value={surge.fun} /></div>
      </div>
      <div class="total-alloc" class:over-alloc={(surge.debt+surge.ef+surge.roth+surge.college529+surge.fun) > 1.01}>
        Total: {((surge.debt+surge.ef+surge.roth+surge.college529+surge.fun)*100).toFixed(0)}%
      </div>
    </div>
  </div>

  <div class="card summary">
    <h3 class="ct">Monthly Summary</h3>
    <div class="sum-grid">
      <div><span class="sl">Tier 1 Baseline</span><strong>{fmt(totalBaseline)}</strong></div>
      <div><span class="sl">Tax Dates</span><strong class="dates">Apr 15 · Jun 15 · Sep 15 · Jan 15</strong></div>
    </div>
    <div class="alert-info">💡 Texas has no state income tax — only federal + SE tax applies to side income.</div>
  </div>

  <button class="btn-primary" onclick={save} style="align-self:flex-start;">Save Income Data</button>
</div>

<style>
  .income { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .ct { font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; }
  .desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .fg { display: flex; flex-direction: column; gap: 0.3rem; }
  .fl { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
  .hint { font-size: 0.72rem; color: var(--text-muted); }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .add-row { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
  .add-row input { flex: 1; }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; transition: all var(--transition); }
  .btn-primary:hover { background: var(--accent-light); }
  .history { max-height: 200px; overflow-y: auto; margin-bottom: 0.8rem; }
  .hist-item { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--border); font-size: 0.85rem; }
  .muted { color: var(--text-muted); font-size: 0.82rem; }
  .baseline-box { background: var(--accent-glow); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; }
  .bl { font-size: 0.82rem; color: var(--accent-light); }
  .alloc { display: flex; flex-direction: column; gap: 0.6rem; }
  .alloc-row { display: grid; grid-template-columns: 1fr 3rem 1fr; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
  .pct { font-weight: 700; text-align: right; color: var(--accent-light); }
  .total-alloc { margin-top: 0.8rem; text-align: right; font-weight: 700; font-size: 0.9rem; }
  .over-alloc { color: var(--red); }
  .sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 0.8rem; }
  .sl { font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 0.2rem; }
  .dates { font-size: 0.85rem; color: var(--amber); }
  .alert-info { font-size: 0.82rem; color: var(--accent-light); background: var(--accent-glow); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border-left: 3px solid var(--accent); }
  input[type="range"] { -webkit-appearance: none; background: var(--border); height: 4px; border-radius: 2px; border: none; padding: 0; }
  input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--accent-light); cursor: pointer; }
  @media (max-width: 768px) { .two-col, .form-row, .sum-grid { grid-template-columns: 1fr; } }
</style>
