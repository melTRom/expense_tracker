# Phase 8 — End-to-End Training Pipeline + Integration Tests
**Role:** senior-ml-engineer  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phases 1-7

## Objective
Wire all 4 ML subsystems into a single executable training pipeline. Verify correctness with integration tests using synthetic 24-month household data (no DB dependency for tests).

## Training Script: scripts/train_all_models.sh
Steps in order (set -e):
1. Generate 5,000 PII training sentences -> ml/data/pii_ner/
2. Fine-tune DistilBERT NER (dslim/distilbert-NER base)
3. Evaluate NER (gate: macro F1 >= 0.92, exits non-zero if fails)
4. Train prediction suite (Prophet + LightGBM + Isolation Forest) against DB

## Integration Tests (synthetic data, no DB)
1. NER pipeline: COMPASS Template A/B/C -> zero SSN/CARD_NUM false negatives
2. Prophet cold-start (3-month input) -> BLS prior returned, no error
3. Prophet full (12-month input) -> model trains and JSON serializes cleanly
4. Isolation Forest (6-month variance ratio matrix) -> detect() schema valid
5. LightGBM (12-month data) -> logistic regression baseline AUC reported
6. Model Registry roundtrip: promote -> get_active -> get_fallback for all model types
7. Full script: bash scripts/train_all_models.sh exits 0 on synthetic data

## Synthetic Test Fixture
ml/tests/fixtures/generate_synthetic_household.py generates:
- 24 months of rows: {period: "YYYY-MM-01", category: str, budgeted: float, actual: float}
- 2-3 injected anomalous months (high variance ratios)
- At least 2 consecutive overspend months (for streak test)

## Acceptance Gate
- [ ] bash scripts/train_all_models.sh exits 0 (at minimum: data generation + NER training)
- [ ] All 7 integration tests pass on synthetic data
- [ ] No hard-coded paths — all driven by env vars or CLI args
- [ ] ml/tests/fixtures/generate_synthetic_household.py runs standalone

## Files to Produce
- scripts/train_all_models.sh
- ml/prediction/train_prediction_suite.py
- ml/tests/__init__.py
- ml/tests/fixtures/generate_synthetic_household.py
- ml/tests/test_integration.py
