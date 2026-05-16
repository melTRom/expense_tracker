# Phase 1 — DistilBERT NER: Synthetic Corpus Generation
**Role:** senior-data-scientist  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 0

## Objective
Generate 5,000 BIO-labeled training sentences covering 8 financial PII entity types. Output must satisfy >= 400 positive spans per entity type in the training split (4,000 sentences) before model training begins.

## Label Schema
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
    "B-HOUSEHOLD_MEMBER_ALIAS", "I-HOUSEHOLD_MEMBER_ALIAS",
]  # 19 labels (plan adds HOUSEHOLD_MEMBER_ALIAS over spec's 17)
```

## Corpus Layers
| Layer | Source | Target |
|-------|--------|--------|
| 1 | Faker templates — 40+ genres (bank statements, mortgage notices, brokerage confirmations, wire memos, COMPASS XML) | 3,500 |
| 2 | CFPB complaint data with synthetic slot-filling (pending legal clearance; see RESEARCH.md) | 1,000 |
| 3 | COMPASS XML Template A/B/C fragments from knowledge/ folder | 500 |

If CFPB Layer 2 is blocked: expand Layer 1 to 4,500 sentences.

## Entity Generators
```python
GENERATORS = {
    "ACCT_NUM":    [generate_full_acct, generate_partial_acct],
    "ROUTING":     [generate_routing, generate_routing_spelled],   # ABA-valid + word form
    "CARD_NUM":    [fake.credit_card_number, generate_card_partial],
    "SSN":         [fake.ssn, generate_ssn_partial],               # "XXX-XX-1234" variants
    "PERSON_NAME": [fake.first_name, fake.full_name],
    "INSTITUTION": lambda: random.choice(INSTITUTION_LIST_200),
    "LOAN_ID":     generate_loan_id,    # LN-, MLN-, MTG-, AUTO- prefixes
    "BALANCE_AMT": generate_balance,    # "$1,234.56", "1234.56", "1,234 dollars"
    "HOUSEHOLD_MEMBER_ALIAS": generate_alias,   # "Adult 1", "Adult 2", "Child 1"
}
```

## Augmentation
| Technique | Apply rate |
|-----------|-----------|
| Entity swapping (same-type pool) | 30% of spans |
| Format variation | All generators |
| Context synonym substitution | 20% of non-entity tokens |
| Label-preserving casing | 15% of non-entity tokens |

## Post-Generation Filters
- ABA routing checksum (mod-10) on every ROUTING span
- Luhn algorithm on every CARD_NUM span
- Entity count assertion: count[entity] >= 400 per type in train split

## Output Format (HuggingFace datasets JSON)
```json
{
  "tokens": ["Account", "ending", "in", "4421", "was", "credited", "$2,500"],
  "ner_tags": ["O", "O", "O", "B-ACCT_NUM", "O", "O", "B-BALANCE_AMT"]
}
```
Split: 80/10/10 -> train.json / dev.json / test.json in ml/data/pii_ner/

## Acceptance Gate
- [ ] 5,000 sentences generated total
- [ ] Per-entity span count >= 400 in train split (assert in script)
- [ ] All BIO tags valid (no I- without preceding B- of same type)
- [ ] ABA + Luhn filters: zero invalid spans in output
- [ ] Runs without GPU: python ml/privacy/generate_training_data.py --n-samples 5000
