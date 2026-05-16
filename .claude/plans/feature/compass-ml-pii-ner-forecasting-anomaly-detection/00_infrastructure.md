# Phase 0 — ML Infrastructure Setup
**Role:** senior-ml-engineer  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO

## Objective
Scaffold the complete ML directory structure, requirements file, and __init__ modules so all subsequent phases have a home. No training happens here — just the skeleton every other phase writes into.

## Deliverables

### Directory Structure
```
expense_tracker/
├── backend/
│   ├── __init__.py
│   └── privacy/
│       ├── __init__.py
│       └── custom_recognizers.py       # Phase 3
├── ml/
│   ├── __init__.py
│   ├── data/
│   │   └── pii_ner/                    # gitignored — generated data
│   ├── models/
│   │   ├── financial_pii_ner/          # gitignored — fine-tuned weights
│   │   └── prediction_cache/           # gitignored — prophet JSON + joblib
│   ├── privacy/
│   │   ├── __init__.py
│   │   ├── generate_training_data.py  # Phase 1
│   │   ├── train_pii_ner.py           # Phase 2
│   │   └── evaluate_ner.py            # Phase 2
│   └── prediction/
│       ├── __init__.py
│       ├── model_registry.py          # Phase 4
│       ├── spending_forecast.py       # Phase 5
│       ├── anomaly_detector.py        # Phase 6
│       └── overspend_classifier.py    # Phase 7
└── scripts/
    └── train_all_models.sh            # Phase 8
```

### Files to Create
- `requirements.txt` — ML dependencies pinned (see compass_ml_plan.md section 7)
- `.gitignore` entries for `ml/data/`, `ml/models/`
- All `__init__.py` with module docstrings

## Acceptance Gate
- [ ] All directories exist
- [ ] `python -c "import ml; import backend"` succeeds (from project root with PYTHONPATH set)
- [ ] `pip install -r requirements.txt --dry-run` exits 0

## Key Requirements (from plan section 7)
```
transformers>=4.40.0
torch>=2.2.0
datasets>=2.18.0
seqeval>=1.2.2
evaluate>=0.4.1
optimum[onnxruntime]>=1.18.0
prophet>=1.1.5
lightgbm>=4.3.0
scikit-learn>=1.4.0
shap>=0.45.0
presidio-analyzer>=2.2.35
presidio-anonymizer>=2.2.35
faker>=24.0.0
joblib>=1.3.0
pandas>=2.2.0
numpy>=1.26.0
```
