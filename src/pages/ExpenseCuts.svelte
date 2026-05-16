<script>
  let { data } = $props();

  const tiers = [
    { level: 'Tier 1 — Painless', color: 'green', impact: 'Zero lifestyle impact',
      items: ['Subscription audit (~$50–$150/mo of forgotten services)', 'Cell plan renegotiation', 'Insurance shopping (3+ carriers every 12 months)', 'Refinancing high-interest debt to lower rates', 'Credit card rewards optimization', 'Generic prescriptions', 'Energy-efficiency basics'] },
    { level: 'Tier 2 — Low-Pain', color: 'accent', impact: 'Minor lifestyle adjustment',
      items: ['Dining-out frequency reduction', 'Grocery optimization (meal planning, store brands, warehouse club math)', 'Entertainment substitution', '"No-spend" weeks'] },
    { level: 'Tier 3 — Structural', color: 'amber', impact: 'Major lifestyle change',
      items: ['Vehicle reduction (3 → 2 or 1)', 'Downsizing housing', 'Refinancing mortgage if rate environment allows'] },
    { level: 'Tier 4 — Last Resort', color: 'red', impact: 'Affects long-term goals',
      items: ['Reducing education contributions', 'Reducing retirement contributions', 'Reducing pet quality of care'] },
  ];
</script>

<div class="exp fade-in">
  <p class="desc">Cut mercilessly on what you don't value; spend deliberately on what you do. Every proposed cut paired with dollar impact AND qualitative cost.</p>

  {#each tiers as tier}
    <div class="card tier-card">
      <div class="tier-head">
        <h3 class="ct {tier.color}">{tier.level}</h3>
        <span class="badge bg-{tier.color}">{tier.impact}</span>
      </div>
      <ul class="cut-list">
        {#each tier.items as item}
          <li class="cut-item">
            <span class="cut-icon {tier.color}">→</span>
            <span>{item}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/each}

  <div class="card">
    <h3 class="ct">Principle</h3>
    <div class="quote">Always pair a proposed cut with its dollar impact <em>and</em> a qualitative cost, presented as a trade-off rather than a directive.</div>
  </div>
</div>

<style>
  .exp { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .desc { font-size: 0.85rem; color: var(--text-muted); }
  .ct { font-size: 1rem; font-weight: 700; }
  .ct.green { color: var(--green); }
  .ct.accent { color: var(--accent-light); }
  .ct.amber { color: var(--amber); }
  .ct.red { color: var(--red); }
  .tier-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
  .badge { display: inline-flex; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 99px; }
  .bg-green { color: var(--green); background: var(--green-glow); }
  .bg-accent { color: var(--accent-light); background: var(--accent-glow); }
  .bg-amber { color: var(--amber); background: var(--amber-glow); }
  .bg-red { color: var(--red); background: var(--red-glow); }
  .cut-list { list-style: none; display: flex; flex-direction: column; gap: 0.4rem; }
  .cut-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; padding: 0.4rem 0.5rem; border-radius: var(--radius-sm); background: var(--bg-primary); }
  .cut-icon { font-weight: 700; flex-shrink: 0; }
  .cut-icon.green { color: var(--green); }
  .cut-icon.accent { color: var(--accent-light); }
  .cut-icon.amber { color: var(--amber); }
  .cut-icon.red { color: var(--red); }
  .quote { font-size: 0.9rem; color: var(--text-secondary); font-style: italic; padding: 0.8rem; background: var(--accent-glow); border-radius: var(--radius-sm); border-left: 3px solid var(--accent); }
</style>
