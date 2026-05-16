# Phase 6 — Isolation Forest Anomaly Detector
**Role:** senior-data-scientist (feature design) + senior-ml-engineer (implementation)  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 4 (Model Registry)

## CRITICAL: Feature Matrix
Use variance ratios (actual/budgeted), NOT raw dollar amounts.
Rationale: mortgage ($1,800/mo) must not dominate streaming ($50/mo).
Ratio 1.0 = on-budget; > 1.0 = overspend; < 1.0 = underspend.

## Preprocessing
```python
X_log = np.log1p(X_raw)        # compress heavy tail; log1p(0) = 0
scaler = RobustScaler()        # median/IQR — robust to outliers we're detecting
X_scaled = scaler.fit_transform(X_log)
# Do NOT use StandardScaler (mean/std pulled by the outliers being detected)
# Do NOT use MinMaxScaler (new data outside training range gets clipped)
```

## Adaptive Contamination
| n_months | contamination | Rationale |
|----------|--------------|-----------|
| <= 12 | 0.05 | Conservative cold-start — false positives erode trust |
| 13-24 | 0.08 | |
| > 24 | 0.10 | Spec's default (1-2 anomalous months/year expected) |

## IsolationForest Config
n_estimators=150, max_features=1.0 (all features — subsampling hurts at small n),
bootstrap=False (without replacement — more stable for small n), random_state=42

## Anomaly Explanation (two layers)
User-facing: percentile rank ("Dining was at its 95th percentile this month")
Internal validation: SHAP TreeExplainer (confirms top-2 categories match percentile ranking)
Agreement check: >= 70% same top-2 categories across both methods.

## Why Not LocalOutlierFactor
LOF is transductive — cannot score new months without full refit.
Isolation Forest supports online updates (retrain monthly on all data).

## Acceptance Gate
- [ ] Trains on synthetic 6-month household data without error
- [ ] detect() returns schema {month: str, is_anomaly: bool, top_contributors: list[dict]}
- [ ] >= 1 anomaly flagged per 12 months (model is alive sanity check)
- [ ] SHAP/percentile agreement >= 70% on test dataset
- [ ] contamination=0.05 used when n_months <= 12

## Files to Produce
- ml/prediction/anomaly_detector.py
