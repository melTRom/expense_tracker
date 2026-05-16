# COMPASS Frontend Plan — Svelte 5 UI Components

**Source of truth**: `HFIA_Architecture_Spec.md` Pillar VII, Pillar VIII  
**CRITICAL NOTE**: Spec defines Next.js 14 components. Actual project uses **Svelte 5.55.5 + Vite 8.0.12**.  
This plan translates all 11 spec components to Svelte 5 runes syntax. Next.js is NOT used.  
**Date**: 2026-05-16

---

## Section 1 — Framework Decision

| Spec says | Actual project | Resolution |
|---|---|---|
| Next.js 14 | Svelte 5.55.5 + Vite 8.0.12 | Use Svelte — already scaffolded |
| `app/page.tsx` | `src/pages/Dashboard.svelte` | Keep existing Svelte pages |
| React `.tsx` components | `.svelte` components | 1-to-1 mapping below |
| Next.js API routes | Vite proxy → FastAPI:8000 | Add proxy in `vite.config.ts` |

**Vite proxy** (`vite.config.ts`):
```typescript
server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } }
```

---

## Section 2 — Component Map

| Spec Component | Svelte File | Notes |
|---|---|---|
| `CompassChat.tsx` | `src/components/CompassChat.svelte` | Main chat UI + SSE consumer |
| `MonthlyReviewCard.tsx` | `src/components/MonthlyReviewCard.svelte` | Markdown renderer |
| `BudgetDonutChart.tsx` | `src/components/BudgetDonutChart.svelte` | Pure SVG donut |
| `DebtAvalancheTimeline.tsx` | `src/components/DebtAvalancheTimeline.svelte` | Progress bars |
| `EFProgressMeter.tsx` | `src/components/EFProgressMeter.svelte` | 4-tier EF bars |
| `SpendingForecastChart.tsx` | `src/components/SpendingForecastChart.svelte` | Prophet line chart |
| `AnomalyAlert.tsx` | `src/components/AnomalyAlert.svelte` | Red banner |
| `VehicleTCOTable.tsx` | `src/components/VehicleTCOTable.svelte` | TCO data table |
| `FICOSimulator.tsx` | `src/components/FICOSimulator.svelte` | Interactive sliders |
| `SinkingFundTracker.tsx` | `src/components/SinkingFundTracker.svelte` | Progress bars |
| `PrivacyIndicator.tsx` | `src/components/PrivacyIndicator.svelte` | PII status badge |

---

## Section 3 — Svelte 5 Store (Runes)

```typescript
// src/lib/stores/compassStore.svelte.ts
export const compassState = $state({
  sessionId: crypto.randomUUID() as string,
  householdId: "00000000-0000-0000-0000-000000000001",
  isStreaming: false,
  provider: "" as string,
  anonymizationApplied: false,
  toolsInvoked: [] as string[],
  privacyNotice: "" as string,
  messages: [] as ChatMessage[],
});

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolsInvoked?: string[];
}
```

---

## Section 4 — SSE Client (from backend plan Section 4)

```typescript
// src/lib/compass_client.ts
import type { SSEEvent } from './types';

export async function* streamChat(
  rawInput: string, message: string,
  sessionId: string, householdId: string,
): AsyncGenerator<SSEEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_input: rawInput, message, session_id: sessionId, household_id: householdId }),
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.startsWith("data: ")) yield JSON.parse(line.slice(6)) as SSEEvent;
    }
  }
}
```

---

## Section 5 — CompassChat.svelte

```svelte
<!-- src/components/CompassChat.svelte -->
<script lang="ts">
  import { compassState } from '$lib/stores/compassStore.svelte';
  import { streamChat } from '$lib/compass_client';
  import PrivacyIndicator from './PrivacyIndicator.svelte';
  import MonthlyReviewCard from './MonthlyReviewCard.svelte';

  let inputText = $state("");
  let rawXmlInput = $state("");
  let statusMessage = $state("");

  async function send() {
    if (!inputText.trim() && !rawXmlInput.trim()) return;
    compassState.isStreaming = true;
    compassState.toolsInvoked = [];
    compassState.messages.push({ role: "user", content: inputText, timestamp: new Date() });
    let assistantContent = "";

    for await (const event of streamChat(rawXmlInput, inputText, compassState.sessionId, compassState.householdId)) {
      if (event.type === "status") statusMessage = event.content;
      else if (event.type === "privacy_notice") { compassState.privacyNotice = event.content; compassState.anonymizationApplied = true; }
      else if (event.type === "text") assistantContent += event.content;
      else if (event.type === "tool_use") compassState.toolsInvoked = [...compassState.toolsInvoked, event.metadata?.tool_name ?? ""];
      else if (event.type === "summary_md") { assistantContent = event.content; compassState.toolsInvoked = event.tools_invoked ?? []; }
      else if (event.type === "error") assistantContent = `Error: ${event.content}`;
    }

    compassState.messages.push({ role: "assistant", content: assistantContent, timestamp: new Date(), toolsInvoked: compassState.toolsInvoked });
    compassState.isStreaming = false;
    inputText = "";
    rawXmlInput = "";
    statusMessage = "";
  }
</script>

<div class="compass-chat">
  <PrivacyIndicator isAnonymized={compassState.anonymizationApplied} provider={compassState.provider} notice={compassState.privacyNotice} />
  <div class="messages">
    {#each compassState.messages as msg}
      <div class="message {msg.role}">
        {#if msg.role === "assistant"}<MonthlyReviewCard markdown={msg.content} />{:else}<p>{msg.content}</p>{/if}
      </div>
    {/each}
    {#if compassState.isStreaming}<div class="status">{statusMessage || "Thinking…"}</div>{/if}
  </div>
  <div class="input-area">
    <textarea bind:value={rawXmlInput} placeholder="Paste XML data (optional)…" rows="3" />
    <input bind:value={inputText} placeholder="Ask COMPASS…" onkeydown={(e) => e.key === 'Enter' && send()} />
    <button onclick={send} disabled={compassState.isStreaming}>Send</button>
  </div>
</div>
```

---

## Section 6 — BudgetDonutChart.svelte (pure SVG)

```svelte
<!-- src/components/BudgetDonutChart.svelte -->
<script lang="ts">
  const { needs = 0, wants = 0, savings = 0 } = $props<{ needs: number; wants: number; savings: number }>();
  const total = $derived(needs + wants + savings || 1);
  const needsPct = $derived((needs / total) * 100);
  const wantsPct = $derived((wants / total) * 100);
  const savingsPct = $derived((savings / total) * 100);
  const alert = $derived(needsPct > 60);

  function arc(pct: number, offset: number) {
    const [r, cx, cy] = [60, 80, 80];
    const s = (pct / 100) * 2 * Math.PI;
    const a = (offset / 100) * 2 * Math.PI - Math.PI / 2;
    const [x1, y1] = [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x2, y2] = [cx + r * Math.cos(a + s), cy + r * Math.sin(a + s)];
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${s > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
  }
</script>

<div class="donut {alert ? 'alert' : ''}">
  <svg viewBox="0 0 160 160" width="160" height="160">
    <path d={arc(needsPct, 0)} fill="#ef4444" opacity="0.85" />
    <path d={arc(wantsPct, needsPct)} fill="#f59e0b" opacity="0.85" />
    <path d={arc(savingsPct, needsPct + wantsPct)} fill="#10b981" opacity="0.85" />
    <circle cx="80" cy="80" r="35" fill="white" />
    <text x="80" y="85" text-anchor="middle" font-size="12" font-weight="bold">{needsPct.toFixed(0)}%</text>
  </svg>
  {#if alert}<p class="alert-text">⚠️ Needs exceed 60% of net</p>{/if}
</div>
```

---

## Section 7 — EFProgressMeter.svelte

```svelte
<!-- src/components/EFProgressMeter.svelte -->
<script lang="ts">
  export interface EFTier { name: string; target: number; current: number; months_to_reach: number; status: string; }
  const { tiers }: { tiers: EFTier[] } = $props();
  const pct = (t: EFTier) => Math.min(100, (t.current / t.target) * 100);
</script>
<div class="ef-meter">
  <h3>Emergency Fund</h3>
  {#each tiers as tier}
    <div class="tier">
      <div class="row"><span>{tier.name}</span><span>${tier.current.toLocaleString()} / ${tier.target.toLocaleString()}</span><span>{tier.status === "achieved" ? "✅" : `${tier.months_to_reach} mo`}</span></div>
      <div class="bar"><div class="fill" style="width:{pct(tier)}%"></div></div>
    </div>
  {/each}
</div>
```

---

## Section 8 — DebtAvalancheTimeline.svelte

```svelte
<!-- src/components/DebtAvalancheTimeline.svelte -->
<script lang="ts">
  export interface DebtRow { label: string; months: number; apr: number; balance: number; }
  const { debts, totalMonths }: { debts: DebtRow[]; totalMonths: number } = $props();
</script>
<div class="avalanche">
  <h3>Debt Payoff — Avalanche</h3>
  {#each debts as debt, i}
    <div class="row">
      <span>#{i+1} {debt.label} ({debt.apr}% APR)</span>
      <div class="bar-track"><div class="fill" style="width:{(debt.months/totalMonths)*100}%;background:hsl({120-i*25},70%,50%)"></div><span>{debt.months}mo</span></div>
    </div>
  {/each}
  <p>Total: {totalMonths} months to debt freedom</p>
</div>
```

---

## Section 9 — SpendingForecastChart.svelte

```svelte
<!-- src/components/SpendingForecastChart.svelte -->
<script lang="ts">
  export interface ForecastPoint { period: string; predicted: number; lower_80: number; upper_80: number; }
  const { category, forecasts, confidence }: { category: string; forecasts: ForecastPoint[]; confidence: string } = $props();
  const W = 300, H = 120, pad = 30;
  const maxVal = $derived(Math.max(...forecasts.map(f => f.upper_80)) * 1.1 || 1);
  const y = (v: number) => H - pad - (v / maxVal) * (H - pad * 2);
  const x = (i: number) => pad + (i / Math.max(forecasts.length - 1, 1)) * (W - pad * 2);
</script>
<div class="forecast">
  <h4>{category}</h4>
  <svg viewBox="0 0 {W} {H}">
    {#each forecasts as f, i}
      {#if i < forecasts.length - 1}
        <polygon points="{x(i)},{y(f.upper_80)} {x(i+1)},{y(forecasts[i+1].upper_80)} {x(i+1)},{y(forecasts[i+1].lower_80)} {x(i)},{y(f.lower_80)}" fill="#3b82f6" opacity="0.15" />
      {/if}
    {/each}
    <polyline points={forecasts.map((f,i) => `${x(i)},${y(f.predicted)}`).join(" ")} fill="none" stroke="#3b82f6" stroke-width="2" />
    {#each forecasts as f, i}
      <circle cx={x(i)} cy={y(f.predicted)} r="4" fill="#3b82f6" />
      <text x={x(i)} y={H-6} text-anchor="middle" font-size="9">{f.period}</text>
      <text x={x(i)} y={y(f.predicted)-8} text-anchor="middle" font-size="9">${f.predicted.toFixed(0)}</text>
    {/each}
  </svg>
  <p class="caveat">Confidence: {confidence} | ±ranges = 80% likely range</p>
</div>
```

---

## Section 10 — FICOSimulator.svelte

```svelte
<!-- src/components/FICOSimulator.svelte -->
<script lang="ts">
  let score = $state(650), util = $state(30), paydown = $state(0), limit = $state(10000);
  const newUtil = $derived(Math.max(0, util - (paydown / limit * 100)));
  const delta = $derived(Math.round((util - newUtil) / 100 * 250 * (1 - (score - 580) / 420)));
  const newScore = $derived(Math.min(850, score + delta));
</script>
<div class="fico-sim">
  <h3>FICO Simulator</h3>
  <label>Score: <input type="range" min="300" max="850" bind:value={score} /> {score}</label>
  <label>Utilization: <input type="range" min="0" max="100" bind:value={util} /> {util}%</label>
  <label>Paydown $: <input type="number" bind:value={paydown} min="0" /></label>
  <label>Total Limit $: <input type="number" bind:value={limit} min="100" /></label>
  <div class="result">
    New util: {newUtil.toFixed(1)}% → Estimated: <strong>{newScore}</strong> ({delta >= 0 ? '+' : ''}{delta} pts)
    <p class="caveat">Estimate only. Re-check 30–45 days after paydown.</p>
  </div>
</div>
```

---

## Section 11 — Remaining Components (concise)

```svelte
<!-- AnomalyAlert.svelte -->
<script lang="ts">
  const { isAnomalous, topCategories }: { isAnomalous: boolean; topCategories: {category:string;percentile:number}[] } = $props();
</script>
{#if isAnomalous}
  <div class="anomaly-alert">⚠️ Unusual spending: {topCategories.map(c => `${c.category} (${c.percentile.toFixed(0)}th pct)`).join(", ")}</div>
{/if}

<!-- PrivacyIndicator.svelte -->
<script lang="ts">
  const { isAnonymized, provider, notice }: { isAnonymized: boolean; provider: string; notice: string } = $props();
</script>
{#if provider}
  <div class="privacy-badge {isAnonymized ? 'cloud' : 'local'}">
    {isAnonymized ? `🛡️ ${notice}` : `🔒 Local (${provider}) — data stays on device`}
  </div>
{/if}

<!-- MonthlyReviewCard.svelte — requires: npm install marked -->
<script lang="ts">
  import { marked } from 'marked';
  const { markdown }: { markdown: string } = $props();
  const html = $derived(marked(markdown || ""));
</script>
<div class="review-card">{@html html}</div>

<!-- VehicleTCOTable.svelte -->
<script lang="ts">
  const { vehicles }: { vehicles: { label:string; monthly_tco:number; loan_balance:number; kbb_value:number; equity:number; action_signal:string }[] } = $props();
  const label = (s:string) => ({ monitor:"✅ Monitor", consider_drop_collision:"💡 Drop collision", sell_analysis_recommended:"⚠️ Run sell analysis" }[s] ?? s);
</script>
<table><thead><tr><th>Vehicle</th><th>Monthly TCO</th><th>KBB</th><th>Equity</th><th>Action</th></tr></thead>
<tbody>{#each vehicles as v}<tr><td>{v.label}</td><td>${v.monthly_tco.toFixed(0)}</td><td>${v.kbb_value.toLocaleString()}</td><td>${v.equity.toLocaleString()}</td><td>{label(v.action_signal)}</td></tr>{/each}</tbody></table>

<!-- SinkingFundTracker.svelte -->
<script lang="ts">
  const { funds }: { funds: { name:string; target:number; current:number; monthly_contribution:number }[] } = $props();
  const mo = (f: typeof funds[0]) => f.current >= f.target ? 0 : Math.ceil((f.target - f.current) / (f.monthly_contribution || 1));
</script>
<div class="sinking-funds">
  {#each funds as f}<div><span>{f.name}</span><span>${f.current.toLocaleString()} / ${f.target.toLocaleString()} ({mo(f)} mo)</span><div class="bar"><div style="width:{Math.min(100,(f.current/f.target)*100}%"></div></div></div>{/each}
</div>
```

---

## Section 12 — Additional Dependencies

```bash
npm install marked            # MonthlyReviewCard markdown rendering
npm install --save-dev @types/marked
```

No chart library needed — all charts use native SVG.

---

## Section 13 — Implementation Sequence (Phase 6, Frontend)

| Step | Task |
|---|---|
| 6a | Add Vite proxy config + `marked` dependency |
| 6b | `src/lib/types.ts` — SSEEvent, ChatMessage interfaces |
| 6c | `src/lib/compass_client.ts` — SSE generator function |
| 6d | `src/lib/stores/compassStore.svelte.ts` — runes state |
| 6e | `PrivacyIndicator.svelte` — no data deps, test first |
| 6f | `MonthlyReviewCard.svelte` — verify `marked` renders tables |
| 6g | `CompassChat.svelte` — wire SSE, test with Ollama running |
| 6h | `BudgetDonutChart.svelte` — test with mock percentages |
| 6i | `EFProgressMeter.svelte`, `DebtAvalancheTimeline.svelte` |
| 6j | `SpendingForecastChart.svelte`, `FICOSimulator.svelte` |
| 6k | `AnomalyAlert.svelte`, `VehicleTCOTable.svelte`, `SinkingFundTracker.svelte` |
| 6l | Wire all into `Dashboard.svelte` layout |

---

*Frontend plan v1.0 — COMPASS Svelte 5 | 2026-05-16*
