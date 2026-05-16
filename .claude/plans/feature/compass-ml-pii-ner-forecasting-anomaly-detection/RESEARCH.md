# Research Open Questions
**Role:** autoresearch-agent  
**Branch:** feature/compass-ml-pii-ner-forecasting-anomaly-detection  
**Status:** TODO (runs in parallel with Phase 0-1)

## Q1: CFPB Complaint Data Legal Clearance
Can we use CFPB consumer complaint database text for corpus Layer 2?
Fallback if blocked: expand Layer 1 from 3,500 to 4,500 Faker-generated sentences.

## Q2: Presidio EntityRecognizer API (presidio-analyzer>=2.2.35)
Confirm: EntityRecognizer constructor params, NlpArtifacts type signature, aggregation_strategy="simple" for span merging. Any breaking changes since 2.2.0?

## Q3: dslim/distilbert-NER License
Confirm commercial/private use allowed. DistilBERT base is Apache 2.0. Is the NER fine-tune also Apache 2.0? Attribution requirements?

## Q4: Prophet JSON Serialization Stability
Confirm model_to_json / model_from_json is stable across Prophet versions. Why NOT pickle (unstable across versions). Any pinning needed?

## Q5: GPU Access
Confirm available hardware for fine-tuning (MacBook M2 MPS vs Colab T4 vs A100).

## Q6: HOUSEHOLD_MEMBER_ALIAS Label Decision
Add as separate label (19th/20th) or subsume into PERSON_NAME?
Recommendation: add separately if corpus can generate >= 400 spans.

## Output Format
For each question:
- Finding: what was found
- Decision: proceed / block / modify
- Impact: changes to implementation plan if any

Update status in this file after research is complete.
