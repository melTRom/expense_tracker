# Phase 7 — LightGBM Overspend Classifier
**Role:** senior-ml-engineer  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 4 (Model Registry)

## CRITICAL: Baseline-First Rollout
Do NOT deploy LightGBM until 18-24 months of data exist.

| Data available | Active model | Upgrade condition |
|----------------|-------------|-------------------|
| < 12 months | Rule: overspend streak >= 2 -> alert | — |
| 12-17 months | Logistic Regression (L2, C=0.1) | — |
| >= 18 months | Compare LR vs LightGBM LOOCV AUC | Promote if AUC > LR + 0.03 |
| >= 24 months | LightGBM primary | Quarterly retraining |

## Pooled Model (all categories in one model)
12 months x 30 categories = 360 rows (10x more data than per-category).
Target: did_overspend_next_month (shift(-1) on overspent column).

## Key Features
- rolling_mean_3m, rolling_std_3m
- variance_ratio = actual/budgeted
- budget_realism = budgeted/rolling_6m_median
- month_sin, month_cos (CYCLIC — not raw integer; LightGBM cannot learn Dec->Jan continuity)
- is_q4, is_back_to_school, is_tax_month
- overspend_streak (resets to 0 when under budget)
- months_since_overspend
- category_encoded

## CRITICAL: Temporal LOOCV
Standard sklearn CV shuffles = data leakage for time series.
Walk-forward: train on rows[:i], test on rows[i], for i in range(min_train, len(X)).

## LightGBM Config (small-data anti-overfit)
num_leaves=6 (not default 31), max_depth=3, min_child_samples=5 (not default 20),
n_estimators=50, reg_alpha=1.0, reg_lambda=5.0 (strong L2 for small n).

## Probability Calibration
Apply CalibratedClassifierCV(method="isotonic") before deployment.
Thresholds: > 0.60 = medium risk (yellow); > 0.75 = high risk (red).

## Acceptance Gate
- [ ] Logistic regression baseline implemented and AUC reported
- [ ] Temporal LOOCV runs without data leakage
- [ ] Calibration applied; thresholds produce correct label mapping
- [ ] Auto-promotion: LightGBM promoted when LOOCV AUC > LR + 0.03
- [ ] LOOCV AUC >= 0.70 on synthetic 18-month dataset

## Files to Produce
- ml/prediction/overspend_classifier.py
