# COMPASS — ML & Models Implementation Plan
## Project: Household Financial Intelligence Assistant (HFIA)
**Version:** 1.0 | **Date:** 2026-05-16 | **Source of Truth:** `Downloads/HFIA_Architecture_Spec.md`

---

## 0. Scope

This plan covers all four ML subsystems in COMPASS plus two rule-based components. It
supplements the architecture spec with concrete training pipelines, corpus strategies,
acceptance criteria, compute requirements, and sequencing decisions.

Synthesized from: architecture spec (Pillar III, VI) + swarm research agents (DistilBERT NER
specialist, Prediction Suite specialist) + sequential reasoning analysis.

| Subsystem | Type | Phase |
|-----------|------|-------|
| DistilBERT Financial NER | Fine-tuned transformer | Phase 3, Week 5 |
| Prophet Spending Forecaster | Time-series model | Phase 3, Week 6 |
| LightGBM Overspend Classifier | Tabular ML | Phase 3, Week 6+ |
| Isolation Forest Anomaly Detector | Unsupervised ML | Phase 3, Week 5 |
| EF Trajectory | Rule-based math | Phase 2 (done in spec) |
| FICO Simulation | Rule-based formula | Phase 2 (done in spec) |

---

## 1. DistilBERT Financial NER — Privacy Trust Layer

### 1.1 Base Model Selection

**Key decision: upgrade base model from spec.**

| Candidate | Params | Starting Point | Decision |
|-----------|--------|----------------|----------|
| `distilbert-base-uncased` | 66M | General LM only | Do not use — no NER prior |
| **`dslim/distilbert-NER`** | **66M** | **CoNLL-2003 NER pretrained** | **Primary recommendation** |
| `ProsusAI/finbert` | 110M | Financial domain LM | Use if latency allows |
| `dslim/bert-base-NER` | 110M | CoNLL-2003 NER pretrained | Alternative to finbert |

**Rationale:**
- `dslim/distilbert-NER` is DistilBERT already fine-tuned for NER on CoNLL-2003. The
  classification head is initialized for BIO sequence labeling — not random. This eliminates
  the chief small-data risk: random head initialization variance.
- `ProsusAI/finbert` adds financial domain pre-training (4.9B tokens: Reuters, SEC filings,
  earnings calls). Best for INSTITUTION, LOAN_ID, BALANCE_AMT F1. Use if the privacy trust
  layer runs as a background service (not hard real-time path).
- The spec's `distilbert-base-uncased` is the weakest justified choice — a free upgrade costs
  nothing and gains 1.5–6 F1 points on minority entity classes.

### 1.2 NER Label Schema (from spec — unchanged)

```python
LABELS = [
    "O",
    "B-ACCT_NUM",    "I-ACCT_NUM",
    "B-ROUTING",     "I-ROUTING",
    "B-CARD_NUM",    "I-CARD_NUM",
    "B-SSN",         "I-SSN",
    "B-PERSON_NAME", "I-PERSON_NAME",
    "B-INSTITUTION", "I-INSTITUTION",
    "B-LOAN_ID",     "I-LOAN_ID",
    "B-BALANCE_AMT", "I-BALANCE_AMT",
]  # 17 labels total
```

**Addition recommended:** `B-HOUSEHOLD_MEMBER_ALIAS` / `I-HOUSEHOLD_MEMBER_ALIAS` — distinct
from generic PERSON_NAME. COMPASS knows its specific household members (Adult 1, Adult 2,
Child 1, Child 2) by name; conflating them with payee names creates unresolvable ambiguity.

### 1.3 Corpus Strategy

**Target:** 5,000 labeled sentences | **Split:** 80/10/10 (train/dev/test)  
**Critical constraint:** ≥ 400 positive spans per entity type in the training split. Models
collapse to predicting "O" on minority entities without intentional oversampling.

**Layer 1 — Template generation (3,500 sentences)**

Expand the spec's 8 templates to 40+ covering real financial document genres:

| Genre | Examples |
|-------|---------|
| Bank statement paragraphs | "Account ending in 4421 was credited $2,500" |
| Mortgage origination notices | "Loan ID MTG-29847 at Chase, routing 021000021" |
| Brokerage confirmations | "Fidelity IRA, acct# 1234-5678-90, Adult 2" |
| Internal wire memos | "Transfer from ACCT_NUM to routing ROUTING at INSTITUTION" |
| COMPASS XML fragments | Actual Template A/B/C snippets from Pillar II |
| Adversarial patterns | Spelled-out numbers, partial masking, non-standard spacing |

```python
GENERATORS = {
    "ACCT_NUM":    [generate_full_acct, generate_partial_acct],  # "...7890" form too
    "ROUTING":     [generate_routing, generate_routing_spelled],  # words + ABA-valid
    "CARD_NUM":    [fake.credit_card_number, generate_card_partial],
    "SSN":         [fake.ssn, generate_ssn_partial],              # "XXX-XX-1234" variants
    "PERSON_NAME": [fake.first_name, fake.full_name],             # multi-token names
    "INSTITUTION": lambda: random.choice(INSTITUTION_LIST_200),   # 200 US institutions
    "LOAN_ID":     generate_loan_id,  # prefixes: LN-, MLN, MTG-, AUTO-, etc.
    "BALANCE_AMT": generate_balance,  # "$1,234.56", "1234.56", "1,234 dollars"
}
```

**Layer 2 — CFPB public complaint data (1,000 sentences)**

Parse CFPB consumer complaint database (public domain, cfpb.gov). Strip actual PII, inject
synthetic entities via slot-filling. Captures real financial prose vocabulary that templates miss.
*Check legal clearance before use — see Open Questions.*

**Layer 3 — COMPASS XML template fragments (500 sentences)**

Extract real sentences from COMPASS's own Template A, B, C (Pillar II). These are exactly the
formats that appear in production. Label with ground-truth entity positions. This is the highest-
signal layer for in-distribution performance.

**Augmentation strategy (post-generation):**

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| Entity swapping | High (+1.5–3.0 F1 on minority classes) | Replace 30% of entity spans with same-type pool entries |
| Format variation | High | "$1,234" vs "1234.56" vs "...7890"; routing spelled out |
| Context paraphrase | Medium (+0.8–1.5 F1) | Word-level synonym list for non-entity context words |
| Label-preserving casing | Low (+0.5 F1) | Randomize case on non-entity tokens |
| Back-translation | Avoid | Corrupts numeric entity surface forms |

**Post-processing filters (free precision gains):**
- ABA routing number checksum (mod-10) on ROUTING predictions
- Luhn algorithm on CARD_NUM predictions

### 1.4 Token Alignment — Critical Implementation Detail

DistilBERT uses WordPiece tokenization. "123456789" → ["123", "##456", "##789"].
BIO labels are word-level; token-level alignment must be explicit.

**Use Strategy A: label first subword, assign -100 to continuations.**

```python
def tokenize_and_align_labels(examples, tokenizer, label2id):
    tokenized = tokenizer(
        examples["tokens"],
        truncation=True,
        is_split_into_words=True,
        max_length=128,
        padding="max_length",
    )
    labels = []
    for i in range(len(examples["tokens"])):
        word_ids = tokenized.word_ids(batch_index=i)
        word_labels = examples["ner_tags"][i]
        label_ids = []
        prev_word_id = None
        for word_id in word_ids:
            if word_id is None:
                label_ids.append(-100)       # special tokens [CLS], [SEP], [PAD]
            elif word_id != prev_word_id:
                label_ids.append(label2id[word_labels[word_id]])  # first subword
            else:
                label_ids.append(-100)       # continuation subword — ignored in loss
            prev_word_id = word_id
        labels.append(label_ids)
    tokenized["labels"] = labels
    return tokenized
```

Strategy A outperforms Strategy B (propagating I- to continuations) empirically. Loss is
computed only on word-initial tokens, keeping gradient signal clean.

### 1.5 Training Configuration

```python
# /ml/privacy/train_pii_ner.py

from transformers import (
    AutoTokenizer, AutoModelForTokenClassification,
    TrainingArguments, Trainer, DataCollatorForTokenClassification,
    EarlyStoppingCallback,
)

BASE_MODEL = "dslim/distilbert-NER"   # upgraded from spec
OUTPUT_DIR = "./ml/models/financial_pii_ner"

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
model = AutoModelForTokenClassification.from_pretrained(
    BASE_MODEL,
    num_labels=len(LABELS),
    id2label={i: l for i, l in enumerate(LABELS)},
    label2id={l: i for i, l in enumerate(LABELS)},
    ignore_mismatched_sizes=True,  # required when changing num_labels
)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    eval_strategy="epoch",
    save_strategy="epoch",
    learning_rate=2e-5,            # optimal for small-data BERT NER
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    num_train_epochs=5,
    weight_decay=0.01,
    warmup_ratio=0.10,             # ~190 steps warmup
    max_grad_norm=1.0,             # gradient clipping — critical for small-data stability
    load_best_model_at_end=True,
    metric_for_best_model="eval_f1",
    greater_is_better=True,
    fp16=True,                     # set False for Apple Silicon MPS
    report_to="none",              # privacy: no external logging
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=dev_dataset,
    tokenizer=tokenizer,
    data_collator=DataCollatorForTokenClassification(tokenizer),
    compute_metrics=compute_seqeval_metrics,
    callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
)
```

**Hyperparameter sensitivity (run 3-point search):**
- Learning rate: {1e-5, 2e-5, 3e-5} — this is the dominant parameter
- Run 3 seeds (42, 123, 456) — if std > 2 F1 points, minority class data is insufficient

**Compute options:**

| Hardware | Est. time | Cost |
|----------|-----------|------|
| MacBook Pro M2 (MPS) | 25–40 min | $0 |
| Colab T4 (16GB) | 8–12 min | $0 free tier |
| Colab A100 (40GB) | 3–5 min | ~$0.10 |
| CPU only | ~5 hours | not recommended |

### 1.6 Evaluation & Acceptance Criteria

```python
from seqeval.metrics import classification_report, f1_score
# Use seqeval span-level F1 — NOT token-level F1 (inflated by "O" tokens)
```

**Acceptance gates (all must pass before production):**

| Entity | F1 Target | Recall Target | Reason |
|--------|-----------|--------------|--------|
| Macro (all entities) | ≥ 0.92 | — | Overall gate |
| SSN | ≥ 0.97 | ≥ 0.95 | Regulatory — false negative = compliance failure |
| CARD_NUM | ≥ 0.95 | ≥ 0.93 | Same |
| ACCT_NUM | ≥ 0.90 | — | High-value PII |
| ROUTING | ≥ 0.88 | — | |
| PERSON_NAME | ≥ 0.82 | — | Hardest — names in both PII + institutional context |
| INSTITUTION | ≥ 0.78 | — | Lower priority (not PII) |
| LOAN_ID | ≥ 0.82 | — | Variable prefix patterns |
| BALANCE_AMT | ≥ 0.85 | — | |
| Inference latency (CPU) | < 20ms | — | Real-time gate |

**Reduce confidence threshold on SSN/CARD_NUM** if recall falls below target — false negatives
are regulatory failures. Accept precision trade-off.

### 1.7 Presidio Integration

```python
# /backend/privacy/custom_recognizers.py

from presidio_analyzer import EntityRecognizer, RecognizerResult
from presidio_analyzer.nlp_engine import NlpArtifacts
from transformers import pipeline

class CompassFinancialNERRecognizer(EntityRecognizer):
    SUPPORTED_ENTITIES = [
        "ACCT_NUM", "ROUTING", "CARD_NUM", "SSN",
        "PERSON_NAME", "INSTITUTION", "LOAN_ID", "BALANCE_AMT",
    ]

    def __init__(self, model_path: str, confidence_threshold: float = 0.85):
        super().__init__(
            supported_entities=self.SUPPORTED_ENTITIES,
            name="CompassFinancialNERRecognizer",
            supported_language="en",
        )
        self.ner_pipeline = pipeline(
            task="token-classification",
            model=model_path,
            aggregation_strategy="simple",  # merges B/I into spans with char offsets
            device=-1,  # CPU; change to 0 for GPU
        )
        self.confidence_threshold = confidence_threshold

    def load(self):
        pass  # model loaded in __init__

    def analyze(self, text: str, entities: list, nlp_artifacts: NlpArtifacts):
        results = []
        for span in self.ner_pipeline(text):
            if span["score"] < self.confidence_threshold:
                continue
            if span["entity_group"] not in entities:
                continue
            results.append(RecognizerResult(
                entity_type=span["entity_group"],
                start=span["start"],
                end=span["end"],
                score=float(span["score"]),
            ))
        return results
```

**Key integration decisions:**
- Use `aggregation_strategy="simple"` — maps BIO spans to character offsets cleanly
- Set per-entity confidence thresholds (not a single global value)
- Apply ABA checksum post-filter on ROUTING results
- Apply Luhn algorithm post-filter on CARD_NUM results
- For conflict resolution with Presidio built-ins: prefer ROUTING over PHONE for 9-digit strings

**Production optimization:** Export to ONNX via `optimum-cli` for ~40% CPU latency reduction.

---

## 2. Prophet — Spending Category Forecaster

### 2.1 Category Tier Classification

**Not all categories need Prophet.** Classify before assigning a model:

| Tier | Examples | Model | `changepoint_prior_scale` |
|------|----------|-------|--------------------------|
| Deterministic | Mortgage P&I, auto loan, HOA | Rule (fixed value) | N/A |
| Semi-stable | Groceries, fuel, utilities, healthcare premium | Prophet | 0.05–0.10 |
| Volatile | Dining out, pets, hobbies, home repair | Prophet | 0.15–0.25 |
| Seasonal spike | Christmas gifts, back-to-school, tuition | Prophet + custom regressors | 0.30–0.50 |

### 2.2 Cold-Start Degradation Ladder

| History | Strategy |
|---------|---------|
| < 3 months | Show observed mean ± 1 stddev. No model. |
| 3–5 months | BLS Consumer Expenditure Survey regional prior as display |
| 6–11 months | Prophet, `yearly_seasonality=False`, `changepoint_prior_scale=0.05` |
| ≥ 12 months | Prophet, `yearly_seasonality=True`, custom household regressors |

**BLS CES fallback values (Texas region, middle-income):**
Groceries $650/mo, Dining $350/mo, Fuel $280/mo, Utilities $230/mo

### 2.3 Seasonality Mode — Key Decision: Additive, Not Multiplicative

The spec uses `seasonality_mode="multiplicative"`. **Change to additive.**

- Household spending categories do NOT scale multiplicatively with a baseline level.
- Christmas grocery spend goes up $200 whether baseline is $400 or $800 — additive.
- Multiplicative mode produces negative lower-bound predictions in low-baseline months.
- **Exception:** Use multiplicative only for self-employed total income modeling.

### 2.4 Enhanced Configuration

```python
# /ml/prediction/spending_forecast.py

CATEGORY_CONFIG = {
    "groceries":       {"changepoint_prior_scale": 0.08, "tier": "semi-stable"},
    "dining_out":      {"changepoint_prior_scale": 0.20, "tier": "volatile"},
    "fuel":            {"changepoint_prior_scale": 0.10, "tier": "semi-stable"},
    "pet_care":        {"changepoint_prior_scale": 0.25, "tier": "volatile"},
    "christmas_gifts": {"changepoint_prior_scale": 0.40, "tier": "seasonal"},
    "utilities_elec":  {"changepoint_prior_scale": 0.06, "tier": "semi-stable"},
    "medical_oop":     {"changepoint_prior_scale": 0.30, "tier": "volatile"},
}

def build_prophet_model(category: str, n_months: int) -> Prophet:
    config = CATEGORY_CONFIG.get(category, {"changepoint_prior_scale": 0.15})
    return Prophet(
        yearly_seasonality=(n_months >= 12),
        weekly_seasonality=False,
        daily_seasonality=False,
        seasonality_mode="additive",           # changed from spec
        changepoint_prior_scale=config["changepoint_prior_scale"],
        seasonality_prior_scale=10.0,
        holidays_prior_scale=10.0,
        interval_width=0.80,
        n_changepoints=min(5, n_months // 4),  # far fewer than Prophet's default 25
        mcmc_samples=0,                         # MAP estimation; MCMC too slow for < 36 pts
        holidays=make_compass_holidays(),
    )


def make_compass_holidays() -> pd.DataFrame:
    """Only financially meaningful events — not full US holiday calendar."""
    return pd.DataFrame({
        "holiday": [
            "christmas_season", "back_to_school", "tax_season",
            "q1_se_tax", "q2_se_tax", "q3_se_tax", "q4_se_tax",
            "black_friday",
        ],
        "ds": pd.to_datetime([
            "2025-12-01", "2025-08-01", "2025-04-01",
            "2026-01-15", "2026-04-15", "2026-06-15", "2026-09-15",
            "2025-11-28",
        ]),
        "lower_window": [-7,   0, -14,  -7,  -7,  -7,  -7,  -7],
        "upper_window": [31,  30,   7,   7,   7,   7,   7,   3],
    })
```

**Surge income as directional regressor (not symmetric holiday):**
```python
def add_surge_indicator(df: pd.DataFrame, side_income: pd.Series) -> pd.DataFrame:
    p75 = side_income.quantile(0.75)
    df["surge_income_indicator"] = (side_income > p75).astype(float)
    # model.add_regressor("surge_income_indicator") — allows signed coefficient
    return df
```

### 2.5 Confidence Interval — Use 80%, Display as "Likely Range"

80% CI (`interval_width=0.80`) is more actionable than 95%.
- With 3–36 data points, Prophet's 95% CI is not statistically honest.
- UX copy: "likely range" not "confidence interval" — prevents false precision interpretation.
- If coverage < 65% of actuals fall inside CI → widen to 90% for that category.

### 2.6 Cross-Validation

```python
from prophet.diagnostics import cross_validation, performance_metrics

def evaluate_prophet(model, history_df):
    if len(history_df) < 18:
        return {"mape": None, "status": "insufficient_data_for_cv"}
    df_cv = cross_validation(
        model,
        initial="365 days",
        period="30 days",
        horizon="90 days",
        parallel="threads",
    )
    df_perf = performance_metrics(df_cv, rolling_window=1)
    return {
        "mape": df_perf["mape"].mean(),
        "coverage": df_perf["coverage"].mean(),
        "rmse": df_perf["rmse"].mean(),
    }
```

### 2.7 Acceptance Criteria & Fallback

| Category Tier | MAPE Target | Fallback trigger |
|---------------|-------------|-----------------|
| Semi-stable | ≤ 12% | > 20% → show rolling 3-month average |
| Volatile | ≤ 25% | > 40% → show rolling 3-month average |
| 80% CI coverage | ≥ 78% | < 65% → widen to 90% CI |

### 2.8 Model Persistence

```python
from prophet.serialize import model_to_json, model_from_json

# Save — use JSON, not pickle (pickle is not stable across Prophet versions)
path = f"ml/models/prediction_cache/{household_id}_{category}.json"
with open(path, "w") as f:
    json.dump(model_to_json(model), f)
```

**Retraining trigger:** Monthly, after each new `monthly_snapshot` is submitted to PostgreSQL.

---

## 3. LightGBM — Overspend Classifier

### 3.1 Key Change: Pooled Training Model

**Spec approach:** Per-category models (~12–36 rows each).  
**Plan approach:** Single pooled model — all categories × all months as rows.

- 12 months × 30 categories = **360 training rows** (10× more data)
- Single model to maintain, retrain, and version
- Cross-category learning: holiday season overspend affects multiple categories simultaneously

### 3.2 Baseline-First Rollout

**Do not deploy LightGBM until 18–24 months of data exist.** Deploy logistic regression first.

| Data available | Active model | Upgrade condition |
|----------------|-------------|-------------------|
| < 12 months | Rule-based: overspend streak ≥ 2 → alert | — |
| 12–17 months | Logistic Regression (L2, C=0.1) | — |
| ≥ 18 months | Compare LR vs. LightGBM LOOCV AUC | Promote LightGBM if AUC > LR + 0.03 |
| ≥ 24 months | LightGBM primary | Quarterly retraining |

### 3.3 Feature Engineering

```python
def build_features(history: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    df = history.copy()

    # Rolling statistics
    df["rolling_mean_3m"] = df.groupby("category")["actual"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    df["rolling_std_3m"] = df.groupby("category")["actual"].transform(
        lambda x: x.rolling(3, min_periods=1).std().fillna(0)
    )

    # Budget pressure
    df["variance_ratio"] = df["actual"] / df["budgeted"].replace(0, np.nan)
    df["budget_realism"] = df["budgeted"] / df.groupby("category")["actual"].transform(
        lambda x: x.rolling(6, min_periods=1).median()
    )

    # Cyclic month encoding (NOT raw integer — LightGBM can't learn Dec→Jan continuity)
    month_num = pd.to_datetime(df["period"]).dt.month
    df["month_sin"] = np.sin(2 * np.pi * month_num / 12)
    df["month_cos"] = np.cos(2 * np.pi * month_num / 12)

    # Seasonal flags
    df["is_q4"] = (month_num >= 10).astype(int)
    df["is_back_to_school"] = (month_num == 8).astype(int)
    df["is_tax_month"] = month_num.isin([1, 4, 6, 9]).astype(int)

    # Streak features
    df["overspent"] = (df["actual"] > df["budgeted"]).astype(int)
    df["overspend_streak"] = df.groupby("category")["overspent"].transform(
        lambda x: x.groupby((x != x.shift()).cumsum()).cumcount() + 1
    ) * df["overspent"]
    df["months_since_overspend"] = df.groupby("category")["overspent"].transform(
        lambda x: x[::-1].cumsum()[::-1].where(x == 0, 0)
    )

    # Category encoding (pooled model)
    df["category_encoded"] = df["category"].astype("category").cat.codes

    df["target"] = df["overspent"].shift(-1)  # predict next month

    FEATURES = [
        "rolling_mean_3m", "rolling_std_3m", "variance_ratio", "budget_realism",
        "month_sin", "month_cos", "is_q4", "is_back_to_school", "is_tax_month",
        "overspend_streak", "months_since_overspend",
        "budgeted", "category_encoded",
    ]
    return df.dropna(subset=["target"]), FEATURES
```

### 3.4 LightGBM Configuration (Small Data)

Standard LightGBM defaults overfit on 360 rows. These settings prevent that:

```python
LGBM_PARAMS = {
    "num_leaves": 6,           # default 31 will memorize 360 rows
    "max_depth": 3,
    "min_child_samples": 5,    # default 20 blocks splits entirely at small n
    "n_estimators": 50,        # fewer trees for small data
    "learning_rate": 0.05,
    "subsample": 0.8,
    "subsample_freq": 1,
    "colsample_bytree": 0.8,
    "reg_alpha": 1.0,          # L1
    "reg_lambda": 5.0,         # strong L2 for small n
    "min_split_gain": 0.1,
    "objective": "binary",
    "metric": "auc",
    "verbose": -1,
    "random_state": 42,
}
```

### 3.5 Temporal Cross-Validation (Not Standard k-Fold)

Standard sklearn CV shuffles data — this is data leakage for time series. Use temporal LOOCV:

```python
def temporal_loocv(X, y, params) -> dict:
    min_train = max(6, len(X) // 3)
    predictions, actuals = [], []
    for test_idx in range(min_train, len(X)):
        X_train, y_train = X[:test_idx], y[:test_idx]
        X_test, y_test = X[test_idx:test_idx+1], y[test_idx]
        w = compute_sample_weight("balanced", y_train)
        m = lgb.LGBMClassifier(**params)
        m.fit(X_train, y_train, sample_weight=w)
        predictions.append(m.predict_proba(X_test)[0, 1])
        actuals.append(y_test)
    return {
        "auc": roc_auc_score(actuals, predictions),
        "avg_precision": average_precision_score(actuals, predictions),
    }
```

### 3.6 Probability Calibration

Raw LightGBM probabilities are not calibrated. Calibrate before showing to users:

```python
from sklearn.calibration import CalibratedClassifierCV

calibrated = CalibratedClassifierCV(model, method="isotonic", cv="prefit")
calibrated.fit(X_val, y_val)

# Alert thresholds:
# > 0.60 → "medium risk" (yellow)
# > 0.75 → "high risk" (red)
```

### 3.7 Acceptance Criteria

| Metric | Target | Fallback |
|--------|--------|---------|
| Temporal LOOCV AUC | ≥ 0.70 | Revert to Logistic Regression |
| Precision at 0.60 threshold | ≥ 0.65 | Lower threshold to 0.50 |
| False alarm rate (< 2 consecutive) | < 30% | Rule-based override |

**Retraining trigger:** Monthly after new snapshot + when LOOCV AUC drops > 0.05 vs stored baseline.

---

## 4. Isolation Forest — Anomaly Detector

### 4.1 Feature Matrix: Variance Ratios, Not Raw Dollars

**Spec:** `(n_months, n_categories)` matrix of raw dollar amounts.  
**Plan:** Use variance ratios (`actual / budgeted`) — normalizes for category scale.

- Mortgage ($1,800/mo) should not dominate over streaming ($50/mo)
- Variance ratio of 1.0 = on budget; > 1.0 = overspend; < 1.0 = underspend
- This is the meaningful signal for anomaly detection, not absolute amount

### 4.2 Preprocessing Pipeline

```python
import numpy as np
from sklearn.preprocessing import RobustScaler

def build_variance_matrix(snapshots: pd.DataFrame) -> np.ndarray:
    pivot = snapshots.pivot(index="period", columns="category", values="variance_ratio")
    return pivot.fillna(1.0).values  # missing month → assume on-budget

def preprocess(X_raw: np.ndarray) -> tuple[np.ndarray, RobustScaler]:
    X_log = np.log1p(X_raw)          # compress heavy tail; log1p(0) = 0
    scaler = RobustScaler()           # median/IQR — robust to the outliers we're detecting
    X_scaled = scaler.fit_transform(X_log)
    return X_scaled, scaler

# Do NOT use StandardScaler — its mean/std are pulled by the outliers you're trying to detect
# Do NOT use MinMaxScaler — new data outside training range gets clipped
```

### 4.3 Adaptive Configuration

```python
def build_anomaly_detector(n_months: int) -> IsolationForest:
    # Contamination: adaptive by data volume
    if n_months <= 12:
        contamination = 0.05   # conservative at cold start — false positives erode trust
    elif n_months <= 24:
        contamination = 0.08
    else:
        contamination = 0.10   # spec's default — 1–2 anomalous months per year

    return IsolationForest(
        n_estimators=150,              # 100–200 all converge for this data scale
        contamination=contamination,
        max_samples=min(n_months, 256),
        max_features=1.0,              # use all features — feature subsampling hurts at small n
        bootstrap=False,               # without replacement — more stable for small n
        random_state=42,
        n_jobs=-1,
    )
```

### 4.4 Anomaly Explanation

**User-facing:** Percentile deviation (most interpretable)  
**Internal validation:** SHAP TreeExplainer

```python
def explain_anomaly_user_facing(
    X_raw: np.ndarray,
    month_idx: int,
    category_names: list,
    top_k: int = 3,
) -> list[dict]:
    """'Dining was at its 95th percentile this month' — interpretable copy."""
    month_values = X_raw[month_idx]
    results = []
    for col_idx, cat_name in enumerate(category_names):
        pct = np.mean(X_raw[:, col_idx] <= month_values[col_idx]) * 100
        results.append({"category": cat_name, "percentile": pct})
    results.sort(key=lambda x: abs(x["percentile"] - 50), reverse=True)
    return results[:top_k]


def explain_anomaly_shap(model, X_scaled, month_idx, category_names) -> list[dict]:
    """Internal validation — confirms percentile explanation aligns with model."""
    import shap
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_scaled)
    month_shap = shap_values[month_idx]
    top_indices = np.argsort(np.abs(month_shap))[::-1][:3]
    return [
        {
            "category": category_names[i],
            "shap": float(month_shap[i]),
            "direction": "above_normal" if month_shap[i] > 0 else "below_normal",
        }
        for i in top_indices
    ]
```

### 4.5 Acceptance Criteria

| Check | Requirement |
|-------|-------------|
| Minimum training data | ≥ 4 months |
| Sanity check | ≥ 1 anomaly per 12 months (model is alive) |
| Human review | First 5 flagged months validated as explainable |
| Percentile/SHAP agreement | ≥ 70% same top-2 categories across methods |

**Retraining:** Monthly (IsolationForest is fast — always retrain on all available data).

**Alternative considered:** LocalOutlierFactor — rejected because LOF cannot score new months
without full refit (transductive). Isolation Forest is the correct choice for online updates.

---

## 5. Model Registry

The spec mentions `model_registry.py` but does not implement it. This is the glue layer.

```python
# /ml/prediction/model_registry.py

import joblib
import json
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime

MODEL_STORE = Path("./ml/models/prediction_cache")

@dataclass
class ModelRecord:
    household_id: str
    model_type: str   # "prophet_{category}", "lgbm_overspend", "isolation_forest"
    version: int
    metrics: dict     # {"auc": 0.75} or {"mape": 0.12, "coverage": 0.82}
    trained_at: str   # ISO 8601
    n_samples: int
    active: bool = True

class ModelRegistry:

    def get_active(self, household_id: str, model_type: str):
        path = MODEL_STORE / f"{household_id}_{model_type}_active.joblib"
        return joblib.load(path) if path.exists() else None

    def promote(self, model, household_id: str, model_type: str,
                metrics: dict, n_samples: int) -> bool:
        current = self.get_active(household_id, model_type)
        if current is None or self._is_improvement(model_type, metrics, current["metrics"]):
            self._save(model, household_id, model_type, metrics, n_samples)
            return True
        return False

    def get_fallback(self, model_type: str):
        if model_type == "lgbm_overspend":
            return OverspendStreakFallback()
        elif model_type.startswith("prophet_"):
            return RollingAverageFallback()
        elif model_type == "isolation_forest":
            return PercentileAnomalyFallback()
        raise ValueError(f"No fallback for {model_type}")

    def _is_improvement(self, model_type: str, new: dict, old: dict) -> bool:
        if "auc" in new:
            return new["auc"] > old.get("auc", 0) + 0.01
        if "mape" in new:
            return new["mape"] < old.get("mape", 1.0) - 0.01
        return True

    def _save(self, model, household_id, model_type, metrics, n_samples):
        record = ModelRecord(
            household_id=household_id,
            model_type=model_type,
            version=int(datetime.now().timestamp()),
            metrics=metrics,
            trained_at=datetime.now().isoformat(),
            n_samples=n_samples,
        )
        joblib.dump(
            {"model": model, "metrics": metrics, "record": asdict(record)},
            MODEL_STORE / f"{household_id}_{model_type}_active.joblib",
        )
```

---

## 6. Corpus Summary

| Model | Source | Size | Cold-start prior |
|-------|--------|------|-----------------|
| DistilBERT NER | Faker templates + CFPB + COMPASS XML | 5,000 labeled sentences (80/10/10) | N/A — synthetic |
| Prophet | PostgreSQL `budget_lines` per category | 6–36 rows (monthly) | BLS CES regional averages |
| LightGBM | PostgreSQL `budget_lines` pooled | 360 rows @ 12 months | Logistic regression baseline |
| Isolation Forest | PostgreSQL `monthly_snapshots` (variance ratios) | n_months × n_categories matrix | — |

**PostgreSQL fields consumed:**
```
budget_lines: {snapshot_id, category, subcategory, budgeted, actual, variance}
monthly_snapshots: {id, household_id, period (YYYY-MM-01), anonymized (JSONB)}
```

---

## 7. Dependencies

```
# requirements.txt — ML additions
transformers>=4.40.0
torch>=2.2.0
datasets>=2.18.0
seqeval>=1.2.2
evaluate>=0.4.1
optimum[onnxruntime]>=1.18.0     # ONNX export for DistilBERT CPU optimization
prophet>=1.1.5
lightgbm>=4.3.0
scikit-learn>=1.4.0
shap>=0.45.0
presidio-analyzer>=2.2.35
presidio-anonymizer>=2.2.35
presidio-evaluator>=0.0.10
faker>=24.0.0
joblib>=1.3.0
pandas>=2.2.0
numpy>=1.26.0
```

---

## 8. Training Script

```bash
#!/bin/bash
# /scripts/train_all_models.sh

set -e
echo "=== COMPASS ML Training Pipeline ==="

echo "[1/4] Generating synthetic PII training data..."
python ml/privacy/generate_training_data.py \
  --n-samples 5000 --output ml/data/pii_ner/

echo "[2/4] Fine-tuning DistilBERT NER..."
python ml/privacy/train_pii_ner.py \
  --base-model dslim/distilbert-NER \
  --data ml/data/pii_ner/ \
  --output ml/models/financial_pii_ner/ \
  --epochs 5 --batch-size 16

echo "[3/4] Evaluating NER (must pass F1 >= 0.92)..."
python ml/privacy/evaluate_ner.py \
  --model ml/models/financial_pii_ner/ \
  --test-data ml/data/pii_ner/test.json

echo "[4/4] Training prediction suite (requires DB)..."
python ml/prediction/train_prediction_suite.py \
  --household-id "${HOUSEHOLD_ID:-all}" \
  --models prophet lgbm isolation_forest

echo "=== Training complete ==="
```

---

## 9. Phased Delivery

| Week | Deliverable | Gate |
|------|-------------|------|
| 5, Day 1–2 | Synthetic PII data generation (Layer 1 + 3) | 5,000 sentences, ≥ 400 spans/entity |
| 5, Day 3 | DistilBERT fine-tuning run | Macro F1 ≥ 0.92 on test set |
| 5, Day 4 | ABA checksum + Luhn post-filters | Zero false negatives on known entity set |
| 5, Day 5 | Presidio recognizer integration | End-to-end PII strip test on COMPASS Template A/B/C |
| 5, Day 5 | Isolation Forest bootstrap | Trains on synthetic household data, `detect()` schema verified |
| 6, Day 1–2 | Prophet cold-start mode | Returns forecast without error on 3-month input |
| 6, Day 3 | LightGBM baseline (Logistic Regression) | AUC reported; fallback rule engaged |
| 6, Day 4–5 | Model Registry wired | `get_active()`, `promote()`, `get_fallback()` tested |
| Phase 5 | ONNX export of DistilBERT | CPU latency < 20ms verified |
| Phase 5 | LightGBM upgrade | Auto-promoted when 18+ months data accumulated |
| Phase 5 | Prophet full seasonal | Auto-promoted when 12+ months data available |
| Phase 5 | DistilBERT re-eval | Re-test on COMPASS XML format; retrain if any entity F1 drops > 5pp |

---

## 10. Open Questions

1. **GPU access:** Confirm Colab A100 or local M-series Mac for DistilBERT fine-tuning.
2. **CFPB legal clearance:** Confirm it is permissible to use CFPB complaint text for corpus layer 2.
3. **Presidio version:** Confirm `presidio-analyzer>=2.2.35` API compatibility with `EntityRecognizer` custom recognizer interface.
4. **PostgreSQL timeline:** Confirm Phase 1 DB is live before Week 5 (prediction models need it for corpus).
5. **Household scope:** Single-household MVP or multi-household from day 1? (determines model registry keying and whether cross-household pooled features are available for LightGBM).
6. **HOUSEHOLD_MEMBER_ALIAS label:** Confirm whether to add this label or subsume into PERSON_NAME.

---

## 11. Key Departures from Architecture Spec

| Spec assumption | Plan decision | Reason |
|-----------------|--------------|--------|
| `distilbert-base-uncased` | `dslim/distilbert-NER` | NER-initialized head — free F1 gain |
| `seasonality_mode="multiplicative"` | additive | Multiplicative produces negative CI bounds for fixed-budget spending |
| 10% IF contamination (fixed) | Adaptive: 5%→8%→10% by data volume | Cold-start false positives erode user trust |
| Per-category LightGBM models | Pooled single model | 10× more training data; easier maintenance |
| LightGBM immediately | Logistic regression baseline first | LightGBM overfits on < 18 months |
| Raw dollar matrix for IF | Variance ratio matrix | Normalizes category scale; mortgage otherwise dominates |
| No model registry impl. | Full ModelRegistry class | Required for fallback and promotion logic |

---

*Plan v1.0 — COMPASS ML Implementation | 2026-05-16*  
*Source: HFIA_Architecture_Spec.md + swarm research synthesis*  
*All financial content: educational only.*
