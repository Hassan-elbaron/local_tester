# AI Marketing Brain OS — Project File Map

> Complete index of every file in the project, organized by layer and function.
> Last updated: 2026-03-27

---

## Root

| File | Purpose |
|------|---------|
| `package.json` | Monorepo dependencies (React + Node.js + tRPC + Drizzle) |
| `tsconfig.json` | TypeScript compiler config |
| `vite.config.ts` | Vite bundler config (client dev server + SSR proxy) |
| `vitest.config.ts` | Unit test runner config |
| `drizzle.config.ts` | Drizzle ORM migration config → MySQL |
| `components.json` | shadcn/ui component registry config |
| `docker-compose.yml` | Docker stack (app + MySQL) |
| `Dockerfile` | Production container definition |
| `.env` | Environment variables (DB, AI, integrations, DEMO_MODE) |
| `pnpm-lock.yaml` | Locked dependency tree |

---

## Root Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `SETUP.md` | Local development setup guide |
| `DEPLOYMENT_GUIDE.md` | Production deployment instructions |
| `PRODUCTION_READY_SUMMARY.md` | Production readiness checklist |
| `PRODUCTION_V4_GUIDE.md` | V4 production architecture guide |
| `OPTIMIZATION_GUIDE.md` | Performance optimization notes |
| `SAAS_READY_SUMMARY.md` | SaaS preparation checklist |
| `REFACTOR_SUMMARY.md` | Architecture refactor history |
| `EXAMPLES.md` | Usage examples and code snippets |

---

## /docs — Project Documentation

| File | Purpose |
|------|---------|
| `project_map.md` | This file — complete project file index |
| `business_flows.md` | All 5 business flows: inputs, outputs, agents, routing |
| `demo_walkthrough_script.md` | 3-minute investor/client demo script with talking points |
| `demo_narrative.md` | Demo Coffee unified story — business situation + flow outcomes |
| `e2e_test_plan.md` | End-to-end test plan for all 5 flows |
| `e2e_test_results.md` | E2E test results with pass/fail status |
| `e2e_sample_inputs.md` | Sample input payloads for manual testing |

---

## /drizzle — Database Layer

| File | Purpose |
|------|---------|
| `schema.ts` | All DB table definitions + TypeScript types (source of truth) |
| `relations.ts` | Drizzle table relationship definitions |
| `0000_*.sql` → `0011_*.sql` | Migration files (applied in order) |
| `meta/` | Drizzle migration metadata |
| `migrations/` | Migration state snapshots |

---

## /server — Backend

### Core Entry

| File | Purpose |
|------|---------|
| `routers.ts` | Main tRPC router — registers all sub-routers |
| `db.ts` | Database connection factory (`getDb()`) |
| `orchestration_contract.ts` | Shared TypeScript contracts: BrainTask, BrainDecision, BrainRunResult, ExecutionReceipt, etc. |

### Orchestration Engine

| File | Purpose |
|------|---------|
| `orchestrator.ts` | Multi-agent deliberation engine — routes agents, runs rounds, produces BrainRunResult. DEMO_MODE execution bypass lives here. |
| `autonomy_policy.ts` | Pure autonomy level decision (L1–L5) by task type, risk score, and confidence. No demo awareness. |
| `execution_gate.ts` | Hard gate between BrainDecision and execution — checks executionAllowed, requiresHumanApproval, status, taskId |
| `execution_receipts.ts` | Execution adapter registry + `runExecutionWithReceipt()` + `persistExecutionReceipt()` |
| `flow_execution_payloads.ts` | Typed payload builders for each flow → feeds the correct adapter (campaign→Meta, content→CMS, etc.) |
| `orchestration_contract.ts` | All shared types used across orchestration |
| `agent_protocol.ts` | AgentInputEnvelope, AgentOutputEnvelope, AGENT_JSON_INSTRUCTION — agent I/O contracts |
| `canonical_agents.ts` | 13 canonical agent definitions with domain weights and model assignments |
| `agents.ts` | Agent registry + AgentOpinionResult type |
| `system_guard.ts` | Duplicate execution guard, infinite loop prevention, run slot management |
| `decision_ledger.ts` | Persists BrainRunResult to DB (brain_runs table) |
| `deliberation_engine.ts` | Multi-round deliberation helper (proposal → critique → revision → scoring → final) |

### Business Flows

| File | Purpose |
|------|---------|
| `flows/brand_audit.ts` | Brand Audit flow — proposalType=`research`, L2 autonomy |
| `flows/strategy_flow.ts` | Strategy Generation flow — proposalType=`strategy`, L2 autonomy |
| `flows/campaign_launch.ts` | Campaign Launch flow — proposalType=`campaign`, L3 → Meta Ads |
| `flows/content_calendar.ts` | Content Calendar flow — proposalType=`content`, L3 → CMS |
| `flows/optimization_loop.ts` | Optimization Loop flow — proposalType=`optimization`, L4 → Webhook |

### Execution Adapters

| File | Target | Credentials Required |
|------|--------|---------------------|
| `execution_adapters/meta_ads_adapter.ts` | `meta_ads` | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` |
| `execution_adapters/sendgrid_email_adapter.ts` | `sendgrid_email` | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |
| `execution_adapters/crm_adapter.ts` | `crm` | `CRM_CONNECTOR_WEBHOOK_URL` |
| `execution_adapters/cms_adapter.ts` | `cms` | `CMS_CONNECTOR_WEBHOOK_URL` |
| `execution_adapters/webhook_adapter.ts` | `webhook` | `EXECUTION_WEBHOOK_URL` |
| `execution_adapters/email_adapter.ts` | `email` | `EMAIL_CONNECTOR_WEBHOOK_URL` (legacy fallback) |

### Intelligence & Memory

| File | Purpose |
|------|---------|
| `hybrid_memory.ts` | Build memory context + extract learnings + write memories per run |
| `memory.ts` | Company memory CRUD (read/write/query) |
| `intelligence.ts` | Learning loop — rules, patterns, intelligence context builder |
| `learning_engine.ts` | Extracts structured learnings from run outcomes |
| `knowledge.ts` | File extraction + company context builder for deliberation |

### Pipeline & Strategy

| File | Purpose |
|------|---------|
| `pipeline.ts` | Marketing pipeline: Business Understanding → Competitors → Personas → Strategy |
| `strategy_versioning.ts` | Strategy version management and history |

### Analytics & Intelligence Modules

| File | Purpose |
|------|---------|
| `decision_engine.ts` | Proposal scoring and decision support |
| `behavior_intelligence.ts` | Behavioral analytics and pattern recognition |
| `brand_guardian.ts` | Brand consistency monitoring |
| `customer_intelligence.ts` | Customer segmentation and insights |
| `seo_engine.ts` | SEO analysis and recommendations |
| `predictive_engine.ts` | Predictive analytics and forecasting |
| `monitoring_service.ts` | System health monitoring |
| `observability.ts` | Metrics, connector status, agent performance queries |
| `asset_system.ts` | Creative asset management |
| `copy_engine.ts` | Copywriting generation |
| `command_center.ts` | Command center orchestration |
| `agent_metrics.ts` | Agent performance tracking |
| `model_policy.ts` | Model selection policy per task type |
| `model_router.ts` | Routes LLM calls to the correct model |
| `replay_service.ts` | Run replay and re-execution |
| `execution.ts` | Execution management and history |
| `execution_pipeline.ts` | Pipeline execution utilities |

### Approvals & Notifications

| File | Purpose |
|------|---------|
| `approval_router.ts` | tRPC router for proposal approvals |
| `approval_service.ts` | Approval business logic |
| `storage.ts` | S3-backed file upload and retrieval |

### _core (Framework Utilities)

| File | Purpose |
|------|---------|
| `_core/trpc.ts` | tRPC instance + `protectedProcedure` + `router` factory |
| `_core/llm.ts` | `invokeLLM()` — Gemini via OpenAI-compatible API |
| `_core/oauth.ts` | OAuth authentication flow |
| `_core/env.ts` | Environment variable validation |
| `_core/context.ts` | tRPC request context (user, db) |
| `_core/cookies.ts` | Cookie handling |
| `_core/sdk.ts` | SDK utilities |
| `_core/dataApi.ts` | Data API helpers |
| `_core/systemRouter.ts` | System-level tRPC routes |
| `_core/notification.ts` | Notification dispatch |
| `_core/imageGeneration.ts` | Image generation integration |
| `_core/voiceTranscription.ts` | Voice transcription integration |
| `_core/map.ts` | Map/geolocation utilities |
| `_core/vite.ts` | Vite server integration for SSR |
| `_core/index.ts` | Core exports |
| `_core/types/` | Core TypeScript type definitions |

---

## /client/src — Frontend

### Application Shell

| File | Purpose |
|------|---------|
| `main.tsx` | React app entry point |
| `App.tsx` | Route definitions (all pages) + AuthGate + ThemeProvider |
| `index.css` | Global styles + Tailwind base |
| `const.ts` | Frontend constants (login URL, etc.) |

### Components

| File | Purpose |
|------|---------|
| `components/DesktopEnvironment.tsx` | Main OS shell — left dock, top panel, window frame, APP_DEFS nav registry |
| `components/AIChatBox.tsx` | Floating AI chat launcher |
| `components/DashboardLayout.tsx` | Dashboard grid layout wrapper |
| `components/DashboardLayoutSkeleton.tsx` | Loading skeleton for dashboard |
| `components/ErrorBoundary.tsx` | React error boundary |
| `components/ManusDialog.tsx` | Manus-style dialog component |
| `components/Map.tsx` | Map visualization component |
| `components/MarketingLayout.tsx` | Marketing page layout wrapper |
| `components/ui/` | shadcn/ui component library (button, card, table, badge, tabs, etc.) |

### Contexts

| File | Purpose |
|------|---------|
| `contexts/ThemeContext.tsx` | Dark/light theme provider |
| `contexts/i18nContext.tsx` | Bilingual (EN/AR) translation provider |
| `contexts/CompanyContext.tsx` | Active company selection context |

### Hooks

| File | Purpose |
|------|---------|
| `_core/hooks/useAuth.ts` | Authentication state hook |
| `hooks/` | Additional custom hooks |

### Lib

| File | Purpose |
|------|---------|
| `lib/trpc.ts` | tRPC client setup + React Query provider |
| `lib/translations.ts` | Complete EN + AR translation strings |
| `lib/utils.ts` | Utility functions (cn, formatters) |
| `lib/catalogs.ts` | Static catalog data |

### Pages — Core

| File | Route | Purpose |
|------|-------|---------|
| `pages/OverviewPage.tsx` | `/overview` | Executive summary: capabilities, flows, integrations, console |
| `pages/DemoPage.tsx` | `/demo` | End-to-end demo with 5 hardcoded flow buttons (Demo Coffee) |
| `pages/Dashboard.tsx` | `/` | Main dashboard |
| `pages/Pipeline.tsx` | `/pipeline` | Marketing Pipeline (Business Understanding → Strategy) |
| `pages/Strategy.tsx` | `/strategy` | Master Strategy view |
| `pages/Execution.tsx` | `/execution` | Execution management |

### Pages — Business Flows

| File | Route | Purpose |
|------|-------|---------|
| `pages/FlowsIndexPage.tsx` | `/flows` | Index of all 5 business flows |
| `pages/BrandAuditPage.tsx` | `/brand-audit` | Brand Audit flow (4 tabs: Decision/Deliberation/Memory/Execution) |
| `pages/StrategyFlowPage.tsx` | `/strategy-flow` | Strategy Generation flow |
| `pages/CampaignLaunchPage.tsx` | `/campaign-launch` | Campaign Launch flow → Meta Ads |
| `pages/ContentCalendarPage.tsx` | `/content-calendar` | Content Calendar flow → CMS |
| `pages/OptimizationLoopPage.tsx` | `/optimization-loop` | Optimization Loop flow → Webhook |

### Pages — Operations Console

| File | Route | Purpose |
|------|-------|---------|
| `pages/RunsPage.tsx` | `/runs` | All brain runs with status and summary |
| `pages/RunDetailPage.tsx` | `/runs/:taskId` | Full deliberation trace for a single run |
| `pages/BrainApprovalsPage.tsx` | `/brain-approvals` | L3 approval queue — approve/reject pending decisions |
| `pages/ExecutionsPage.tsx` | `/executions` | Execution receipt history |
| `pages/ExecutionDetailPage.tsx` | `/executions/:taskId` | Single execution receipt detail |
| `pages/MemoryPage.tsx` | `/memory` | Company memory index |
| `pages/MemoryDetailPage.tsx` | `/memory/:key` | Single memory entry detail |
| `pages/ObservabilityPage.tsx` | `/observability` | System health, connectors, agent performance |

### Pages — Analytics

| File | Route | Purpose |
|------|-------|---------|
| `pages/Monitoring.tsx` | `/monitoring` | Real-time monitoring |
| `pages/SeoPage.tsx` | `/seo` | SEO analysis dashboard |
| `pages/BrandPage.tsx` | `/brand` | Brand health metrics |
| `pages/CustomersPage.tsx` | `/customers` | Customer intelligence |
| `pages/BehaviorPage.tsx` | `/behavior` | Behavioral analytics |
| `pages/PredictionsPage.tsx` | `/predictions` | Predictive analytics |
| `pages/DecisionsPage.tsx` | `/decisions` | Decision history and scoring |
| `pages/Intelligence.tsx` | `/intelligence` | Intelligence center |

### Pages — System

| File | Route | Purpose |
|------|-------|---------|
| `pages/Proposals.tsx` | `/proposals` | Proposal list |
| `pages/ProposalDetail.tsx` | `/proposals/:id` | Proposal detail with options |
| `pages/Approvals.tsx` | `/approvals` | Human approval queue |
| `pages/Notifications.tsx` | `/notifications` | Notification center |
| `pages/Agents.tsx` | `/agents` | Agent registry and performance |
| `pages/AuditLog.tsx` | `/audit` | Full system audit log |
| `pages/Companies.tsx` | `/companies` | Companies with Knowledge/Files/Research/Memory tabs |
| `pages/LearningPage.tsx` | `/learning` | Learning loop dashboard |
| `pages/SkillsHub.tsx` | `/skills` | Skills and plugins |
| `pages/ExpansionCenter.tsx` | `/expansion` | Market expansion center |
| `pages/CommandCenter.tsx` | `/command` | Command center |
| `pages/ChatControl.tsx` | `/chat` | Chat control center |
| `pages/Settings.tsx` | `/settings` | System settings |
| `pages/NotFound.tsx` | `/404` | 404 page |

---

## /shared — Shared Types

| File | Purpose |
|------|---------|
| `shared/types.ts` | Shared TypeScript types (client + server) |
| `shared/const.ts` | Shared constants |
| `shared/_core/` | Shared core utilities |

---

## /scripts

| File | Purpose |
|------|---------|
| `scripts/start-db.ps1` | PowerShell script to start local MySQL instance |

---

## Autonomy Level Reference

| Level | Behavior | Assigned To |
|-------|----------|-------------|
| L1 | Insight only — no recommendation, no execution | `compliance` (always), risk ≥ 0.8 (override) |
| L2 | Recommendation only — no execution gate | `strategy`, `analytics`, `research`, `budget`, `watchman`, `futurist` |
| L3 | Requires explicit human approval | `content`, `campaign`, `community`, `support` |
| L4 | Auto-execute if confidence ≥ 80% + risk ≤ 35% | `optimization` |
| L5 | Full autonomy — reserved, not assigned by default | (none in production) |

---

## Environment Variables Reference

| Variable | Used By | Required |
|----------|---------|----------|
| `DATABASE_URL` | `server/db.ts` | ✅ Always |
| `BUILT_IN_FORGE_API_KEY` | `server/_core/llm.ts` | ✅ Always |
| `BUILT_IN_FORGE_API_URL` | `server/_core/llm.ts` | ✅ Always |
| `DEMO_MODE` | `orchestrator.ts` (gate bypass) + all adapters | — (`false` = production) |
| `META_ACCESS_TOKEN` | `meta_ads_adapter.ts` | Campaign flows |
| `META_AD_ACCOUNT_ID` | `meta_ads_adapter.ts` | Campaign flows |
| `SENDGRID_API_KEY` | `sendgrid_email_adapter.ts` | Support flows |
| `SENDGRID_FROM_EMAIL` | `sendgrid_email_adapter.ts` | Support flows |
| `CRM_CONNECTOR_WEBHOOK_URL` | `crm_adapter.ts` | Community flows |
| `CRM_CONNECTOR_SECRET` | `crm_adapter.ts` | Optional |
| `CMS_CONNECTOR_WEBHOOK_URL` | `cms_adapter.ts` | Content flows |
| `CMS_CONNECTOR_SECRET` | `cms_adapter.ts` | Optional |
| `EXECUTION_WEBHOOK_URL` | `webhook_adapter.ts` | Optimization flows |
| `EXECUTION_WEBHOOK_SECRET` | `webhook_adapter.ts` | Optional |
| `JWT_SECRET` | `_core/oauth.ts` | Auth |
| `OAUTH_SERVER_URL` | `_core/oauth.ts` | Production auth |
