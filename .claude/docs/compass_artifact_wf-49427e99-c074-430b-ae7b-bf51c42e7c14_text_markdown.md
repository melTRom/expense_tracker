# Building an Optimal Claude Project as a Household Financial Intelligence Assistant: A Research Report

This report provides the research and design specifications you need to build a Claude Project that functions as a comprehensive household financial intelligence assistant for your specific family profile (two adults with mixed/single-income, two college-bound kids, three vehicles, mortgage, senior pug and kitten, and four simultaneous financial priorities). It synthesizes Anthropic's official prompt-engineering guidance, mainstream personal-finance frameworks (Ramsey, Sethi, Bogleheads, Warren), current (May 2026) HYSA and FICO data, and household-specific calibrations.

## 1. Claude Project System Prompt Architecture

Anthropic's published best practices converge on a consistent skeleton for high-performing system prompts: **Role → Context → Instructions → Constraints → Output format**, optionally with **Examples** and a **Thinking** section. For a financial assistant, the architecture should map to:

- **`<role>`** — a single specific persona ("You are a household financial intelligence assistant…"). Anthropic explicitly notes that even a one-sentence role definition meaningfully changes Claude's reasoning lens; experimenting with the role (e.g., "household CFO" vs. "fee-only fiduciary planner") materially shifts which risks the model surfaces.
- **`<household_profile>`** — static facts the assistant should never forget: members, ages, pets, vehicles, housing, debts, priorities. Putting this in the system prompt (not user messages) is what makes the Project feel "smart" across sessions.
- **`<priorities>`** — explicit ranked goals (debt/credit repair, emergency fund, college, retirement) so trade-offs can be resolved consistently.
- **`<frameworks>`** — encoded methodologies (zero-based budget, Baby Steps, Conscious Spending, Bogleheads investment order).
- **`<instructions>`** — what to do each interaction (proactive insights, monthly check-ins, calculations).
- **`<constraints>`** — what NOT to do (no specific securities, no legal/tax advice as fact).
- **`<output_format>`** — structure for recurring outputs (monthly review, alerts).
- **`<disclaimers>`** — required language for high-stakes outputs.

The Anthropic docs note that with the latest Claude models, providing dense, well-specified context upfront maximizes performance and reduces token-burn from repeated user clarifications, so this front-loaded design is strongly preferred over conversational drip-feeding.

**Tone/persona that works best for household finance:** A *fee-only fiduciary-style advisor + supportive accountability coach* hybrid. Avoid Ramsey-style moralizing ("debt is dumb") and avoid Sethi-style "rich life" maximalism — both are too dogmatic to handle a household juggling four priorities. Aim for "calm, numerate, candid, and proactive." Explicitly instruct Claude to ask clarifying questions when data is missing and to surface trade-offs rather than dictate answers.

## 2. Household Expense-Category Framework

For a household with your profile, a 25–30 line-item zero-based chart of accounts is the right level of granularity — detailed enough to find leaks, simple enough to maintain monthly. Group categories into five tiers (this maps cleanly to both zero-based and 50/30/20 thinking):

- **Housing (target ~25–35% of net):** mortgage P&I, property tax/escrow, HOA, homeowner's insurance, home maintenance sinking fund (1% of home value/year), utilities (electric, gas, water/sewer, trash, internet/cell).
- **Transportation (target ~10–15% of net — likely high for you):** auto loan payments (per vehicle), auto insurance (all three vehicles), fuel, routine maintenance, registration/inspection, repairs sinking fund.
- **Food & household (target ~10–15%):** groceries, household supplies, dining out (separate line so you can see it).
- **People care:** healthcare premiums, OOP medical, prescriptions, dental/vision, clothing, personal care, kids' college direct costs (UTEP tuition/fees/books/room or commute), childcare (n/a here), incoming-freshman launch budget.
- **Pet care (separate from healthcare — meaningful for you):** food, routine vet, prevention (flea/heartworm), pet insurance premiums, **senior-pug medical sinking fund**, kitten first-year sinking fund, grooming, supplies.
- **Subscriptions & lifestyle:** streaming, software, gym, hobbies, entertainment, gifts, travel.
- **Financial priorities (target ~20%+ combined):** minimum debt payments (in needs), accelerated debt payoff, emergency fund contribution, retirement contributions (per account), 529 contributions, taxable investing.
- **Irregular/sinking funds:** Christmas, birthdays, annual insurance premiums paid lump-sum, vehicle replacement, home repair, vet emergency. Sinking funds are the single most under-used budgeting tool and are what makes zero-based budgeting actually survive contact with reality.

## 3. Income Tracking Schema (Mixed Salary + Variable Side Income)

The standard practice for a household with one stable W-2 + variable side income is the **"two-tier baseline" approach**:

- **Tier 1 — Baseline income:** the salary (after tax) plus the *lowest-month, lowest-quarter floor* of side income (use the 25th-percentile of the last 6–12 months, not the average). Build the entire monthly zero-based budget around this number so the family is never overspending what hasn't arrived.
- **Tier 2 — Surge income:** anything above baseline. Pre-allocate by percentage *before it arrives*, e.g., 50% high-interest debt, 20% emergency fund, 15% Roth IRA, 10% 529, 5% "fun money / guilt-free spending" (a deliberate Sethi nod that prevents budget burnout).

Track side income gross, then net it for self-employment tax (~15.3% SE tax + estimated federal income tax — set aside 25–30% in a separate tax-holding sub-account; Texas has no state income tax, which is a real advantage). The assistant should auto-prompt quarterly estimated tax dates (Apr 15, Jun 15, Sep 15, Jan 15).

**Framework choice for your household:** Use a **hybrid — zero-based budget as the operating system, with 50/30/20 as a sanity check.** Pure 50/30/20 breaks for most U.S. households because "needs" routinely consume 60–80% of net pay; pure zero-based is the most effective for debt payoff and variable income but is high-effort. The hybrid lets the assistant flag when needs creep above 60% (a structural problem signal) while still assigning every baseline dollar a job. Ramsey's Baby Steps order is useful encoded knowledge but should be modified: your household cannot pause college savings entirely while building a full emergency fund because one child is already enrolled. Sethi's Conscious Spending Plan (50–60% fixed costs, 10% investments, 5–10% savings goals, 20–35% guilt-free spending) is too generous on discretionary spend for your debt-priority context but its philosophy — automate aggressively, spend deliberately on what you value — is worth encoding as a principle.

## 4. Credit Health Module

The system prompt should encode the FICO factor weights as ground truth: **payment history 35%, amounts owed (utilization) 30%, length of history 15%, new credit 10%, credit mix 10%.** Key benchmarks to monitor:

- **Utilization:** the popular "under 30%" is the *danger threshold*, not the target. People with 800+ FICO scores average ~6% utilization. The assistant should target **single-digit utilization per card and aggregate**, and recommend paying balances *before* the statement closing date (so the reported balance is low even if you use the card heavily).
- **Payment history:** a single 30-day late can drop a score 60–110 points and stays on the report for 7 years. The assistant should track autopay status for every account.
- **Debt-to-income (DTI):** not a FICO factor but used by every lender. Mortgage lenders generally want back-end DTI ≤ 43% (≤ 36% preferred). Compute monthly: (all monthly debt payments incl. mortgage) ÷ gross monthly income.
- **Credit mix and age:** the assistant should warn before closing old cards (shortens average age and reduces total available credit, both hurting score) and discourage opening new accounts within 12 months of any planned mortgage refi.

**Credit-repair playbook to encode:** (1) Get all three free reports weekly at AnnualCreditReport.com and dispute errors; (2) bring every account current and stay current; (3) drive utilization to single digits via payment timing and/or limit increase requests (soft-pull if possible); (4) keep oldest card open with a small recurring charge + autopay; (5) avoid new applications during repair window; (6) re-check FICO 30–45 days after each utilization payment.

## 5. Savings / Emergency Fund Module

For your household profile — single working adult, mortgage, three vehicles, two college-age kids, senior pug — the textbook 3–6 months expenses is **inadequate**. Encode a tiered target:

- **Tier 1 — Starter EF: $2,000–$2,500** (one-month cushion + buffer for one vet emergency). Ramsey's $1,000 starter is too low given the senior pug.
- **Tier 2 — Working EF: 1 month of essential expenses** (housing + utilities + groceries + insurance + minimum debt + transportation). Build this while attacking high-interest debt.
- **Tier 3 — Full EF: 6 months of essential expenses.** Six (not three) months is appropriate because of single-income concentration risk + three vehicles + senior pet + mortgage + dependent kids. For a representative household with $5,000/mo essential spend, that's $30,000.
- **Tier 4 — Sinking-fund layer:** a dedicated $1,500–$3,000 pug emergency fund (separate sub-account), a vehicle repair sinking fund (~$1,000–$2,000), and a home repair sinking fund.

**Where to park it (May 2026 rate environment):** Top HYSAs as of May 2026 are paying 4.00–5.00% APY with the national average sitting near 0.38%. Reputable options widely cited include Varo (up to 5.00%), SoFi (up to 4.50% with direct deposit), Axos (~4.21%), American Express HYSA, Marcus by Goldman Sachs, Capital One 360 Performance Savings, Ally, and Bread Savings. The Fed has cut rates three times since late 2025 and further cuts are expected, so rates are trending down — for funds you won't touch for 12 months, a 12-month CD may be worth considering to lock in a rate, but emergency funds should stay liquid in an HYSA. All recommendations should reference FDIC/NCUA $250,000 per-depositor coverage.

## 6. Investment Module

Encode the Bogleheads investment priority order, adapted to your household:

1. **Build starter EF + bring all debt current** (you can't invest your way out of a missed payment).
2. **Capture full employer 401(k) match** — the only guaranteed 50–100% instant return available; never leave this on the table.
3. **Pay off high-interest debt** (anything above ~7–8%, especially credit cards).
4. **Max HSA if eligible** — triple tax-advantaged (deductible in, tax-free growth, tax-free out for medical); at 65+ functions like a traditional IRA.
5. **Max Roth IRA(s)** — 2026 limit is $7,000 per person ($8,000 if 50+). A non-working spouse can fund a Spousal Roth IRA based on the working spouse's earned income — *this is one of the most under-used moves in single-income households and should be a flagged opportunity.*
6. **Remainder of 401(k) up to the annual employee limit.**
7. **529 for kids** (see below).
8. **Pay off medium-interest debt** (auto loans 4–7%).
9. **Taxable brokerage** for surplus.
10. **Optional: extra mortgage principal** if rate > ~5% and other priorities met.

**Index fund/ETF basics to encode (beginner-friendly):** The Bogleheads three-fund portfolio (US total market + international + US total bond) using low-cost index funds or ETFs (Vanguard VTI/VXUS/BND, Fidelity FZROX/FZILX/FXNAX, or Schwab equivalents) covers >99% of what a household needs. Expense ratios should be ≤ 0.10%. Avoid actively managed funds, individual stock-picking, and anything with loads.

**529 for incoming freshman (Texas):** Because Texas has no state income tax, there is **no state-tax advantage to using the Texas College Savings Plan over an out-of-state plan** — your household can shop nationally. Utah's my529 and other top-rated, low-fee plans are commonly preferred. For a child *already* college-age, a 529 is still useful: contributions grow tax-free, can be withdrawn tax-free for qualified expenses *in the same year as the expense*, and (since SECURE 2.0) unused balances up to $35,000 lifetime can roll to the beneficiary's Roth IRA after 15 years. For your current UTEP student and incoming freshman, prioritize: cash-flow current tuition first, fund 529 only with whatever surplus exists after retirement priorities, and explore UTEP-specific scholarships, Pell Grant eligibility, and the Texas Tuition Promise Fund only for younger children (locks tuition at today's prices).

## 7. Car Optimization Analysis (Van, Chrysler, Nissan Sentra SR 2022)

The assistant should run a **per-vehicle total cost of ownership (TCO) analysis** monthly: (loan payment + insurance + fuel + maintenance + estimated annual repairs ÷ 12 + depreciation). Key decision logic to encode:

- **Three vehicles for one driver is structurally expensive.** Insurance alone on three vehicles likely runs $250–$500+/month. The assistant should ask whether all three are actually being driven weekly; if not, the older two are candidates for sale.
- **2022 Nissan Sentra SR:** likely the newest and the one most likely under loan. Check the loan rate against current HYSA rates (~4–5%) — if the auto rate is below ~5%, paying minimums is mathematically rational; if above ~6–7%, accelerate payoff after match/Roth.
- **Van and Chrysler:** if older and paid off, run a "keep vs sell" calc each year: (annual repair cost + insurance + registration) vs (sale value + insurance savings + reduced maintenance). General rule: when a single repair exceeds 50% of the vehicle's market value, sell.
- **Insurance optimization:** shop full quotes every 12 months from at least three carriers (GEICO, Progressive, State Farm, USAA if eligible, plus one local). Raise deductibles to $1,000 if EF supports it. Consider dropping comprehensive/collision on any vehicle worth under ~$4,000. Bundle with home insurance.
- **Depreciation tracking:** pull KBB/Edmunds values quarterly so net-worth tracking is accurate.

## 8. Expense-Cut Suggestion Engine

Encode a tiered cut hierarchy that respects quality of life:

- **Tier 1 (painless):** subscription audit (~$50–$150/mo of forgotten services in typical households), cell plan renegotiation, insurance shopping, refinancing high-interest debt to lower rates, credit card rewards optimization, generic prescriptions, energy-efficiency basics. *Cut first — zero lifestyle impact.*
- **Tier 2 (low-pain):** dining-out frequency, grocery optimization (meal planning, store brands, warehouse club math), entertainment substitution, "no-spend" weeks.
- **Tier 3 (structural):** vehicle reduction, downsizing housing, refinancing mortgage if rate environment allows.
- **Tier 4 (last resort):** education/retirement contributions, pet quality of care.

The logic should always pair a proposed cut with its dollar impact *and* a qualitative cost, presented as a trade-off rather than a directive. Per Sethi's principle: cut mercilessly on what you don't value, spend deliberately on what you do.

## 9. Pet Financial Planning

**Senior pug (9 yrs):** Pugs are a brachycephalic, structurally high-medical-risk breed (BOAS/airway, eye injuries, skin-fold infections, allergies, spinal issues), and at 9 years old the dog is firmly in senior territory (small-breed seniors typically 10–12, but pugs run "older" health-wise). Insurance economics:

- Pet insurance for an enrolled-young pet is usually worth it; **for a 9-year-old pug being enrolled now, it's marginal** because (a) premiums for senior pugs commonly run $80–$150+/month and (b) most existing or hinted-at conditions will be excluded as pre-existing. Quote it from MetLife Pet, Pumpkin (no upper age limit), AKC, Spot, and Lemonade; if the best quote is under ~$60/mo with reasonable terms, it's defensible.
- **Recommended hybrid:** a dedicated pug emergency sinking fund of **$3,000–$5,000** held in the HYSA (this is what insurance would cover after deductible/copay anyway), plus accident-only insurance if available cheaply. Establish a "humane endpoint" budget conversation now — decide in advance what the household can spend on a major procedure (mass removal, spinal surgery $5K–$10K, etc.) so the decision isn't made in crisis.
- Routine annual budget for a senior pug: ~$1,200–$2,000 (food, prevention, two vet visits, dental, expected meds).

**Kitten (3 months):** First-year all-in is typically **$1,000–$2,000**: vaccine series ($150–$350), spay/neuter ($75–$500 depending on clinic; Texas low-cost clinics like TCAP run packages around $100–$200), microchip ($15–$60), FeLV/FIV test (~$30–$50), flea/heartworm prevention (~$200/yr), supplies (litter box, carrier, food, toys, $200–$400), and 1–2 wellness visits. Pet insurance for a young kitten is cheap ($12–$32/month) and easy to justify — enroll *before* any condition is documented in the medical record.

## 10. System Prompt Formatting Best Practices

Anthropic's published guidance is clear: **Claude was specifically trained to recognize XML tags**, and XML outperforms markdown headers for prompt organization when a prompt has 3+ distinct components — which yours will. Best practices to apply:

- Use XML tags for structural sections (`<role>`, `<household_profile>`, `<priorities>`, `<frameworks>`, `<instructions>`, `<constraints>`, `<output_format>`, `<disclaimers>`). Use **markdown inside** the tags for readability (bullets, tables, bold). This is the "best of both" pattern Anthropic's own examples use.
- Be consistent with tag names and nest hierarchically (e.g., `<frameworks><budgeting>...</budgeting><credit>...</credit></frameworks>`).
- **Include an explicit `<constraints>` ("what NOT to do") section** — empirically, negative constraints are essential for finance use cases (no specific stock picks, no tax-prep substitutes, no legal advice, no shaming language).
- **Bake in proactive behavior** with an instruction like: *"At the start of each conversation, ask which mode the user wants: (1) monthly review, (2) ad-hoc question, (3) scenario modeling, (4) credit/debt check-in, (5) just venting. Then proactively surface 1–3 insights or risks the user did NOT ask about, ranked by financial impact."* This converts Claude from reactive to genuinely advisory.
- Add a `<thinking>` instruction for complex multi-account trade-offs so the model reasons through priority order before recommending.
- Keep the full system prompt under ~6,000–8,000 tokens; longer prompts dilute attention. Move stable household data into Project Knowledge (uploaded files) rather than the system prompt where possible.

## 11. Data Input Templates

Claude parses **markdown tables and labeled key-value blocks** most reliably. Provide the user with three templates to paste each month:

**Template A — Monthly Income & Expense Snapshot** (markdown table with columns: Category | Budgeted | Actual | Variance | Notes). One row per chart-of-accounts line item.

**Template B — Balance & Debt Snapshot:**
```
## Accounts (as of [date])
- Checking: $___
- HYSA (Emergency Fund): $___
- Roth IRA (Adult 1): $___
- 401(k): $___
- 529 (Child 1): $___
- 529 (Child 2): $___

## Debts
| Account | Balance | APR | Min Payment | Type |
|---------|---------|-----|-------------|------|
| ...     | ...     | ... | ...         | ...  |

## Credit
- FICO (latest): ___ | Date: ___
- Aggregate utilization: ___%
- Per-card utilization: Card1 __%, Card2 __%, ...
```

**Template C — Life Events / Anomalies This Month:** free-text section flagging anything unusual (vet visit, car repair, side-income spike, tuition payment due, scholarship received).

Anthropic's docs note that wrapping pasted data in named XML tags (`<monthly_data>...</monthly_data>`) further improves parsing reliability, especially when the assistant must reason across multiple months.

## 12. Privacy and Safety Guardrails

Encode an explicit `<constraints>` block:

- **No legally actionable advice.** Claude must not present itself as a CFP®, CPA, attorney, or fiduciary. Recommendations are educational, not personalized legal/tax/investment advice.
- **No specific security recommendations** (no "buy AAPL"). Generic asset-class guidance (e.g., "a low-cost US total-market index fund") is acceptable.
- **No promises of returns.** Use ranges, historical averages with disclaimers, and explicit acknowledgment that past performance does not guarantee future results.
- **Tax guidance:** general rules only (contribution limits, account types), with a standing recommendation to consult a CPA before any tax-year-end move with >$1,000 impact.
- **Encourage second opinions** for: refinancing, withdrawing from retirement accounts before 59½, debt settlement/bankruptcy, life insurance products, annuities.
- **Privacy hygiene:** instruct Claude not to ask for or store full account numbers, SSNs, or login credentials; the user should redact these in any pasted statements.
- **Standing disclaimer footer** for any output containing dollar recommendations: *"Educational information only — not investment, tax, or legal advice. Verify with a licensed professional before acting."*
- **Behavioral guardrails:** no shaming language about past financial decisions; no catastrophizing; acknowledge uncertainty explicitly; when household priorities conflict (e.g., child tuition vs retirement match), present the trade-off and let the user decide rather than dictating.

## Putting It Together

The resulting Claude Project should consist of: (1) a ~3,000–5,000 token system prompt structured with XML tags as described above; (2) Project Knowledge files containing the static household profile, the chart of accounts, the frameworks reference (Bogleheads order, FICO weights, sinking-fund list), and the three monthly templates; and (3) an instruction that Claude open each session by asking which "mode" the household wants and proactively surface 1–3 unasked insights ranked by dollar impact. The hybrid framework — zero-based execution, 50/30/20 sanity check, Bogleheads investment order, Ramsey-style debt urgency, Sethi-style automation and small "guilt-free" allowance — is the right shape for a household balancing all four priorities simultaneously, and is robust to the specific stressors of your profile: single-earner concentration risk, three-vehicle overhead, senior-pet medical tail risk, and overlapping college timelines.
