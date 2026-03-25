# AI Marketing OS - Todo

## Phase 1: Database Schema + Backend Core
- [x] Database schema (companies, agents, proposals, deliberations, approvals, audit_logs, notifications)
- [x] Company isolation helpers in db.ts
- [x] Agents registry + 13 agent definitions
- [x] Deliberation engine (multi-agent consensus)
- [x] Approval system (approve/reject/revise + versioning)
- [x] Audit logging (full traceability)
- [x] tRPC routers: companies, proposals, approvals, agents, notifications, deliberation
- [x] i18n shared constants (EN + AR)

## Phase 2: Frontend Foundation
- [x] Global theme + index.css design tokens
- [x] i18n context + hook (EN/AR switching)
- [x] DashboardLayout customization for AI Marketing OS
- [x] Company switcher component
- [x] Sidebar navigation with i18n labels
- [x] App.tsx routes setup

## Phase 3: Frontend Pages
- [x] Dashboard home (KPIs + recent activity)
- [x] Chat Control Center (AI conversation + command interface)
- [x] Proposals page (list + create + view)
- [x] Approvals panel (pending + history + approve/reject)
- [x] Notifications panel
- [x] Agents page (registry + status)
- [x] Audit log viewer

## Phase 4: Seed Data + Testing
- [x] Seed script (2 demo companies + realistic proposals + deliberations + approvals)
- [x] Vitest tests for routers (auth.logout + seed.test - 12 tests passing)
- [x] Final checkpoint + delivery

## Phase 5: Deliberation Engine (Real)
- [ ] Multi-agent deliberation with per-agent independent analysis
- [ ] Option generation: multiple strategy options per proposal
- [ ] Option evaluation matrix with scoring per agent
- [ ] Best option recommendation with reasoning
- [ ] Decision trace: why chosen, why alternatives rejected
- [ ] Multi-round consensus with agent opinion evolution
- [ ] Deliberation trigger from UI (manual + auto)

## Phase 6: Approval State Machine (Full)
- [ ] 10-state lifecycle: draft → proposed → under_deliberation → pending_approval → approved → rejected → needs_revision → ready_for_execution → executed → rolled_back
- [ ] State transition guards (no skipping states)
- [ ] Versioning + revision history
- [ ] Approval/rejection reasons stored
- [ ] Alternative suggestions on rejection
- [ ] Full audit trail per state change

## Phase 7: Company Memory System (Real)
- [ ] Per-company isolated memory store
- [ ] Memory categories: decisions, analyses, campaigns, results, brand, audience, competitors
- [ ] Memory retrieval API for agents
- [ ] Memory search (keyword + semantic)
- [ ] Memory used in deliberation context injection

## Phase 8: File Upload + Knowledge Extraction
- [ ] S3-backed file upload (brand guidelines, briefs, reports, assets)
- [ ] LLM-based knowledge extraction from uploaded files
- [ ] Extracted knowledge stored in company memory
- [ ] Asset categorization (logo, creative, document, report)
- [ ] Brand understanding builder from uploaded files

## Phase 9: Ubuntu-like Desktop UI
- [ ] Desktop shell with dock/app launcher
- [ ] Window manager (draggable/resizable panels)
- [ ] App icons for each module
- [ ] Notifications center overlay
- [ ] Approvals inbox panel
- [ ] Company switcher in dock
- [ ] Workspace concept (per-company context)

## Phase 10: Chat/Terminal Control Center
- [ ] Full command interface (not just chat)
- [ ] Company context commands: @company, /analyze, /propose, /approve, /reject
- [ ] Agent dispatch from terminal
- [ ] Decision history retrieval from terminal
- [ ] Streaming responses with agent attribution
- [ ] Command history and shortcuts

## Phase 11: Decision Engine + Budget Engine
- [ ] Strategy proposal generator (LLM-powered, memory-aware)
- [ ] Budget allocation engine with channel recommendations
- [ ] Alternative budget scenarios
- [ ] Reasoning explanation for every suggestion
- [ ] Linked to company past performance data

## Phase 12: Execution Preview Workflow
- [ ] Ad creative preview (Facebook Feed, Instagram, Stories, Reels)
- [ ] Campaign structure preview
- [ ] Step-by-step execution plan
- [ ] Asset sufficiency check
- [ ] Preview approval gate (cannot execute without preview approval)

## Phase 13: Notifications System (Real)
- [ ] Real-time notification delivery
- [ ] Notification types: approval_request, deliberation_complete, rejection, revision_needed, anomaly, opportunity
- [ ] Filterable by company, type, date
- [ ] Action-linked (click → go to relevant entity)
- [ ] Unread count in dock/sidebar

## Phase 14: Phase 2 Milestone (Completed)
- [x] Extended schema: company_files, proposal_options, decision_trace, execution_previews
- [x] db.ts helpers for all new tables + getApprovalByProposal
- [x] Options Generator: 3 strategic options with ROI/feasibility/risk/speed scores
- [x] Execution Preview generator (LLM-powered)
- [x] Ubuntu-like Desktop UI: top panel, dock, app launcher, window frame with traffic lights
- [x] ProposalDetail: full deliberation visualization, options comparison, approval decision panel
- [x] Dashboard: correct status filters + real KPIs from DB
- [x] getByProposal procedure in approvals router
- [x] generateOptions + executionPreview procedures in proposals router
- [x] 12 tests passing (auth.logout + seed data validation)

## Phase 15: Knowledge Upload + External Research (Completed)
- [x] Schema: external_research_requests table (status, approval gate, sources, result)
- [x] File upload endpoint: S3 base64 + LLM knowledge extraction → company memory
- [x] Knowledge injection into deliberation context via buildCompanyContext()
- [x] Companies page: 4 tabs (Overview, Knowledge Files, External Research, Memory)
- [x] External research approval gate: shows what/where/why/frequency before execution
- [x] Research executor: LLM-powered company profile → memory save
- [x] Chat: can suggest external research but cannot execute it directly
- [x] Governed self-improvement: proposals only, no auto-install
- [x] Notifications overlay panel in top bar (slide-in)
- [x] 12 tests passing (auth.logout + seed data validation)

## Phase 16: Autonomous Marketing Intelligence System

### 16A: Learning Loop System
- [ ] Schema: learnings table (event_type, entity_id, what_happened, why_succeeded, why_failed, pattern, rule, confidence, company_id)
- [ ] Schema: system_rules table (rule_text, source_learning_ids, applies_to, confidence, approved_by_human, company_id)
- [ ] LearningEngine: extractLearning() — analyzes every approval/rejection/result event via LLM
- [ ] LearningEngine: generateRule() — converts patterns into actionable rules
- [ ] Auto-trigger: on approval, rejection, revision → extract learning automatically
- [ ] learningsRouter: list, get, approve rule, reject rule
- [ ] Learnings injected into agent deliberation context

### 16B: Decision Scoring System
- [ ] Every proposal option gets: score (0-10), confidence (%), risk (low/medium/high), expected_outcome, reasoning
- [ ] Option comparison matrix UI: A vs B vs C with scoring breakdown
- [ ] Decision score stored in proposal_options table (already has score fields — wire them up)
- [ ] Score displayed prominently in ProposalDetail and Approvals panel

### 16C: Closed-Loop Architecture
- [ ] Schema: campaign_results table (proposal_id, actual_roas, actual_cpa, actual_reach, actual_conversions, period, notes)
- [ ] Results entry UI in ProposalDetail (post-execution tab)
- [ ] Auto-learning trigger: when results entered → extract learning → update memory
- [ ] Loop visualization: proposal → approval → execution → results → learning → next proposal

### 16D: Memory-Driven Intelligence
- [ ] buildCompanyContext() injected into ALL agent reasoning (not just deliberation)
- [ ] Past decisions summary injected into new proposal generation
- [ ] Personalization layer: track owner approval patterns → build owner_preferences memory
- [ ] Owner preference learning: what types of proposals get approved/rejected

### 16E: Predictive Intelligence
- [ ] predictiveRouter: forecastROAS, forecastCPA, scenarioModel
- [ ] Scenario modeling: budget +20%, budget -20%, creative change, audience expansion
- [ ] Confidence range (best/worst case) for each forecast
- [ ] Predictions displayed in ProposalDetail Options tab

### 16F: Pattern & Insight Engine
- [ ] patternRouter: discoverPatterns, getInsights
- [ ] Pattern types: timing patterns, budget patterns, audience patterns, creative patterns
- [ ] Insight generation: "Proposals with budget >$50k have 80% approval rate"
- [ ] Patterns displayed in Intelligence Dashboard

### 16G: Intelligence Dashboard
- [x] New page: /intelligence — unified view (Learnings | Rules | Campaign Results | Governance)
- [ ] Tabs: Patterns | Predictions | Self-Improvement Proposals (pending)
- [ ] Self-improvement proposals: system suggests new agents/skills, requires human approval
- [ ] Trust & Transparency: every decision has full reasoning chain visible

## Phase 17: Core Marketing Pipeline (COMPLETED)
- [x] DB migration: project_pipeline, competitor_profiles, personas, master_strategy tables
- [x] Schema: ProjectPipeline, CompetitorProfile, Persona, MasterStrategy types
- [x] server/pipeline.ts: business understanding, competitor discovery, persona generation, strategy generation
- [x] All CRUD helpers: pipeline, competitors, personas, strategy
- [x] pipelineRouter: 17 procedures in routers.ts
- [x] Pipeline page (/pipeline): Business Understanding → Competitors → Personas → Strategy journey
- [x] Strategy page (/strategy): full master strategy viewer with channels, funnel, content, SEO, paid, automation, KPIs
- [x] Routes + navigation (Pipeline + Strategy in dock)
