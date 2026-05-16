# FinPulse — Household Financial Intelligence

A Svelte-based web application implementing the household financial intelligence architecture.

## Project Structure

```
expense_tracker/
├── system_prompt.md              # Claude system prompt (XML-tagged, ~5K tokens)
├── knowledge/                    # Project Knowledge files
│   ├── household_profile.md      # Static household facts
│   ├── chart_of_accounts.md      # 57 line-item zero-based budget categories
│   ├── frameworks_reference.md   # All encoded financial frameworks
│   └── monthly_templates.md      # Three monthly data input templates (A, B, C)
├── src/
│   ├── App.svelte                # Main shell — sidebar nav + SPA routing
│   ├── app.css                   # Global design tokens + resets
│   ├── main.js                   # Svelte 5 mount entry point
│   ├── lib/
│   │   └── storage.js            # localStorage persistence + defaults + helpers
│   └── pages/
│       ├── Dashboard.svelte      # Net worth, KPIs, EF progress, priority scoreboard
│       ├── Budget.svelte         # Zero-based budget with full chart of accounts
│       ├── Income.svelte         # Two-tier baseline income + surge allocation
│       ├── Credit.svelte         # FICO factors, utilization, DTI, repair playbook
│       ├── Savings.svelte        # Tiered EF progress + HYSA reference
│       ├── Investments.svelte    # Bogleheads priority order + three-fund portfolio
│       ├── Vehicles.svelte       # Per-vehicle TCO + keep-vs-sell + insurance
│       ├── ExpenseCuts.svelte    # Tiered cut hierarchy (painless → last resort)
│       ├── Pets.svelte           # Senior pug + kitten financial planning
│       └── DataEntry.svelte      # Debt management + life events + templates
├── index.html
├── package.json
├── vite.config.js
└── svelte.config.js
```

## Quick Start

```bash
npm install
npm run dev
```

## Architecture Modules

1. **Dashboard** — Net worth, debt, savings, FICO KPIs, EF tier progress, priority scoreboard
2. **Budget** — 57-item zero-based chart of accounts with budgeted/actual/variance
3. **Income** — Two-tier baseline model, side income 25th-percentile, surge allocation sliders
4. **Credit Health** — FICO factor weights, per-card utilization, DTI, 6-step repair playbook
5. **Emergency Fund** — 4-tier EF targets, account balances, HYSA comparison table
6. **Investments** — 10-step Bogleheads priority order, Spousal Roth IRA flag, three-fund portfolio, 529 Texas planning
7. **Vehicles** — Per-vehicle TCO calculator, loan rate signals, keep-vs-sell logic, insurance optimization
8. **Expense Cuts** — 4-tier cut hierarchy with qualitative trade-off principle
9. **Pet Finance** — Senior pug sinking fund + insurance analysis + humane endpoint; kitten first-year budget + milestones
10. **Data Entry** — Debt account CRUD, life events log, template reference

## Encoded Frameworks

- Zero-based budget + 50/30/20 sanity check
- Two-tier baseline income (salary + variable side income)
- FICO factor weights + credit-repair playbook
- Tiered emergency fund ($2K starter → 6-month full EF + sinking funds)
- Bogleheads investment priority order (adapted)
- Tiered expense-cut hierarchy
- Per-vehicle TCO analysis
- Pet financial planning (breed-specific)

## Standing Disclaimer

Educational information only — not investment, tax, or legal advice. Verify with a licensed professional before acting.
