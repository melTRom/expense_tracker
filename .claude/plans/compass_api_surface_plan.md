# COMPASS API Surface Plan — Full Endpoint Specification

**Source of truth**: `HFIA_Architecture_Spec.md` Pillar IX  
**Covers**: All 3 REST endpoints, request/response schemas, error handling, env vars  
**Date**: 2026-05-16

---

## Section 1 — Endpoint Overview

| Method | Path | Purpose | Streaming |
|---|---|---|---|
| `POST` | `/api/chat` | Main agent endpoint — processes message + optional XML data | Yes (SSE) |
| `POST` | `/api/data/submit` | Submit XML template A/B/C (no LLM call) | No |
| `GET` | `/api/reports/{period}` | Retrieve cached monthly summary | No |

---

## Section 2 — POST /api/chat

### Request Schema
```json
{
  "session_id": "uuid — client-generated; creates new session if not found",
  "household_id": "uuid — required; maps to DB household",
  "message": "string — user's question in natural language",
  "raw_input": "string — optional XML (Templates A/B/C) or empty string",
  "mode": "monthly_review|adhoc|scenario|credit_checkin|prediction|vent — auto-detected if omitted"
}
```

### SSE Response Events (full schema — reconciled with Pillar IX + backend plan)
```json
{"type":"status","content":"Processing…","session_id":"uuid","tools_invoked":[],"anonymization_applied":false}
{"type":"privacy_notice","content":"Using claude — PII will be anonymized","session_id":"uuid","tools_invoked":[]}
{"type":"tool_use","content":"","session_id":"uuid","tools_invoked":[],"metadata":{"tool_name":"run_budget_analysis"}}
{"type":"tool_result","content":"","session_id":"uuid","tools_invoked":[],"metadata":{"tool_name":"run_budget_analysis"}}
{"type":"summary_md","content":"# COMPASS Monthly Review…","session_id":"uuid","tools_invoked":["run_budget_analysis"],"anonymization_applied":true,"metadata":{"provider":"claude","latency_ms":2140}}
{"type":"error","content":"Ollama offline and cloud fallback disabled","session_id":"uuid","tools_invoked":[]}
```

### Implementation
```python
# backend/routers/chat.py
from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.orchestrator import Orchestrator
from backend.providers.registry import ProviderRegistry
from backend.config import get_settings
import json, uuid as _uuid

router = APIRouter()

@router.post("/api/chat")
async def chat(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.json()
    raw_input    = body.get("raw_input", "")
    user_message = body.get("message", "")
    session_id   = body.get("session_id") or str(_uuid.uuid4())
    household_id = body.get("household_id", "")
    mode         = body.get("mode", None)

    settings = get_settings()
    registry = ProviderRegistry(settings)
    orchestrator = Orchestrator(registry, db)

    async def event_stream():
        try:
            yield _sse("status", "Processing your request...", session_id=session_id)
            provider = await registry.get_provider()
            anonymization_applied = not provider.is_local
            if not provider.is_local:
                yield _sse("privacy_notice",
                           f"Using {provider.model_name()} — PII will be anonymized",
                           session_id=session_id)
            result, invoked = await orchestrator.run(
                raw_input, user_message, session_id, household_id, mode,
                sse_cb=lambda t, n: ...,   # emit tool_use/tool_result events mid-stream
            )
            yield _sse("summary_md", result,
                       session_id=session_id,
                       tools_invoked=invoked,
                       anonymization_applied=anonymization_applied,
                       metadata={"provider": provider.model_name()})
        except RuntimeError as e:
            yield _sse("error", str(e), session_id=session_id)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

def _sse(type_: str, content: str, session_id: str = "",
         tools_invoked: list | None = None,
         anonymization_applied: bool = False,
         metadata: dict | None = None) -> str:
    payload = {
        "type": type_, "content": content, "session_id": session_id,
        "tools_invoked": tools_invoked or [], "anonymization_applied": anonymization_applied,
    }
    if metadata:
        payload["metadata"] = metadata
    return f"data: {json.dumps(payload)}\n\n"
```

---

## Section 3 — POST /api/data/submit

Stores Templates A/B/C directly to PostgreSQL without invoking the LLM.
Use this for: bulk historical data load, saving data without asking a question.

### Request Schema
```json
{
  "household_id": "uuid",
  "xml_data": "<monthly_data month='2026-05'>…</monthly_data>"
}
```

### Response Schema
```json
{
  "status": "accepted",
  "periods_saved": ["2026-05-01"],
  "budget_lines_saved": 32,
  "debts_updated": true,
  "message": "Data saved. ML predictions will update on next session."
}
```

### Implementation
```python
# backend/routers/data.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.session import get_db
from backend.db.repository import SnapshotRepository, DebtRepository
from backend.db.models import BudgetLineModel
from backend.agents.ingestion_agent import IngestionAgent
from datetime import date
import uuid

router = APIRouter()

class DataSubmitRequest(BaseModel):
    household_id: uuid.UUID
    xml_data: str

@router.post("/api/data/submit")
async def submit_data(body: DataSubmitRequest, db: AsyncSession = Depends(get_db)):
    ingestion = IngestionAgent()
    household_data = ingestion.run(body.xml_data)

    if not household_data.monthly_data and household_data.balance_snapshot is None:
        raise HTTPException(400, "No recognized template found in XML")

    snap_repo = SnapshotRepository(db)
    debt_repo = DebtRepository(db)
    saved_periods, total_lines = [], 0

    for md in household_data.monthly_data:
        period = date.fromisoformat(md.period + "-01")
        snap = await snap_repo.upsert_snapshot(
            household_id=body.household_id, period=period,
            raw_xml=body.xml_data,
            anonymized={"income": md.income, "variable_expenses": md.variable_expenses},
        )
        for subcat, amount in md.income.items():
            db.add(BudgetLineModel(snapshot_id=snap.id, category="income", subcategory=subcat, budgeted=amount, actual=amount))
        for subcat, amount in md.variable_expenses.items():
            db.add(BudgetLineModel(snapshot_id=snap.id, category="variable", subcategory=subcat, budgeted=amount, actual=amount))
        saved_periods.append(period.isoformat())
        total_lines += len(md.income) + len(md.variable_expenses)

    debts_updated = False
    if household_data.balance_snapshot:
        await debt_repo.update_debts(body.household_id, household_data.balance_snapshot.debts)
        debts_updated = True

    await db.commit()
    return {"status": "accepted", "periods_saved": saved_periods,
            "budget_lines_saved": total_lines, "debts_updated": debts_updated,
            "message": "Data saved. ML predictions will update on next session."}
```

---

## Section 4 — GET /api/reports/{period}

Returns a cached monthly summary if one was generated for the given period.

### URL
```
GET /api/reports/2026-05?household_id=00000000-0000-0000-0000-000000000001
```

### Response Schema
```json
{
  "found": true,
  "period": "2026-05",
  "household_id": "uuid",
  "summary_md": "# COMPASS Monthly Review — May 2026\n…",
  "tools_invoked": ["run_budget_analysis", "run_debt_avalanche"],
  "provider": "ollama",
  "generated_at": "2026-05-16T03:00:00Z"
}
```

If not found: `{"found": false, "period": "2026-05"}`

### Implementation
```python
# backend/routers/reports.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db.session import get_db
from backend.db.models import AgentSessionModel
import uuid

router = APIRouter()

@router.get("/api/reports/{period}")
async def get_report(
    period: str,
    household_id: uuid.UUID = Query(...),
    db: AsyncSession = Depends(get_db),
):
    stmt = (select(AgentSessionModel)
            .where(AgentSessionModel.household_id == household_id,
                   AgentSessionModel.mode == "monthly_review")
            .order_by(AgentSessionModel.started_at.desc())
            .limit(10))
    result = await db.execute(stmt)
    for session in result.scalars().all():
        for msg in (session.messages or []):
            if isinstance(msg, dict) and msg.get("role") == "assistant" and period in msg.get("content", ""):
                return {
                    "found": True, "period": period,
                    "household_id": str(household_id),
                    "summary_md": msg["content"],
                    "tools_invoked": msg.get("tools_invoked", []),
                    "provider": msg.get("provider", "unknown"),
                    "generated_at": session.started_at.isoformat(),
                }
    return {"found": False, "period": period}
```

---

## Section 5 — FastAPI App Factory

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import chat, data, reports

def create_app() -> FastAPI:
    app = FastAPI(title="COMPASS API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],  # Vite dev server
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(chat.router)
    app.include_router(data.router)
    app.include_router(reports.router)
    return app

app = create_app()
# uvicorn backend.main:app --reload --port 8000
```

---

## Section 6 — Complete Environment Variables

```bash
# .env.example
# LLM Providers
PREFERRED_PROVIDER=ollama
CLOUD_ALLOWS_FALLBACK=false
CLOUD_REQUIRES_PII_SCRUB=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Infrastructure
DATABASE_URL=postgresql+asyncpg://compass:compass@localhost:5432/compass
REDIS_URL=redis://localhost:6379
LOG_LEVEL=INFO

# Privacy
PII_TOKEN_TTL_SECONDS=3600
PRIVACY_MODEL_PATH=./ml/models/financial_pii_ner
PRESIDIO_SCORE_THRESHOLD=0.7

# Financial constants
SE_TAX_RESERVE_PCT=0.27
EF_ALERT_THRESHOLD=0.60
```

---

## Section 7 — Error Convention

```python
# All non-SSE errors return JSON:
# {"error": "HOUSEHOLD_NOT_FOUND", "message": "Household ID not found", "status": 404}

# SSE errors always emitted as:
# {"type": "error", "content": "human-readable message", "session_id": "..."}

ERROR_MAP = {
    "NO_PROVIDER":          (503, "No LLM provider available"),
    "OLLAMA_OFFLINE":       (503, "Ollama offline and cloud fallback disabled"),
    "INVALID_XML":          (400, "XML data could not be parsed"),
    "HOUSEHOLD_NOT_FOUND":  (404, "Household ID not found"),
    "PERIOD_FORMAT":        (400, "Period must be YYYY-MM"),
}
```

---

## Section 8 — Implementation Sequence

| Step | Task |
|---|---|
| 6.1 | `backend/main.py` — app factory + CORS |
| 6.2 | `backend/routers/chat.py` — SSE endpoint |
| 6.3 | `backend/routers/data.py` — submit endpoint |
| 6.4 | `backend/routers/reports.py` — reports endpoint |
| 6.5 | Wire `Depends(get_db)` into all routers |
| 6.6 | Integration test: `POST /api/data/submit` with Template A XML |
| 6.7 | Integration test: `POST /api/chat` with Ollama running |
| 6.8 | Integration test: `GET /api/reports/2026-05` returns cache hit |

---

*API Surface plan v1.0 — COMPASS | 2026-05-16*
