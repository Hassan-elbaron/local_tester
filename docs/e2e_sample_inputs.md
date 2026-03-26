# E2E Sample Inputs

Copy-paste ready payloads for repeating E2E tests on each flow.

---

## Brand Audit

**Endpoint**: `POST /api/trpc/brandAudit.run`

```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "website": "https://acmecorp.com",
  "industry": "SaaS",
  "targetAudience": "SMB owners aged 30-50",
  "notes": "Evaluate positioning vs enterprise competitors"
}
```

**Expected**: decision.recommendation visible, execution blocked (L2 by design)

---

## Strategy Generation

**Endpoint**: `POST /api/trpc/strategyFlow.run`

```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "industry": "SaaS",
  "businessGoal": "Grow MRR by 40% in 6 months",
  "targetAudience": "SMB founders 30-50",
  "currentOffers": "Monthly SaaS subscription $99/mo",
  "channels": "LinkedIn, Email, SEO",
  "notes": "Focus on inbound, minimal paid"
}
```

**Expected**: full strategic plan in decision, execution blocked (L2 by design)

---

## Campaign Launch

**Endpoint**: `POST /api/trpc/campaignLaunch.run`

```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "campaignGoal": "Generate 500 qualified leads in 30 days",
  "offer": "Free 14-day trial, no credit card",
  "audience": "SMB founders age 30-50, interested in productivity tools",
  "channels": "LinkedIn Ads, Facebook Ads",
  "budget": "$3,000 total / $100 per day",
  "timeline": "30 days starting April 1",
  "landingPage": "https://acmecorp.com/trial",
  "notes": "Retargeting allowed. Exclude existing customers."
}
```

**Expected**: run blocked → visible in /brain-approvals → approve → Meta Ads API (requires ENV) or failed with "Missing Meta Ads credentials"

---

## Content Calendar

**Endpoint**: `POST /api/trpc/contentCalendar.run`

```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "contentGoal": "Increase LinkedIn engagement by 30% in 60 days",
  "audience": "SMB founders, marketing managers",
  "channels": "LinkedIn, Email Newsletter, Twitter",
  "contentPillars": "Education, Social Proof, Product Updates, Culture",
  "postingFrequency": "5x/week LinkedIn, 1x/week Email, 3x/week Twitter",
  "campaignContext": "Q2 product launch — new analytics feature",
  "offers": "Free webinar: 'How to scale B2B SaaS'",
  "notes": "Tone: professional but conversational. No jargon."
}
```

**Expected**: run blocked → visible in /brain-approvals → approve → CMS bridge (requires ENV) or failed with "CMS_CONNECTOR_WEBHOOK_URL not set"

---

## Optimization Loop

**Endpoint**: `POST /api/trpc/optimizationLoop.run`

```json
{
  "companyId": 1,
  "brandName": "Acme Corp",
  "optimizationGoal": "Improve landing page CVR from 2.1% to 5%",
  "currentPerformance": "CVR 2.1%, CPC $3.80, ROAS 2.1x, 280 leads/month, 68% bounce on hero",
  "bottlenecks": "Hero section has no social proof. CTA is 'Learn More' not action-oriented. Form has 8 fields.",
  "channels": "Google Ads, LinkedIn Ads",
  "audience": "Warm retargeting list + lookalike",
  "offer": "Free 14-day trial",
  "landingPage": "https://acmecorp.com/trial",
  "notes": "A/B test ran for 2 weeks — headline variant beat control by 12% CVR. Ready for next iteration."
}
```

**Expected**: if L4 conditions met (confidence ≥ 0.8, riskScore ≤ 0.35) → auto-execute → webhook (requires ENV). Otherwise blocked.

---

## Quick Test Sequence (No ENV needed)

Run in this order to verify the full decision + approval + ledger path without external credentials:

1. **Brand Audit** → confirm run appears in `/runs`, decision visible
2. **Strategy** → confirm run appears in `/runs`, decision visible
3. **Campaign Launch** → confirm run appears in `/brain-approvals` with status=planned
4. **Content Calendar** → confirm run appears in `/brain-approvals` with status=planned
5. **Optimization Loop** → confirm run appears in `/runs`, check execution status

All 5 should complete without errors even with empty ENV. External execution will gracefully return `status: failed` with clear error message.
