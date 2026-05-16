<script>
  import { fmt } from '../lib/storage.js';
  let { data, onsave } = $props();

  let credit = $state({ ...data.credit });
  let newCard = $state({ name: '', limit: 0, balance: 0, autopay: false });

  const utilForCard = (c) => c.limit > 0 ? ((c.balance / c.limit) * 100).toFixed(1) : '0.0';
  const aggUtil = $derived(() => {
    const totalLimit = credit.cards.reduce((s,c) => s + (c.limit||0), 0);
    const totalBal = credit.cards.reduce((s,c) => s + (c.balance||0), 0);
    return totalLimit > 0 ? (totalBal / totalLimit * 100) : 0;
  });

  function addCard() {
    if (newCard.name) {
      credit.cards = [...credit.cards, { ...newCard }];
      newCard = { name: '', limit: 0, balance: 0, autopay: false };
    }
  }
  function removeCard(i) { credit.cards = credit.cards.filter((_, idx) => idx !== i); }
  function save() {
    credit.aggregateUtilization = aggUtil();
    data.credit = credit;
    onsave?.(data);
  }

  const factors = [
    { name: 'Payment History', weight: '35%', desc: 'Zero missed payments. One 30-day late drops 60–110 pts, stays 7 years.' },
    { name: 'Amounts Owed', weight: '30%', desc: 'Target single-digit utilization per card AND aggregate. 800+ avg ~6%.' },
    { name: 'Length of History', weight: '15%', desc: 'Never close oldest card. Keep open with small recurring charge + autopay.' },
    { name: 'New Credit', weight: '10%', desc: 'No new applications during repair or within 12 months of mortgage refi.' },
    { name: 'Credit Mix', weight: '10%', desc: 'Maintain diverse account types.' },
  ];

  const playbook = [
    'Pull all 3 free reports weekly at AnnualCreditReport.com; dispute errors',
    'Bring every account current and stay current',
    'Drive utilization to single digits via payment timing and/or limit increases (soft-pull)',
    'Keep oldest card open with small recurring charge + autopay',
    'Avoid new applications during repair window',
    'Re-check FICO 30–45 days after each utilization payment',
  ];
</script>

<div class="credit fade-in">
  <div class="top-cards">
    <div class="card kpi-card">
      <span class="kl">FICO Score</span>
      <input type="number" class="fico-input" bind:value={credit.ficoScore} placeholder="---" />
      <div class="fg"><label class="fl">Date</label><input type="date" bind:value={credit.ficoDate} /></div>
    </div>
    <div class="card kpi-card">
      <span class="kl">Aggregate Utilization</span>
      <span class="kv" class:good={aggUtil() <= 10} class:warn={aggUtil() > 10 && aggUtil() <= 30} class:bad={aggUtil() > 30}>{aggUtil().toFixed(1)}%</span>
      <div class="track"><div class="fill" class:green={aggUtil()<=10} class:amber={aggUtil()>10 && aggUtil()<=30} class:red={aggUtil()>30} style="width:{Math.min(aggUtil(),100)}%"></div></div>
      <div class="range"><span>Target: &lt;10%</span><span>Danger: &gt;30%</span></div>
    </div>
    <div class="card kpi-card">
      <span class="kl">DTI Ratio</span>
      <input type="number" class="dti-input" bind:value={credit.dti} step="0.1" placeholder="0" />
      <span class="hint">Target ≤36% | Max ≤43%</span>
      <div class="track"><div class="fill" class:green={credit.dti<=36} class:amber={credit.dti>36 && credit.dti<=43} class:red={credit.dti>43} style="width:{Math.min(credit.dti||0,100)}%"></div></div>
    </div>
  </div>

  <div class="two-col">
    <div class="card">
      <h3 class="ct">FICO Factor Weights</h3>
      {#each factors as f}
        <div class="factor"><div class="f-top"><strong>{f.name}</strong><span class="badge bg-accent">{f.weight}</span></div><p class="f-desc">{f.desc}</p></div>
      {/each}
    </div>

    <div class="card">
      <h3 class="ct">Credit Cards</h3>
      <div class="add-form">
        <input bind:value={newCard.name} placeholder="Card name" />
        <input type="number" bind:value={newCard.limit} placeholder="Limit" />
        <input type="number" bind:value={newCard.balance} placeholder="Balance" />
        <button class="btn-primary btn-sm" onclick={addCard}>Add</button>
      </div>
      {#each credit.cards as card, i}
        <div class="card-row">
          <div class="cr-info"><strong>{card.name}</strong><span class="muted">{fmt(card.balance)} / {fmt(card.limit)}</span></div>
          <span class="badge" class:bg-green={parseFloat(utilForCard(card))<=10} class:bg-amber={parseFloat(utilForCard(card))>10 && parseFloat(utilForCard(card))<=30} class:bg-red={parseFloat(utilForCard(card))>30}>{utilForCard(card)}%</span>
          <button class="rm" onclick={() => removeCard(i)}>✕</button>
        </div>
      {/each}
    </div>
  </div>

  <div class="card">
    <h3 class="ct">Credit-Repair Playbook</h3>
    <ol class="playbook">
      {#each playbook as step, i}<li class="pb-step"><span class="step-num">{i+1}</span>{step}</li>{/each}
    </ol>
  </div>

  <button class="btn-primary" onclick={save}>Save Credit Data</button>
</div>

<style>
  .credit { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .top-cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; }
  .kpi-card { display: flex; flex-direction: column; gap: 0.4rem; }
  .kl { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .kv { font-size: 1.8rem; font-weight: 800; }
  .good { color: var(--green); }
  .warn { color: var(--amber); }
  .bad { color: var(--red); }
  .fico-input, .dti-input { font-size: 1.5rem; font-weight: 800; background: transparent; border: 1px solid var(--border); padding: 0.3rem; width: 120px; }
  .track { width: 100%; height: 8px; background: var(--bg-primary); border-radius: 99px; overflow: hidden; }
  .fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .fill.green { background: linear-gradient(90deg,#22c55e,#4ade80); }
  .fill.amber { background: linear-gradient(90deg,#f59e0b,#fbbf24); }
  .fill.red { background: linear-gradient(90deg,#ef4444,#f87171); }
  .range { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); }
  .hint { font-size: 0.72rem; color: var(--text-muted); }
  .ct { font-size: 1rem; font-weight: 700; margin-bottom: 0.8rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .factor { margin-bottom: 0.8rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--border); }
  .f-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; font-size: 0.88rem; }
  .f-desc { font-size: 0.78rem; color: var(--text-secondary); }
  .badge { display: inline-flex; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 99px; }
  .bg-accent { color: var(--accent-light); background: var(--accent-glow); }
  .bg-green { color: var(--green); background: var(--green-glow); }
  .bg-amber { color: var(--amber); background: var(--amber-glow); }
  .bg-red { color: var(--red); background: var(--red-glow); }
  .add-form { display: grid; grid-template-columns: 1fr 5rem 5rem auto; gap: 0.5rem; margin-bottom: 0.8rem; }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; }
  .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.78rem; }
  .card-row { display: flex; align-items: center; gap: 0.8rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
  .cr-info { flex: 1; display: flex; flex-direction: column; }
  .cr-info strong { font-size: 0.88rem; }
  .muted { font-size: 0.78rem; color: var(--text-muted); }
  .rm { color: var(--red); font-size: 0.9rem; }
  .fg { display: flex; flex-direction: column; gap: 0.2rem; }
  .fl { font-size: 0.72rem; color: var(--text-muted); }
  .playbook { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
  .pb-step { display: flex; align-items: center; gap: 0.8rem; font-size: 0.88rem; padding: 0.5rem 0.6rem; border-radius: var(--radius-sm); background: var(--bg-primary); }
  .step-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent-glow); color: var(--accent-light); font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  @media (max-width: 768px) { .top-cards, .two-col { grid-template-columns: 1fr; } .add-form { grid-template-columns: 1fr; } }
</style>
