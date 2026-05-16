# Phase 4 — Model Registry
**Role:** senior-ml-engineer  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 0

## Objective
Implement the ModelRegistry glue layer. Required by Prophet, LightGBM, and Isolation Forest before any prediction model can run in production.

## ModelRecord
```python
@dataclass
class ModelRecord:
    household_id: str
    model_type: str   # "prophet_{category}", "lgbm_overspend", "isolation_forest"
    version: int      # unix timestamp
    metrics: dict     # {"auc": 0.75} or {"mape": 0.12, "coverage": 0.82}
    trained_at: str   # ISO 8601 e.g. "2026-05-16T03:25:00"
    n_samples: int
    active: bool = True
```

## Core API
- get_active(household_id, model_type) -> model dict or None
- promote(model, household_id, model_type, metrics, n_samples) -> bool
- get_fallback(model_type) -> OverspendStreakFallback | RollingAverageFallback | PercentileAnomalyFallback
- _is_improvement: auc-based -> new > old+0.01; mape-based -> new < old-0.01

## Three Fallback Classes (all must be implemented)
- OverspendStreakFallback: flag if >= 2 consecutive overspend months
- RollingAverageFallback: 3-month rolling mean as Prophet substitute
- PercentileAnomalyFallback: flag if any category > 95th percentile of own history

## Persistence
- All models: joblib dump to ml/models/prediction_cache/{household_id}_{model_type}_active.joblib
- Prophet models specifically: prophet.serialize.model_to_json (NOT pickle — unstable across Prophet versions)

## Acceptance Gate
- [ ] get_active() returns None when no model saved
- [ ] promote() saves model; get_active() returns it on next call
- [ ] promote() returns False when metrics do not improve over current
- [ ] get_fallback() returns correct type for all three model_type families
- [ ] All three fallbacks run without error on synthetic data
- [ ] Unit tests pass: ml/prediction/test_model_registry.py

## Files to Produce
- ml/prediction/model_registry.py
- ml/prediction/test_model_registry.py
