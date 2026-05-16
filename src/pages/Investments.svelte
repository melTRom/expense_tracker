<script>
  import { fmt } from '../lib/storage.js';
  let { data, onsave } = $props();
  let inv = $state({ ...data.investments });

  const steps = [
    { label: '1. Build starter EF + bring debt current', check: true },
    { label: '2. Capture full employer 401(k) match', check: inv.employerMatch },
    { label: '3. Pay off high-interest debt (>7–8%)', check: false },
    { label: '4. Max HSA if eligible', check: inv.hsa > 0 },
    { label: '5. Max Roth IRA(s) — $7K/person ($8K if 50+)', check: false },
    { label: '6. Remainder of 401(k) to annual limit', check: false },
    { label: '7. 529 for kids', check: (inv.child529_1 + inv.child529_2) > 0 },
    { label: '8. Pay off medium-interest debt (4–7%)', check: false },
    { label: '9. Taxable brokerage for surplus', check: inv.taxable > 0 },
    { label: '10. Extra mortgage principal (if rate >5%)', check: false },
  ];

  const funds = [
    { label: 'US Total Market', vanguard: 'VTI', fidelity: 'FZROX' },
    { label: 'International', vanguard: 'VXUS', fidelity: 'FZILX' },
    { label: 'US Total Bond', vanguard: 'BND', fidelity: 'FXNAX' },
  ];

  function save() { data.investments = inv; onsave?.(data); }
</script>

<div class="inv fade-in">
  <div class="two-col">
    <div class="card">
      <h3 class="ct">Bogleheads Priority Order</h3>
      <p class="desc">Follow this order. Don't skip steps. Each builds on the last.</p>
      <div class="steps">
        {#each steps as step, i}
          <div class="step" class:done={step.check}>
            <span class="step-check">{step.check ? '✓' : (i+1)}</span>
            <span>{step.label}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="card">
      <h3 class="ct">Account Balances</h3>
      <div class="fields">
        <div class="fg"><label class="fl">401(k)</label><input type="number" bind:value={inv.k401} /></div>
        <div class="row2">
          <div class="fg"><label class="fl">Employer Match?</label><select bind:value={inv.employerMatch}><option value={true}>Yes</option><option value={false}>No</option></select></div>
          <div class="fg"><label class="fl">Match %</label><input type="number" bind:value={inv.matchPercent} /></div>
        </div>
        <div class="fg"><label class="fl">Roth IRA (Adult 1)</label><input type="number" bind:value={inv.roth1} /></div>
        <div class="fg"><label class="fl">Roth IRA (Adult 2 — Spousal)</label><input type="number" bind:value={inv.roth2} /></div>
        <div class="alert-tip">💡 Spousal Roth IRA: non-working spouse can fund based on working spouse's earned income. One of the most under-used moves in single-income households.</div>
        <div class="fg"><label class="fl">HSA</label><input type="number" bind:value={inv.hsa} /></div>
        <div class="fg"><label class="fl">529 (Child 1)</label><input type="number" bind:value={inv.child529_1} /></div>
        <div class="fg"><label class="fl">529 (Child 2)</label><input type="number" bind:value={inv.child529_2} /></div>
        <div class="fg"><label class="fl">Taxable Brokerage</label><input type="number" bind:value={inv.taxable} /></div>
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3 class="ct">Three-Fund Portfolio</h3>
      <p class="desc">Expense ratios ≤ 0.10%. Avoid actively managed funds, individual stocks, anything with loads.</p>
      <table>
        <thead><tr><th>Asset Class</th><th>Vanguard</th><th>Fidelity</th></tr></thead>
        <tbody>{#each funds as f}<tr><td>{f.label}</td><td class="ticker">{f.vanguard}</td><td class="ticker">{f.fidelity}</td></tr>{/each}</tbody>
      </table>
    </div>
    <div class="card">
      <h3 class="ct">529 Planning (Texas)</h3>
      <ul class="notes">
        <li>Texas has NO state-tax advantage — shop nationally</li>
        <li>Utah my529 and other top-rated low-fee plans preferred</li>
        <li>SECURE 2.0: unused 529 up to $35K can roll to beneficiary's Roth IRA after 15 years</li>
        <li>Current student: cash-flow tuition first, fund 529 with surplus after retirement</li>
        <li>Explore: UTEP scholarships, Pell Grants, TX Tuition Promise Fund</li>
      </ul>
    </div>
  </div>
  <button class="btn-primary" onclick={save}>Save Investment Data</button>
</div>

<style>
  .inv { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .ct { font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; }
  .desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.8rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .steps { display: flex; flex-direction: column; gap: 0.3rem; }
  .step { display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem 0.7rem; border-radius: var(--radius-sm); font-size: 0.85rem; background: var(--bg-primary); }
  .step.done { background: var(--green-glow); }
  .step-check { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; background: var(--accent-glow); color: var(--accent-light); }
  .step.done .step-check { background: var(--green-glow); color: var(--green); }
  .fields { display: flex; flex-direction: column; gap: 0.6rem; }
  .fg { display: flex; flex-direction: column; gap: 0.3rem; }
  .fl { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  .alert-tip { font-size: 0.8rem; color: var(--green); background: var(--green-glow); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--green); }
  .ticker { color: var(--accent-light); font-weight: 600; font-family: monospace; }
  .notes { list-style: disc; padding-left: 1.2rem; font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.4rem; }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; align-self: flex-start; }
  @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
</style>
