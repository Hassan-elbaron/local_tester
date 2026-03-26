# Demo Narrative — Demo Coffee

## The Brand
**Company:** Demo Coffee
**Industry:** Specialty Coffee
**Stage:** Established DTC brand, 140 orders/month, growing online presence

---

## The Business Situation
Demo Coffee has a strong product but is leaving revenue on the table:

- **Online sales** are flat — target is +50% growth in Q2
- **Seasonal product line** just launched but traffic is low
- **Social channels** (LinkedIn + Instagram) have declining engagement
- **Checkout funnel** is broken — only 1.8% CVR, 65% cart abandonment, 6-step checkout with no trust signals

They need a system that can think across brand, strategy, content, campaigns, and optimization — simultaneously — without requiring a full marketing team.

---

## What Happens in Each Flow

### 1. Brand Audit
**Input:** Brand name, industry, notes
**What the system does:**
- Deploys 4 agents (Research, Strategy, Analytics, Compliance) in a multi-round deliberation
- Assesses brand positioning clarity, target audience definition, messaging consistency, and competitive differentiation
- Surfaces gaps: weak value proposition, inconsistent tone, unclear ICP

**Business value:**
Before you can grow, you need to know where you're broken. Most brands skip this and waste budget on campaigns built on shaky foundations. The system does it in seconds.

---

### 2. Strategy Generation
**Input:** Brand name, industry, business goal (50% sales growth in Q2)
**What the system does:**
- Generates a full strategic marketing plan
- 30-day: fix brand foundation, define ICP, establish content pillars
- 60-day: launch campaigns, build email sequences, optimize funnel
- 90-day: scale what's working, cut what isn't, expand channels
- Autonomy level: L2 — recommendation only (strategic decisions stay with humans)

**Business value:**
A marketing strategy that would take a consultant 2 weeks and $15,000 — delivered in under 60 seconds, with full reasoning and confidence scores.

---

### 3. Campaign Launch
**Input:** Brand name, campaign goal, channels, budget, target audience
**What the system does:**
- Builds a Meta Ads campaign structure (campaign → ad set → creative brief)
- Targets: Coffee enthusiasts 25–45, interest-based + lookalike
- Budget: $3,000 total across LinkedIn Ads + Facebook Ads
- In production: POSTs directly to Meta Graph API v18.0 to create the campaign
- Returns an external reference (campaign ID) for tracking
- Autonomy level: L3 — requires human approval before execution (real money involved)

**Business value:**
Campaign briefs that used to take a media buyer 3–4 hours now take seconds. The human still approves, but the groundwork is done by the AI.

---

### 4. Content Calendar
**Input:** Brand name, content goal, channels, content pillars, posting frequency
**What the system does:**
- Builds a 30-day content calendar for LinkedIn + Instagram
- Pillars: Education (30%), Behind-the-Scenes (25%), Product (25%), Culture (20%)
- Frequency: 5 posts/week = ~20 posts planned
- Pushes `create_draft` to CMS connector (WordPress/Contentful/Ghost/Strapi)
- Autonomy level: L3 — requires approval before publishing (content is irreversible)

**Business value:**
A content calendar that a social media manager would spend a full day building — done in seconds, pushed directly to the CMS as drafts.

---

### 5. Optimization Loop
**Input:** Current CVR (1.8%), bottlenecks (6-step checkout, no trust badges, slow mobile load)
**What the system does:**
- Diagnoses the performance gap (target: 4% CVR)
- Identifies root causes: checkout friction, trust deficit, performance issues
- Recommends: reduce to 2-step checkout, add trust badges, lazy-load images
- Autonomy level: L4 — **auto-executes** if confidence ≥ 80% and risk ≤ 35%
- Sends optimization directives via webhook to the implementation system

**Business value:**
The only flow that runs without human approval — because the risk is bounded, the evidence is clear, and speed matters for conversion optimization.

---

## Why the Results Matter

| Flow | Output | Business Impact |
|------|--------|----------------|
| Brand Audit | Gaps identified | Saves 2 weeks of brand strategy work |
| Strategy | 30/60/90 plan | Replaces $15K consultant brief |
| Campaign | Meta Ads structure | Media buying brief in seconds |
| Content | 20 posts drafted to CMS | Full month of content in one click |
| Optimization | CVR fix auto-executed | Direct revenue impact: 1.8% → 4% = +122% conversion |

---

## The Unified Story
Demo Coffee came in with flat sales, a broken checkout, and no clear strategy. In under 5 minutes, the AI Marketing Brain OS:
1. Diagnosed what's wrong with the brand
2. Generated a 3-month strategic plan
3. Launched a $3,000 Meta campaign (pending approval)
4. Scheduled 20 pieces of content across 2 channels
5. Auto-fixed the checkout funnel

**No agency. No 3-week turnaround. No black box.**
Every decision is traceable, every execution is logged, every agent opinion is recorded.
