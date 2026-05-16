# Phase 5 — Prophet Spending Forecaster
**Role:** senior-data-scientist (design) + senior-ml-engineer (wiring)  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 4 (Model Registry)

## CRITICAL: Seasonality Mode Correction
Use seasonality_mode="additive" NOT "multiplicative" (spec has this wrong).
Rationale: spending increases by fixed dollar amount seasonally, not proportionally.
Exception: self-employed total income modeling may use multiplicative.

## Category Tiers
| Tier | Examples | changepoint_prior_scale |
|------|----------|------------------------|
| Deterministic | Mortgage P&I, HOA | Rule only — no Prophet |
| Semi-stable | Groceries, fuel, utilities | 0.05-0.10 |
| Volatile | Dining out, pets, home repair | 0.15-0.25 |
| Seasonal spike | Christmas gifts, back-to-school | 0.30-0.50 |

## Cold-Start Degradation Ladder
| History | Strategy |
|---------|---------|
| < 3 months | Observed mean +/- 1 stddev, no model |
| 3-5 months | BLS CES TX middle-income priors (groceries $650, dining $350, fuel $280, utilities $230) |
| 6-11 months | Prophet, yearly_seasonality=False, changepoint_prior_scale=0.05 |
| >= 12 months | Prophet, yearly_seasonality=True, custom regressors |

## COMPASS Holiday Calendar (financially meaningful only)
christmas_season, back_to_school, tax_season, q1/q2/q3/q4 SE taxes, black_friday.
Do NOT use full US holiday calendar — only events that affect household spending.

## Surge Income Regressor
```python
df["surge_income_indicator"] = (side_income > side_income.quantile(0.75)).astype(float)
model.add_regressor("surge_income_indicator")
```

## Confidence Interval
interval_width=0.80 (80% CI displayed as "likely range" not "confidence interval")
If coverage < 65%: widen to 90%.

## Acceptance Criteria
| Tier | MAPE | Fallback trigger |
|------|------|-----------------|
| Semi-stable | <= 12% | > 20% -> RollingAverageFallback |
| Volatile | <= 25% | > 40% -> RollingAverageFallback |
| 80% CI coverage | >= 78% | < 65% -> widen to 90% |

## Acceptance Gate
- [ ] Returns forecast without error on 3-month input (cold-start)
- [ ] BLS prior returned for < 6 months history
- [ ] yearly_seasonality=False enforced when < 12 months
- [ ] MAPE verified on synthetic 24-month dataset
- [ ] JSON serialization roundtrip works cleanly

## Files to Produce
- ml/prediction/spending_forecast.py
