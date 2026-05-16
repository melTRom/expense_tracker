# Household Financial Intelligence Assistant (HFIA)
## Full-Stack Architecture Specification — v1.0

> **Project codename:** COMPASS  
> **Stack decision:** FastAPI (Python) backend · Next.js 14 frontend · PostgreSQL · Redis · Claude claude-sonnet-4-20250514 via Anthropic API · Prophet + Isolation Forest + LightGBM prediction suite · Microsoft Presidio + fine-tuned DistilBERT privacy trust layer

---

## TABLE OF CONTENTS

1. [Pillar I — System Prompt Directives (The "Brain")](#pillar-i)
2. [Pillar II — Incoming Data Formats & Schemas](#pillar-ii)
3. [Pillar III — Privacy Trust Layer](#pillar-iii)
4. [Pillar IV — Agent Orchestration Engine](#pillar-iv)
5. [Pillar V — Calculation Engine (Internal Workings)](#pillar-v)
6. [Pillar VI — Prediction Model Suite](#pillar-vi)
7. [Pillar VII — Output & Display Specification](#pillar-vii)
8. [Pillar VIII — Full-Stack Project Structure](#pillar-viii)
9. [Pillar IX — API Surface & Integration Contracts](#pillar-ix)

---

## PILLAR I — SYSTEM PROMPT DIRECTIVES {#pillar-i}

### 1.1 Architecture Philosophy

The system prompt follows Anthropic's **Role → Context → Instructions → Constraints → Output Format** skeleton, encoded entirely in XML tags with markdown inside. Stable household data (profile, chart of accounts, framework constants) lives in **Project Knowledge files** rather than inline — keeping the system prompt under the 6,000-token attention sweet spot.

### 1.2 Full System Prompt (Production-Ready)

```xml
<role>
You are COMPASS, the Household Financial Intelligence Assistant for this family. You function as
a fee-only fiduciary-style advisor and supportive accountability coach — calm, numerate, candid,
and proactive. You never moralize about past decisions, never catastrophize, and never dictate
answers. You surface trade-offs and let the household decide.

You are NOT a CFP®, CPA, attorney, or fiduciary. All outputs are educational.
</role>

<household_profile>
## Members
- **Adult 1:** Primary earner (W-2 salary + variable side income). Texas resident, no state income tax.
- **Adult 2:** Non-working or secondary earner. Eligible for Spousal Roth IRA.
- **Child 1:** Current UTEP student (enrolled). Tuition being cash-flowed.
- **Child 2:** Incoming college freshman. Launch budget active.

## Assets & Liabilities
- **Housing:** Mortgage (track P&I, escrow, HOA separately)
- **Vehicles:** Van (older, likely paid off) | Chrysler (older, likely paid off) | 2022 Nissan Sentra SR (likely under loan)
- **Pets:** Senior pug ~9 yrs (brachycephalic high-risk) | Kitten ~3 months (first-year costs active)
- **Emergency Fund target:** Tier 3 = 6 months essential expenses (~$30,000 for $5k/mo base)
- **Pug emergency sinking fund target:** $3,000–$5,000 (separate sub-account)

## Geographic Context
Texas — no state income tax. Quarterly estimated SE tax due: Apr 15, Jun 15, Sep 15, Jan 15.
529 note: No TX state-tax advantage — shop nationally (Utah my529 preferred).
</household_profile>

<priorities>
Ranked by urgency — resolve conflicts in this order:
1. **Credit repair & debt payoff** — bring all accounts current; drive credit utilization to single digits; attack high-interest debt (>7% APR) with avalanche method
2. **Emergency fund build** — Tier 1 ($2,500) first, then Tier 2 (1 month essentials), then Tier 3 (6 months)
3. **Retirement capture** — never leave 401(k) match on table; max Spousal Roth IRA (flagged opportunity for single-income household)
4. **College cash-flow** — pay UTEP current-year costs; 529 contributions only from surplus after priorities 1–3
</priorities>

<frameworks>
  <budgeting>
  - **Operating system:** Zero-based budget — every baseline dollar gets a job before the month begins
  - **Sanity check:** 50/30/20 — flag structural alert if Needs exceed 60% of net income
  - **Income split:** Two-tier baseline. Tier 1 = salary + 25th-percentile floor of side income.
    Surge income pre-allocated: 50% high-interest debt → 20% EF → 15% Roth → 10% 529 → 5% guilt-free
  - **SE tax reserve:** Set aside 27% of gross side income into a dedicated tax-holding sub-account
  - **Sinking funds:** Treat as non-negotiable line items. Christmas, vet emergency, vehicle repair,
    home repair, annual insurance, registration, college launch
  </budgeting>

  <credit>
  - FICO weights: Payment History 35% | Utilization 30% | Length 15% | New Credit 10% | Mix 10%
  - Utilization target: <9% per-card AND aggregate (not "under 30%")
  - Pay balances before statement closing date to control reported utilization
  - Never close oldest card; no new applications within 12 months of planned refi
  - Re-check FICO 30–45 days after each major utilization payment
  - DTI computation: (all monthly debt payments + mortgage) ÷ gross monthly income; target ≤36%
  </credit>

  <investment>
  Bogleheads priority order (adapted):
  1. Starter EF + all accounts current
  2. Full 401(k) employer match
  3. Pay off debt >7–8% APR
  4. Max HSA if eligible
  5. Max Roth IRA(s) — $7,000/person ($8,000 if 50+); Spousal Roth available
  6. Remainder of 401(k) to employee limit
  7. 529 contributions (surplus only)
  8. Pay off medium debt (4–7% APR)
  9. Taxable brokerage
  10. Extra mortgage principal (if rate >5% and priorities 1–9 met)

  Fund philosophy: Three-fund index portfolio, expense ratio ≤0.10%.
  Never recommend specific securities. Generic asset-class guidance only.
  </investment>

  <vehicles>
  TCO formula per vehicle: (loan_payment + insurance + fuel + maintenance + repairs/12 + depreciation/12)
  Keep vs sell trigger: single repair > 50% of KBB market value → recommend sale analysis
  Insurance shop: every 12 months, 3+ carriers; deductibles to $1,000 if EF ≥ Tier 2
  Drop comprehensive/collision on vehicles worth <$4,000
  </vehicles>

  <pets>
  Senior pug: routine annual $1,200–$2,000; dedicated sinking fund $3,000–$5,000 in HYSA.
  Humane endpoint budget: family to establish in advance.
  Kitten: first-year all-in $1,000–$2,000; enroll in pet insurance now (cheap at this age, before conditions documented).
  </pets>
</frameworks>

<instructions>
## Session Opening (ALWAYS)
1. Ask which mode the household wants:
   **(1) Monthly Review** | **(2) Ad-hoc Question** | **(3) Scenario Modeling** |
   **(4) Credit/Debt Check-in** | **(5) Just venting**
2. After mode selection, proactively surface **1–3 unasked insights** ranked by dollar impact.
   Example: "Before we start — I noticed your pug sinking fund is at $800 vs a $3,000 target.
   Here's how much that gap costs you in risk exposure per month..."

## Per-Interaction Behaviors
- When data is missing, ask exactly one clarifying question before proceeding
- Always pair a proposed action with: (a) dollar impact, (b) qualitative trade-off, (c) priority-order reasoning
- For multi-account decisions, think through Bogleheads priority order before recommending
- Flag estimated tax dates proactively in April, June, September, January
- Flag FICO check reminder 30–45 days after any large debt payoff
- Flag spousal Roth IRA opportunity if not yet funded each calendar year
- Surface vehicle TCO analysis if any repair is mentioned

## Calculation Triggers
When user provides `<monthly_data>` block → run automatically:
- Budget variance analysis (actual vs budgeted per category)
- 50/30/20 health check (flag if Needs >60%)
- Debt payoff timeline update (avalanche method)
- EF progress (current tier + months to next tier)
- FICO utilization check (warn if any card >9%)
- Net worth delta (assets − liabilities vs prior month)

## Surge Income Trigger
When side income is reported above baseline → immediately output surge allocation table
</instructions>

<constraints>
- NEVER present as CFP®, CPA, attorney, or fiduciary
- NEVER recommend specific securities, ETFs by ticker for purchase, or individual stocks
- NEVER promise returns or guaranteed outcomes
- NEVER use shaming language about past decisions
- NEVER catastrophize (no "you're going to lose your house" framings)
- NEVER ask for or store full account numbers, SSNs, card numbers, or login credentials
- NEVER give definitive tax advice; always include "verify with a CPA before acting on tax-year-end moves >$1,000"
- NEVER recommend debt settlement or bankruptcy without flagging that these require professional legal advice
- ALWAYS append disclaimer footer to any output with dollar-specific recommendations
</constraints>

<output_format>
## Monthly Review Output Structure
```
### COMPASS Monthly Review — [Month Year]

#### Income Summary
| Source | Budgeted | Actual | Variance | SE Tax Reserve |
|--------|----------|--------|----------|----------------|

#### Budget Health
| Category | Budgeted | Actual | Variance | % of Net |
|----------|----------|--------|----------|----------|
[50/30/20 health check line]
[Alert if Needs >60%]

#### Priority Stack Progress
1. Credit/Debt: [utilization %, next payment date, avalanche progress]
2. Emergency Fund: [current tier, balance, $ to next tier, months at current rate]
3. Retirement: [match captured Y/N, Roth funded Y/N, Spousal Roth Y/N]
4. College: [tuition covered Y/N, 529 balance per child]

#### Proactive Insights (unasked)
- [Insight 1 — highest dollar impact]
- [Insight 2]
- [Insight 3]

#### Sinking Fund Status
[Table: Fund | Target | Current | Monthly Contribution | Months to Full]

#### Vehicle TCO Snapshot
[Table: Vehicle | Monthly TCO | Loan Balance | APR | KBB Est. | Action Signal]

---
*Educational information only — not investment, tax, or legal advice.
Verify with a licensed professional before acting.*
```
</output_format>

<disclaimers>
Any response containing specific dollar recommendations or projections must end with:
"Educational information only — not investment, tax, or legal advice. Verify with a licensed
professional before acting on any specific recommendation."
</disclaimers>
```

---

## PILLAR II — INCOMING DATA FORMATS & SCHEMAS {#pillar-ii}

### 2.1 Three Canonical Input Templates

All user data is submitted via these three templates, wrapped in XML tags for reliable parsing.

#### Template A — Monthly Income & Expense Snapshot

```xml
<monthly_data month="2026-05">
  <income>
    <source name="W2_salary_net" amount="0000" type="baseline"/>
    <source name="side_income_gross" amount="0000" type="variable"/>
    <source name="side_income_net_after_se_reserve" amount="0000" type="variable"/>
    <source name="other" amount="0" label="" type="other"/>
  </income>

  <expenses>
    <!-- HOUSING -->
    <item category="housing" subcategory="mortgage_pi"      budgeted="0000" actual="0000"/>
    <item category="housing" subcategory="escrow_tax_ins"   budgeted="0000" actual="0000"/>
    <item category="housing" subcategory="hoa"              budgeted="000"  actual="0000"/>
    <item category="housing" subcategory="utilities_elec"   budgeted="000"  actual="0000"/>
    <item category="housing" subcategory="utilities_gas"    budgeted="000"  actual="0000"/>
    <item category="housing" subcategory="utilities_water"  budgeted="000"  actual="0000"/>
    <item category="housing" subcategory="internet_cell"    budgeted="000"  actual="0000"/>
    <item category="housing" subcategory="home_maint_sink"  budgeted="000"  actual="0000"/>

    <!-- TRANSPORTATION -->
    <item category="transport" subcategory="loan_sentra"    budgeted="000"  actual="0000"/>
    <item category="transport" subcategory="insurance_all3" budgeted="000"  actual="0000"/>
    <item category="transport" subcategory="fuel"           budgeted="000"  actual="0000"/>
    <item category="transport" subcategory="maintenance"    budgeted="000"  actual="0000"/>
    <item category="transport" subcategory="repair_sink"    budgeted="000"  actual="0000"/>
    <item category="transport" subcategory="registration"   budgeted="000"  actual="0000"/>

    <!-- FOOD & HOUSEHOLD -->
    <item category="food" subcategory="groceries"           budgeted="000"  actual="0000"/>
    <item category="food" subcategory="dining_out"          budgeted="000"  actual="0000"/>
    <item category="food" subcategory="household_supplies"  budgeted="000"  actual="0000"/>

    <!-- PEOPLE CARE -->
    <item category="people" subcategory="healthcare_prem"   budgeted="000"  actual="0000"/>
    <item category="people" subcategory="medical_oop"       budgeted="000"  actual="0000"/>
    <item category="people" subcategory="dental_vision"     budgeted="000"  actual="0000"/>
    <item category="people" subcategory="clothing"          budgeted="000"  actual="0000"/>
    <item category="people" subcategory="utep_tuition_fees" budgeted="000"  actual="0000"/>
    <item category="people" subcategory="college2_launch"   budgeted="000"  actual="0000"/>

    <!-- PETS -->
    <item category="pets" subcategory="food_supplies"       budgeted="000"  actual="0000"/>
    <item category="pets" subcategory="pug_vet_routine"     budgeted="000"  actual="0000"/>
    <item category="pets" subcategory="kitten_vet_routine"  budgeted="000"  actual="0000"/>
    <item category="pets" subcategory="prevention_flea_hw"  budgeted="000"  actual="0000"/>
    <item category="pets" subcategory="pet_insurance"       budgeted="000"  actual="0000"/>
    <item category="pets" subcategory="pug_emergency_sink"  budgeted="000"  actual="0000"/>

    <!-- SUBSCRIPTIONS & LIFESTYLE -->
    <item category="lifestyle" subcategory="streaming"      budgeted="000"  actual="0000"/>
    <item category="lifestyle" subcategory="gym_fitness"    budgeted="000"  actual="0000"/>
    <item category="lifestyle" subcategory="hobbies_ent"    budgeted="000"  actual="0000"/>
    <item category="lifestyle" subcategory="gifts"          budgeted="000"  actual="0000"/>

    <!-- FINANCIAL PRIORITIES -->
    <item category="financial" subcategory="401k_contrib"   budgeted="000"  actual="0000"/>
    <item category="financial" subcategory="roth_ira_adult1" budgeted="000" actual="0000"/>
    <item category="financial" subcategory="spousal_roth"   budgeted="000"  actual="0000"/>
    <item category="financial" subcategory="ef_contribution" budgeted="000" actual="0000"/>
    <item category="financial" subcategory="debt_extra_pmts" budgeted="000" actual="0000"/>
    <item category="financial" subcategory="529_child1"     budgeted="000"  actual="0000"/>
    <item category="financial" subcategory="529_child2"     budgeted="000"  actual="0000"/>

    <!-- IRREGULAR / SINKING FUNDS -->
    <item category="sinking" subcategory="christmas_gifts"  budgeted="000"  actual="0000"/>
    <item category="sinking" subcategory="vehicle_replace"  budgeted="000"  actual="0000"/>
    <item category="sinking" subcategory="annual_ins_lump"  budgeted="000"  actual="0000"/>
  </expenses>
</monthly_data>
```

#### Template B — Balance & Debt Snapshot

```xml
<balance_snapshot date="2026-05-01">
  <accounts>
    <account type="checking"      label="Primary checking"   balance="0000"/>
    <account type="hysa"          label="Emergency fund"     balance="0000" apy="4.50"/>
    <account type="hysa_sub"      label="Pug emergency fund" balance="0000" apy="4.50"/>
    <account type="hysa_sub"      label="SE tax reserve"     balance="0000" apy="4.50"/>
    <account type="roth_ira"      label="Roth IRA Adult 1"   balance="0000"/>
    <account type="roth_ira"      label="Spousal Roth IRA"   balance="0000"/>
    <account type="401k"          label="401k"               balance="0000"/>
    <account type="529"           label="529 Child 1"        balance="0000"/>
    <account type="529"           label="529 Child 2"        balance="0000"/>
  </accounts>

  <debts>
    <debt label="CC_primary"      balance="0000" apr="00.00" min_payment="000" type="credit_card"/>
    <debt label="CC_secondary"    balance="0000" apr="00.00" min_payment="000" type="credit_card"/>
    <debt label="auto_sentra"     balance="00000" apr="0.00" min_payment="000" type="auto_loan"/>
    <debt label="mortgage"        balance="000000" apr="0.00" min_payment="0000" type="mortgage"/>
  </debts>

  <credit>
    <fico score="000" date="2026-05-01" source="free_monitor"/>
    <utilization aggregate="00" card="CC_primary:00" card="CC_secondary:00"/>
    <autopay_status card="CC_primary:yes" card="CC_secondary:yes" mortgage:yes"/>
  </credit>

  <vehicles>
    <vehicle label="van"    kbb_value="0000"  loan_balance="0"     insurance_monthly="000"/>
    <vehicle label="chrysler" kbb_value="0000" loan_balance="0"    insurance_monthly="000"/>
    <vehicle label="sentra" kbb_value="00000" loan_balance="00000" insurance_monthly="000"/>
  </vehicles>
</balance_snapshot>
```

#### Template C — Life Events & Anomalies

```xml
<life_events month="2026-05">
  <event type="vet_visit"       pet="pug"       amount="000" notes="Annual checkup + dental"/>
  <event type="car_repair"      vehicle="van"   amount="000" notes="Brake pads"/>
  <event type="income_spike"    source="side"   amount="000" notes="Large project completed"/>
  <event type="tuition_due"     child="child1"  amount="000" notes="UTEP summer session"/>
  <event type="scholarship"     child="child1"  amount="000" notes="Departmental award"/>
  <event type="other"           notes=""/>
</life_events>
```

### 2.2 Internal Database Schema (PostgreSQL)

```sql
-- Core tables (simplified; full ERD in /docs/erd.md)

CREATE TABLE monthly_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  UUID NOT NULL,
  period        DATE NOT NULL,  -- first of month
  raw_xml       TEXT,           -- original user input (pre-anonymization)
  anonymized    JSONB,          -- post-privacy-layer structured data
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE budget_lines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id     UUID REFERENCES monthly_snapshots(id),
  category        TEXT NOT NULL,
  subcategory     TEXT NOT NULL,
  budgeted        NUMERIC(10,2),
  actual          NUMERIC(10,2),
  variance        NUMERIC(10,2) GENERATED ALWAYS AS (actual - budgeted) STORED
);

CREATE TABLE debt_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL,
  label           TEXT NOT NULL,    -- anonymized label only
  debt_type       TEXT NOT NULL,
  apr             NUMERIC(5,2),
  current_balance NUMERIC(12,2),
  min_payment     NUMERIC(8,2),
  as_of_date      DATE NOT NULL
);

CREATE TABLE prediction_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL,
  model_type      TEXT NOT NULL,    -- 'prophet_spending','isolation_forecast','lgbm_overspend'
  target          TEXT NOT NULL,    -- category or metric being predicted
  prediction_json JSONB,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  valid_through   TIMESTAMPTZ
);

CREATE TABLE agent_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL,
  mode            TEXT,             -- monthly_review|adhoc|scenario|credit|vent
  messages        JSONB,            -- full conversation history for context
  started_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## PILLAR III — PRIVACY TRUST LAYER {#pillar-iii}

### 3.1 Architecture Decision

**Two-component stack:**
1. **Microsoft Presidio** — Open-source PII orchestration framework (built-in detectors for SSN, credit cards, phone numbers, email, IP addresses, dates of birth, URLs, medical record numbers)
2. **Fine-tuned DistilBERT** — Custom NER model for financial-domain PII that Presidio misses: account labels used as identifiers, routing numbers in context, brokerage account patterns, household-specific proper nouns

### 3.2 Fine-Tuning DistilBERT: Full Specification

#### Model Selection Rationale

| Model | Size | Latency | Financial NER F1 | Decision |
|-------|------|---------|-----------------|---------|
| distilbert-base-uncased | 66M | ~12ms | Tunable | ✅ **Selected** |
| bert-base-uncased | 110M | ~28ms | Higher ceiling | Too slow for real-time |
| roberta-base | 125M | ~30ms | Best ceiling | Overkill for token budget |
| spaCy en_core_web_lg | 685MB | ~5ms | Rule-based | Misses contextual patterns |

DistilBERT gives a 40% speed gain over BERT-base with only ~3% accuracy loss on NER — acceptable given our privacy-first-but-responsive requirement.

#### NER Label Schema

```python
LABELS = [
    "O",                    # not PII
    "B-ACCT_NUM",           # account number beginning
    "I-ACCT_NUM",           # account number continuation
    "B-ROUTING",            # routing number
    "I-ROUTING",
    "B-CARD_NUM",           # card number (partial or full)
    "I-CARD_NUM",
    "B-SSN",                # social security number
    "I-SSN",
    "B-PERSON_NAME",        # household member name
    "I-PERSON_NAME",
    "B-INSTITUTION",        # bank/brokerage name when used as identifier
    "I-INSTITUTION",
    "B-LOAN_ID",            # loan account identifier
    "I-LOAN_ID",
    "B-BALANCE_AMT",        # specific dollar amounts (optional masking)
    "I-BALANCE_AMT",
]
```

#### Synthetic Training Data Generation

```python
# /ml/privacy/generate_training_data.py

import random
from faker import Faker
from presidio_evaluator.data_generator import PresidioDataGenerator

fake = Faker()

TEMPLATES = [
    "My checking account number is {ACCT_NUM} at {INSTITUTION}",
    "Routing number {ROUTING} for wire transfer",
    "The loan ID {LOAN_ID} has a balance of ${BALANCE_AMT}",
    "{PERSON_NAME}'s Roth IRA at {INSTITUTION} ending in {ACCT_NUM}",
    "Card number {CARD_NUM} is the primary card",
    "SSN {SSN} for the 1099 form",
    "Account {ACCT_NUM} at {INSTITUTION}, routing {ROUTING}",
    "My husband {PERSON_NAME} has a spousal Roth at {INSTITUTION}",
]

def generate_acct_num():
    return str(random.randint(10000000, 9999999999))

def generate_routing():
    return str(random.randint(100000000, 999999999))

def generate_loan_id():
    prefix = random.choice(["LN", "LOAN", "MTG", "AUTO"])
    return f"{prefix}-{random.randint(10000, 99999)}"

GENERATORS = {
    "ACCT_NUM":    generate_acct_num,
    "ROUTING":     generate_routing,
    "CARD_NUM":    lambda: fake.credit_card_number(),
    "SSN":         lambda: fake.ssn(),
    "PERSON_NAME": lambda: fake.first_name(),
    "INSTITUTION": lambda: random.choice(["Chase", "Ally", "SoFi", "Marcus", "Vanguard",
                                           "Fidelity", "Schwab", "Capital One", "Axos"]),
    "LOAN_ID":     generate_loan_id,
    "BALANCE_AMT": lambda: f"{random.randint(100, 500000):,}",
}

# Generate ~5,000 labeled sentences for fine-tuning
# Augment with real financial document fragments (public domain only)
```

#### Fine-Tuning Pipeline

```python
# /ml/privacy/train_pii_ner.py

from transformers import (
    DistilBertForTokenClassification,
    DistilBertTokenizerFast,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification,
)
import torch

MODEL_NAME = "distilbert-base-uncased"
OUTPUT_DIR = "./ml/models/financial_pii_ner"

tokenizer = DistilBertTokenizerFast.from_pretrained(MODEL_NAME)
model = DistilBertForTokenClassification.from_pretrained(
    MODEL_NAME,
    num_labels=len(LABELS),
    id2label={i: l for i, l in enumerate(LABELS)},
    label2id={l: i for i, l in enumerate(LABELS)},
)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    evaluation_strategy="epoch",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    num_train_epochs=5,
    weight_decay=0.01,
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    fp16=torch.cuda.is_available(),
    report_to="none",           # no external logging — privacy
)

# Target: F1 ≥ 0.92 on held-out financial PII test set
# Estimated fine-tuning time: ~2 hours on single A100 GPU
```

### 3.3 Anonymization Pipeline (Runtime)

```python
# /backend/privacy/trust_layer.py

from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig
from .custom_recognizers import DistilBertFinancialRecognizer

class PrivacyTrustLayer:
    """
    Intercepts all user input before it reaches Claude API.
    Replaces PII with descriptive non-disclosive tokens.
    Maintains a session-scoped token→original mapping in Redis
    (TTL = session duration; never persisted to disk).
    """

    REPLACEMENT_MAP = {
        "ACCT_NUM":    "[ACCOUNT_NUMBER]",
        "ROUTING":     "[ROUTING_NUMBER]",
        "CARD_NUM":    "[CARD_NUMBER]",
        "SSN":         "[SSN]",
        "PERSON_NAME": "[HOUSEHOLD_MEMBER]",
        "INSTITUTION": "[FINANCIAL_INSTITUTION]",
        "LOAN_ID":     "[LOAN_IDENTIFIER]",
        "BALANCE_AMT": "[DOLLAR_AMOUNT]",
        # Presidio built-ins
        "EMAIL_ADDRESS": "[EMAIL]",
        "PHONE_NUMBER":  "[PHONE]",
        "US_BANK_NUMBER": "[BANK_NUMBER]",
        "CREDIT_CARD":    "[CARD_NUMBER]",
        "US_SSN":         "[SSN]",
        "IP_ADDRESS":     "[IP_ADDRESS]",
    }

    def __init__(self, redis_client):
        self.redis = redis_client
        registry = RecognizerRegistry()
        registry.load_predefined_recognizers()
        registry.add_recognizer(DistilBertFinancialRecognizer())  # custom model
        self.analyzer = AnalyzerEngine(registry=registry)
        self.anonymizer = AnonymizerEngine()

    def anonymize(self, text: str, session_id: str) -> tuple[str, dict]:
        """
        Returns (anonymized_text, token_map).
        token_map is stored in Redis keyed by session_id with TTL.
        """
        results = self.analyzer.analyze(
            text=text,
            language="en",
            entities=list(self.REPLACEMENT_MAP.keys()),
        )

        operators = {
            entity: OperatorConfig("replace", {"new_value": replacement})
            for entity, replacement in self.REPLACEMENT_MAP.items()
        }

        anonymized = self.anonymizer.anonymize(
            text=text,
            analyzer_results=results,
            operators=operators,
        )

        # Store mapping in Redis (session-scoped, in-memory only)
        token_map = {r.entity_type: text[r.start:r.end] for r in results}
        self.redis.setex(
            f"pii_map:{session_id}",
            3600,               # 1-hour TTL
            json.dumps(token_map)
        )

        return anonymized.text, token_map

    def validate_outbound(self, response_text: str) -> bool:
        """
        Scans Claude's response for any PII that may have leaked through.
        Returns False and logs alert if found.
        """
        results = self.analyzer.analyze(text=response_text, language="en")
        if results:
            # Log alert, strip before returning to user
            return False
        return True
```

---

## PILLAR IV — AGENT ORCHESTRATION ENGINE {#pillar-iv}

### 4.1 Intent Router

```python
# /backend/agent/router.py

from enum import Enum

class AgentMode(Enum):
    MONTHLY_REVIEW   = "monthly_review"     # full structured analysis
    ADHOC            = "adhoc"              # single question, conversational
    SCENARIO         = "scenario"           # what-if modeling
    CREDIT_CHECKIN   = "credit_checkin"     # focused credit/debt analysis
    PREDICTION       = "prediction"         # triggers ML prediction models
    VENT             = "vent"               # supportive, minimal financial output

class IntentRouter:
    """
    Routes user input to the appropriate processing pipeline.
    Trigger detection based on:
    - Explicit mode selection (user picks 1-5)
    - Content-based detection (keywords, data templates present)
    - Calculation triggers (numeric data + budget_lines present)
    - Prediction triggers (6+ months of history in DB)
    """

    CALCULATION_TRIGGERS = [
        "<monthly_data", "<balance_snapshot",
        "how much", "calculate", "run the numbers",
        "what's my", "total debt", "payoff date",
    ]

    PREDICTION_TRIGGERS = [
        "forecast", "predict", "trend", "next month",
        "will i", "am i on track", "trajectory",
        "when will i reach", "how long until",
    ]

    def route(self, user_input: str, session: dict) -> AgentMode:
        # Explicit mode
        if user_input.strip() in ["1", "monthly review"]:
            return AgentMode.MONTHLY_REVIEW
        # Data template present → always monthly review
        if "<monthly_data" in user_input or "<balance_snapshot" in user_input:
            return AgentMode.MONTHLY_REVIEW
        # Prediction keywords + history available
        if any(t in user_input.lower() for t in self.PREDICTION_TRIGGERS):
            if session.get("months_of_history", 0) >= 3:
                return AgentMode.PREDICTION
        # Calculation keywords
        if any(t in user_input.lower() for t in self.CALCULATION_TRIGGERS):
            return AgentMode.ADHOC  # calculation engine handles inline
        return AgentMode.ADHOC
```

### 4.2 Tool Definitions (Claude API Tool Use)

```python
# /backend/agent/tools.py
# These are passed to Claude as tools; Claude decides when to invoke them

TOOLS = [
    {
        "name": "run_budget_analysis",
        "description": "Runs zero-based budget variance analysis and 50/30/20 health check on provided monthly data. Returns structured analysis with alerts.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {"type": "string", "description": "YYYY-MM format"},
                "income_net": {"type": "number"},
                "expense_categories": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "category": {"type": "string"},
                            "budgeted": {"type": "number"},
                            "actual": {"type": "number"}
                        }
                    }
                }
            },
            "required": ["period", "income_net", "expense_categories"]
        }
    },
    {
        "name": "run_debt_avalanche",
        "description": "Calculates debt payoff timeline using avalanche method. Returns ordered payoff sequence, months to freedom, and total interest saved vs minimum payments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "debts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "balance": {"type": "number"},
                            "apr": {"type": "number"},
                            "min_payment": {"type": "number"}
                        }
                    }
                },
                "monthly_extra": {"type": "number", "description": "Extra payment available above minimums"}
            },
            "required": ["debts"]
        }
    },
    {
        "name": "run_ef_projection",
        "description": "Projects emergency fund growth timeline across tiers. Returns months to Tier 1, 2, 3 at current contribution rate.",
        "input_schema": {
            "type": "object",
            "properties": {
                "current_balance": {"type": "number"},
                "monthly_contribution": {"type": "number"},
                "monthly_essential_expenses": {"type": "number"},
                "hysa_apy": {"type": "number"}
            },
            "required": ["current_balance", "monthly_contribution", "monthly_essential_expenses"]
        }
    },
    {
        "name": "run_vehicle_tco",
        "description": "Calculates total cost of ownership per vehicle and generates keep vs sell analysis.",
        "input_schema": {
            "type": "object",
            "properties": {
                "vehicles": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "loan_payment": {"type": "number"},
                            "insurance_monthly": {"type": "number"},
                            "fuel_monthly": {"type": "number"},
                            "maintenance_monthly": {"type": "number"},
                            "repair_annual": {"type": "number"},
                            "kbb_value": {"type": "number"},
                            "loan_balance": {"type": "number"},
                            "apr": {"type": "number"}
                        }
                    }
                }
            },
            "required": ["vehicles"]
        }
    },
    {
        "name": "run_spending_forecast",
        "description": "Runs Prophet time-series model to forecast next 3 months of spending by category. Requires at least 3 months of historical data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string"},
                "horizon_months": {"type": "integer", "default": 3}
            },
            "required": ["category"]
        }
    },
    {
        "name": "run_anomaly_check",
        "description": "Runs Isolation Forest to flag unusual expense patterns compared to historical baseline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "period": {"type": "string"}
            },
            "required": ["period"]
        }
    },
    {
        "name": "run_fico_simulation",
        "description": "Simulates FICO score impact of proposed actions (paying down a card, opening/closing an account).",
        "input_schema": {
            "type": "object",
            "properties": {
                "current_score": {"type": "integer"},
                "current_utilization": {"type": "number"},
                "proposed_paydown": {"type": "number"},
                "account_action": {"type": "string", "enum": ["none", "open", "close"]}
            },
            "required": ["current_score", "current_utilization"]
        }
    }
]
```

---

## PILLAR V — CALCULATION ENGINE {#pillar-v}

### 5.1 Core Financial Math Modules

```python
# /backend/calculations/engine.py

from dataclasses import dataclass
from typing import List
import math

# ─── BUDGET ANALYSIS ───────────────────────────────────────────────

@dataclass
class BudgetResult:
    needs_pct: float
    wants_pct: float
    savings_pct: float
    alert_needs_exceeded: bool
    category_variances: List[dict]
    surplus_or_deficit: float

def run_budget_analysis(income_net: float, lines: List[dict]) -> BudgetResult:
    NEEDS_CATS = {"housing", "transport", "food", "people", "pets"}
    WANTS_CATS = {"lifestyle", "subscriptions"}
    SAVINGS_CATS = {"financial", "sinking"}

    totals = {"needs": 0, "wants": 0, "savings": 0}
    variances = []

    for line in lines:
        variance = line["actual"] - line["budgeted"]
        variances.append({**line, "variance": variance, "variance_pct": variance / line["budgeted"] * 100 if line["budgeted"] else 0})
        cat = line["category"]
        if cat in NEEDS_CATS:
            totals["needs"] += line["actual"]
        elif cat in WANTS_CATS:
            totals["wants"] += line["actual"]
        elif cat in SAVINGS_CATS:
            totals["savings"] += line["actual"]

    return BudgetResult(
        needs_pct=totals["needs"] / income_net * 100,
        wants_pct=totals["wants"] / income_net * 100,
        savings_pct=totals["savings"] / income_net * 100,
        alert_needs_exceeded=totals["needs"] / income_net > 0.60,
        category_variances=sorted(variances, key=lambda x: abs(x["variance"]), reverse=True),
        surplus_or_deficit=income_net - sum(totals.values()),
    )


# ─── DEBT AVALANCHE ────────────────────────────────────────────────

@dataclass
class AvalancheResult:
    payoff_order: List[str]
    payoff_timeline: List[dict]   # per-debt: label, months_to_payoff, total_interest
    total_months: int
    total_interest_paid: float
    interest_saved_vs_minimums: float

def run_debt_avalanche(debts: list, monthly_extra: float = 0) -> AvalancheResult:
    """
    Avalanche: sort by APR desc, concentrate extra payment on highest-rate debt.
    Computes amortization for each debt, cascades freed minimum payment to next.
    """
    sorted_debts = sorted(debts, key=lambda d: d["apr"], reverse=True)
    results = []
    total_interest = 0
    month = 0
    freed_payment = 0  # cascades as debts are paid off

    working_debts = [{**d, "balance": d["balance"]} for d in sorted_debts]

    while any(d["balance"] > 0 for d in working_debts):
        month += 1
        extra_remaining = monthly_extra + freed_payment

        for i, debt in enumerate(working_debts):
            if debt["balance"] <= 0:
                continue
            interest = debt["balance"] * (debt["apr"] / 100 / 12)
            total_interest += interest
            payment = debt["min_payment"]
            if i == 0 and extra_remaining > 0:
                payment += extra_remaining
                extra_remaining = 0
            payment = min(payment, debt["balance"] + interest)
            debt["balance"] = max(0, debt["balance"] + interest - payment)

            if debt["balance"] == 0 and not debt.get("paid_month"):
                debt["paid_month"] = month
                freed_payment += debt["min_payment"]

        if month > 600:  # safety cap (50 years)
            break

    # Compare to minimums-only
    min_interest = sum(_amortize_min_only(d) for d in sorted_debts)

    return AvalancheResult(
        payoff_order=[d["label"] for d in sorted(working_debts, key=lambda d: d.get("paid_month", 999))],
        payoff_timeline=[{"label": d["label"], "months": d.get("paid_month", month)} for d in working_debts],
        total_months=month,
        total_interest_paid=total_interest,
        interest_saved_vs_minimums=max(0, min_interest - total_interest),
    )


# ─── EMERGENCY FUND PROJECTION ─────────────────────────────────────

def run_ef_projection(current_balance: float, monthly_contribution: float,
                       monthly_essential: float, hysa_apy: float = 4.5) -> dict:
    TIERS = {
        "tier1_starter": 2500,
        "tier2_working": monthly_essential,
        "tier3_full": monthly_essential * 6,
    }
    monthly_rate = hysa_apy / 100 / 12
    results = {}

    for tier_name, target in TIERS.items():
        if current_balance >= target:
            results[tier_name] = {"status": "achieved", "months": 0, "target": target}
            continue
        balance = current_balance
        months = 0
        while balance < target and months < 240:
            balance = balance * (1 + monthly_rate) + monthly_contribution
            months += 1
        results[tier_name] = {
            "target": target,
            "current": current_balance,
            "gap": target - current_balance,
            "months_to_reach": months,
            "interest_earned": balance - current_balance - (months * monthly_contribution),
        }

    return results


# ─── VEHICLE TCO ───────────────────────────────────────────────────

def run_vehicle_tco(vehicles: list) -> list:
    results = []
    for v in vehicles:
        monthly_depreciation = (v.get("kbb_value", 0) * 0.15) / 12  # ~15%/yr avg
        tco = (
            v.get("loan_payment", 0)
            + v.get("insurance_monthly", 0)
            + v.get("fuel_monthly", 0)
            + v.get("maintenance_monthly", 0)
            + v.get("repair_annual", 0) / 12
            + monthly_depreciation
        )
        # Keep vs sell signal
        single_repair_threshold = v.get("kbb_value", 1) * 0.50
        action = "monitor"
        if v.get("kbb_value", 0) < 4000:
            action = "consider_drop_collision"
        if v.get("recent_repair", 0) > single_repair_threshold:
            action = "sell_analysis_recommended"

        results.append({
            "label": v["label"],
            "monthly_tco": round(tco, 2),
            "loan_balance": v.get("loan_balance", 0),
            "kbb_value": v.get("kbb_value", 0),
            "equity": v.get("kbb_value", 0) - v.get("loan_balance", 0),
            "action_signal": action,
        })

    return results


# ─── FICO SIMULATION ───────────────────────────────────────────────

def run_fico_simulation(current_score: int, current_util: float,
                         proposed_paydown: float, total_limit: float) -> dict:
    """
    Estimates FICO score change from utilization reduction.
    Based on published FICO weight (utilization = 30% of score).
    Simplified linear model — actual FICO uses proprietary algorithm.
    """
    new_util = max(0, current_util - (proposed_paydown / total_limit * 100))
    util_improvement_factor = (current_util - new_util) / 100

    # Rough empirical mapping: each 10pp util reduction ≈ 20-30 points at mid-range scores
    score_delta = round(util_improvement_factor * 250 * (1 - (current_score - 580) / 420))

    return {
        "current_score": current_score,
        "current_utilization": current_util,
        "new_utilization": round(new_util, 1),
        "estimated_score_after": min(850, current_score + score_delta),
        "estimated_delta": score_delta,
        "note": "Estimate only. Actual FICO depends on full credit profile. Re-check 30-45 days after paydown."
    }
```

---

## PILLAR VI — PREDICTION MODEL SUITE {#pillar-vi}

### 6.1 Model Selection Decision

| Task | Model Selected | Rationale |
|------|---------------|-----------|
| Spending trend forecasting | **Prophet (Meta)** | Handles small datasets (3+ months), seasonal spending patterns (holidays, tuition), irregular intervals, missing months. No GPU required. |
| Overspend category alert | **LightGBM (binary classifier)** | Tabular data, fast inference, handles categorical features (month, category), works on 12-36 row training sets with feature engineering |
| Anomaly detection | **Isolation Forest (sklearn)** | Unsupervised, no labeled anomaly data needed, effective on small datasets, low false-positive rate |
| EF trajectory | **Compound interest formula** | Deterministic math preferred over ML for savings projections |
| FICO projection | **Rule-based formula** | Regulatory complexity makes black-box ML inappropriate here |
| PII detection | **Fine-tuned DistilBERT** | See Pillar III |

### 6.2 Prophet — Spending Trend Forecasting

```python
# /ml/prediction/spending_forecast.py

from prophet import Prophet
import pandas as pd
from typing import Optional

class SpendingForecaster:
    """
    Per-category spending forecaster using Prophet.
    Handles: seasonality (holiday spending, tuition cycles, tax season),
    missing months, and variable side income patterns.
    """

    HOUSEHOLD_SEASONALITY = [
        # Custom seasonal events encoded as regressors
        {"date": "12-01", "label": "christmas_season", "strength": 1.5},
        {"date": "08-15", "label": "back_to_school",   "strength": 1.3},
        {"date": "04-01", "label": "tax_season",        "strength": 0.8},
        {"date": "01-01", "label": "new_year_reset",    "strength": 0.9},
    ]

    def __init__(self, category: str):
        self.category = category
        self.model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,    # monthly data — no weekly signal
            daily_seasonality=False,
            seasonality_mode="multiplicative",  # spending scales with income
            changepoint_prior_scale=0.3,        # flexible to lifestyle changes
            seasonality_prior_scale=10,
            interval_width=0.80,                 # 80% confidence interval
        )
        # Add household-specific seasonality
        self.model.add_seasonality(
            name="household_annual",
            period=365.25,
            fourier_order=5,
        )

    def fit(self, history: pd.DataFrame):
        """
        history: DataFrame with columns ['ds' (date), 'y' (actual spend)]
        Minimum: 3 rows (months). Recommended: 12+ for seasonal accuracy.
        """
        if len(history) < 3:
            raise ValueError("Prophet requires at least 3 months of history")

        # Add surge income as external regressor if available
        if "surge_income_indicator" in history.columns:
            self.model.add_regressor("surge_income_indicator")

        self.model.fit(history)
        return self

    def forecast(self, horizon_months: int = 3) -> dict:
        future = self.model.make_future_dataframe(periods=horizon_months, freq="MS")
        forecast_df = self.model.predict(future)

        predictions = forecast_df.tail(horizon_months)[["ds", "yhat", "yhat_lower", "yhat_upper"]]

        return {
            "category": self.category,
            "forecasts": [
                {
                    "period": row["ds"].strftime("%Y-%m"),
                    "predicted": round(row["yhat"], 2),
                    "lower_80": round(row["yhat_lower"], 2),
                    "upper_80": round(row["yhat_upper"], 2),
                    "trend": "up" if i > 0 and row["yhat"] > predictions.iloc[i-1]["yhat"] else "down",
                }
                for i, (_, row) in enumerate(predictions.iterrows())
            ],
            "model_confidence": "low" if len(self.model.history) < 6 else
                                "medium" if len(self.model.history) < 12 else "high",
        }
```

### 6.3 LightGBM — Category Overspend Classifier

```python
# /ml/prediction/overspend_classifier.py

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.model_selection import cross_val_score

class OverspendClassifier:
    """
    Binary classifier: will this category exceed budget next month?
    Features engineered from monthly history.
    Training: once per year (or when 6+ new months accumulate).
    Inference: runs at session open to pre-flag risk categories.
    """

    def build_features(self, history: pd.DataFrame) -> pd.DataFrame:
        """
        Feature engineering from monthly budget data.
        Each row = one month, one category.
        """
        df = history.copy()

        # Rolling statistics (3-month window)
        df["rolling_mean_3m"] = df.groupby("category")["actual"].transform(
            lambda x: x.rolling(3, min_periods=1).mean()
        )
        df["rolling_std_3m"] = df.groupby("category")["actual"].transform(
            lambda x: x.rolling(3, min_periods=1).std().fillna(0)
        )

        # Variance ratio vs budget
        df["variance_ratio"] = df["actual"] / df["budgeted"].replace(0, np.nan)

        # Month-of-year features (seasonality)
        df["month_num"] = pd.to_datetime(df["period"]).dt.month
        df["is_q4"] = (df["month_num"] >= 10).astype(int)        # holiday season
        df["is_back_to_school"] = (df["month_num"] == 8).astype(int)

        # Consecutive overspend streak
        df["overspent"] = (df["actual"] > df["budgeted"]).astype(int)
        df["overspend_streak"] = df.groupby("category")["overspent"].transform(
            lambda x: x.groupby((x != x.shift()).cumsum()).cumcount() + 1
        ) * df["overspent"]

        # Target variable
        df["target"] = df["overspent"].shift(-1)  # next month's overspend

        FEATURES = [
            "rolling_mean_3m", "rolling_std_3m", "variance_ratio",
            "month_num", "is_q4", "is_back_to_school", "overspend_streak",
            "budgeted",
        ]

        return df.dropna(subset=["target"]), FEATURES

    def train(self, history: pd.DataFrame):
        df, FEATURES = self.build_features(history)

        X = df[FEATURES]
        y = df["target"]

        self.model = lgb.LGBMClassifier(
            n_estimators=100,
            learning_rate=0.05,
            max_depth=4,
            min_child_samples=5,    # low for small dataset
            class_weight="balanced",
            random_state=42,
            verbose=-1,
        )

        # Cross-validate (leave-one-out for small datasets)
        scores = cross_val_score(self.model, X, y, cv=min(5, len(X)//3), scoring="roc_auc")
        self.cv_auc = scores.mean()

        self.model.fit(X, y)
        self.feature_names = FEATURES
        return self

    def predict_risk(self, current_month_features: dict) -> dict:
        X = pd.DataFrame([current_month_features])[self.feature_names]
        prob = self.model.predict_proba(X)[0][1]
        return {
            "overspend_probability": round(prob, 3),
            "risk_level": "high" if prob > 0.70 else "medium" if prob > 0.45 else "low",
            "model_auc": round(self.cv_auc, 3),
            "caveat": "Based on historical patterns only. Life events override model."
        }
```

### 6.4 Isolation Forest — Anomaly Detection

```python
# /ml/prediction/anomaly_detector.py

from sklearn.ensemble import IsolationForest
import numpy as np

class SpendingAnomalyDetector:
    """
    Flags months where one or more categories are anomalously high
    compared to household's own historical baseline.
    Contamination tuned to flag ~10% of months (expected for a real household).
    """

    def __init__(self):
        self.model = IsolationForest(
            contamination=0.10,
            random_state=42,
            n_estimators=100,
        )

    def fit(self, history_matrix: np.ndarray):
        """
        history_matrix: shape (n_months, n_categories)
        Each column = one expense category, each row = one month.
        """
        self.model.fit(history_matrix)
        return self

    def detect(self, current_month: np.ndarray) -> dict:
        """
        Returns anomaly score and which categories contributed most.
        """
        score = self.model.decision_function(current_month.reshape(1, -1))[0]
        is_anomaly = self.model.predict(current_month.reshape(1, -1))[0] == -1

        return {
            "is_anomalous_month": bool(is_anomaly),
            "anomaly_score": round(float(score), 4),
            "interpretation": (
                "This month's spending pattern is significantly outside your household's normal range. "
                "Review life events for explanation."
                if is_anomaly else
                "Spending pattern within normal historical range."
            )
        }
```

---

## PILLAR VII — OUTPUT & DISPLAY SPECIFICATION {#pillar-vii}

### 7.1 LLM-Triggered Markdown Summary Format

When Claude triggers `run_budget_analysis` or similar tools, the final response is always structured as a **Markdown report block** for display. The backend renders this as a formatted card in the frontend.

```markdown
# COMPASS Monthly Review — May 2026

## Income Health
| Source | Budgeted | Actual | Variance |
|--------|----------|--------|----------|
| W-2 Net Salary | $X,XXX | $X,XXX | $0 |
| Side Income (net) | $XXX | $XXX | +$XXX |
| **Total Net** | **$X,XXX** | **$X,XXX** | **+$XXX** |

> ⚠️ **SE Tax Reserve:** $XXX set aside (27% of $XXX gross side income)
> Next estimated tax due: **September 15, 2026**

---

## Budget Health — 50/30/20 Check
| Bucket | Budgeted | Actual | % of Net | Status |
|--------|----------|--------|----------|--------|
| Needs | $X,XXX | $X,XXX | 58% | ✅ |
| Wants | $XXX | $XXX | 12% | ✅ |
| Savings/Financial | $XXX | $XXX | 18% | ⚠️ Below 20% target |

> **Top 3 variances:** Dining Out (+$XXX) · Pet care (+$XXX) · Fuel (+$XXX)

---

## Priority Stack

### 1. Credit & Debt
- Aggregate utilization: **XX%** [target: <9%] ⚠️
- CC Primary: XX% · CC Secondary: XX%
- **Action:** Pay $XXX before CC Primary statement closes [date]
- Debt avalanche: XX months to CC payoff at current rate
- Estimated FICO impact of $XXX paydown: **+XX–XX points** (re-check Jul 15)

### 2. Emergency Fund
| Tier | Target | Current | Gap | Months |
|------|--------|---------|-----|--------|
| Tier 1 — Starter | $2,500 | $X,XXX | — | ✅ |
| Tier 2 — 1 month | $X,XXX | $X,XXX | $XXX | X mo |
| Tier 3 — 6 months | $XX,XXX | $X,XXX | $XX,XXX | XX mo |
| Pug Emergency | $5,000 | $XXX | $4,XXX | XX mo |

### 3. Retirement
- 401(k) match: ✅ Captured
- Roth IRA Adult 1: ✅ Funded $XXX / $7,000 YTD
- **Spousal Roth IRA: ⚠️ $0 contributed — $7,000 available for [year]**

### 4. College
- UTEP (Child 1): ✅ Cash-flowed — $X,XXX paid
- Child 2 launch: $XXX of $XXX budget used

---

## Proactive Insights (you didn't ask)

1. **$XXX/month opportunity:** Your kitten has no pet insurance. At 3 months old, you
   can enroll for ~$15–25/month before any conditions are documented. Waiting locks in
   pre-existing exclusions. Dollar impact: eliminates potential $2,000–$5,000 in
   uncovered first-year vet costs.

2. **Vehicle alert:** Van insurance is $XXX/month on a vehicle worth ~$X,XXX (KBB).
   Dropping collision/comprehensive saves ~$XX/month ($XXX/year). Your EF is now
   above Tier 1 so the deductible risk is covered.

3. **Tax season prep:** Side income is tracking 34% above last year's pace. Consider
   increasing SE tax reserve to 30% for the remainder of the year to avoid Q3 underpayment.

---

## Spending Forecast (3-Month Prophet Model)

| Category | Jun 2026 | Jul 2026 | Aug 2026 | Trend |
|----------|----------|----------|----------|-------|
| Groceries | $XXX ±$XX | $XXX ±$XX | $XXX ±$XX | → |
| Dining Out | $XXX ±$XX | $XXX ±$XX | $XXX ±$XX | ↑ |
| Pet Care | $XXX ±$XX | $XXX ±$XX | $XXX ±$XX | ↑ Back-to-school |
| Fuel | $XXX ±$XX | $XXX ±$XX | $XXX ±$XX | → |

> *Model confidence: Medium (8 months of history). ±ranges = 80% interval.*

---

*Educational information only — not investment, tax, or legal advice.
Verify with a licensed professional before acting on any specific recommendation.*
```

### 7.2 Frontend Display Components (Next.js)

```
/frontend/src/components/
├── CompassChat.tsx          # main conversational interface
├── MonthlyReviewCard.tsx    # renders markdown summary as structured card
├── BudgetDonutChart.tsx     # 50/30/20 needs/wants/savings pie
├── DebtAvalancheTimeline.tsx # animated payoff progress bar per debt
├── EFProgressMeter.tsx      # 4-tier progress bars (Tier1→2→3→PugFund)
├── SpendingForecastChart.tsx # Prophet output: line chart with confidence band
├── AnomalyAlert.tsx         # red banner when Isolation Forest fires
├── VehicleTCOTable.tsx      # per-vehicle cost breakdown + action signal
├── FICOSimulator.tsx        # interactive FICO score estimator
├── SinkingFundTracker.tsx   # progress bars per sinking fund
└── PrivacyIndicator.tsx     # shows PII anonymization status
```

---

## PILLAR VIII — FULL-STACK PROJECT STRUCTURE {#pillar-viii}

```
compass/
├── backend/
│   ├── main.py                      # FastAPI app entry point
│   ├── routers/
│   │   ├── chat.py                  # /api/chat — main agent endpoint
│   │   ├── data.py                  # /api/data/submit — template ingestion
│   │   └── reports.py               # /api/reports/{period} — cached summaries
│   ├── agent/
│   │   ├── orchestrator.py          # Claude API client + tool loop
│   │   ├── router.py                # Intent router
│   │   └── tools.py                 # Tool definitions
│   ├── calculations/
│   │   └── engine.py                # All financial math (Pillar V)
│   ├── privacy/
│   │   ├── trust_layer.py           # Presidio + DistilBERT pipeline
│   │   └── custom_recognizers.py    # DistilBERT NER recognizer wrapper
│   ├── db/
│   │   ├── models.py                # SQLAlchemy ORM models
│   │   └── migrations/              # Alembic migrations
│   └── config.py                    # Environment config (API keys via env)
│
├── ml/
│   ├── privacy/
│   │   ├── generate_training_data.py   # Synthetic PII data generation
│   │   ├── train_pii_ner.py            # DistilBERT fine-tuning
│   │   └── evaluate_ner.py             # F1 evaluation on test set
│   ├── prediction/
│   │   ├── spending_forecast.py        # Prophet model
│   │   ├── overspend_classifier.py     # LightGBM classifier
│   │   ├── anomaly_detector.py         # Isolation Forest
│   │   └── model_registry.py           # Load/save/version models
│   └── models/                         # Serialized model files (git-ignored)
│       ├── financial_pii_ner/          # Fine-tuned DistilBERT weights
│       └── prediction_cache/           # Cached Prophet/LGBM artifacts
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Main dashboard
│   │   │   └── api/                # Next.js API routes (proxy to FastAPI)
│   │   ├── components/             # (see Pillar VII)
│   │   └── lib/
│   │       ├── apiClient.ts        # Typed API client
│   │       └── formatters.ts       # Currency/date formatters
│   └── public/
│
├── docs/
│   ├── erd.md                      # Database ERD
│   ├── system_prompt.xml           # Canonical system prompt (Pillar I)
│   └── household_profile.md        # Project Knowledge file for Claude
│
├── scripts/
│   ├── seed_db.py                  # Initial household setup
│   └── train_all_models.sh         # ML training pipeline
│
├── docker-compose.yml              # Postgres + Redis + backend + frontend
├── .env.example                    # ANTHROPIC_API_KEY, DB_URL, REDIS_URL
└── requirements.txt
```

---

## PILLAR IX — API SURFACE & INTEGRATION CONTRACTS {#pillar-ix}

### 9.1 Main Agent Endpoint

```
POST /api/chat
Content-Type: application/json

{
  "session_id": "uuid",
  "household_id": "uuid",
  "message": "<monthly_data month='2026-05'>...</monthly_data>",
  "mode": "monthly_review"  // optional; auto-detected if omitted
}

Response (streaming SSE):
{
  "type": "text" | "tool_use" | "tool_result" | "summary_md" | "pii_alert",
  "content": "...",
  "tools_invoked": ["run_budget_analysis", "run_debt_avalanche"],
  "anonymization_applied": true,
  "session_id": "uuid"
}
```

### 9.2 Claude API Call Pattern

```python
# /backend/agent/orchestrator.py

import anthropic
from .tools import TOOLS
from ..privacy.trust_layer import PrivacyTrustLayer

client = anthropic.Anthropic()  # key from ANTHROPIC_API_KEY env var

async def run_agent(session: dict, user_message: str, privacy_layer: PrivacyTrustLayer):
    # Step 1: Anonymize user input
    clean_message, token_map = privacy_layer.anonymize(user_message, session["id"])

    # Step 2: Build message history (full context each call — Claude has no memory)
    messages = session.get("messages", [])
    messages.append({"role": "user", "content": clean_message})

    # Step 3: Call Claude with tools
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,           # Pillar I XML prompt
        tools=TOOLS,                    # Pillar IV tool definitions
        messages=messages,
    )

    # Step 4: Agentic tool loop
    while response.stop_reason == "tool_use":
        tool_calls = [b for b in response.content if b.type == "tool_use"]
        tool_results = []

        for tc in tool_calls:
            result = await dispatch_tool(tc.name, tc.input, session)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tc.id,
                "content": json.dumps(result),
            })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

    # Step 5: Validate outbound (no PII leak)
    final_text = next(b.text for b in response.content if hasattr(b, "text"))
    if not privacy_layer.validate_outbound(final_text):
        final_text = privacy_layer.strip_pii_from_response(final_text)

    return final_text, messages
```

### 9.3 Environment Variables

```bash
# .env.example
ANTHROPIC_API_KEY=sk-ant-...        # never commit; load from secrets manager
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
PRIVACY_MODEL_PATH=./ml/models/financial_pii_ner
PRESIDIO_SCORE_THRESHOLD=0.7        # minimum confidence for PII detection
SE_TAX_RESERVE_PCT=0.27             # 27% of gross side income
EF_ALERT_THRESHOLD=0.60             # flag if Needs > 60% of net
```

---

## IMPLEMENTATION SEQUENCE

```
Phase 1 (Weeks 1-2): Core Infrastructure
  → Docker compose (Postgres + Redis + FastAPI skeleton)
  → Database schema + migrations
  → Privacy trust layer (Presidio baseline, no fine-tuned model yet)
  → System prompt finalized and tested in Claude.ai directly

Phase 2 (Weeks 3-4): Agent + Calculations
  → Tool definitions registered with Claude API
  → Calculation engine (budget, avalanche, EF projection, TCO, FICO sim)
  → Agentic tool loop tested end-to-end with mock data
  → Markdown summary output format validated

Phase 3 (Weeks 5-6): ML Models
  → Generate synthetic PII training data (5,000 samples)
  → Fine-tune DistilBERT NER (target F1 ≥ 0.92)
  → Integrate custom recognizer into Presidio pipeline
  → Prophet spending forecaster (once 3 months of real data exists)
  → Isolation Forest anomaly detector
  → LightGBM overspend classifier (once 6 months of data exists)

Phase 4 (Weeks 7-8): Frontend + Integration
  → Next.js dashboard shell
  → Chat interface + streaming SSE display
  → Chart components (budget donut, debt timeline, EF meter)
  → Forecast chart with Prophet confidence bands

Phase 5 (Week 9+): Calibration
  → Load real (anonymized) household data
  → Re-train Prophet on actual spending history
  → Tune LightGBM contamination parameters
  → A/B test system prompt variants (household CFO vs fiduciary planner persona)
```

---

*COMPASS Architecture Spec v1.0 — May 2026*
*All financial content: educational only. No investment, tax, or legal advice.*
