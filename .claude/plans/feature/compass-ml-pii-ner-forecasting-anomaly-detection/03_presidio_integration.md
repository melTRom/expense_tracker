# Phase 3 — Presidio Integration (CompassFinancialNERRecognizer)
**Role:** senior-ml-engineer  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 2 (model must pass F1 gates)

## Objective
Wire the fine-tuned DistilBERT model into Microsoft Presidio as a custom EntityRecognizer so the backend privacy layer can strip/anonymize PII from any text before sending to cloud LLMs.

## Key Decisions
- aggregation_strategy="simple" — maps BIO spans to character offsets cleanly
- Per-entity confidence thresholds (not a single global threshold)
- ABA checksum post-filter on ROUTING results
- Luhn post-filter on CARD_NUM results
- Conflict resolution: prefer ROUTING over PHONE for 9-digit strings

## ABA Routing Checksum
```python
def validate_routing(routing_str: str) -> bool:
    digits = [int(c) for c in routing_str if c.isdigit()]
    if len(digits) != 9:
        return False
    return (3*(digits[0]+digits[3]+digits[6]) +
            7*(digits[1]+digits[4]+digits[7]) +
            (digits[2]+digits[5]+digits[8])) % 10 == 0
```

## Luhn Algorithm (CARD_NUM)
```python
def validate_card_luhn(card_str: str) -> bool:
    digits = [int(c) for c in card_str if c.isdigit()]
    total = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0
```

## End-to-End Test
Run against COMPASS Template A/B/C from knowledge/ folder:
- [ ] Zero false negatives on SSN and CARD_NUM spans
- [ ] No ROUTING with invalid ABA checksum passes
- [ ] No CARD_NUM failing Luhn passes
- [ ] PII-stripped output safe for cloud LLM submission

## Files to Produce
- backend/privacy/custom_recognizers.py
- backend/privacy/test_recognizers.py (integration test)
