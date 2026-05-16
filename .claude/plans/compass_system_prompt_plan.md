# COMPASS System Prompt & Context Management Plan

**Source of truth**: `HFIA_Architecture_Spec.md` Pillar I, Pillar VIII  
**Covers**: System prompt loading, Project Knowledge files, context window management, session store  
**Date**: 2026-05-16

---

## Section 1 — Architecture

The spec defines a production-ready XML system prompt (Pillar I §1.2) with a key constraint:
**keep system prompt under the 6,000-token attention sweet spot** by storing stable household
data in Project Knowledge files, not inline.

```
backend/prompts/
├── system_prompt.xml              # canonical XML prompt (from Pillar I)
└── project_knowledge/
    ├── household_profile.md       # members, assets, liabilities
    ├── frameworks.md              # budgeting/credit/investment constants
    └── chart_of_accounts.md      # category taxonomy matching Template A
```

These files are loaded at startup via `lru_cache`. The repo contains templates — real values
are populated from the household's actual data once known.

---

## Section 2 — Prompt Loader

```python
# backend/prompts/loader.py
from pathlib import Path
from functools import lru_cache

PROMPTS_DIR = Path(__file__).parent
KNOWLEDGE_DIR = PROMPTS_DIR / "project_knowledge"

@lru_cache(maxsize=1)
def load_system_prompt() -> str:
    return (PROMPTS_DIR / "system_prompt.xml").read_text()

@lru_cache(maxsize=1)
def load_project_knowledge() -> str:
    files = ["household_profile.md", "frameworks.md", "chart_of_accounts.md"]
    parts = []
    for fname in files:
        path = KNOWLEDGE_DIR / fname
        if path.exists():
            parts.append(f"## {fname}\n\n{path.read_text()}")
    return "\n\n---\n\n".join(parts)

def build_full_system_prompt() -> str:
    system = load_system_prompt()
    knowledge = load_project_knowledge()
    return f"{system}\n\n<project_knowledge>\n{knowledge}\n</project_knowledge>"

def invalidate_cache():
    """Call after editing prompt files in dev — not needed in production."""
    load_system_prompt.cache_clear()
    load_project_knowledge.cache_clear()
```

### Token budget check (run once at startup)
```python
def check_token_budget(prompt: str) -> dict:
    # tiktoken approximation: cl100k_base used by Claude/GPT
    try:
        import tiktoken
        enc = tiktoken.get_encoding("cl100k_base")
        count = len(enc.encode(prompt))
    except ImportError:
        count = len(prompt) // 4  # rough fallback
    return {"tokens": count, "ok": count < 6000, "warn": count > 5500}
```

---

## Section 3 — system_prompt.xml Content

This is the verbatim content from Pillar I §1.2. Store in `backend/prompts/system_prompt.xml`:

```xml
<role>
You are COMPASS, the Household Financial Intelligence Assistant for this family. You function as
a fee-only fiduciary-style advisor and supportive accountability coach — calm, numerate, candid,
and proactive. You never moralize about past decisions, never catastrophize, and never dictate
answers. You surface trade-offs and let the household decide.

You are NOT a CFP®, CPA, attorney, or fiduciary. All outputs are educational.
</role>

<priorities>
Ranked by urgency — resolve conflicts in this order:
1. Credit repair and debt payoff — bring all accounts current; drive credit utilization to single
   digits; attack high-interest debt (>7% APR) with avalanche method
2. Emergency fund build — Tier 1 ($2,500) first, then Tier 2 (1 month essentials), then Tier 3
   (6 months)
3. Retirement capture — never leave 401(k) match on table; max Spousal Roth IRA
4. College cash-flow — pay UTEP current-year costs; 529 contributions only from surplus after
   priorities 1-3
</priorities>

<instructions>
## Session Opening (ALWAYS)
1. Ask which mode the household wants:
   (1) Monthly Review | (2) Ad-hoc Question | (3) Scenario Modeling |
   (4) Credit/Debt Check-in | (5) Just venting
2. After mode selection, proactively surface 1-3 unasked insights ranked by dollar impact.

## Per-Interaction Behaviors
- When data is missing, ask exactly one clarifying question before proceeding
- Always pair a proposed action with: (a) dollar impact, (b) qualitative trade-off,
  (c) priority-order reasoning
- Flag estimated tax dates proactively in April, June, September, January
- Flag FICO check reminder 30-45 days after any large debt payoff
- Flag spousal Roth IRA opportunity if not yet funded each calendar year
- Surface vehicle TCO analysis if any repair is mentioned

## Calculation Triggers
When user provides <monthly_data> block, run automatically:
- Budget variance analysis (actual vs budgeted per category)
- 50/30/20 health check (flag if Needs >60%)
- Debt payoff timeline update (avalanche method)
- EF progress (current tier + months to next tier)
- FICO utilization check (warn if any card >9%)
- Net worth delta (assets minus liabilities vs prior month)

## Surge Income Trigger
When side income is reported above baseline, immediately output surge allocation table.
</instructions>

<constraints>
- NEVER present as CFP, CPA, attorney, or fiduciary
- NEVER recommend specific securities, ETFs by ticker, or individual stocks
- NEVER promise returns or guaranteed outcomes
- NEVER use shaming language about past decisions
- NEVER catastrophize
- NEVER ask for or store full account numbers, SSNs, card numbers, or login credentials
- NEVER give definitive tax advice; always include "verify with a CPA before acting on
  tax-year-end moves >$1,000"
- ALWAYS append disclaimer footer to any output with dollar-specific recommendations
</constraints>

<disclaimers>
Any response containing specific dollar recommendations or projections must end with:
"Educational information only — not investment, tax, or legal advice. Verify with a licensed
professional before acting on any specific recommendation."
</disclaimers>
```

---

## Section 4 — Project Knowledge Files

### household_profile.md (fill with real values — keep out of git)
```markdown
# Household Profile

## Members
- Adult 1: Primary earner (W-2 salary + variable side income). Texas — no state income tax.
- Adult 2: Non-working/secondary earner. Eligible for Spousal Roth IRA.
- Child 1: UTEP student (enrolled). Tuition cash-flowed.
- Child 2: Incoming college freshman. Launch budget active.

## Assets & Liabilities
- Housing: Mortgage (track P&I, escrow, HOA separately)
- Vehicles: Van (older, likely paid off) | Chrysler (older) | 2022 Nissan Sentra SR (under loan)
- Pets: Senior pug ~9 yrs (brachycephalic high-risk) | Kitten ~3 months
- Emergency Fund target: Tier 3 = 6 months essential expenses (~$30,000)
- Pug emergency sinking fund target: $3,000–$5,000 (separate sub-account)

## Geographic Context
Texas — no state income tax.
SE tax due: Apr 15, Jun 15, Sep 15, Jan 15.
529: No TX state-tax advantage — Utah my529 preferred.
```

### frameworks.md
```markdown
# Financial Frameworks

## Zero-Based Budget + 50/30/20 Check
- Every baseline dollar gets a job before the month begins
- Alert if Needs exceed 60% of net income
- Surge income split: 50% high-interest debt / 20% EF / 15% Roth / 10% 529 / 5% guilt-free
- SE tax reserve: 27% of gross side income into dedicated sub-account

## FICO Weights
Payment History 35% | Utilization 30% | Length 15% | New Credit 10% | Mix 10%
Target: <9% per-card AND aggregate. Pay before statement closing date.

## Bogleheads Priority Order
1. Starter EF + all accounts current
2. Full 401(k) employer match
3. Pay off debt >7-8% APR
4. Max HSA if eligible
5. Max Roth IRA(s) $7,000/person ($8,000 if 50+); Spousal Roth available
6. Remainder of 401(k)
7. 529 contributions (surplus only)
8. Pay off medium debt 4-7% APR
9. Taxable brokerage
10. Extra mortgage principal if rate >5%

## Vehicle TCO Formula
Monthly TCO = loan_payment + insurance + fuel + maintenance + repair_annual/12 + depreciation/12
Keep vs sell trigger: single repair > 50% KBB. Drop collision/comp on vehicles < $4,000.

## Pet Sinking Funds
Pug: routine annual $1,200–$2,000; dedicated sinking fund $3,000–$5,000 in HYSA.
Kitten: first-year all-in $1,000–$2,000; enroll pet insurance now (cheap at 3 months).
```

### chart_of_accounts.md
```markdown
# Chart of Accounts

Categories match Template A XML subcategory attributes:

housing: mortgage_pi, escrow_tax_ins, hoa, utilities_elec, utilities_gas,
         utilities_water, internet_cell, home_maint_sink
transport: loan_sentra, insurance_all3, fuel, maintenance, repair_sink, registration
food: groceries, dining_out, household_supplies
people: healthcare_prem, medical_oop, dental_vision, clothing,
        utep_tuition_fees, college2_launch
pets: food_supplies, pug_vet_routine, kitten_vet_routine, prevention_flea_hw,
      pet_insurance, pug_emergency_sink
lifestyle: streaming, gym_fitness, hobbies_ent, gifts
financial: 401k_contrib, roth_ira_adult1, spousal_roth, ef_contribution,
           debt_extra_pmts, 529_child1, 529_child2
sinking: christmas_gifts, vehicle_replace, annual_ins_lump
```

---

## Section 5 — Context Window Management (Multi-Turn)

Each LLM call receives full message history (Claude/Ollama have no built-in memory).
Long sessions need a sliding window to stay within context limits.

```python
# backend/agent/context_manager.py
APPROX_TOKENS_PER_CHAR = 0.25
MAX_HISTORY_TOKENS = 50_000     # leaves headroom for response

def trim_messages(messages: list[dict]) -> list[dict]:
    """Keep first message + trim oldest pairs until within budget."""
    if not messages:
        return messages
    total = sum(len(str(m.get("content", ""))) * APPROX_TOKENS_PER_CHAR for m in messages)
    if total <= MAX_HISTORY_TOKENS:
        return messages
    first = messages[:1]
    rest = messages[1:]
    while rest:
        est = sum(len(str(m.get("content", ""))) * APPROX_TOKENS_PER_CHAR for m in rest)
        if est + len(str(first[0].get("content",""))) * APPROX_TOKENS_PER_CHAR <= MAX_HISTORY_TOKENS:
            break
        rest = rest[2:]    # drop oldest user+assistant pair
    return first + rest
```

---

## Section 6 — Session Message Store (Redis)

```python
# backend/agent/session_store.py
import json
import redis.asyncio as aioredis

SESSION_TTL = 7200  # 2 hours

class SessionStore:
    def __init__(self, redis_url: str):
        self._url = redis_url

    async def get_messages(self, session_id: str) -> list[dict]:
        async with aioredis.from_url(self._url) as r:
            raw = await r.get(f"session:{session_id}:messages")
            return json.loads(raw) if raw else []

    async def save_messages(self, session_id: str, messages: list[dict]):
        async with aioredis.from_url(self._url) as r:
            await r.setex(f"session:{session_id}:messages", SESSION_TTL, json.dumps(messages))

    async def clear(self, session_id: str):
        async with aioredis.from_url(self._url) as r:
            await r.delete(f"session:{session_id}:messages")
```

---

## Section 7 — Surge Income Trigger

The spec mandates a surge income allocation table when side income exceeds the 25th-percentile
baseline. This is separate from the standard calculation triggers.

```python
# backend/agent/surge_trigger.py
import os

SE_TAX_RESERVE_PCT = float(os.getenv("SE_TAX_RESERVE_PCT", "0.27"))

SURGE_ALLOCATION = {
    "high_interest_debt": 0.50,
    "emergency_fund":     0.20,
    "roth_ira":           0.15,
    "529":                0.10,
    "guilt_free":         0.05,
}

def detect_surge(income_data: dict, baseline_floor: float) -> dict | None:
    """Returns allocation table if side_income_gross > baseline_floor. None otherwise."""
    side_gross = income_data.get("side_income_gross", 0)
    if side_gross <= baseline_floor:
        return None
    surge = side_gross - baseline_floor
    se_reserve = side_gross * SE_TAX_RESERVE_PCT
    net = surge - se_reserve
    return {
        "side_income_gross": side_gross,
        "se_tax_reserve": round(se_reserve, 2),
        "net_surge_allocatable": round(net, 2),
        "allocation": {k: round(net * v, 2) for k, v in SURGE_ALLOCATION.items()},
    }
```

Inject surge result into `ReasoningAgent` context summary when non-None. The LLM will
automatically format the surge allocation table per its output format instructions.

---

## Section 8 — Prompt Versioning

```python
# backend/prompts/versioning.py
import hashlib
from pathlib import Path

def get_prompt_hash() -> str:
    content = (Path(__file__).parent / "system_prompt.xml").read_text()
    return hashlib.sha256(content.encode()).hexdigest()[:8]
```

Store `get_prompt_hash()` in `audit_events` when Phase 5 A/B testing begins.

---

## Section 9 — Implementation Sequence

| Step | Task |
|---|---|
| 1 | Create `backend/prompts/system_prompt.xml` — copy Pillar I verbatim |
| 2 | Create `backend/prompts/project_knowledge/` with 3 template files |
| 3 | Implement `loader.py` with `lru_cache` |
| 4 | Run token budget check — verify < 6,000 tokens with knowledge files |
| 5 | Wire `build_full_system_prompt()` into `ReasoningAgent` system param |
| 6 | Implement `SessionStore` — Redis-backed message history |
| 7 | Wire `trim_messages()` in Orchestrator before every LLM call |
| 8 | Implement `surge_trigger.py` — wire into Orchestrator context summary |
| 9 | Phase 5: add prompt hash to AuditEvent for A/B tracking |

---

*System Prompt & Context plan v1.0 — COMPASS | 2026-05-16*
