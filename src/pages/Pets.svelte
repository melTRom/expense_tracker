<script>
  import { fmt, pct } from '../lib/storage.js';
  let { data, onsave } = $props();
  let pets = $state(structuredClone(data.pets));

  function save() { data.pets = pets; onsave?.(data); }
</script>

<div class="pets fade-in">
  <div class="two-col">
    <div class="card">
      <div class="pet-head"><span class="pet-emoji">🐶</span><h3 class="ct">Senior Pug (9 yrs)</h3></div>
      <div class="alert-warn">Brachycephalic breed — high medical risk: BOAS/airway, eye injuries, skin-fold infections, allergies, spinal issues. Firmly in senior territory.</div>

      <h4 class="sub-ct">Sinking Fund</h4>
      <div class="fg"><label class="fl">Pug Emergency Fund Balance</label><input type="number" bind:value={pets.pugSinkingFund} /></div>
      <div class="prog-row">
        <span class="prog-label">{fmt(pets.pugSinkingFund)} / $3,000–$5,000 target</span>
        <span class="prog-pct">{pct(pets.pugSinkingFund, 4000)}%</span>
      </div>
      <div class="track"><div class="fill teal" style="width:{Math.min(pct(pets.pugSinkingFund,4000),100)}%"></div></div>

      <h4 class="sub-ct">Annual Budget</h4>
      <div class="fg"><label class="fl">Annual Routine Budget (~$1,200–$2,000)</label><input type="number" bind:value={pets.pugAnnualBudget} /></div>
      <p class="detail">Covers: food, prevention, 2 vet visits, dental, expected meds</p>

      <h4 class="sub-ct">Insurance</h4>
      <div class="fg"><label class="fl">Monthly Premium (if enrolled)</label><input type="number" bind:value={pets.pugInsurance} /></div>
      <div class="alert-info">
        <strong>Insurance is marginal for a 9-year-old pug.</strong> Premiums commonly $80–$150+/mo with pre-existing exclusions. Recommended: dedicated sinking fund + accident-only insurance if cheap. Quote from MetLife Pet, Pumpkin, AKC, Spot, Lemonade. Only if &lt;$60/mo with reasonable terms.
      </div>

      <div class="alert-important" style="margin-top:0.8rem;">
        🩺 <strong>Humane Endpoint Budget:</strong> Decide in advance what the household can spend on a major procedure (mass removal, spinal surgery $5K–$10K) so the decision isn't made in crisis.
      </div>
    </div>

    <div class="card">
      <div class="pet-head"><span class="pet-emoji">🐱</span><h3 class="ct">Kitten (3 months)</h3></div>

      <h4 class="sub-ct">First-Year Budget ($1,000–$2,000)</h4>
      <div class="fg"><label class="fl">First-Year Fund Balance</label><input type="number" bind:value={pets.kittenFirstYear} /></div>
      <div class="prog-row">
        <span class="prog-label">{fmt(pets.kittenFirstYear)} / $1,000–$2,000</span>
        <span class="prog-pct">{pct(pets.kittenFirstYear, 1500)}%</span>
      </div>
      <div class="track"><div class="fill accent" style="width:{Math.min(pct(pets.kittenFirstYear,1500),100)}%"></div></div>

      <h4 class="sub-ct">First-Year Cost Breakdown</h4>
      <table>
        <tbody>
          <tr><td>Vaccine series</td><td>$150–$350</td></tr>
          <tr><td>Spay/neuter</td><td>$75–$500 (TCAP: $100–$200)</td></tr>
          <tr><td>Microchip</td><td>$15–$60</td></tr>
          <tr><td>FeLV/FIV test</td><td>$30–$50</td></tr>
          <tr><td>Prevention (flea/HW)</td><td>~$200/yr</td></tr>
          <tr><td>Supplies</td><td>$200–$400</td></tr>
          <tr><td>Wellness visits</td><td>1–2 visits</td></tr>
        </tbody>
      </table>

      <h4 class="sub-ct">Milestones</h4>
      <label class="check-row"><input type="checkbox" bind:checked={pets.kittenVaccines} /><span>Vaccine series complete</span></label>
      <label class="check-row"><input type="checkbox" bind:checked={pets.kittenSpayNeuter} /><span>Spay/neuter done</span></label>

      <h4 class="sub-ct">Insurance</h4>
      <div class="fg"><label class="fl">Monthly Premium ($12–$32/mo)</label><input type="number" bind:value={pets.kittenInsurance} /></div>
      <div class="alert-tip">💡 Enroll BEFORE any condition is documented in the medical record. Young kitten insurance is cheap and easy to justify.</div>
    </div>
  </div>
  <button class="btn-primary" onclick={save}>Save Pet Data</button>
</div>

<style>
  .pets { display: flex; flex-direction: column; gap: 1rem; }
  .card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.4rem; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .pet-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.8rem; }
  .pet-emoji { font-size: 1.5rem; }
  .ct { font-size: 1rem; font-weight: 700; }
  .sub-ct { font-size: 0.88rem; font-weight: 700; color: var(--text-secondary); margin-top: 1rem; margin-bottom: 0.4rem; }
  .fg { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.5rem; }
  .fl { font-size: 0.72rem; font-weight: 600; color: var(--text-secondary); }
  .prog-row { display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 0.3rem; }
  .prog-pct { font-weight: 600; }
  .track { width: 100%; height: 8px; background: var(--bg-primary); border-radius: 99px; overflow: hidden; }
  .fill { height: 100%; border-radius: 99px; transition: width 0.6s ease; }
  .fill.teal { background: linear-gradient(90deg,#14b8a6,#2dd4bf); }
  .fill.accent { background: linear-gradient(90deg,var(--accent),var(--accent-light)); }
  .detail { font-size: 0.78rem; color: var(--text-muted); }
  .alert-warn { font-size: 0.8rem; color: var(--amber); background: var(--amber-glow); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--amber); margin-bottom: 0.5rem; }
  .alert-info { font-size: 0.8rem; color: var(--accent-light); background: var(--accent-glow); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--accent); margin-top: 0.5rem; }
  .alert-tip { font-size: 0.8rem; color: var(--green); background: var(--green-glow); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--green); margin-top: 0.5rem; }
  .alert-important { font-size: 0.8rem; color: var(--pink); background: rgba(236,72,153,0.1); padding: 0.6rem; border-radius: var(--radius-sm); border-left: 3px solid var(--pink); }
  .check-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; margin-bottom: 0.3rem; cursor: pointer; }
  .check-row input { width: auto; accent-color: var(--green); }
  table td { font-size: 0.85rem; }
  table td:last-child { color: var(--text-muted); text-align: right; }
  .btn-primary { padding: 0.6rem 1.2rem; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; background: var(--accent); color: #fff; align-self: flex-start; }
  @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
</style>
