# Business Flows

All flows are thin wrappers over `runOrchestratedDeliberation()`.
No new core logic. No new execution engines.

Every flow:
1. Creates a proposal in DB
2. Calls `runOrchestratedDeliberation({ proposalId, companyId, proposalType, proposalContext })`
3. Returns a unified output shape
4. Saves a brain run ledger entry → visible in `/runs`
5. If approval required → visible in `/brain-approvals`
6. If execution fires → visible in `/executions` and `/observability`

---

## Output Shape (all flows identical)

```ts
{
  proposalId:   number;
  taskId:       string | null;
  decision:     BrainDecision | null;
  deliberation: {
    id:                  number;
    finalRecommendation: string;
    consensusScore:      number;      // 0–1
    escalated:           boolean;
    selectedAgents:      string[];
    dissentSummary:      { agentRole: string; concern: string }[];
  };
  memoryWrites: MemoryWriteRequest[];
  execution:    ExecutionReceipt | null;
  guardBlocked: { guard: string; reason: string } | null;
}
```

---

## Flow 1 — Brand Audit

- **Route**: `/brand-audit`
- **Router**: `brandAudit.run`
- **File**: `server/flows/brand_audit.ts`
- **proposalType**: `research`
- **Required fields**: `companyId`, `brandName`
- **Optional fields**: `website`, `industry`, `targetAudience`, `notes`
- **Output**: See unified shape above
- **Autonomy**: L2 (research → human approval by default)

---

## Flow 2 — Strategy Generation

- **Route**: `/strategy-flow`
- **Router**: `strategyFlow.run`
- **File**: `server/flows/strategy_flow.ts`
- **proposalType**: `strategy`
- **Required fields**: `companyId`, `brandName`, `businessGoal`
- **Optional fields**: `industry`, `targetAudience`, `currentOffers`, `channels`, `notes`
- **Output**: See unified shape above
- **Autonomy**: L2 (strategy → human approval by default)

---

## Flow 3 — Campaign Launch

- **Route**: `/campaign-launch`
- **Router**: `campaignLaunch.run`
- **File**: `server/flows/campaign_launch.ts`
- **proposalType**: `campaign`
- **Required fields**: `companyId`, `brandName`, `campaignGoal`
- **Optional fields**: `offer`, `audience`, `channels`, `budget`, `timeline`, `landingPage`, `notes`
- **Output**: See unified shape above
- **Autonomy**: L3 (campaign → human approval by default; routes to webhook if approved)

---

## Flow 4 — Content Calendar

- **Route**: `/content-calendar`
- **Router**: `contentCalendar.run`
- **File**: `server/flows/content_calendar.ts`
- **proposalType**: `content`
- **Required fields**: `companyId`, `brandName`, `contentGoal`
- **Optional fields**: `audience`, `channels`, `contentPillars`, `postingFrequency`, `campaignContext`, `offers`, `notes`
- **Output**: See unified shape above
- **Autonomy**: L3 (content → human approval by default; routes to webhook/email if approved)

---

## Flow 5 — Optimization Loop

- **Route**: `/optimization-loop`
- **Router**: `optimizationLoop.run`
- **File**: `server/flows/optimization_loop.ts`
- **proposalType**: `optimization`
- **Required fields**: `companyId`, `brandName`, `optimizationGoal`
- **Optional fields**: `currentPerformance`, `bottlenecks`, `channels`, `audience`, `offer`, `landingPage`, `notes`
- **Output**: See unified shape above
- **Autonomy**: L4 (optimization → auto-execute if confidence ≥ 0.8 and riskScore ≤ 0.35)

---

## Index Page

- **Route**: `/flows`
- Lists all 5 flows with name, proposalType, description, and Open link

---

## Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| Backend file | `snake_case.ts` | `campaign_launch.ts` |
| Router name (appRouter) | `camelCase` | `campaignLaunch` |
| tRPC endpoint | `<router>.run` | `campaignLaunch.run` |
| Frontend file | `PascalCase.tsx` | `CampaignLaunchPage.tsx` |
| URL route | `kebab-case` | `/campaign-launch` |

---

## Operations Console Integration

| Action | Where |
|--------|-------|
| All runs (any flow) | `/runs` |
| Pending approvals | `/brain-approvals` |
| Execution logs | `/executions` |
| Brain memory | `/memory` |
| System observability | `/observability` |
