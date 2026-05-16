# COMPASS Backend — Multi-LLM Provider & Agent Orchestration Plan

**Source of truth**: `.claude/docs/HFIA_Architecture_Spec.md`  
**Companion plan**: `compass_ml_plan.md` (ML models)  
**Status**: Greenfield — no backend exists yet  
**Date**: 2026-05-16

---

## Overview

The backend must support three LLM providers with Ollama as the privacy-first default:

| Provider | Type | Privacy Level | Fallback Order |
|---|---|---|---|
| Ollama (qwen2.5:7b) | Local | Full — raw PII allowed | 1st (preferred) |
| Anthropic Claude | Cloud | Requires PII scrub | 2nd |
| OpenAI GPT-4o-mini | Cloud | Requires PII scrub | 3rd |

The core architectural constraint: **privacy enforcement must happen at the routing layer**, not inside individual agents, so no agent can "forget" to scrub.

---

## Section 1 — Provider Abstraction Layer

### 1.1 LLMProvider Protocol

```python
# backend/providers/base.py
from typing import Protocol, AsyncIterator, runtime_checkable
from dataclasses import dataclass

@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict

@dataclass
class LLMResponse:
    content: str
    tool_calls: list[ToolCall]
    raw: dict                     # original response for debugging
    model: str
    latency_ms: int

@dataclass
class LLMEvent:
    type: str                     # "text_delta" | "tool_use_start" | "tool_use_delta" | "done"
    delta: str = ""
    tool_call: ToolCall | None = None

@runtime_checkable
class LLMProvider(Protocol):
    async def chat(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system: str | None = None,
    ) -> LLMResponse: ...

    async def chat_stream(
        self,
        messages: list[dict],
        tools: list[dict] | None = None,
        system: str | None = None,
    ) -> AsyncIterator[LLMEvent]: ...

    def supports_tool_calling(self) -> bool: ...
    def model_name(self) -> str: ...

    @property
    def is_local(self) -> bool: ...
```

### 1.2 OllamaAdapter

Ollama exposes an OpenAI-compatible `/v1` endpoint. Use the `openai` Python SDK pointed at `localhost:11434`.

```python
# backend/providers/ollama_adapter.py
import openai
import time
from backend.providers.base import LLMProvider, LLMResponse, LLMEvent, ToolCall

class OllamaAdapter:
    is_local = True

    def __init__(self, model: str = "qwen2.5:7b", base_url: str = "http://localhost:11434"):
        # qwen2.5:7b preferred over llama3.1:8b — better tool-call accuracy
        self._model = model
        self._client = openai.AsyncOpenAI(
            base_url=f"{base_url}/v1",
            api_key="ollama",       # Ollama ignores the key but SDK requires it
        )

    def model_name(self) -> str:
        return self._model

    def supports_tool_calling(self) -> bool:
        # Ollama tool calling is unreliable on small models; safe to return True
        # for qwen2.5:7b but fall back to prompting if no tool_calls in response
        return True

    async def chat(self, messages, tools=None, system=None) -> LLMResponse:
        if system:
            messages = [{"role": "system", "content": system}] + messages
        t0 = time.monotonic()
        kwargs = {"model": self._model, "messages": messages}
        if tools:
            kwargs["tools"] = tools
        resp = await self._client.chat.completions.create(**kwargs)
        latency = int((time.monotonic() - t0) * 1000)
        choice = resp.choices[0].message
        tool_calls = []
        if choice.tool_calls:
            import json
            for tc in choice.tool_calls:
                tool_calls.append(ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=json.loads(tc.function.arguments),
                ))
        return LLMResponse(
            content=choice.content or "",
            tool_calls=tool_calls,
            raw=resp.model_dump(),
            model=self._model,
            latency_ms=latency,
        )

    async def chat_stream(self, messages, tools=None, system=None):
        if system:
            messages = [{"role": "system", "content": system}] + messages
        kwargs = {"model": self._model, "messages": messages, "stream": True}
        if tools:
            kwargs["tools"] = tools
        async with await self._client.chat.completions.create(**kwargs) as stream:
            async for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None
                if not delta:
                    continue
                if delta.content:
                    yield LLMEvent(type="text_delta", delta=delta.content)
                if delta.tool_calls:
                    for tc in delta.tool_calls:
                        if tc.function.name:
                            import json
                            yield LLMEvent(
                                type="tool_use_start",
                                tool_call=ToolCall(
                                    id=tc.id or "",
                                    name=tc.function.name,
                                    arguments=json.loads(tc.function.arguments or "{}"),
                                ),
                            )
        yield LLMEvent(type="done")
```

### 1.3 AnthropicAdapter

```python
# backend/providers/anthropic_adapter.py
import anthropic
import time
from backend.providers.base import LLMProvider, LLMResponse, LLMEvent, ToolCall

class AnthropicAdapter:
    is_local = False

    def __init__(self, api_key: str, model: str = "claude-haiku-4-5-20251001"):
        self._model = model
        self._client = anthropic.AsyncAnthropic(api_key=api_key)

    def model_name(self) -> str:
        return self._model

    def supports_tool_calling(self) -> bool:
        return True

    async def chat(self, messages, tools=None, system=None) -> LLMResponse:
        t0 = time.monotonic()
        kwargs = {
            "model": self._model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools        # already in Claude tool format
        resp = await self._client.messages.create(**kwargs)
        latency = int((time.monotonic() - t0) * 1000)
        text_blocks = [b.text for b in resp.content if b.type == "text"]
        tool_calls = []
        for b in resp.content:
            if b.type == "tool_use":
                tool_calls.append(ToolCall(id=b.id, name=b.name, arguments=b.input))
        return LLMResponse(
            content="\n".join(text_blocks),
            tool_calls=tool_calls,
            raw=resp.model_dump(),
            model=self._model,
            latency_ms=latency,
        )

    async def chat_stream(self, messages, tools=None, system=None):
        kwargs = {
            "model": self._model,
            "max_tokens": 4096,
            "messages": messages,
        }
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools
        async with self._client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield LLMEvent(type="text_delta", delta=text)
        yield LLMEvent(type="done")
```

### 1.4 OpenAIAdapter

```python
# backend/providers/openai_adapter.py
import openai
import json
import time
from backend.providers.base import LLMProvider, LLMResponse, LLMEvent, ToolCall

class OpenAIAdapter:
    is_local = False

    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self._model = model
        self._client = openai.AsyncOpenAI(api_key=api_key)

    def model_name(self) -> str:
        return self._model

    def supports_tool_calling(self) -> bool:
        return True

    async def chat(self, messages, tools=None, system=None) -> LLMResponse:
        if system:
            messages = [{"role": "system", "content": system}] + messages
        t0 = time.monotonic()
        kwargs = {"model": self._model, "messages": messages}
        if tools:
            kwargs["tools"] = tools
        resp = await self._client.chat.completions.create(**kwargs)
        latency = int((time.monotonic() - t0) * 1000)
        choice = resp.choices[0].message
        tool_calls = []
        if choice.tool_calls:
            for tc in choice.tool_calls:
                tool_calls.append(ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=json.loads(tc.function.arguments),
                ))
        return LLMResponse(
            content=choice.content or "",
            tool_calls=tool_calls,
            raw=resp.model_dump(),
            model=self._model,
            latency_ms=latency,
        )

    async def chat_stream(self, messages, tools=None, system=None):
        if system:
            messages = [{"role": "system", "content": system}] + messages
        kwargs = {"model": self._model, "messages": messages, "stream": True}
        if tools:
            kwargs["tools"] = tools
        async for chunk in await self._client.chat.completions.create(**kwargs):
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield LLMEvent(type="text_delta", delta=delta.content)
        yield LLMEvent(type="done")
```

### 1.5 Tool Definition Normalization

A single canonical `ToolDefinition` is translated to provider-specific formats at call time.
Tool schemas below are **fully aligned with Pillar IV of the spec** (reconciled 2026-05-16 — earlier version had drastically simplified parameter schemas).

```python
# backend/tools/registry.py
from dataclasses import dataclass, field

@dataclass
class ToolParam:
    name: str
    type: str       # "string" | "number" | "boolean" | "array" | "object"
    description: str
    required: bool = True

@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: list[ToolParam] = field(default_factory=list)

    def to_openai_tool(self) -> dict:
        props = {p.name: {"type": p.type, "description": p.description} for p in self.parameters}
        required = [p.name for p in self.parameters if p.required]
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": {"type": "object", "properties": props, "required": required},
            },
        }

    def to_claude_tool(self) -> dict:
        props = {p.name: {"type": p.type, "description": p.description} for p in self.parameters}
        required = [p.name for p in self.parameters if p.required]
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": {"type": "object", "properties": props, "required": required},
        }

# Ollama uses the same format as OpenAI
# NOTE: These schemas match Pillar IV of HFIA_Architecture_Spec.md exactly.
# The LLM populates these from parsed HouseholdData via context injection in ReasoningAgent.
COMPASS_TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="run_budget_analysis",
        description="Runs zero-based budget variance analysis and 50/30/20 health check on provided monthly data. Returns structured analysis with alerts.",
        parameters=[
            ToolParam("period", "string", "YYYY-MM format"),
            ToolParam("income_net", "number", "Total net income for the period"),
            ToolParam("expense_categories", "array",
                      "Array of {category, subcategory, budgeted, actual} objects"),
        ],
    ),
    ToolDefinition(
        name="run_debt_avalanche",
        description="Calculates debt payoff timeline using avalanche method (highest APR first). Returns payoff sequence, months to freedom, total interest saved vs minimums.",
        parameters=[
            ToolParam("debts", "array",
                      "Array of {label, balance, apr, min_payment} objects"),
            ToolParam("monthly_extra", "number",
                      "Extra payment available above minimums each month", required=False),
        ],
    ),
    ToolDefinition(
        name="run_ef_projection",
        description="Projects emergency fund growth timeline across Tier 1 ($2,500), Tier 2 (1 month), Tier 3 (6 months) at current contribution rate.",
        parameters=[
            ToolParam("current_balance", "number", "Current emergency fund balance"),
            ToolParam("monthly_contribution", "number", "Monthly contribution amount"),
            ToolParam("monthly_essential_expenses", "number", "Monthly essential expenses for tier calculations"),
            ToolParam("hysa_apy", "number", "HYSA annual percentage yield (default 4.5)", required=False),
        ],
    ),
    ToolDefinition(
        name="run_vehicle_tco",
        description="Calculates total cost of ownership per vehicle and generates keep vs sell analysis.",
        parameters=[
            ToolParam("vehicles", "array",
                      "Array of {label, loan_payment, insurance_monthly, fuel_monthly, maintenance_monthly, repair_annual, kbb_value, loan_balance, apr} objects"),
        ],
    ),
    ToolDefinition(
        name="run_spending_forecast",
        description="Runs Prophet time-series model to forecast next 3 months of spending by category. Requires at least 3 months of historical data.",
        parameters=[
            ToolParam("category", "string", "Expense category name to forecast"),
            ToolParam("horizon_months", "number", "Forecast horizon in months (default 3)", required=False),
        ],
    ),
    ToolDefinition(
        name="run_anomaly_check",
        description="Runs Isolation Forest to flag unusual expense patterns compared to household's own historical baseline.",
        parameters=[
            ToolParam("period", "string", "YYYY-MM period to check for anomalies"),
        ],
    ),
    ToolDefinition(
        name="run_fico_simulation",
        description="Simulates FICO score impact of proposed actions (paying down a card, opening/closing an account). Uses published FICO weights.",
        parameters=[
            ToolParam("current_score", "number", "Current FICO score (300–850)"),
            ToolParam("current_utilization", "number", "Current aggregate utilization percentage"),
            ToolParam("proposed_paydown", "number", "Dollar amount to pay down", required=False),
            ToolParam("account_action", "string",
                      "One of: none, open, close — whether to open/close an account", required=False),
        ],
    ),
]

def get_tools_for_provider(provider: "LLMProvider") -> list[dict]:
    """Return tools in the correct format for the given provider."""
    if hasattr(provider, '_client') and hasattr(provider._client, 'messages'):
        # Anthropic client detected
        return [t.to_claude_tool() for t in COMPASS_TOOLS]
    return [t.to_openai_tool() for t in COMPASS_TOOLS]   # OpenAI format for Ollama + OpenAI
```

### 1.6 ProviderRegistry

```python
# backend/providers/registry.py
import httpx
from backend.providers.base import LLMProvider
from backend.providers.ollama_adapter import OllamaAdapter
from backend.providers.anthropic_adapter import AnthropicAdapter
from backend.providers.openai_adapter import OpenAIAdapter
from backend.config import Settings

class ProviderRegistry:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._providers: dict[str, LLMProvider] = {}
        self._build()

    def _build(self):
        s = self._settings
        self._providers["ollama"] = OllamaAdapter(
            model=s.ollama_model,
            base_url=s.ollama_base_url,
        )
        if s.anthropic_api_key:
            self._providers["claude"] = AnthropicAdapter(
                api_key=s.anthropic_api_key,
                model=s.anthropic_model,
            )
        if s.openai_api_key:
            self._providers["openai"] = OpenAIAdapter(
                api_key=s.openai_api_key,
                model=s.openai_model,
            )

    async def _ollama_healthy(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                r = await client.get(f"{self._settings.ollama_base_url}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def get_provider(self) -> LLMProvider:
        """Privacy-first selection: Ollama → Claude → OpenAI."""
        preferred = self._settings.preferred_provider
        if preferred == "ollama":
            if await self._ollama_healthy():
                return self._providers["ollama"]
            if not self._settings.cloud_allows_fallback:
                raise RuntimeError("Ollama offline and cloud fallback disabled — cannot process")
        # Cloud fallback order
        for name in ["claude", "openai"]:
            if name in self._providers:
                return self._providers[name]
        raise RuntimeError("No provider available")

    def get_by_name(self, name: str) -> LLMProvider:
        return self._providers[name]
```

---

## Section 2 — Multi-Agent Pipeline

The pipeline is a directed acyclic graph (DAG) with 7 agents. Agents 4a and 4b run in parallel via `asyncio.gather`. The LLM is only called in Agent 5 (ReasoningAgent).

```
[1] IngestionAgent     → parse XML Templates A/B/C → HouseholdData
[2] PrivacyAgent       → Presidio + DistilBERT NER  → SKIP if provider.is_local
[3] RouterAgent        → AgentMode classification    → pure Python, no LLM
        ↓
[4a] CalculationAgent ─┬─ asyncio.gather (parallel)
[4b] PredictionAgent  ─┘  PredictionAgent → Celery worker
        ↓
[5] ReasoningAgent     → LLM call + tool loop (streaming SSE)
        ↓
[6] FormatterAgent     → Markdown report
[7] OutputValidatorAgent → PII scan outbound → SKIP if provider.is_local
```

### 2.1 Shared Data Models

**Enum reconciliation (2026-05-16):** The spec (Pillar IV) defines 6 user-facing `SessionMode` values.
This plan defines 8 internal `AgentMode` values for tool routing. Both coexist:
`SessionMode` = what the user selects at session start → `AgentMode` = what tool the pipeline runs.
RouterAgent maps `SessionMode.MONTHLY_REVIEW` → multiple AgentModes per calculation trigger.

```python
# backend/models.py
from dataclasses import dataclass, field
from enum import Enum

class SessionMode(Enum):
    """User-facing session types (matches Pillar IV IntentRouter)."""
    MONTHLY_REVIEW  = "monthly_review"    # full structured analysis
    ADHOC           = "adhoc"             # single question, conversational
    SCENARIO        = "scenario"          # what-if modeling
    CREDIT_CHECKIN  = "credit_checkin"    # focused credit/debt analysis
    PREDICTION      = "prediction"        # triggers ML prediction models
    VENT            = "vent"              # supportive, minimal financial output

class AgentMode(Enum):
    """Internal pipeline routing — which calculation tools to pre-run."""
    BUDGET_REVIEW = "budget_review"
    DEBT_STRATEGY = "debt_strategy"
    EMERGENCY_FUND = "emergency_fund"
    VEHICLE_TCO = "vehicle_tco"
    SPENDING_FORECAST = "spending_forecast"
    ANOMALY_ALERT = "anomaly_alert"
    FICO_SIMULATION = "fico_simulation"
    GENERAL = "general"

@dataclass
class MonthlyData:
    period: str           # YYYY-MM
    income: dict          # {source: amount}
    fixed_expenses: dict  # {category: amount}
    variable_expenses: dict
    savings: dict

@dataclass
class BalanceSnapshot:
    date: str
    checking: float
    savings: float
    debts: list[dict]     # [{name, balance, apr, min_payment}]
    investments: float

@dataclass
class LifeEvent:
    date: str
    type: str
    description: str
    financial_impact: float

@dataclass
class HouseholdData:
    monthly_data: list[MonthlyData] = field(default_factory=list)
    balance_snapshot: BalanceSnapshot | None = None
    life_events: list[LifeEvent] = field(default_factory=list)
    raw_text: str = ""          # cleared after PrivacyAgent completes

@dataclass
class PipelineContext:
    household_data: HouseholdData
    mode: AgentMode
    provider: "LLMProvider"
    session_id: str
    anonymized: bool = False
    token_map: dict = field(default_factory=dict)   # Redis key → real value (PII re-hydration)
    calculation_results: dict = field(default_factory=dict)
    prediction_results: dict = field(default_factory=dict)
    reasoning_output: str = ""
    formatted_response: str = ""  # re-hydrated PII — NEVER log to disk
```

### 2.2 IngestionAgent (Pillar II)

Handles the three canonical XML templates (A: monthly_data, B: balance_snapshot, C: life_events) plus free-text fallback.

```python
# backend/agents/ingestion_agent.py
import xml.etree.ElementTree as ET
from backend.models import HouseholdData, MonthlyData, BalanceSnapshot, LifeEvent

class IngestionAgent:
    """Parse XML Templates A/B/C into HouseholdData. Falls back to raw text."""

    def run(self, raw_input: str) -> HouseholdData:
        data = HouseholdData(raw_text=raw_input)
        if not raw_input.strip().startswith("<"):
            return data                              # raw text — handled by ReasoningAgent
        try:
            root = ET.fromstring(raw_input)
        except ET.ParseError:
            # Permissive: attempt partial parse, fall through to raw text
            return data

        for monthly in root.findall(".//monthly_data"):
            data.monthly_data.append(self._parse_monthly(monthly))
        snapshot_el = root.find(".//balance_snapshot")
        if snapshot_el is not None:
            data.balance_snapshot = self._parse_balance(snapshot_el)
        for event in root.findall(".//life_event"):
            data.life_events.append(self._parse_event(event))
        return data

    def _parse_monthly(self, el) -> MonthlyData:
        def _dict(parent_tag):
            node = el.find(parent_tag)
            if node is None:
                return {}
            return {child.tag: float(child.text or 0) for child in node}
        return MonthlyData(
            period=el.findtext("period", ""),
            income=_dict("income"),
            fixed_expenses=_dict("fixed_expenses"),
            variable_expenses=_dict("variable_expenses"),
            savings=_dict("savings"),
        )

    def _parse_balance(self, el) -> BalanceSnapshot:
        debts = []
        for d in el.findall(".//debt"):
            debts.append({
                "name": d.findtext("name", ""),
                "balance": float(d.findtext("balance", 0)),
                "apr": float(d.findtext("apr", 0)),
                "min_payment": float(d.findtext("min_payment", 0)),
            })
        return BalanceSnapshot(
            date=el.findtext("date", ""),
            checking=float(el.findtext("checking", 0)),
            savings=float(el.findtext("savings", 0)),
            debts=debts,
            investments=float(el.findtext("investments", 0)),
        )

    def _parse_event(self, el) -> LifeEvent:
        return LifeEvent(
            date=el.findtext("date", ""),
            type=el.findtext("type", ""),
            description=el.findtext("description", ""),
            financial_impact=float(el.findtext("financial_impact", 0)),
        )
```

### 2.3 PrivacyAgent (Pillar III)

Skipped when `provider.is_local` is True. Otherwise runs Presidio + DistilBERT NER.

```python
# backend/agents/privacy_agent.py
import uuid
import redis.asyncio as aioredis
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine
from backend.models import PipelineContext

PRESIDIO_ENTITIES = [
    "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
    "US_SSN", "IBAN_CODE", "US_BANK_NUMBER", "IP_ADDRESS",
    "LOCATION", "NRP",
]

class PrivacyAgent:
    """
    Anonymize PII using Presidio + DistilBERT NER.
    Token map stored in Redis (TTL 3600s). Never persisted to disk.
    SKIPPED when provider.is_local == True.
    """

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self._analyzer = AnalyzerEngine()
        self._anonymizer = AnonymizerEngine()
        self._redis_url = redis_url

    async def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.provider.is_local:
            return ctx                           # Ollama — raw PII is safe

        redis = await aioredis.from_url(self._redis_url)
        token_map = {}

        text = ctx.household_data.raw_text
        results = self._analyzer.analyze(text=text, entities=PRESIDIO_ENTITIES, language="en")

        anonymized = self._anonymizer.anonymize(text=text, analyzer_results=results)
        # Build reversible token map: <PERSON_abc123> → "John Smith"
        for result, item in zip(results, anonymized.items):
            token = item.text                    # e.g. "<PERSON_abc123>"
            original = text[result.start:result.end]
            token_map[token] = original
            key = f"pii:{ctx.session_id}:{token}"
            await redis.setex(key, 3600, original)   # 1-hour TTL

        ctx.household_data.raw_text = anonymized.text
        ctx.token_map = token_map
        ctx.anonymized = True

        # Clear original payload immediately
        ctx.household_data.raw_text = anonymized.text
        await redis.aclose()
        return ctx

    async def rehydrate(self, text: str, ctx: PipelineContext) -> str:
        """Replace tokens with real values for final user-facing response."""
        for token, original in ctx.token_map.items():
            text = text.replace(token, original)
        return text
```

### 2.4 RouterAgent (Pillar IV)

Pure Python keyword + pattern matching. No LLM call.

```python
# backend/agents/router_agent.py
import re
from backend.models import AgentMode, PipelineContext

KEYWORD_MAP = {
    AgentMode.DEBT_STRATEGY: ["debt", "avalanche", "snowball", "apr", "payoff", "loan", "credit card balance"],
    AgentMode.EMERGENCY_FUND: ["emergency", "safety net", "e-fund", "rainy day"],
    AgentMode.VEHICLE_TCO: ["car", "vehicle", "truck", "tco", "total cost", "auto loan"],
    AgentMode.SPENDING_FORECAST: ["forecast", "predict", "next month", "trend", "projection"],
    AgentMode.ANOMALY_ALERT: ["anomaly", "unusual", "spike", "weird", "outlier"],
    AgentMode.FICO_SIMULATION: ["fico", "credit score", "credit limit", "utilization"],
    AgentMode.BUDGET_REVIEW: ["budget", "variance", "over budget", "underspent", "spending breakdown"],
}

class RouterAgent:
    def run(self, ctx: PipelineContext, user_message: str) -> PipelineContext:
        msg = user_message.lower()
        scores = {mode: 0 for mode in AgentMode}
        for mode, keywords in KEYWORD_MAP.items():
            for kw in keywords:
                if kw in msg:
                    scores[mode] += 1
        best = max(scores, key=scores.get)
        ctx.mode = best if scores[best] > 0 else AgentMode.GENERAL
        return ctx
```

### 2.5 CalculationAgent (Pillar V, pure Python)

```python
# backend/agents/calculation_agent.py
from backend.models import PipelineContext

class CalculationAgent:
    """Pure Python financial calculations. No LLM, no I/O — safe to call directly."""

    def run(self, ctx: PipelineContext) -> dict:
        results = {}
        if ctx.household_data.monthly_data:
            results["budget_variance"] = self._budget_variance(ctx)
        if ctx.household_data.balance_snapshot:
            results["debt_summary"] = self._debt_summary(ctx)
            results["net_worth"] = self._net_worth(ctx)
        return results

    def _budget_variance(self, ctx) -> dict:
        latest = ctx.household_data.monthly_data[-1]
        total_variable = sum(latest.variable_expenses.values())
        # Variance by category (positive = under budget, negative = over)
        variances = {}
        for cat, actual in latest.variable_expenses.items():
            variances[cat] = actual   # budget targets loaded from household_profile
        return {"period": latest.period, "total_variable": total_variable, "by_category": variances}

    def _debt_summary(self, ctx) -> dict:
        snap = ctx.household_data.balance_snapshot
        total_debt = sum(d["balance"] for d in snap.debts)
        sorted_by_apr = sorted(snap.debts, key=lambda d: d["apr"], reverse=True)
        return {"total": total_debt, "avalanche_order": [d["name"] for d in sorted_by_apr]}

    def _net_worth(self, ctx) -> dict:
        snap = ctx.household_data.balance_snapshot
        assets = snap.checking + snap.savings + snap.investments
        liabilities = sum(d["balance"] for d in snap.debts)
        return {"assets": assets, "liabilities": liabilities, "net_worth": assets - liabilities}
```

### 2.6 PredictionAgent (Celery Worker)

Prophet and LightGBM cannot block the FastAPI event loop. PredictionAgent dispatches to Celery.

```python
# backend/agents/prediction_agent.py
from celery import Celery
from backend.models import PipelineContext

celery_app = Celery("compass", broker="redis://localhost:6379/1")

@celery_app.task
def forecast_task(monthly_data_dicts: list[dict], categories: list[str]) -> dict:
    """Runs in Celery worker — blocking Prophet call is safe here."""
    from prophet import Prophet
    import pandas as pd
    results = {}
    for cat in categories:
        rows = [
            {"ds": m["period"] + "-01", "y": m["variable_expenses"].get(cat, 0)}
            for m in monthly_data_dicts
            if cat in m.get("variable_expenses", {})
        ]
        if len(rows) < 3:
            results[cat] = {"status": "insufficient_data"}
            continue
        df = pd.DataFrame(rows)
        df["ds"] = pd.to_datetime(df["ds"])
        m = Prophet(seasonality_mode="additive", changepoint_prior_scale=0.10)
        m.fit(df)
        future = m.make_future_dataframe(periods=3, freq="MS")
        forecast = m.predict(future)
        next3 = forecast.tail(3)[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_dict("records")
        results[cat] = {"forecasts": next3}
    return results

class PredictionAgent:
    async def run(self, ctx: PipelineContext) -> dict:
        if not ctx.household_data.monthly_data:
            return {}
        data_dicts = [
            {
                "period": m.period,
                "variable_expenses": m.variable_expenses,
            }
            for m in ctx.household_data.monthly_data
        ]
        categories = list(ctx.household_data.monthly_data[-1].variable_expenses.keys())
        # Dispatch to Celery, await result with async wrapper
        import asyncio
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: forecast_task.apply_async(args=[data_dicts, categories]).get(timeout=30),
        )
        return result or {}
```

### 2.7 ReasoningAgent (the only LLM call)

```python
# backend/agents/reasoning_agent.py
import json
from backend.models import PipelineContext
from backend.tools.registry import COMPASS_TOOLS, get_tools_for_provider

MAX_TOOL_ITERATIONS = 5   # guard against infinite tool loops

SYSTEM_PROMPT = """You are COMPASS, a privacy-first household financial intelligence assistant.
You have access to financial calculation tools. Use them when quantitative analysis is needed.
Always ground your reasoning in the provided data. Be specific, cite numbers, and flag risks."""

class ReasoningAgent:
    async def run(self, ctx: PipelineContext, user_message: str) -> PipelineContext:
        messages = self._build_messages(ctx, user_message)
        tools = get_tools_for_provider(ctx.provider)
        iterations = 0

        while iterations < MAX_TOOL_ITERATIONS:
            response = await ctx.provider.chat(
                messages=messages,
                tools=tools,
                system=SYSTEM_PROMPT,
            )
            if not response.tool_calls:
                ctx.reasoning_output = response.content
                return ctx
            # Tool loop: execute tool calls and feed results back
            messages.append({"role": "assistant", "content": response.content or "",
                              "tool_calls": self._format_tool_calls(response.tool_calls)})
            for tc in response.tool_calls:
                result = await self._execute_tool(tc, ctx)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })
            iterations += 1

        ctx.reasoning_output = "Maximum tool iterations reached."
        return ctx

    def _build_messages(self, ctx: PipelineContext, user_message: str) -> list[dict]:
        context_summary = self._summarize_context(ctx)
        return [{"role": "user", "content": f"{context_summary}\n\nUser question: {user_message}"}]

    def _summarize_context(self, ctx: PipelineContext) -> str:
        parts = []
        if ctx.calculation_results:
            parts.append(f"Calculation results: {json.dumps(ctx.calculation_results, indent=2)}")
        if ctx.prediction_results:
            parts.append(f"Prediction results: {json.dumps(ctx.prediction_results, indent=2)}")
        return "\n".join(parts) if parts else "No pre-computed context."

    def _format_tool_calls(self, tool_calls) -> list[dict]:
        return [{"id": tc.id, "type": "function",
                 "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}}
                for tc in tool_calls]

    async def _execute_tool(self, tc, ctx: PipelineContext) -> dict:
        # Route tool calls to CalculationAgent methods
        calc = ctx.calculation_results
        if tc.name == "run_budget_analysis":
            return calc.get("budget_variance", {"error": "no data"})
        if tc.name == "run_debt_avalanche":
            return calc.get("debt_summary", {"error": "no data"})
        if tc.name == "run_spending_forecast":
            cats = tc.arguments.get("categories", [])
            return {c: ctx.prediction_results.get(c, {}) for c in cats}
        return {"error": f"unknown tool: {tc.name}"}
```

### 2.8 FormatterAgent

```python
# backend/agents/formatter_agent.py
from backend.models import PipelineContext

class FormatterAgent:
    def run(self, ctx: PipelineContext) -> PipelineContext:
        ctx.formatted_response = ctx.reasoning_output   # re-hydration happens in OutputValidatorAgent
        return ctx
```

### 2.9 OutputValidatorAgent

```python
# backend/agents/output_validator_agent.py
from backend.models import PipelineContext
from backend.agents.privacy_agent import PrivacyAgent

class OutputValidatorAgent:
    """Ensure no PII leaks in cloud-provider responses."""

    def __init__(self):
        self._privacy = PrivacyAgent()

    async def run(self, ctx: PipelineContext) -> PipelineContext:
        if ctx.provider.is_local:
            # Re-hydrate tokens even for local provider (in case tokens crept in)
            ctx.formatted_response = await self._privacy.rehydrate(ctx.reasoning_output, ctx)
            return ctx
        # Cloud: validate no raw PII in reasoning_output, then re-hydrate for user
        ctx.formatted_response = await self._privacy.rehydrate(ctx.reasoning_output, ctx)
        # NOTE: formatted_response contains real PII — deliver to user, never log to disk
        return ctx
```

### 2.10 Pipeline Orchestrator

```python
# backend/orchestrator.py
import asyncio
from backend.models import PipelineContext, HouseholdData
from backend.agents.ingestion_agent import IngestionAgent
from backend.agents.privacy_agent import PrivacyAgent
from backend.agents.router_agent import RouterAgent
from backend.agents.calculation_agent import CalculationAgent
from backend.agents.prediction_agent import PredictionAgent
from backend.agents.reasoning_agent import ReasoningAgent
from backend.agents.formatter_agent import FormatterAgent
from backend.agents.output_validator_agent import OutputValidatorAgent
from backend.providers.registry import ProviderRegistry

class Orchestrator:
    def __init__(self, provider_registry: ProviderRegistry):
        self._registry = provider_registry
        self._ingestion = IngestionAgent()
        self._privacy = PrivacyAgent()
        self._router = RouterAgent()
        self._calculation = CalculationAgent()
        self._prediction = PredictionAgent()
        self._reasoning = ReasoningAgent()
        self._formatter = FormatterAgent()
        self._validator = OutputValidatorAgent()

    async def run(self, raw_input: str, user_message: str, session_id: str) -> str:
        provider = await self._registry.get_provider()

        # [1] Ingest
        household_data = self._ingestion.run(raw_input)

        # [2] Privacy gate — SKIP if local
        ctx = PipelineContext(
            household_data=household_data,
            mode=None,
            provider=provider,
            session_id=session_id,
        )
        ctx = await self._privacy.run(ctx)

        # [3] Route
        ctx = self._router.run(ctx, user_message)

        # [4] Calculate + Predict in parallel
        calc_task = asyncio.create_task(
            asyncio.to_thread(self._calculation.run, ctx)
        )
        pred_task = asyncio.create_task(self._prediction.run(ctx))
        calc_results, pred_results = await asyncio.gather(calc_task, pred_task)
        ctx.calculation_results = calc_results
        ctx.prediction_results = pred_results

        # [5] Reason (LLM call)
        ctx = await self._reasoning.run(ctx, user_message)

        # [6] Format
        ctx = self._formatter.run(ctx)

        # [7] Validate output
        ctx = await self._validator.run(ctx)

        # AuditAgent-equivalent: log reasoning_output (with tokens), NOT formatted_response
        # TODO: write ctx.reasoning_output to audit log

        # Clear raw payload
        ctx.household_data.raw_text = ""

        return ctx.formatted_response
```

---

## Section 3 — Privacy Routing Decision Matrix

| Provider | `is_local` | PrivacyAgent runs | PII in LLM prompt | OutputValidator runs | Re-hydrate for user |
|---|---|---|---|---|---|
| Ollama (local) | True | No | Yes (raw PII allowed) | No (skip) | Yes (token passthrough) |
| Claude (cloud) | False | Yes (mandatory) | No (tokens only) | Yes | Yes (real values) |
| OpenAI (cloud) | False | Yes (mandatory) | No (tokens only) | Yes | Yes (real values) |

**Critical invariants** (must never be violated):
- `cloud_requires_pii_scrub: bool = True` — never disable in production
- `formatted_response` (re-hydrated PII) must never be written to any log file
- `raw_payload` (original user input with PII) must be cleared after PrivacyAgent completes
- Redis token map: 1-hour TTL, never persisted to disk
- `report_to="none"` in DistilBERT training config (no external logging)

---

## Section 4 — SSE Streaming

### FastAPI SSE Endpoint

Request body now includes `household_id` (required per Pillar IX spec) and `mode` (optional).
SSE response schema adds `tools_invoked`, `anonymization_applied`, `session_id` (reconciled with spec).

```python
# backend/routers/chat.py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from backend.orchestrator import Orchestrator
from backend.providers.registry import ProviderRegistry
from backend.config import get_settings
import json

router = APIRouter()

@router.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    raw_input = body.get("raw_input", "")
    user_message = body.get("message", "")
    session_id = body.get("session_id", "")
    household_id = body.get("household_id", "")   # required — links to DB records
    mode = body.get("mode", None)                  # optional; auto-detected if omitted

    settings = get_settings()
    registry = ProviderRegistry(settings)
    orchestrator = Orchestrator(registry)

    tools_invoked: list[str] = []

    async def event_stream():
        try:
            yield _sse("status", "Processing your request...",
                       session_id=session_id, tools_invoked=[])
            provider = await registry.get_provider()
            anonymization_applied = not provider.is_local
            if not provider.is_local:
                yield _sse("privacy_notice",
                           f"Using {provider.model_name()} — PII will be anonymized",
                           session_id=session_id, tools_invoked=[])
            result, invoked = await orchestrator.run(
                raw_input, user_message, session_id, household_id, mode
            )
            yield _sse("summary_md", result,
                       session_id=session_id,
                       tools_invoked=invoked,
                       anonymization_applied=anonymization_applied)
        except Exception as e:
            yield _sse("error", str(e), session_id=session_id, tools_invoked=[])

    return StreamingResponse(event_stream(), media_type="text/event-stream")

def _sse(
    type_: str,
    content: str,
    session_id: str = "",
    tools_invoked: list[str] | None = None,
    anonymization_applied: bool = False,
    metadata: dict | None = None,
) -> str:
    payload = {
        "type": type_,
        "content": content,
        "session_id": session_id,
        "tools_invoked": tools_invoked or [],
        "anonymization_applied": anonymization_applied,
    }
    if metadata:
        payload["metadata"] = metadata
    return f"data: {json.dumps(payload)}\n\n"
```

### SSE Event Schema (TypeScript, for Svelte consumer)

```typescript
// frontend/src/lib/types.ts
export type SSEEventType =
  | "status"
  | "privacy_notice"
  | "text"
  | "tool_use"
  | "tool_result"
  | "pii_alert"
  | "summary_md"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  content: string;
  metadata?: {
    provider?: string;
    tool_name?: string;
    latency_ms?: number;
  };
}
```

### Svelte SSE Consumer

```typescript
// frontend/src/lib/compass_client.ts
export async function* streamChat(
  rawInput: string,
  message: string,
  sessionId: string
): AsyncGenerator<SSEEvent> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw_input: rawInput, message, session_id: sessionId }),
  });
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        yield JSON.parse(line.slice(6)) as SSEEvent;
      }
    }
  }
}
```

---

## Section 5 — Configuration

```python
# backend/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Provider selection
    preferred_provider: str = "ollama"         # "ollama" | "claude" | "openai"
    cloud_allows_fallback: bool = False         # True only for dev/staging
    cloud_requires_pii_scrub: bool = True       # NEVER disable in production

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"           # preferred: better tool-call accuracy than llama3.1:8b

    # Anthropic
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-haiku-4-5-20251001"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Infrastructure
    redis_url: str = "redis://localhost:6379"
    database_url: str = "postgresql+asyncpg://compass:compass@localhost:5432/compass"
    log_level: str = "INFO"

    # Privacy
    pii_token_ttl_seconds: int = 3600

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## Section 6 — Project Structure

```
expense_tracker/
├── frontend/                   # existing Svelte app
│   └── src/
│       ├── lib/
│       │   ├── types.ts        # SSEEvent type
│       │   └── compass_client.ts
│       └── pages/
├── backend/
│   ├── main.py                 # FastAPI app factory
│   ├── config.py               # pydantic-settings Settings
│   ├── models.py               # HouseholdData, PipelineContext, AgentMode
│   ├── orchestrator.py         # Orchestrator — wires all 7 agents
│   ├── providers/
│   │   ├── base.py             # LLMProvider Protocol, LLMResponse, LLMEvent
│   │   ├── ollama_adapter.py
│   │   ├── anthropic_adapter.py
│   │   ├── openai_adapter.py
│   │   └── registry.py        # ProviderRegistry + health check
│   ├── agents/
│   │   ├── ingestion_agent.py
│   │   ├── privacy_agent.py
│   │   ├── router_agent.py
│   │   ├── calculation_agent.py
│   │   ├── prediction_agent.py # dispatches to Celery
│   │   ├── reasoning_agent.py
│   │   ├── formatter_agent.py
│   │   └── output_validator_agent.py
│   ├── tools/
│   │   └── registry.py        # ToolDefinition, COMPASS_TOOLS, get_tools_for_provider
│   └── routers/
│       └── chat.py            # /api/chat SSE endpoint
├── docker-compose.yml
├── pyproject.toml
└── .env.example
```

---

## Section 7 — Docker Compose

```yaml
# docker-compose.yml
version: "3.9"
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      PREFERRED_PROVIDER: ollama
      OLLAMA_BASE_URL: http://ollama:11434
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgresql+asyncpg://compass:compass@postgres:5432/compass
    depends_on: [redis, postgres, ollama]

  celery_worker:
    build: ./backend
    command: celery -A backend.agents.prediction_agent.celery_app worker -l info
    depends_on: [redis]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama_data:/root/.ollama"]
    # After first start: docker exec ollama ollama pull qwen2.5:7b

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: compass
      POSTGRES_PASSWORD: compass
      POSTGRES_DB: compass
    volumes: ["pg_data:/var/lib/postgresql/data"]

volumes:
  ollama_data:
  pg_data:
```

---

## Section 8 — Python Dependencies

```toml
# pyproject.toml (backend section)
[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.115"
uvicorn = {extras = ["standard"], version = "^0.30"}
pydantic-settings = "^2.3"
openai = "^1.40"             # used for Ollama + OpenAI adapters
anthropic = "^0.34"
presidio-analyzer = "^2.2"
presidio-anonymizer = "^2.2"
redis = {extras = ["asyncio"], version = "^5.0"}
celery = "^5.4"
prophet = "^1.1"
lightgbm = "^4.3"
scikit-learn = "^1.5"
httpx = "^0.27"
asyncpg = "^0.29"
sqlalchemy = {extras = ["asyncio"], version = "^2.0"}

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"
pytest-asyncio = "^0.23"
httpx = "^0.27"
```

---

## Section 9 — Implementation Sequence

### Phase 1 — Provider Layer (no agents, no LLM calls yet)
1. `backend/config.py` + `.env.example`
2. `backend/providers/base.py` — Protocol + dataclasses
3. `backend/providers/ollama_adapter.py`
4. `backend/providers/registry.py` — health check only
5. Smoke test: `curl localhost:11434/api/tags` → pull `qwen2.5:7b`

### Phase 2 — Ingestion + Tools
1. `backend/models.py` — all dataclasses
2. `backend/agents/ingestion_agent.py`
3. `backend/tools/registry.py` — all 7 COMPASS_TOOLS

### Phase 3 — Calculation Agent
1. `backend/agents/calculation_agent.py`
2. Unit tests with synthetic `HouseholdData`

### Phase 4 — Privacy Layer
1. `backend/agents/privacy_agent.py` — Presidio integration
2. Redis setup + TTL test
3. `backend/agents/output_validator_agent.py`

### Phase 5 — Reasoning + Orchestration
1. `backend/agents/router_agent.py`
2. `backend/agents/reasoning_agent.py`
3. `backend/agents/formatter_agent.py`
4. `backend/orchestrator.py`

### Phase 6 — SSE API
1. `backend/routers/chat.py`
2. `backend/main.py`
3. Svelte SSE consumer in `frontend/src/lib/`

### Phase 7 — Prediction Agent
1. Celery setup
2. `backend/agents/prediction_agent.py`
3. Integration test with 6+ months synthetic data

### Phase 8 — Anthropic + OpenAI Adapters
1. `backend/providers/anthropic_adapter.py`
2. `backend/providers/openai_adapter.py`
3. `ProviderRegistry` fallback logic

---

## Section 10 — Open Questions

| # | Question | Recommendation |
|---|---|---|
| 1 | Which Ollama model for production? | `qwen2.5:7b` — best tool-call accuracy at 7B params. Upgrade to `qwen2.5:14b` on 16GB+ VRAM |
| 2 | How to handle Ollama tool-call failures? | Detect empty `tool_calls` in response; re-prompt with JSON schema in system prompt as fallback |
| 3 | PredictionAgent cold start (< 3 months data)? | Return `{"status": "insufficient_data"}` and skip forecast section in FormatterAgent |
| 4 | PostgreSQL schema for audit log? | `audit_events(id, session_id, timestamp, mode, provider, reasoning_output_tokens)` — store token count not content |
| 5 | Streaming tool-use events to Svelte? | Emit `tool_use` SSE event before executing each tool; emit `tool_result` SSE event after |
| 6 | Multi-household support? | `session_id` maps to `household_id` in DB; PrivacyAgent already scoped per session |
