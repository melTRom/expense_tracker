<script>
  let { data, onsave } = $props();

  let debtName = $state('');
  let debtBal = $state(0);
  let debtApr = $state(0);
  let debtMin = $state(0);
  let debtType = $state('credit_card');
  let lifeEvent = $state('');

  function addDebt() {
    if (debtName) {
      data.debts = [...(data.debts || []), { name: debtName, balance: debtBal, apr: debtApr, minPayment: debtMin, type: debtType }];
      debtName = ''; debtBal = 0; debtApr = 0; debtMin = 0; debtType = 'credit_card';
      onsave?.(data);
    }
  }

  function removeDebt(i) {
    data.debts = data.debts.filter((_, idx) => idx !== i);
    dispatch('save', data);
  }

  function addEvent() {
    if (lifeEvent) {
      data.lifeEvents = [...(data.lifeEvents || []), { date: new Date().toISOString().slice(0,10), text: lifeEvent }];
      lifeEvent = '';
      onsave?.(data);
    }
  }
</script>

<div class="de fade-in">
  <p class="desc">Enter your monthly data here. Wrap pasted data in <code>&lt;monthly_data&gt;</code> XML tags for multi-month tracking.</p>

  <div class="two-col">
    <div class="card">
      <h3 class="ct">Debt Accounts</h3>
      <div class="add-form">
        <input bind:value={debtName} placeholder="Account name" />
        <input type="number" bind:value={debtBal} placeholder="Balance" />
        <input type="number" bind:value={debtApr} step="0.1" placeholder="APR %" />
        <input type="number" bind:value={debtMin} placeholder="Min payment" />
        <select bind:value={debtType}>
          <option value="credit_card">Credit Card</option>
          <option value="auto_loan">Auto Loan</option>
          <option value="mortgage">Mortgage</option>
          <option value="student_loan">Student Loan</option>
          <option value="personal">Personal Loan</option>
          <option value="other">Other</option>
        </select>
        <button class="btn-primary btn-sm" onclick={addDebt}>Add</button>
      </div>
      {#if (data.debts || []).length > 0}
        <table>
          <thead><tr><th>Account</th><th>Balance</th><th>APR</th><th>Min</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {#each data.debts as d, i}
              <tr>
                <td>{d.name}</td>
                <td>${(d.balance||0).toLocaleString()}</td>
                <td class:high-apr={d.apr > 7}>{d.apr}%</td>
                <td>${d.minPayment}</td>
                <td><span class="type-badge">{d.type.replace('_',' ')}</span></td>
                <td><button class="rm" onclick={() => removeDebt(i)}>✕</button></td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <p class="muted">No debts entered yet.</p>
      {/if}
    </div>

    <div class="card">
      <h3 class="ct">Life Events & Anomalies</h3>
      <p class="sub-desc">Flag anything unusual: vet visits, car repairs, side-income spikes, tuition payments, scholarships.</p>
      <div class="add-row">
        <input bind:value={lifeEvent} placeholder="Describe the event..." />
        <button class="btn-primary btn-sm" onclick={addEvent}>Add</button>
      </div>
      {#if (data.lifeEvents || []).length > 0}
        <div class="events">
          {#each data.lifeEvents as e}
            <div class="event-item"><span class="event-date">{e.date}</span><span>{e.text}</span></div>
          {/each}
        </div>
      {:else}
        <p class="muted">No events logged yet.</p>
      {/if}
    </div>
  </div>

  <div class="card">
    <h3 class="ct">Quick Reference — Data Templates</h3>
    <p class="sub-desc">Use the templates in the <code>knowledge/monthly_templates.md</code> file. Paste snapshots each month for tracking.</p>
    <div class="template-list">
      <div class="tmpl"><strong>Template A</strong> — Monthly Income & Expense Snapshot</div>
      <div class="tmpl"><strong>Template B</strong> — Balance & Debt Snapshot</div>
      <div class="tmpl"><strong>Template C</strong> — Life Events / Anomalies</div>
    </div>
  </div>
</div>

<style>
  .de { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .ct { font-size: 1rem; font-weight: 700; margin-bottom: 0.6rem; }
  .desc { font-size: 0.85rem; color: var(--text-muted); }
  .sub-desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.8rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .add-form { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.8rem; }
  .add-form input, .add-form select { width: auto; flex: 1; min-width: 100px; }
  .add-row { display: flex; gap: 0.5rem; margin-bottom: 0.8rem; }
  .add-row input { flex: 1; }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; }
  .btn-sm { padding: 0.4rem 0.8rem; font-size: 0.78rem; }
  .muted { font-size: 0.82rem; color: var(--text-muted); }
  .high-apr { color: var(--red); font-weight: 600; }
  .type-badge { font-size: 0.72rem; background: var(--bg-primary); padding: 0.15rem 0.4rem; border-radius: 4px; text-transform: capitalize; }
  .rm { color: var(--red); font-size: 0.9rem; }
  .events { display: flex; flex-direction: column; gap: 0.3rem; }
  .event-item { display: flex; gap: 0.8rem; font-size: 0.85rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
  .event-date { color: var(--text-muted); font-size: 0.78rem; min-width: 5rem; }
  .template-list { display: flex; flex-direction: column; gap: 0.4rem; }
  .tmpl { font-size: 0.88rem; padding: 0.5rem 0.7rem; background: var(--bg-primary); border-radius: var(--radius-sm); }
  code { font-size: 0.82rem; color: var(--accent-light); background: var(--accent-glow); padding: 0.1rem 0.3rem; border-radius: 3px; }
  @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
</style>
