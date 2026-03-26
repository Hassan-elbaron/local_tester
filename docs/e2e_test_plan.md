# E2E Test Plan — Business Flows

All flows follow: form input → router → orchestrator → deliberation → decision → autonomy gate → execution → receipt → ledger entry in /runs.

---

## Flow 1 — Brand Audit

- **Route**: `/brand-audit`
- **Router**: `brandAudit.run`
- **proposalType**: `research`
- **Autonomy Level**: L2 (recommendation only — executionAllowed=false, requiresHumanApproval=false)
- **Expected Target**: `internal` (no external connector)
- **Expected Execution Gate**: BLOCKED (L2 blocks all execution)
- **Expected receipt.status**: `blocked`
- **Expected externalRef**: null
- **Result path**: `/runs/:taskId` — decision visible, execution shows "blocked"
- **Approval required**: No

### Sample Input
```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "website": "https://acmecorp.com",
  "industry": "SaaS",
  "targetAudience": "SMB owners aged 30-50",
  "notes": "Looking to reposition for enterprise"
}
```

---

## Flow 2 — Strategy Generation

- **Route**: `/strategy-flow`
- **Router**: `strategyFlow.run`
- **proposalType**: `strategy`
- **Autonomy Level**: L2 (recommendation only)
- **Expected Target**: `internal`
- **Expected Execution Gate**: BLOCKED (L2)
- **Expected receipt.status**: `blocked`
- **Expected externalRef**: null
- **Result path**: `/runs/:taskId`
- **Approval required**: No

### Sample Input
```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "industry": "SaaS",
  "businessGoal": "Grow MRR by 40% in 6 months",
  "targetAudience": "SMB founders",
  "currentOffers": "Monthly SaaS subscription",
  "channels": "LinkedIn, Email, SEO",
  "notes": "Focus on inbound"
}
```

---

## Flow 3 — Campaign Launch

- **Route**: `/campaign-launch`
- **Router**: `campaignLaunch.run`
- **proposalType**: `campaign`
- **Autonomy Level**: L3 (requiresHumanApproval=true)
- **Expected Target**: `meta_ads`
- **Expected Execution Gate**: BLOCKED pending approval
- **Expected receipt.status (before approval)**: `blocked`
- **Expected receipt.status (after approval)**: `completed` or `failed` (depends on META ENV)
- **Expected externalRef**: real Meta campaign ID (if META_ACCESS_TOKEN set) or `failed` with error
- **Result path**: `/brain-approvals` → approve → `/runs/:taskId` + `/executions`
- **Approval required**: Yes

### Sample Input
```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "campaignGoal": "Generate 500 leads in 30 days",
  "offer": "Free 14-day trial",
  "audience": "SMB founders, age 30-50",
  "channels": "LinkedIn Ads, Facebook Ads",
  "budget": "$3,000 total",
  "timeline": "30 days starting April 1",
  "landingPage": "https://acmecorp.com/trial",
  "notes": "Focus on conversion not awareness"
}
```

---

## Flow 4 — Content Calendar

- **Route**: `/content-calendar`
- **Router**: `contentCalendar.run`
- **proposalType**: `content`
- **Autonomy Level**: L3 (requiresHumanApproval=true)
- **Expected Target**: `cms`
- **Expected Execution Gate**: BLOCKED pending approval
- **Expected receipt.status (before approval)**: `blocked`
- **Expected receipt.status (after approval)**: `completed` or `failed` (depends on CMS_CONNECTOR_WEBHOOK_URL)
- **Expected externalRef**: content ID/slug from CMS bridge (if set)
- **Result path**: `/brain-approvals` → approve → `/runs/:taskId` + `/executions`
- **Approval required**: Yes

### Sample Input
```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "contentGoal": "Increase LinkedIn engagement by 30% in 60 days",
  "audience": "SMB founders",
  "channels": "LinkedIn, Email Newsletter",
  "contentPillars": "Education, Social Proof, Product, Culture",
  "postingFrequency": "5x/week LinkedIn, 1x/week Email",
  "campaignContext": "Q2 product launch",
  "offers": "Free webinar series",
  "notes": "Tone: professional but conversational"
}
```

---

## Flow 5 — Optimization Loop

- **Route**: `/optimization-loop`
- **Router**: `optimizationLoop.run`
- **proposalType**: `optimization`
- **Autonomy Level**: L4 conditional (auto-execute if confidence ≥ 0.8 AND riskScore ≤ 0.35), else L1 if risk ≥ 0.8
- **Expected Target**: `webhook`
- **Expected Execution Gate**: ALLOWED (if L4 conditions met) or BLOCKED
- **Expected receipt.status**: `completed` (if EXECUTION_WEBHOOK_URL set + L4) or `failed`/`blocked`
- **Expected externalRef**: webhook response ref (if EXECUTION_WEBHOOK_URL set)
- **Result path**: `/runs/:taskId` + `/executions`
- **Approval required**: No (L4 auto-executes when conditions met)

### Sample Input
```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "optimizationGoal": "Improve landing page CVR from 2% to 5%",
  "currentPerformance": "CVR 2.1%, CPC $3.80, ROAS 2.1x, 280 leads/month",
  "bottlenecks": "High bounce rate on LP hero, weak CTA, no social proof above fold",
  "channels": "Google Ads, LinkedIn",
  "audience": "Warm retargeting list",
  "offer": "Free trial",
  "landingPage": "https://acmecorp.com/trial",
  "notes": "A/B test already ran — headline variant won by 12%"
}
```

---

## ENV Requirements Per Flow

| Flow | Required ENV for Full Execution |
|------|---------------------------------|
| Brand Audit | None (internal only) |
| Strategy | None (internal only) |
| Campaign Launch | `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` |
| Content Calendar | `CMS_CONNECTOR_WEBHOOK_URL` |
| Optimization Loop | `EXECUTION_WEBHOOK_URL` (if L4 auto-exec fires) |
| Support flows | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` |
| Community flows | `CRM_CONNECTOR_WEBHOOK_URL` |
