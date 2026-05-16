# Monthly Data Input Templates

Wrap all pasted data in `<monthly_data>...</monthly_data>` XML tags for improved parsing reliability across multiple months.

---

## Template A — Monthly Income & Expense Snapshot

```
<monthly_data>
## Monthly Income & Expense Snapshot — [Month Year]

### Income
| Source | Expected | Actual | Variance | Notes |
|--------|----------|--------|----------|-------|
| W-2 Salary (net) | $ | $ | $ | |
| Side Income (gross) | $ | $ | $ | |
| Side Income Tax Set-Aside (25-30%) | $ | $ | $ | |
| Side Income (net) | $ | $ | $ | |
| **Total Net Income** | **$** | **$** | **$** | |

### Expenses by Category
| Category | Budgeted | Actual | Variance | Notes |
|----------|----------|--------|----------|-------|
| **HOUSING** | | | | |
| Mortgage P&I | $ | $ | $ | |
| Property Tax / Escrow | $ | $ | $ | |
| HOA | $ | $ | $ | |
| Homeowner's Insurance | $ | $ | $ | |
| Home Maintenance Fund | $ | $ | $ | |
| Electric | $ | $ | $ | |
| Gas | $ | $ | $ | |
| Water / Sewer / Trash | $ | $ | $ | |
| Internet / Cell | $ | $ | $ | |
| **TRANSPORTATION** | | | | |
| Auto Loan — Sentra | $ | $ | $ | |
| Auto Loan — Van | $ | $ | $ | |
| Auto Loan — Chrysler | $ | $ | $ | |
| Auto Insurance (all) | $ | $ | $ | |
| Fuel | $ | $ | $ | |
| Routine Maintenance | $ | $ | $ | |
| Registration / Inspection | $ | $ | $ | |
| Repairs Sinking Fund | $ | $ | $ | |
| **FOOD & HOUSEHOLD** | | | | |
| Groceries | $ | $ | $ | |
| Household Supplies | $ | $ | $ | |
| Dining Out | $ | $ | $ | |
| **PEOPLE CARE** | | | | |
| Healthcare Premiums | $ | $ | $ | |
| Out-of-Pocket Medical | $ | $ | $ | |
| Prescriptions | $ | $ | $ | |
| Dental / Vision | $ | $ | $ | |
| Clothing | $ | $ | $ | |
| Personal Care | $ | $ | $ | |
| College Costs | $ | $ | $ | |
| Freshman Launch Budget | $ | $ | $ | |
| **PET CARE** | | | | |
| Pet Food | $ | $ | $ | |
| Routine Vet | $ | $ | $ | |
| Prevention (Flea/HW) | $ | $ | $ | |
| Pet Insurance | $ | $ | $ | |
| Pug Medical Fund | $ | $ | $ | |
| Kitten First-Year Fund | $ | $ | $ | |
| Grooming | $ | $ | $ | |
| Pet Supplies | $ | $ | $ | |
| **SUBSCRIPTIONS & LIFESTYLE** | | | | |
| Streaming | $ | $ | $ | |
| Software | $ | $ | $ | |
| Gym / Fitness | $ | $ | $ | |
| Hobbies | $ | $ | $ | |
| Entertainment | $ | $ | $ | |
| Gifts | $ | $ | $ | |
| Travel | $ | $ | $ | |
| **FINANCIAL PRIORITIES** | | | | |
| Min Debt Payments | $ | $ | $ | |
| Accelerated Debt Payoff | $ | $ | $ | |
| Emergency Fund | $ | $ | $ | |
| 401(k) | $ | $ | $ | |
| Roth IRA | $ | $ | $ | |
| HSA | $ | $ | $ | |
| 529 | $ | $ | $ | |
| Taxable Investing | $ | $ | $ | |
| **SINKING FUNDS** | | | | |
| Christmas | $ | $ | $ | |
| Birthdays | $ | $ | $ | |
| Annual Insurance | $ | $ | $ | |
| Vehicle Replacement | $ | $ | $ | |
| Home Repair | $ | $ | $ | |
| Vet Emergency | $ | $ | $ | |
| **TOTAL EXPENSES** | **$** | **$** | **$** | |
| **NET (Income - Expenses)** | **$** | **$** | **$** | Should be $0 in zero-based budget |
</monthly_data>
```

---

## Template B — Balance & Debt Snapshot

```
<monthly_data>
## Accounts (as of [date])
- Checking: $___
- HYSA (Emergency Fund): $___
- HYSA (Pug Emergency): $___
- HYSA (Vehicle Repair): $___
- HYSA (Home Repair): $___
- Tax-Holding Sub-Account: $___
- Roth IRA (Adult 1): $___
- Roth IRA (Adult 2 — Spousal): $___
- 401(k): $___
- HSA: $___
- 529 (Child 1): $___
- 529 (Child 2): $___
- Taxable Brokerage: $___

## Debts
| Account | Balance | APR | Min Payment | Type |
|---------|---------|-----|-------------|------|
| ...     | ...     | ... | ...         | ...  |

## Credit
- FICO (latest): ___ | Date: ___
- Aggregate utilization: ___%
- Per-card utilization: Card1 __%, Card2 __%, ...
- Autopay status: all accounts on autopay? Y/N
- Any missed payments this month? Y/N
- DTI this month: ___%
</monthly_data>
```

---

## Template C — Life Events / Anomalies This Month

```
<monthly_data>
## Life Events & Anomalies — [Month Year]

Flag anything unusual this month:
- [ ] Vet visit (which pet, cost, diagnosis)
- [ ] Car repair (which vehicle, cost, nature of repair)
- [ ] Side-income spike or drop (amount, reason)
- [ ] Tuition payment due
- [ ] Scholarship received
- [ ] Insurance renewal / rate change
- [ ] Job change / income change
- [ ] Major purchase
- [ ] Medical event
- [ ] Other: ___

**Free-text notes:**

</monthly_data>
```

---

> **Reminder:** Wrapping pasted data in named XML tags (`<monthly_data>...</monthly_data>`) improves parsing reliability, especially when the assistant must reason across multiple months.
