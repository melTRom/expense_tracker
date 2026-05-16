# COMPASS Database Plan — SQLAlchemy ORM, Migrations & Seeding

**Source of truth**: `HFIA_Architecture_Spec.md` Pillar II §2.2, Pillar VIII  
**Covers**: ORM models, Alembic migrations, seed script, ERD, connection config  
**Date**: 2026-05-16

---

## Section 1 — SQLAlchemy Async ORM Models

```python
# backend/db/models.py
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Numeric, Date, DateTime, Boolean,
    ForeignKey, Index, func
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from sqlalchemy.ext.asyncio import AsyncAttrs

class Base(AsyncAttrs, DeclarativeBase):
    pass

class HouseholdModel(Base):
    __tablename__ = "households"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    label         = Column(String(100), nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    snapshots     = relationship("MonthlySnapshotModel", back_populates="household")
    sessions      = relationship("AgentSessionModel", back_populates="household")

class MonthlySnapshotModel(Base):
    __tablename__ = "monthly_snapshots"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    household_id  = Column(UUID(as_uuid=True), ForeignKey("households.id"), nullable=False)
    period        = Column(Date, nullable=False)       # first of month: 2026-05-01
    raw_xml       = Column(Text)                       # pre-anonymization; cleared post-processing
    anonymized    = Column(JSONB)                      # structured post-privacy-layer data
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    household     = relationship("HouseholdModel", back_populates="snapshots")
    budget_lines  = relationship("BudgetLineModel", back_populates="snapshot",
                                  cascade="all, delete-orphan")
    __table_args__ = (
        Index("ix_monthly_snapshots_household_period", "household_id", "period", unique=True),
    )

class BudgetLineModel(Base):
    __tablename__ = "budget_lines"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    snapshot_id   = Column(UUID(as_uuid=True), ForeignKey("monthly_snapshots.id"), nullable=False)
    category      = Column(String(50), nullable=False)
    subcategory   = Column(String(80), nullable=False)
    budgeted      = Column(Numeric(10, 2))
    actual        = Column(Numeric(10, 2))
    # variance computed in Python as (actual - budgeted); Postgres STORED column added via migration
    snapshot      = relationship("MonthlySnapshotModel", back_populates="budget_lines")
    __table_args__ = (
        Index("ix_budget_lines_snapshot_category", "snapshot_id", "category"),
    )

    @property
    def variance(self) -> float:
        if self.actual is None or self.budgeted is None:
            return 0.0
        return float(self.actual) - float(self.budgeted)

class DebtRegistryModel(Base):
    __tablename__ = "debt_registry"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    household_id    = Column(UUID(as_uuid=True), ForeignKey("households.id"), nullable=False)
    label           = Column(String(80), nullable=False)    # anonymized label only
    debt_type       = Column(String(30), nullable=False)    # credit_card | auto_loan | mortgage
    apr             = Column(Numeric(5, 2))
    current_balance = Column(Numeric(12, 2))
    min_payment     = Column(Numeric(8, 2))
    as_of_date      = Column(Date, nullable=False)
    __table_args__ = (
        Index("ix_debt_registry_household", "household_id"),
    )

class PredictionCacheModel(Base):
    __tablename__ = "prediction_cache"
    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    household_id    = Column(UUID(as_uuid=True), ForeignKey("households.id"), nullable=False)
    model_type      = Column(String(50), nullable=False)  # prophet_spending | isolation_forecast | lgbm_overspend
    target          = Column(String(80), nullable=False)  # category name or metric
    prediction_json = Column(JSONB)
    generated_at    = Column(DateTime(timezone=True), server_default=func.now())
    valid_through   = Column(DateTime(timezone=True))
    __table_args__ = (
        Index("ix_prediction_cache_household_model", "household_id", "model_type", "target"),
    )

class AgentSessionModel(Base):
    __tablename__ = "agent_sessions"
    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    household_id  = Column(UUID(as_uuid=True), ForeignKey("households.id"), nullable=False)
    mode          = Column(String(30))   # monthly_review|adhoc|scenario|credit_checkin|prediction|vent
    messages      = Column(JSONB)        # full conversation history for multi-turn context
    started_at    = Column(DateTime(timezone=True), server_default=func.now())
    household     = relationship("HouseholdModel", back_populates="sessions")
    audit_events  = relationship("AuditEventModel", back_populates="session")

class AuditEventModel(Base):
    """Stores reasoning metadata — NEVER stores formatted_response (PII re-hydrated)."""
    __tablename__ = "audit_events"
    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id              = Column(UUID(as_uuid=True), ForeignKey("agent_sessions.id"), nullable=False)
    timestamp               = Column(DateTime(timezone=True), server_default=func.now())
    mode                    = Column(String(30))
    provider                = Column(String(20))   # ollama | claude | openai
    reasoning_output_tokens = Column(Numeric(8, 0))  # token count ONLY — not content
    tools_invoked           = Column(JSONB)          # list of tool names called
    latency_ms              = Column(Numeric(8, 0))
    anonymization_applied   = Column(Boolean, default=False)
    session                 = relationship("AgentSessionModel", back_populates="audit_events")
```

---

## Section 2 — Async Engine & Session Factory

```python
# backend/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.config import get_settings

def create_engine():
    settings = get_settings()
    return create_async_engine(
        settings.database_url,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=settings.log_level == "DEBUG",
    )

engine = create_engine()
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

---

## Section 3 — Alembic Setup

```bash
pip install alembic
alembic init backend/db/migrations
```

```python
# backend/db/migrations/env.py — async-compatible version
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import AsyncEngine
from alembic import context
from backend.db.models import Base

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    from backend.db.session import engine
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)

def run_migrations_online():
    import asyncio
    asyncio.run(run_async_migrations())

run_migrations_online()
```

```bash
# Generate and apply initial migration
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

In the generated migration, **manually add** the computed variance column:
```python
op.execute("""
    ALTER TABLE budget_lines
    ADD COLUMN IF NOT EXISTS variance NUMERIC(10,2)
    GENERATED ALWAYS AS (actual - budgeted) STORED;
""")
```

---

## Section 4 — CRUD Repository Layer

```python
# backend/db/repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from backend.db.models import (
    MonthlySnapshotModel, BudgetLineModel, DebtRegistryModel,
    AgentSessionModel, AuditEventModel
)
from datetime import date
import uuid

class SnapshotRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_snapshot(self, household_id: uuid.UUID, period: date,
                               raw_xml: str, anonymized: dict) -> MonthlySnapshotModel:
        stmt = select(MonthlySnapshotModel).where(
            and_(MonthlySnapshotModel.household_id == household_id,
                 MonthlySnapshotModel.period == period)
        )
        result = await self.db.execute(stmt)
        snap = result.scalar_one_or_none()
        if snap:
            snap.raw_xml = raw_xml
            snap.anonymized = anonymized
        else:
            snap = MonthlySnapshotModel(
                household_id=household_id, period=period,
                raw_xml=raw_xml, anonymized=anonymized,
            )
            self.db.add(snap)
        await self.db.flush()
        return snap

    async def clear_raw_xml(self, snapshot_id: uuid.UUID):
        """Called after PrivacyAgent completes — removes raw PII from DB."""
        stmt = select(MonthlySnapshotModel).where(MonthlySnapshotModel.id == snapshot_id)
        result = await self.db.execute(stmt)
        snap = result.scalar_one_or_none()
        if snap:
            snap.raw_xml = None
            await self.db.flush()

    async def get_history(self, household_id: uuid.UUID, n_months: int = 24):
        stmt = (select(MonthlySnapshotModel)
                .where(MonthlySnapshotModel.household_id == household_id)
                .order_by(MonthlySnapshotModel.period.desc())
                .limit(n_months))
        result = await self.db.execute(stmt)
        return result.scalars().all()

class DebtRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def update_debts(self, household_id: uuid.UUID, debts: list[dict]):
        """Replaces all debt records from a balance_snapshot submission."""
        stmt = select(DebtRegistryModel).where(DebtRegistryModel.household_id == household_id)
        result = await self.db.execute(stmt)
        for existing in result.scalars().all():
            await self.db.delete(existing)
        for d in debts:
            self.db.add(DebtRegistryModel(
                household_id=household_id,
                label=d.get("label", "unknown"),
                debt_type=d.get("type", "unknown"),
                apr=d.get("apr", 0),
                current_balance=d.get("balance", 0),
                min_payment=d.get("min_payment", 0),
                as_of_date=date.today(),
            ))
        await self.db.flush()

class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_event(self, session_id: uuid.UUID, mode: str, provider: str,
                         token_count: int, tools: list[str],
                         latency_ms: int, anonymized: bool):
        event = AuditEventModel(
            session_id=session_id,
            mode=mode,
            provider=provider,
            reasoning_output_tokens=token_count,
            tools_invoked=tools,
            latency_ms=latency_ms,
            anonymization_applied=anonymized,
        )
        self.db.add(event)
        await self.db.flush()
```

---

## Section 5 — Database Seed Script

```python
# scripts/seed_db.py
import asyncio
import uuid
from backend.db.session import AsyncSessionLocal
from backend.db.models import HouseholdModel, DebtRegistryModel
from datetime import date

HOUSEHOLD_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

async def seed():
    async with AsyncSessionLocal() as db:
        existing = await db.get(HouseholdModel, HOUSEHOLD_ID)
        if existing:
            print("Already seeded — skipping.")
            return
        household = HouseholdModel(id=HOUSEHOLD_ID, label="Torres-Romero Family")
        db.add(household)
        # Seed known debts with placeholder balances — updated by first balance_snapshot submission
        debts = [
            DebtRegistryModel(household_id=HOUSEHOLD_ID, label="CC_primary",
                               debt_type="credit_card", apr=24.99, current_balance=0,
                               min_payment=25, as_of_date=date.today()),
            DebtRegistryModel(household_id=HOUSEHOLD_ID, label="CC_secondary",
                               debt_type="credit_card", apr=19.99, current_balance=0,
                               min_payment=25, as_of_date=date.today()),
            DebtRegistryModel(household_id=HOUSEHOLD_ID, label="auto_sentra",
                               debt_type="auto_loan", apr=6.99, current_balance=0,
                               min_payment=0, as_of_date=date.today()),
            DebtRegistryModel(household_id=HOUSEHOLD_ID, label="mortgage",
                               debt_type="mortgage", apr=0.0, current_balance=0,
                               min_payment=0, as_of_date=date.today()),
        ]
        db.add_all(debts)
        await db.commit()
        print(f"Seeded household {HOUSEHOLD_ID}")

asyncio.run(seed())
```

---

## Section 6 — ERD

```
households
  id (PK UUID)
  label TEXT
  created_at TIMESTAMPTZ
  │
  ├── monthly_snapshots (household_id FK) [UNIQUE: household_id + period]
  │     id, period DATE, raw_xml TEXT (nullable), anonymized JSONB
  │     │
  │     └── budget_lines (snapshot_id FK)
  │           id, category TEXT, subcategory TEXT, budgeted NUMERIC, actual NUMERIC
  │           variance NUMERIC [GENERATED STORED = actual - budgeted]
  │
  ├── debt_registry (household_id FK)
  │     id, label TEXT, debt_type TEXT, apr NUMERIC, current_balance NUMERIC, min_payment NUMERIC, as_of_date DATE
  │
  ├── prediction_cache (household_id FK)
  │     id, model_type TEXT, target TEXT, prediction_json JSONB, generated_at, valid_through
  │
  └── agent_sessions (household_id FK)
        id, mode TEXT, messages JSONB, started_at TIMESTAMPTZ
        │
        └── audit_events (session_id FK)
              id, provider TEXT, reasoning_output_tokens NUMERIC, tools_invoked JSONB,
              latency_ms NUMERIC, anonymization_applied BOOLEAN
              [NEVER stores formatted_response or raw PII content]
```

---

## Section 7 — Implementation Sequence

| Step | Task | Gate |
|---|---|---|
| 1 | Install alembic, `alembic init backend/db/migrations` | `alembic.ini` exists |
| 2 | Write ORM models in `backend/db/models.py` | `alembic revision --autogenerate` produces correct diff |
| 3 | Patch `env.py` for async engine | Migration runs without `MissingGreenlet` error |
| 4 | `alembic upgrade head` | All 6 tables created in postgres |
| 5 | Manually add STORED variance column in migration | `budget_lines.variance` auto-computed |
| 6 | `python scripts/seed_db.py` | Household + 4 debts in DB |
| 7 | Write repositories + unit tests (SQLite in-memory for CI) | Tests pass |

---

*Database plan v1.0 — COMPASS | 2026-05-16*
