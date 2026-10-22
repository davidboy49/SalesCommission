# Hanuman Beverages – Outdoor Sales Commission System
## Best-practice study, proposed plan, and scoping questions

Status: **Draft for decision** · Stack: **Angular (frontend) + .NET (backend)** · Date: 2026-10-21

---

## 1. What "best practice" looks like for beverage / FMCG field-sales commission

### 1.1 Plan design (the business rules)
| Practice | Why it matters for beverage outdoor sales |
|---|---|
| **Fixed vs variable pay mix** (typically 70/30 – 80/20 for route/outdoor reps) | Reps must have stable income but a real incentive to push volume. |
| **Few KPIs (3–5), weighted scorecard** | More than 5 KPIs dilutes focus and reps stop understanding their pay. |
| **Volume-based KPI in cases / liters**, not only revenue | Price changes and promotions distort revenue; cases are what the factory cares about. |
| **Distribution KPIs**: active outlets, new outlets opened, numeric distribution per SKU | Beverages win by being present in every shop, not just big orders. |
| **Execution KPIs**: strike rate (productive visits ÷ planned visits), lines per call, focus-SKU / new-product push | Drives the behaviour that creates volume next month. |
| **Collection gate** for credit sales (e.g. commission paid only if collection ≥ 90%, or commission on *collected* sales) | Prevents reps selling to bad-paying outlets just to hit target. |
| **Thresholds, tiers and caps** – e.g. 0% below 80% achievement, linear 80–100%, accelerator above 100%, cap at 150% | Rewards over-performance without unlimited liability. |
| **Deductions / clawbacks** for returns, expired stock, bad debt | Commission reflects real net sales. |
| **Supervisor / team overrides** (Supervisor earns on team achievement) | Aligns the hierarchy: Rep → Supervisor → Area Manager. |
| **Effective-dated plan versions** | Plans change every year/quarter; old periods must always recalc with old rules. |

### 1.2 Process (the operating cycle)
```
Plan design → Target setting → Sales/collection data load → Calculation
   → Rep statement → Dispute/adjustment → Approval (Supervisor → Sales Mgr → Finance)
   → Period lock → Payout export to payroll → Audit / reporting
```

### 1.3 System best practices
- **Rules are configuration, not code.** Finance/Sales Ops can create a new plan without a developer.
- **Single source of truth for transactions** (ERP/DMS), imported and reconciled – no re-typing.
- **Period locking + full audit trail.** Every calculation result traceable to the invoices and the rule version that produced it.
- **Recalculation is repeatable and idempotent** (run it twice, get the same answer).
- **Transparency to reps**: each rep sees their own achievement and estimated commission daily/weekly – the #1 driver of motivation in incentive programs.
- **Money handled as `decimal`**, explicit rounding rules, multi-currency awareness (USD / KHR).
- **Role-based access**: a rep sees only their own data, a supervisor their team, Finance everything.
- **Khmer + English UI** and Khmer-friendly PDF statements.

---

## 2. Proposed architecture (Angular + .NET)

| Layer | Recommendation |
|---|---|
| Frontend | Latest Angular (standalone components, signals), Angular Material or PrimeNG, ngx-translate (KM/EN), PWA so reps can use it on phones |
| Backend | ASP.NET Core Web API on **.NET 10 (LTS)**, Clean Architecture (Domain / Application / Infrastructure / API) |
| Data | SQL Server (or PostgreSQL) via EF Core; read-heavy reports via Dapper or views |
| Calculation engine | Domain service with pluggable rule types (tiered %, per-case rate, KPI scorecard, gate, cap, clawback) |
| Background jobs | Hangfire (or Quartz.NET) for nightly import + month-end calculation |
| Auth | Microsoft Entra ID / AD (if company uses Microsoft 365) or ASP.NET Core Identity + JWT |
| Import / Export | ClosedXML (Excel), CSV; API connectors to ERP later |
| Statements | QuestPDF (with Khmer font) |
| Logging / audit | Serilog + audit tables (who changed what, when) |
| Hosting | On-prem IIS/Windows Server, or Azure / Docker – **to be decided** |
| Quality | xUnit tests on the calculation engine (golden test cases from real past months), CI pipeline |

### Core domain entities (first draft)
`Employee`, `SalesHierarchy (Rep→Supervisor→Area→Region)`, `Route`, `Outlet/Customer`, `Product/SKU`, `ProductGroup/Brand`,
`SalesTransaction (invoice lines)`, `Return`, `Collection/Payment`, `Visit` (optional),
`CommissionPlan`, `PlanVersion`, `PlanComponent/Rule`, `Target`, `Period`, `CalculationRun`, `CommissionResult`, `ResultDetail`,
`Adjustment`, `Dispute`, `Approval`, `PayoutBatch`, `AuditLog`.

---

## 3. Phased roadmap (choose how far to go)

| Phase | Scope | Rough effort* |
|---|---|---|
| **Phase 1 – MVP** | Master data, Excel import of sales/returns/collections, configurable plans (tiers, per-case, gate, cap), targets, month-end calculation, rep statement PDF, simple approval, Excel payout export, audit log | 2–3 months, 1–2 devs |
| **Phase 2 – Standard** | Direct ERP/DMS integration, rep & supervisor self-service dashboard (PWA), dispute workflow, multi-level approval, supervisor overrides, clawbacks, Khmer UI, reports | +2–3 months |
| **Phase 3 – Advanced** | Native/mobile app, visit & GPS data from field app, what-if simulator for plan design, accrual posting to GL, leaderboard / gamification, analytics & forecasting | +3–4 months |

\*Indicative only; depends heavily on the answers below.

---

## 4. Scoping questions (please answer – these decide the scope)

### A. Business & sales model
1. Which sales model do outdoor reps use: **pre-sales** (take orders, delivered later), **van sales** (sell & deliver from truck), **merchandisers**, **key-account**, or a mix?
2. How many outdoor sales staff today, and expected in 2–3 years? How many supervisors / area managers?
3. Is commission calculated **monthly**? Any quarterly / annual bonuses?
4. Do you have a **current commission scheme** (Excel)? Can you share a sample (anonymized) month?
5. Which KPIs count today: volume (cases), revenue, new outlets, active outlets, focus SKUs, collection, strike rate, visibility/cooler compliance?
6. Are there **different plans** per channel (General Trade, Modern Trade, HoReCa, wholesaler), per region or per product brand?
7. Are commissions paid on **invoiced** or **collected** sales? How are returns / expired goods / bad debt handled?
8. Do supervisors / managers earn **overrides** on their team?
9. Currency: **USD, KHR or both**? Any tax (salary tax) handled in this system or in payroll?

### B. Data & integration
10. Where do sales transactions come from: **ERP** (SAP B1, SAP S/4, Odoo, Microsoft Dynamics, other?), a **DMS / SFA app**, or Excel?
11. Can we get an **API or direct DB read access**, or only file exports?
12. Is there a field app capturing **visits / GPS / outlet photos** today?
13. Where is the **employee master & hierarchy** maintained (HR system)? Where does payroll run?

### C. Users & access
14. Who uses the system: Sales Ops / Finance admins, supervisors, **reps themselves**, HR, management?
15. Should reps see their own live achievement on **mobile**? Do they have smartphones and data?
16. Company login: **Microsoft 365 / Entra ID**, Google Workspace, or separate accounts?
17. Languages: Khmer, English, or both?

### D. Process & control
18. Approval chain before payout (e.g. Supervisor → Sales Manager → Finance → GM)?
19. Do reps need a formal **dispute** process?
20. Do you need commission **accruals** posted to the general ledger?
21. Audit / compliance requirements (internal audit, group-level reporting)?

### E. Technical & delivery
22. Hosting: **on-premise** server, **Azure**, other cloud?
23. Database preference: SQL Server (licence available?) or PostgreSQL?
24. Team: who builds and maintains it (you alone, in-house team, plus Claude)? Your experience level with Angular / .NET?
25. Target go-live date? Should the first live month run **in parallel** with the current Excel process?
26. Budget constraints for licences / hosting?

---

## 5. Decisions so far (2026-10-21)
| Topic | Decision | Impact on plan |
|---|---|---|
| First release | **MVP first** (Phase 1) | Keep scope to section 3 Phase 1 |
| Data source | **DMS / SFA field app** | Phase 1 imports DMS exports (Excel/CSV); API connector in Phase 2. Visit data is available, so execution KPIs are feasible early |
| KPIs | **Volume/revenue, outlet distribution, collection, visit execution** | Weighted scorecard engine with collection gate is core to MVP |
| Users | **Admin/Finance, supervisors, sales reps, management** | Role-based access needed in MVP; rep view can start as a simple read-only web page, full PWA in Phase 2 |

### 5.1 Group A – Business & sales model
| Q | Answer | Design impact |
|---|---|---|
| A1 Sales model | **Pre-sales, van sales, key account, merchandisers** | Plan is assigned per role; merchandisers need non-sales KPIs (visits, audits) |
| A2 Headcount | **200–500** field staff | Batch calculation must handle ~500 reps × all transactions in minutes; paging on all lists |
| A3 Frequency | **Monthly + quarterly + annual** | Periods form a hierarchy (month → quarter → year); bonus components can read aggregated achievement |
| A6 Plan variety | **By channel, region, brand/SKU and role** | Plan eligibility rules (who gets which plan) + rates/targets that vary by channel/region/product group |
| A7 Sales base | **Not decided – make it configurable** | Each plan component chooses its base: invoiced, invoiced − returns, or collected |
| A8 Overrides | **Yes, on team result** | Supervisor/manager components roll up from the sales hierarchy |
| A9 Currency | **USD and KHR** | Store original currency + exchange rate per transaction; plan defines payout currency; monthly rate table |
| A9 Tax | **Calculated in this system** | Configurable salary-tax bracket table (rates to be confirmed by Finance); statement shows gross, tax, net |

### 5.2 Group B – Data & integration
| Q | Answer | Design impact |
|---|---|---|
| B10 DMS | **In-house built** | We can agree the API contract with the internal team later |
| B11 Access | **API exists, but MVP uses mock / manual data** | MVP: seed mock data generator + Excel/CSV import + manual entry screens; import layer designed so the API connector plugs in later |
| B12 DMS data | **Visits, collections, returns, outlet photos/audits** | All four KPI families are supported by real data later |
| B13 Employees / payroll | **Manual / mock employees for MVP; HR system later** | Employee & hierarchy maintenance screens in MVP; HR sync in a later phase |

### 5.3 Group C – Users & access
| Q | Answer | Design impact |
|---|---|---|
| C15 Rep access | **Mobile web** | Responsive Angular UI; rep "My Commission" page designed mobile-first |
| C16 Login | **Local accounts for now** | ASP.NET Core Identity + JWT, roles: Admin, Finance, Supervisor, Manager, Rep, Viewer; SSO later |
| C17 Language | **English only** | Still keep text in translation files so Khmer can be added later |

### 5.4 Group D – Process & control
| Q | Answer | Design impact |
|---|---|---|
| D18 Approval | **Configurable** | Approval-step templates per plan (e.g. Supervisor → Manager → Finance) |
| D19 Disputes | **Yes, in the system** | Rep raises a dispute on a result line → reviewer resolves → optional adjustment |
| D20 GL accrual | **Accrual list in the system, exportable** | Accrual screen per period (by cost centre/region) + Excel export; no ERP posting |
| D21 Audit | **Full audit** | Approved periods locked; every change logged; reopen needs admin + reason |

### 5.5 Group E – Technical & delivery
| Q | Answer | Design impact |
|---|---|---|
| E22 Hosting | **Local dev only for now** | Run locally; keep it Docker-ready so hosting can be chosen later |
| E23 Database | **PostgreSQL** | EF Core + Npgsql; Postgres via Docker or local install |
| E24 Team | **You + Claude** | Strong conventions, tests on the calculation engine, small vertical slices |
| E25 Timeline | **Demo first, no date** | Goal = end-to-end demo with mock data; go-live decided after demo |
| E26 Budget | *Open* | Stack chosen is free/open-source except optional hosting |

### 5.6 Scope note
Your answers move several items from Phase 2 into the first release: quarterly/annual bonuses, supervisor overrides, dual currency, tax calculation, disputes, configurable approvals and the accrual list.
Proposed split so the demo arrives early:
- **Milestone 1 – Core demo:** master data (manual + mock), plans & targets, monthly calculation for reps (4 KPI families, gate, tiers, cap), USD/KHR, rep mobile view, admin dashboard.
- **Milestone 2 – Control:** configurable approvals, period lock + audit, disputes & adjustments, tax, PDF statements, payout export.
- **Milestone 3 – Extend:** quarterly/annual bonuses, supervisor overrides, accrual list & export, Excel/CSV import.
- **Later:** DMS API connector, HR system sync, SSO, Khmer UI, hosting.

Still open: E26 budget; Finance to confirm salary-tax rules and exchange-rate source.

## 6. Recommended next steps
1. Answer the questions (at least A, B and the top of C/E).
2. Share one real (anonymized) month of commission Excel + the current scheme document.
3. I convert that into: plan-rule specification, data model, and golden test cases.
4. Scaffold the solution (`/src/backend` .NET 10 solution, `/src/frontend` Angular workspace), then build Phase 1 feature by feature.

> Environment note: Node.js v26.1.0 is installed on this machine; no .NET SDK was detected on PATH – install the **.NET 10 SDK** before scaffolding.
