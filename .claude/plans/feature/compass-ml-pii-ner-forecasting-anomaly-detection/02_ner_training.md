# Phase 2 — DistilBERT NER: Training + Evaluation
**Role:** senior-ml-engineer  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO  
**Depends on:** Phase 1

## Objective
Fine-tune dslim/distilbert-NER on the synthetic PII corpus. Produce a model that passes all F1/recall acceptance gates and runs under 20ms CPU inference. Export to ONNX for production.

## Base Model
dslim/distilbert-NER (66M params, CoNLL-2003 NER pretrained)
NOT distilbert-base-uncased — NER-initialized head eliminates random head variance on small data.

## Critical: Token Alignment (Strategy A)
WordPiece splits "123456789" -> ["123", "##456", "##789"]. Label first subword; assign -100 to continuations (excluded from loss). This outperforms Strategy B (propagating I- to continuations) empirically.

## Training Configuration
```python
learning_rate=2e-5,            # run 3-point search: {1e-5, 2e-5, 3e-5}
per_device_train_batch_size=16,
num_train_epochs=5,
weight_decay=0.01,
warmup_ratio=0.10,
max_grad_norm=1.0,             # gradient clipping — critical for small-data stability
load_best_model_at_end=True,
metric_for_best_model="eval_f1",
fp16=True,                     # set False for Apple Silicon MPS
report_to="none",              # no external logging (privacy requirement)
# Run seeds 42, 123, 456. If std > 2 F1 pts -> minority class data is insufficient.
```

## Acceptance Gates (all must pass before Presidio integration)
| Entity | F1 Target | Recall Target |
|--------|-----------|--------------|
| Macro (all entities) | >= 0.92 | — |
| SSN | >= 0.97 | >= 0.95 |
| CARD_NUM | >= 0.95 | >= 0.93 |
| ACCT_NUM | >= 0.90 | — |
| ROUTING | >= 0.88 | — |
| PERSON_NAME | >= 0.82 | — |
| INSTITUTION | >= 0.78 | — |
| LOAN_ID | >= 0.82 | — |
| BALANCE_AMT | >= 0.85 | — |
| CPU latency | < 20ms | — |

If SSN/CARD_NUM recall < target: lower confidence threshold (false negatives = compliance failure).
Evaluation metric: seqeval span-level F1 (NOT token-level — inflated by "O" tokens).

## ONNX Export
```bash
optimum-cli export onnx --model ml/models/financial_pii_ner \
  ml/models/financial_pii_ner_onnx/ --task token-classification
```
Expected: ~40% CPU latency reduction. Verify < 20ms after export.

## Files to Produce
- ml/privacy/train_pii_ner.py (HuggingFace Trainer, full implementation)
- ml/privacy/evaluate_ner.py (seqeval metrics, per-entity report)
- ml/models/financial_pii_ner/ (populated after training run)
