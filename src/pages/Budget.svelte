<script>
  import { fmt } from '../lib/storage.js';
  let { data, onsave } = $props();

  const categories = [
    { group: 'Housing', target: '25–35%', items: ['Mortgage P&I','Property Tax/Escrow','HOA','Homeowner\'s Insurance','Home Maintenance Fund','Electric','Gas','Water/Sewer/Trash','Internet/Cell'] },
    { group: 'Transportation', target: '10–15%', items: ['Auto Loan — Sentra','Auto Loan — Van','Auto Loan — Chrysler','Auto Insurance (all)','Fuel','Routine Maintenance','Registration/Inspection','Repairs Sinking Fund'] },
    { group: 'Food & Household', target: '10–15%', items: ['Groceries','Household Supplies','Dining Out'] },
    { group: 'People Care', target: '', items: ['Healthcare Premiums','Out-of-Pocket Medical','Prescriptions','Dental/Vision','Clothing','Personal Care','College Costs','Freshman Launch Budget'] },
    { group: 'Pet Care', target: '', items: ['Pet Food','Routine Vet','Prevention (Flea/HW)','Pet Insurance','Pug Medical Fund','Kitten First-Year Fund','Grooming','Pet Supplies'] },
    { group: 'Subscriptions & Lifestyle', target: '', items: ['Streaming','Software','Gym/Fitness','Hobbies','Entertainment','Gifts','Travel'] },
    { group: 'Financial Priorities', target: '20%+', items: ['Min Debt Payments','Accelerated Debt Payoff','Emergency Fund','401(k)','Roth IRA','HSA','529','Taxable Investing'] },
    { group: 'Sinking Funds', target: '', items: ['Christmas','Birthdays','Annual Insurance','Vehicle Replacement','Home Repair','Vet Emergency'] },
  ];

  let budget = $state(data.budget?.categories || {});
  let month = $state(data.budget?.month || new Date().toISOString().slice(0,7));

  function getVal(cat, field) { return budget[cat]?.[field] || 0; }
  function setVal(cat, field, val) {
    if (!budget[cat]) budget[cat] = {};
    budget[cat][field] = parseFloat(val) || 0;
  }

  function save() {
    data.budget = { month, categories: budget };
    onsave?.(data);
  }

  function totalBudgeted(group) { return group.items.reduce((s, c) => s + getVal(c, 'budgeted'), 0); }
  function totalActual(group) { return group.items.reduce((s, c) => s + getVal(c, 'actual'), 0); }
</script>

<div class="budget fade-in">
  <div class="controls">
    <div class="fg">
      <label class="fl">Month</label>
      <input type="month" bind:value={month} />
    </div>
    <button class="btn-primary" onclick={save}>Save Budget</button>
  </div>
  <p class="desc">Zero-based budget: every baseline dollar assigned a job. Net should equal $0.</p>

  {#each categories as group}
    <div class="card group-card">
      <div class="group-head">
        <h3 class="group-title">{group.group}</h3>
        {#if group.target}<span class="badge bg-accent">Target: {group.target}</span>{/if}
      </div>
      <table>
        <thead><tr><th>Category</th><th>Budgeted</th><th>Actual</th><th>Variance</th></tr></thead>
        <tbody>
          {#each group.items as item}
            {@const v = getVal(item,'actual') - getVal(item,'budgeted')}
            <tr>
              <td class="cat-name">{item}</td>
              <td><input type="number" value={getVal(item,'budgeted')} oninput={(e) => setVal(item,'budgeted',e.target.value)} placeholder="0" /></td>
              <td><input type="number" value={getVal(item,'actual')} oninput={(e) => setVal(item,'actual',e.target.value)} placeholder="0" /></td>
              <td class:over={v > 0} class:under={v < 0}>{v > 0 ? '+' : ''}{fmt(v)}</td>
            </tr>
          {/each}
          <tr class="total-row">
            <td><strong>Subtotal</strong></td>
            <td><strong>{fmt(totalBudgeted(group))}</strong></td>
            <td><strong>{fmt(totalActual(group))}</strong></td>
            <td class:over={totalActual(group)-totalBudgeted(group)>0} class:under={totalActual(group)-totalBudgeted(group)<0}><strong>{fmt(totalActual(group)-totalBudgeted(group))}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  {/each}
</div>

<style>
  .budget { display: flex; flex-direction: column; gap: 1rem; }
  .controls { display: flex; align-items: flex-end; gap: 1rem; margin-bottom: 0.5rem; }
  .fg { display: flex; flex-direction: column; gap: 0.3rem; }
  .fl { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
  .desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem; }
  .btn-primary { display: inline-flex; align-items: center; padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; transition: all var(--transition); }
  .btn-primary:hover { background: var(--accent-light); box-shadow: 0 0 16px var(--accent-glow); }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.2rem; }
  .group-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
  .group-title { font-size: 1rem; font-weight: 700; }
  .badge { display: inline-flex; font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.55rem; border-radius: 99px; }
  .bg-accent { color: var(--accent-light); background: var(--accent-glow); }
  .cat-name { font-size: 0.85rem; }
  table input { width: 100px; padding: 0.4rem 0.5rem; font-size: 0.85rem; }
  .over { color: var(--red); }
  .under { color: var(--green); }
  .total-row { background: var(--bg-primary); }
  .total-row td { border-top: 2px solid var(--border); }
</style>
