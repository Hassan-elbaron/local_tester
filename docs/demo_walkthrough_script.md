# AI Marketing Brain OS — 3-Minute Demo Walkthrough Script

**Use Case:** Investor / Client live demo
**Brand:** Demo Coffee
**Mode:** `DEMO_MODE=true` — all external calls simulated, no API keys required
**Entry point:** `/demo`

---

## Pre-Demo Setup (30 seconds)
1. Open the app in browser
2. Navigate to `/demo` from the top of the left dock (flask icon)
3. Confirm you see "Demo Coffee" as the brand name in the page header
4. All 5 step buttons should be idle (not loading)

---

## Step 1 — Brand Audit (30 seconds)
**What to say:**
> "The system starts by auditing the brand — assessing positioning, messaging gaps, and audience clarity. This runs through 4 specialist AI agents in a deliberation round."

**Action:** Click **Run** on *1. Brand Audit*

**What to show:**
- Loading state ("Running…")
- Result appears: Decision recommendation + Confidence %
- Execution status: `completed`
- Click **View Full Run →** to show the full deliberation trace in `/runs/:id`

**Key point to highlight:**
> "Every decision is traceable — who said what, why, with what confidence. No black box."

---

## Step 2 — Strategy Generation (30 seconds)
**What to say:**
> "Based on the audit, the system generates a full strategic marketing plan — 30/60/90-day actions, aligned to the business goal of 50% sales growth in Q2."

**Action:** Click **Run** on *2. Strategy Generation*

**What to show:**
- Confidence score (typically 75–85%)
- Decision: `proceed` or `approve`
- Execution: `completed`

**Key point:**
> "Strategy is L2 — recommendation only. It never auto-executes. It feeds humans, not replaces them."

---

## Step 3 — Campaign Launch (30 seconds)
**What to say:**
> "Now the system plans a Meta Ads campaign for the seasonal product line — audience, budget, creative direction — and would push it to Meta Graph API in production."

**Action:** Click **Run** on *3. Campaign Launch*

**What to show:**
- External Ref: `demo_meta_campaign_123`
- Execution: `completed`
- This is what gets sent to Meta Ads in real mode

**Key point:**
> "In production, this creates a real Meta campaign. In demo, it returns a simulated reference. The payload structure is identical."

---

## Step 4 — Content Calendar (20 seconds)
**What to say:**
> "The system builds a content plan — 5 posts per week across LinkedIn and Instagram — and pushes a draft to the CMS."

**Action:** Click **Run** on *4. Content Calendar*

**What to show:**
- External Ref: `demo_cms_post_321`
- CMS action: `create_draft`

---

## Step 5 — Optimization Loop (20 seconds)
**What to say:**
> "Finally, the system diagnoses performance bottlenecks — checkout conversion is at 1.8%, with 65% cart abandonment — and auto-executes optimizations because confidence is high and risk is low."

**Action:** Click **Run** on *5. Optimization Loop*

**What to show:**
- Autonomy level: L4 (auto-execute, no human needed)
- This is the only flow that bypasses approval — by policy design

**Key point:**
> "Every flow has a different autonomy level — the system knows what it can decide alone and what needs a human."

---

## Closing — Operations Console (30 seconds)
**Navigate to the footer links:**

| Screen | What to show |
|--------|-------------|
| `/runs` | All 5 runs just executed — full deliberation history |
| `/brain-approvals` | Approval queue (L3 flows waiting for human) |
| `/executions` | Execution receipts — what was sent where |
| `/memory` | What the system learned from these runs |
| `/observability` | System health, connector status, agent performance |

**Closing line:**
> "This isn't a chatbot. It deliberates, it decides, it executes, it learns — and it logs everything for audit. Five flows. Five integrations. One brain."

---

## Timing Summary

| Segment | Time |
|---------|------|
| Setup | 0:30 |
| Brand Audit | 0:30 |
| Strategy | 0:30 |
| Campaign | 0:30 |
| Content | 0:20 |
| Optimization | 0:20 |
| Console tour | 0:30 |
| **Total** | **~3:30** |
