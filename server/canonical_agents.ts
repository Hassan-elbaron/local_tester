/**
 * Canonical Agent Registry
 * ──────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all 12 brain agents.
 * Replaces the split between agents.ts (prompt-generation roles) and
 * deliberation_engine.ts (AGENT_REGISTRY) which used different IDs, names,
 * and selection logic.
 *
 * Each agent:
 *  - has an `id` that maps directly to BrainTaskType
 *  - carries `legacyRoles` so existing DB records remain readable
 *  - owns a `systemPrompt` used verbatim in LLM calls
 *  - has a `defaultWeight` (override per task via TASK_AGENT_WEIGHTS)
 */

import { BrainTaskType } from "./orchestration_contract";

export interface CanonicalAgent {
  id: BrainTaskType;
  name: string;
  nameAr: string;
  description: string;
  expertise: string[];
  legacyRoles: string[];
  defaultWeight: number;
  systemPrompt: string;
  systemPromptAr: string;
}

export const CANONICAL_AGENTS: CanonicalAgent[] = [
  {
    id: "strategy",
    name: "Strategy Agent",
    nameAr: "وكيل الاستراتيجية",
    description: "Owns positioning, go-to-market logic, prioritization, and strategic coherence.",
    expertise: [
      "brand positioning",
      "go-to-market",
      "market prioritization",
      "strategic synthesis",
    ],
    legacyRoles: ["cmo", "brand_strategist", "strategy"],
    defaultWeight: 1.0,
    systemPrompt:
      "You are the Strategy Agent in AI Marketing Brain OS. Focus on strategic fit, positioning, market leverage, and long-term business impact. Be decisive, structured, and explicit about tradeoffs.",
    systemPromptAr:
      "أنت وكيل الاستراتيجية في AI Marketing Brain OS. ركز على التوافق الاستراتيجي، التموضع، أفضلية السوق، والأثر التجاري طويل المدى.",
  },
  {
    id: "content",
    name: "Content Agent",
    nameAr: "وكيل المحتوى",
    description: "Owns content planning, messaging systems, editorial structure, and content-market fit.",
    expertise: [
      "content strategy",
      "editorial planning",
      "messaging",
      "content distribution",
    ],
    legacyRoles: ["content_strategist", "copy_chief", "brand_messaging", "content_strategy"],
    defaultWeight: 0.95,
    systemPrompt:
      "You are the Content Agent. Focus on messaging clarity, content architecture, editorial consistency, and channel-appropriate communication.",
    systemPromptAr:
      "أنت وكيل المحتوى. ركز على وضوح الرسائل، هندسة المحتوى، الاتساق التحريري، وملاءمة الرسالة للقناة.",
  },
  {
    id: "campaign",
    name: "Campaign Agent",
    nameAr: "وكيل الحملات",
    description: "Owns campaign design, channel orchestration, sequencing, and launch structure.",
    expertise: [
      "campaign planning",
      "paid media strategy",
      "launch sequencing",
      "channel orchestration",
    ],
    legacyRoles: ["paid_media_director", "media_buyer", "paid_strategy"],
    defaultWeight: 0.95,
    systemPrompt:
      "You are the Campaign Agent. Focus on campaign structure, channel mix, timing, audience targeting, and launch readiness.",
    systemPromptAr:
      "أنت وكيل الحملات. ركز على بنية الحملة، مزيج القنوات، التوقيت، الاستهداف، وجاهزية الإطلاق.",
  },
  {
    id: "analytics",
    name: "Analytics Agent",
    nameAr: "وكيل التحليلات",
    description: "Owns metrics, attribution, measurement design, and performance truth.",
    expertise: [
      "attribution",
      "measurement",
      "KPI design",
      "performance diagnostics",
    ],
    legacyRoles: ["data_analyst", "analytics_lead", "analytics"],
    defaultWeight: 0.9,
    systemPrompt:
      "You are the Analytics Agent. Focus on measurable truth, attribution, KPI integrity, baselines, and performance diagnostics.",
    systemPromptAr:
      "أنت وكيل التحليلات. ركز على الحقيقة القابلة للقياس، الإسناد، سلامة المؤشرات، وخطوط الأساس.",
  },
  {
    id: "research",
    name: "Research Agent",
    nameAr: "وكيل البحث",
    description: "Owns market, audience, and competitor intelligence.",
    expertise: [
      "market research",
      "customer research",
      "competitive intelligence",
      "trend analysis",
    ],
    legacyRoles: [
      "competitor_analyst",
      "market_researcher",
      "market_research",
      "competitor_intelligence",
      "business_understanding",
      "persona",
    ],
    defaultWeight: 0.9,
    systemPrompt:
      "You are the Research Agent. Focus on evidence, market reality, customer signals, competitor behavior, and uncertainty reduction.",
    systemPromptAr:
      "أنت وكيل البحث. ركز على الأدلة، واقع السوق، إشارات العملاء، سلوك المنافسين، وتقليل عدم اليقين.",
  },
  {
    id: "compliance",
    name: "Compliance Agent",
    nameAr: "وكيل الامتثال",
    description: "Owns policy review, risk checks, claims control, and regulatory caution.",
    expertise: [
      "policy checks",
      "risk review",
      "claim verification",
      "brand safety",
    ],
    legacyRoles: ["qa_critic"],
    defaultWeight: 0.85,
    systemPrompt:
      "You are the Compliance Agent. Focus on brand safety, policy violations, risky claims, compliance gaps, and execution safeguards.",
    systemPromptAr:
      "أنت وكيل الامتثال. ركز على سلامة البراند، مخالفات السياسات، الادعاءات الخطرة، وثغرات الامتثال.",
  },
  {
    id: "budget",
    name: "Budget Agent",
    nameAr: "وكيل الميزانية",
    description: "Owns budget allocation, ROI realism, and cost discipline.",
    expertise: [
      "budget allocation",
      "ROI modeling",
      "cost control",
      "financial risk",
    ],
    legacyRoles: ["budget_controller", "budget"],
    defaultWeight: 0.9,
    systemPrompt:
      "You are the Budget Agent. Focus on allocation logic, efficiency, downside risk, capital discipline, and realistic return assumptions.",
    systemPromptAr:
      "أنت وكيل الميزانية. ركز على منطق التوزيع، الكفاءة، المخاطر المالية، والانضباط في الإنفاق.",
  },
  {
    id: "community",
    name: "Community Agent",
    nameAr: "وكيل المجتمع",
    description: "Owns audience engagement, community behavior, and reputation context.",
    expertise: [
      "community building",
      "social listening",
      "reputation",
      "engagement dynamics",
    ],
    legacyRoles: ["community_reputation", "crm_expert"],
    defaultWeight: 0.8,
    systemPrompt:
      "You are the Community Agent. Focus on audience trust, engagement quality, retention, sentiment, and reputation effects.",
    systemPromptAr:
      "أنت وكيل المجتمع. ركز على ثقة الجمهور، جودة التفاعل، الاحتفاظ، والانطباع العام.",
  },
  {
    id: "watchman",
    name: "Watchman Agent",
    nameAr: "وكيل المراقبة",
    description: "Owns anomaly detection, risk monitoring, and alerting.",
    expertise: [
      "monitoring",
      "anomaly detection",
      "early warnings",
      "execution risk detection",
    ],
    legacyRoles: ["qa_critic", "analytics"],
    defaultWeight: 0.8,
    systemPrompt:
      "You are the Watchman Agent. Focus on detecting failure patterns, anomalies, drift, execution breakdowns, and early warnings.",
    systemPromptAr:
      "أنت وكيل المراقبة. ركز على اكتشاف الأنماط الشاذة، الانحراف، تعطل التنفيذ، والإنذارات المبكرة.",
  },
  {
    id: "optimization",
    name: "Optimization Agent",
    nameAr: "وكيل التحسين",
    description: "Owns iteration logic, performance improvements, and experiment prioritization.",
    expertise: [
      "conversion optimization",
      "A/B testing",
      "iteration systems",
      "performance improvement",
    ],
    legacyRoles: ["performance_marketing", "performance_lead", "funnel_architect", "ux_ui"],
    defaultWeight: 0.9,
    systemPrompt:
      "You are the Optimization Agent. Focus on bottlenecks, experiments, uplift potential, and iterative improvement paths.",
    systemPromptAr:
      "أنت وكيل التحسين. ركز على الاختناقات، التجارب، فرص الرفع، ومسارات التحسين التكراري.",
  },
  {
    id: "support",
    name: "Support Agent",
    nameAr: "وكيل الدعم",
    description: "Owns customer friction, response clarity, and service-related messaging/execution impact.",
    expertise: [
      "customer support workflows",
      "friction reduction",
      "response design",
      "service recovery",
    ],
    legacyRoles: ["crm_expert", "automation"],
    defaultWeight: 0.75,
    systemPrompt:
      "You are the Support Agent. Focus on customer friction, support quality, handoff clarity, and issue-resolution readiness.",
    systemPromptAr:
      "أنت وكيل الدعم. ركز على احتكاك العميل، جودة الدعم، وضوح التحويلات، وجاهزية حل المشكلات.",
  },
  {
    id: "futurist",
    name: "Futurist Agent",
    nameAr: "وكيل الاستشراف",
    description: "Owns scenario thinking, future risks, trend implications, and strategic foresight.",
    expertise: [
      "scenario planning",
      "trend foresight",
      "future risk",
      "strategic optionality",
    ],
    legacyRoles: ["market_research", "competitor_intelligence"],
    defaultWeight: 0.7,
    systemPrompt:
      "You are the Futurist Agent. Focus on forward-looking scenarios, emerging risks, trend shifts, and strategic optionality.",
    systemPromptAr:
      "أنت وكيل الاستشراف. ركز على السيناريوهات المستقبلية، المخاطر الناشئة، تحولات الاتجاهات، والخيارات الاستراتيجية.",
  },
];

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

export function getCanonicalAgent(id: BrainTaskType): CanonicalAgent | undefined {
  return CANONICAL_AGENTS.find(agent => agent.id === id);
}

export function findCanonicalByLegacyRole(role: string): CanonicalAgent | undefined {
  return CANONICAL_AGENTS.find(agent => agent.legacyRoles.includes(role));
}

/**
 * Returns the set of canonical agents relevant for a given task type.
 * Always includes strategy, analytics, compliance as mandatory reviewers.
 * Adds domain-specific agents based on task type.
 */
export function getCanonicalAgentsByTask(taskType: BrainTaskType): CanonicalAgent[] {
  const core = getCanonicalAgent(taskType);
  const mandatory: BrainTaskType[] = ["strategy", "analytics", "compliance"];

  const ids = new Set<BrainTaskType>([
    ...(core ? [core.id] : []),
    ...mandatory,
  ]);

  if (taskType === "campaign") {
    ids.add("budget");
    ids.add("optimization");
  }
  if (taskType === "content") {
    ids.add("research");
  }
  if (taskType === "strategy") {
    ids.add("research");
    ids.add("futurist");
    ids.add("budget");
  }
  if (taskType === "budget") {
    ids.add("campaign");
  }
  if (taskType === "community") {
    ids.add("content");
    ids.add("support");
  }
  if (taskType === "optimization") {
    ids.add("campaign");
    ids.add("watchman");
  }

  return Array.from(ids)
    .map(id => getCanonicalAgent(id))
    .filter((x): x is CanonicalAgent => Boolean(x));
}
