import { invokeLLM } from "./_core/llm";

// ─── Agent Definitions ────────────────────────────────────────────────────────
export interface AgentConfig {
  role: string;
  name: string;
  nameAr: string;
  expertise: string;
  systemPrompt: string;
  systemPromptAr: string;
  color: string;
  icon: string;
}

export const AGENTS: AgentConfig[] = [
  {
    role: "cmo",
    name: "Chief Marketing Officer",
    nameAr: "مدير التسويق التنفيذي",
    expertise: "Overall marketing strategy, brand positioning, budget allocation, ROI optimization",
    color: "#6366f1",
    icon: "👔",
    systemPrompt: `You are the CMO (Chief Marketing Officer) in a multi-agent AI marketing system. 
Your role is to provide strategic oversight and ensure all marketing decisions align with business objectives.
Focus on: overall strategy, brand positioning, budget allocation, ROI, market leadership.
Always provide structured analysis with confidence scores (0.0-1.0).
Be decisive but acknowledge risks. Consider both short-term results and long-term brand equity.`,
    systemPromptAr: `أنت مدير التسويق التنفيذي في نظام تسويق متعدد الوكلاء.
دورك هو توفير الإشراف الاستراتيجي وضمان توافق قرارات التسويق مع أهداف الأعمال.
ركز على: الاستراتيجية الشاملة، تموضع العلامة التجارية، توزيع الميزانية، العائد على الاستثمار.`,
  },
  {
    role: "paid_media_director",
    name: "Paid Media Director",
    nameAr: "مدير الإعلانات المدفوعة",
    expertise: "Meta Ads, Google Ads, TikTok Ads, programmatic buying, ROAS optimization",
    color: "#f59e0b",
    icon: "📢",
    systemPrompt: `You are the Paid Media Director specializing in performance advertising.
Your expertise: Meta Ads, Google Ads, TikTok Ads, programmatic buying, ROAS optimization.
Focus on: channel mix, bid strategies, audience targeting, creative testing, attribution.
Provide specific budget recommendations and expected ROAS for each channel.`,
    systemPromptAr: `أنت مدير الإعلانات المدفوعة المتخصص في الإعلانات الأدائية.
خبرتك: إعلانات ميتا، إعلانات جوجل، إعلانات تيك توك، الشراء البرامجي.
ركز على: مزيج القنوات، استراتيجيات العطاء، استهداف الجمهور، اختبار الإبداعات.`,
  },
  {
    role: "performance_marketing",
    name: "Performance Marketing Lead",
    nameAr: "قائد التسويق الأدائي",
    expertise: "Conversion optimization, A/B testing, funnel analytics, CPA/CPL reduction",
    color: "#10b981",
    icon: "📊",
    systemPrompt: `You are the Performance Marketing Lead focused on measurable results.
Your expertise: conversion optimization, A/B testing, funnel analytics, CPA/CPL reduction.
Focus on: conversion rates, cost per acquisition, funnel optimization, data-driven decisions.
Always quantify expected improvements with specific metrics and timeframes.`,
    systemPromptAr: `أنت قائد التسويق الأدائي المركز على النتائج القابلة للقياس.
خبرتك: تحسين التحويل، اختبار A/B، تحليلات القمع، تقليل تكلفة الاكتساب.`,
  },
  {
    role: "creative_director",
    name: "Creative Director",
    nameAr: "المدير الإبداعي",
    expertise: "Visual identity, campaign concepts, creative strategy, brand storytelling",
    color: "#ec4899",
    icon: "🎨",
    systemPrompt: `You are the Creative Director responsible for visual and conceptual excellence.
Your expertise: visual identity, campaign concepts, creative strategy, brand storytelling.
Focus on: creative differentiation, emotional resonance, visual consistency, campaign narratives.
Evaluate creative approaches for their potential to cut through noise and connect with audiences.`,
    systemPromptAr: `أنت المدير الإبداعي المسؤول عن التميز البصري والمفاهيمي.
خبرتك: الهوية البصرية، مفاهيم الحملات، الاستراتيجية الإبداعية، سرد قصص العلامة التجارية.`,
  },
  {
    role: "copy_chief",
    name: "Copy Chief",
    nameAr: "رئيس كتابة المحتوى",
    expertise: "Copywriting, messaging frameworks, value propositions, tone of voice",
    color: "#8b5cf6",
    icon: "✍️",
    systemPrompt: `You are the Copy Chief responsible for all written communications.
Your expertise: copywriting, messaging frameworks, value propositions, tone of voice.
Focus on: compelling headlines, clear CTAs, consistent brand voice, persuasive messaging.
Evaluate copy for clarity, persuasion, and alignment with brand positioning.`,
    systemPromptAr: `أنت رئيس كتابة المحتوى المسؤول عن جميع الاتصالات المكتوبة.
خبرتك: كتابة الإعلانات، أطر الرسائل، عروض القيمة، نبرة الصوت.`,
  },
  {
    role: "content_strategist",
    name: "Content Strategist",
    nameAr: "استراتيجي المحتوى",
    expertise: "Content marketing, editorial planning, SEO content, thought leadership",
    color: "#06b6d4",
    icon: "📝",
    systemPrompt: `You are the Content Strategist responsible for content marketing excellence.
Your expertise: content marketing, editorial planning, SEO content, thought leadership.
Focus on: content pillars, distribution strategy, audience engagement, organic growth.
Provide specific content recommendations with expected organic reach and engagement metrics.`,
    systemPromptAr: `أنت استراتيجي المحتوى المسؤول عن تميز تسويق المحتوى.
خبرتك: تسويق المحتوى، التخطيط التحريري، محتوى SEO، قيادة الفكر.`,
  },
  {
    role: "funnel_architect",
    name: "Funnel Architect",
    nameAr: "مهندس القمع التسويقي",
    expertise: "Customer journey mapping, conversion funnels, lead nurturing, lifecycle marketing",
    color: "#f97316",
    icon: "🔽",
    systemPrompt: `You are the Funnel Architect specializing in customer journey optimization.
Your expertise: customer journey mapping, conversion funnels, lead nurturing, lifecycle marketing.
Focus on: funnel stages, conversion bottlenecks, nurture sequences, customer lifetime value.
Map out specific funnel stages with expected conversion rates at each step.`,
    systemPromptAr: `أنت مهندس القمع التسويقي المتخصص في تحسين رحلة العميل.
خبرتك: رسم خرائط رحلة العميل، قمع التحويل، رعاية العملاء المحتملين.`,
  },
  {
    role: "crm_expert",
    name: "CRM Expert",
    nameAr: "خبير إدارة علاقات العملاء",
    expertise: "CRM strategy, customer segmentation, retention, loyalty programs, email marketing",
    color: "#84cc16",
    icon: "🤝",
    systemPrompt: `You are the CRM Expert focused on customer relationships and retention.
Your expertise: CRM strategy, customer segmentation, retention, loyalty programs, email marketing.
Focus on: customer lifetime value, churn prevention, segmentation, personalization.
Recommend specific CRM tactics with expected impact on retention and revenue.`,
    systemPromptAr: `أنت خبير إدارة علاقات العملاء المركز على العلاقات والاحتفاظ بالعملاء.
خبرتك: استراتيجية CRM، تقسيم العملاء، الاحتفاظ، برامج الولاء.`,
  },
  {
    role: "seo_strategist",
    name: "SEO Strategist",
    nameAr: "استراتيجي تحسين محركات البحث",
    expertise: "Technical SEO, keyword strategy, link building, local SEO, content optimization",
    color: "#14b8a6",
    icon: "🔍",
    systemPrompt: `You are the SEO Strategist responsible for organic search performance.
Your expertise: technical SEO, keyword strategy, link building, local SEO, content optimization.
Focus on: search visibility, organic traffic growth, keyword rankings, technical health.
Provide specific SEO recommendations with expected traffic impact and timeline.`,
    systemPromptAr: `أنت استراتيجي تحسين محركات البحث المسؤول عن أداء البحث العضوي.
خبرتك: SEO التقني، استراتيجية الكلمات المفتاحية، بناء الروابط.`,
  },
  {
    role: "data_analyst",
    name: "Data Analyst",
    nameAr: "محلل البيانات",
    expertise: "Marketing analytics, attribution modeling, data visualization, predictive analysis",
    color: "#3b82f6",
    icon: "📈",
    systemPrompt: `You are the Data Analyst providing evidence-based insights.
Your expertise: marketing analytics, attribution modeling, data visualization, predictive analysis.
Focus on: data quality, statistical significance, attribution accuracy, actionable insights.
Always ground recommendations in data and flag when assumptions are being made.`,
    systemPromptAr: `أنت محلل البيانات الذي يقدم رؤى مبنية على الأدلة.
خبرتك: تحليلات التسويق، نمذجة الإسناد، تصور البيانات، التحليل التنبؤي.`,
  },
  {
    role: "competitor_analyst",
    name: "Competitor Analyst",
    nameAr: "محلل المنافسين",
    expertise: "Competitive intelligence, market positioning, SWOT analysis, benchmarking",
    color: "#ef4444",
    icon: "🔭",
    systemPrompt: `You are the Competitor Analyst providing competitive intelligence.
Your expertise: competitive intelligence, market positioning, SWOT analysis, benchmarking.
Focus on: competitor strategies, market gaps, differentiation opportunities, threat assessment.
Identify specific competitive advantages and risks with supporting evidence.`,
    systemPromptAr: `أنت محلل المنافسين الذي يقدم الذكاء التنافسي.
خبرتك: الذكاء التنافسي، تموضع السوق، تحليل SWOT، المقارنة المعيارية.`,
  },
  {
    role: "media_buyer",
    name: "Media Buyer",
    nameAr: "مشتري الوسائط",
    expertise: "Media planning, inventory buying, CPM/CPC negotiation, reach and frequency",
    color: "#a855f7",
    icon: "💰",
    systemPrompt: `You are the Media Buyer responsible for efficient media investment.
Your expertise: media planning, inventory buying, CPM/CPC negotiation, reach and frequency.
Focus on: cost efficiency, reach optimization, frequency capping, media mix modeling.
Provide specific media recommendations with estimated costs and reach projections.`,
    systemPromptAr: `أنت مشتري الوسائط المسؤول عن الاستثمار الفعال في الوسائط.
خبرتك: تخطيط الوسائط، شراء المخزون، التفاوض على CPM/CPC.`,
  },
  {
    role: "qa_critic",
    name: "QA Critic",
    nameAr: "ناقد ضمان الجودة",
    expertise: "Quality assurance, risk identification, compliance review, strategy stress-testing",
    color: "#64748b",
    icon: "🔬",
    systemPrompt: `You are the QA Critic responsible for quality assurance and risk management.
Your expertise: quality assurance, risk identification, compliance review, strategy stress-testing.
Focus on: identifying weaknesses, compliance issues, unrealistic assumptions, execution risks.
Be constructively critical - identify specific problems and suggest concrete improvements.
Your job is to stress-test every proposal before it goes to human approval.`,
    systemPromptAr: `أنت ناقد ضمان الجودة المسؤول عن ضمان الجودة وإدارة المخاطر.
خبرتك: ضمان الجودة، تحديد المخاطر، مراجعة الامتثال، اختبار الإجهاد الاستراتيجي.`,
  },
];

export function getAgentByRole(role: string): AgentConfig | undefined {
  return AGENTS.find((a) => a.role === role);
}

// ─── Agent Opinion Generator ──────────────────────────────────────────────────
export interface AgentOpinionResult {
  agentRole: string;
  agentName: string;
  opinion: string;
  opinionAr: string;
  recommendation: string;
  confidence: number;
  /** Risk score 0-1 from structured agent output (0 = no risk, 1 = max risk) */
  risk?: number;
  concerns: string[];
  suggestions: string[];
  votedFor: boolean;
  /** Model routing audit — set by orchestrator when invokeRoutedLLM is used */
  routing?: {
    provider: "local" | "cloud";
    reasons: string[];
    policyVersion: string;
  };
}

export async function generateAgentOpinion(
  agent: AgentConfig,
  proposalContext: string,
  companyContext: string,
  previousOpinions: string,
  round: number,
  language: "en" | "ar" = "en"
): Promise<AgentOpinionResult> {
  const systemPrompt = language === "ar" ? agent.systemPromptAr : agent.systemPrompt;

  const prompt = `
COMPANY CONTEXT:
${companyContext}

PROPOSAL BEING EVALUATED:
${proposalContext}

${previousOpinions ? `PREVIOUS AGENT OPINIONS (Round ${round - 1}):\n${previousOpinions}\n` : ""}

As the ${agent.name}, provide your structured opinion on this proposal.

Respond ONLY with valid JSON in this exact format:
{
  "opinion": "Your detailed professional opinion (2-3 paragraphs)",
  "recommendation": "Your specific recommendation in one sentence",
  "confidence": 0.85,
  "concerns": ["concern 1", "concern 2"],
  "suggestions": ["suggestion 1", "suggestion 2"],
  "votedFor": true
}

Rules:
- confidence: 0.0 to 1.0 (how confident you are in your assessment)
- votedFor: true if you support moving forward, false if you recommend stopping/major revision
- Be specific and professional
- Base your opinion on your area of expertise: ${agent.expertise}
`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "agent_opinion",
          strict: true,
          schema: {
            type: "object",
            properties: {
              opinion: { type: "string" },
              recommendation: { type: "string" },
              confidence: { type: "number" },
              concerns: { type: "array", items: { type: "string" } },
              suggestions: { type: "array", items: { type: "string" } },
              votedFor: { type: "boolean" },
            },
            required: ["opinion", "recommendation", "confidence", "concerns", "suggestions", "votedFor"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const parsed = JSON.parse(content);

    // Generate Arabic version if needed
    let opinionAr = parsed.opinion;
    if (language === "en") {
      // Keep English, Arabic translation is optional for now
      opinionAr = parsed.opinion;
    }

    return {
      agentRole: agent.role,
      agentName: agent.name,
      opinion: parsed.opinion,
      opinionAr,
      recommendation: parsed.recommendation,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      concerns: parsed.concerns ?? [],
      suggestions: parsed.suggestions ?? [],
      votedFor: parsed.votedFor ?? true,
    };
  } catch (err) {
    console.error(`[Agent ${agent.role}] Error generating opinion:`, err);
    return {
      agentRole: agent.role,
      agentName: agent.name,
      opinion: `As ${agent.name}, I was unable to generate a detailed opinion at this time. Please review the proposal manually.`,
      opinionAr: `كـ ${agent.nameAr}، لم أتمكن من توليد رأي مفصل في هذا الوقت.`,
      recommendation: "Manual review required",
      confidence: 0.5,
      concerns: ["System error during analysis"],
      suggestions: ["Retry deliberation"],
      votedFor: true,
    };
  }
}

// ─── Deliberation Orchestrator ────────────────────────────────────────────────
export interface DeliberationResult {
  rounds: number;
  consensusScore: number;
  finalRecommendation: string;
  finalRecommendationAr: string;
  alternativeOptions: string[];
  summary: string;
  summaryAr: string;
  allOpinions: AgentOpinionResult[][];
}

export async function runDeliberation(
  proposalContext: string,
  companyContext: string,
  maxRounds = 2
): Promise<DeliberationResult> {
  const allOpinions: AgentOpinionResult[][] = [];
  let previousOpinionsSummary = "";

  for (let round = 1; round <= maxRounds; round++) {
    const roundOpinions: AgentOpinionResult[] = [];

    // Run all 13 agents in parallel for speed
    const opinionPromises = AGENTS.map((agent) =>
      generateAgentOpinion(agent, proposalContext, companyContext, previousOpinionsSummary, round)
    );

    const results = await Promise.all(opinionPromises);
    roundOpinions.push(...results);
    allOpinions.push(roundOpinions);

    // Build summary for next round
    previousOpinionsSummary = roundOpinions
      .map((o) => `${o.agentName}: ${o.recommendation} (confidence: ${o.confidence.toFixed(2)}, support: ${o.votedFor})`)
      .join("\n");
  }

  // Calculate consensus score
  const lastRound = allOpinions[allOpinions.length - 1];
  const supportingAgents = lastRound.filter((o) => o.votedFor).length;
  const avgConfidence = lastRound.reduce((sum, o) => sum + o.confidence, 0) / lastRound.length;
  const consensusScore = (supportingAgents / lastRound.length) * 0.6 + avgConfidence * 0.4;

  // Generate final synthesis using CMO perspective
  const synthesisPrompt = `
Based on the following agent opinions, provide a final synthesis:

${previousOpinionsSummary}

Provide a JSON response with:
{
  "finalRecommendation": "Clear, actionable final recommendation",
  "finalRecommendationAr": "التوصية النهائية بالعربية",
  "alternativeOptions": ["option 1", "option 2"],
  "summary": "Executive summary of the deliberation",
  "summaryAr": "ملخص تنفيذي للمداولة"
}
`;

  let synthesis = {
    finalRecommendation: "Proceed with the proposal with minor adjustments based on agent feedback.",
    finalRecommendationAr: "المضي قدماً في المقترح مع تعديلات طفيفة بناءً على تعليقات الوكلاء.",
    alternativeOptions: ["Proceed as planned", "Revise budget allocation", "Phase the implementation"],
    summary: `After ${maxRounds} rounds of deliberation with ${AGENTS.length} specialized agents, the consensus score is ${(consensusScore * 100).toFixed(0)}%. ${supportingAgents} of ${AGENTS.length} agents support moving forward.`,
    summaryAr: `بعد ${maxRounds} جولات من المداولة مع ${AGENTS.length} وكيل متخصص، بلغت درجة الإجماع ${(consensusScore * 100).toFixed(0)}٪.`,
  };

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a senior marketing strategist synthesizing multiple expert opinions into a final recommendation." },
        { role: "user", content: synthesisPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "synthesis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              finalRecommendation: { type: "string" },
              finalRecommendationAr: { type: "string" },
              alternativeOptions: { type: "array", items: { type: "string" } },
              summary: { type: "string" },
              summaryAr: { type: "string" },
            },
            required: ["finalRecommendation", "finalRecommendationAr", "alternativeOptions", "summary", "summaryAr"],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    synthesis = { ...synthesis, ...JSON.parse(content) };
  } catch (err) {
    console.error("[Deliberation] Synthesis error:", err);
  }

  return {
    rounds: maxRounds,
    consensusScore,
    finalRecommendation: synthesis.finalRecommendation,
    finalRecommendationAr: synthesis.finalRecommendationAr,
    alternativeOptions: synthesis.alternativeOptions,
    summary: synthesis.summary,
    summaryAr: synthesis.summaryAr,
    allOpinions,
  };
}

// ─── Chat Response Generator ──────────────────────────────────────────────────
export async function generateChatResponse(
  userMessage: string,
  companyContext: string,
  chatHistory: Array<{ role: string; content: string }>,
  language: "en" | "ar" = "en"
): Promise<{ content: string; agentRole: string }> {
  const systemPrompt = language === "ar"
    ? `أنت مساعد تسويق ذكي متعدد الوكلاء. لديك وصول إلى 13 وكيل متخصص في التسويق.
سياق الشركة: ${companyContext}
أجب بالعربية بشكل احترافي ومفيد.`
    : `You are an intelligent multi-agent marketing assistant. You have access to 13 specialized marketing agents.
Company context: ${companyContext}
Respond professionally and helpfully in English.`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...chatHistory.slice(-10).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user" as const, content: userMessage },
  ];

  try {
    const response = await invokeLLM({ messages });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "I'm here to help with your marketing needs.";
    return { content, agentRole: "orchestrator" };
  } catch (err) {
    console.error("[Chat] Error:", err);
    return {
      content: language === "ar"
        ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى."
        : "Sorry, an error occurred. Please try again.",
      agentRole: "orchestrator",
    };
  }
}

// ─── Options Generator ────────────────────────────────────────────────────────
export interface ProposalOption {
  optionIndex: number;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  scores: {
    feasibility: number;
    roi: number;
    risk: number;
    speed: number;
    brandFit: number;
    overall: number;
  };
  pros: string[];
  cons: string[];
  estimatedBudget?: number;
  estimatedTimeline?: string;
  channels?: string[];
  isRecommended: boolean;
  whyRecommended?: string;
  whyOthersRejected?: string;
  agentVotes: Array<{ agentRole: string; votedFor: boolean; reason: string }>;
}

export async function generateProposalOptions(
  proposalContext: string,
  companyContext: string,
  agentOpinions: AgentOpinionResult[]
): Promise<ProposalOption[]> {
  const opinionsSummary = agentOpinions
    .map((o) => `${o.agentName}: ${o.recommendation} (confidence: ${o.confidence.toFixed(2)})`)
    .join("\n");

  const prompt = `Based on this proposal and expert agent opinions, generate 3 distinct strategic options (conservative, balanced, aggressive).

COMPANY CONTEXT: ${companyContext}
PROPOSAL: ${proposalContext}
AGENT OPINIONS: ${opinionsSummary}

Return JSON with an "options" array of 3 items, each having: optionIndex(1-3), title, titleAr, description, descriptionAr, scores(feasibility/roi/risk/speed/brandFit/overall 0-10), pros(array), cons(array), estimatedBudget(number), estimatedTimeline(string), channels(array), isRecommended(bool), whyRecommended(string), whyOthersRejected(string).`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a senior marketing strategist. Generate 3 strategic options as JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "proposal_options",
          strict: true,
          schema: {
            type: "object",
            properties: {
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    optionIndex: { type: "integer" },
                    title: { type: "string" },
                    titleAr: { type: "string" },
                    description: { type: "string" },
                    descriptionAr: { type: "string" },
                    scores: {
                      type: "object",
                      properties: {
                        feasibility: { type: "number" },
                        roi: { type: "number" },
                        risk: { type: "number" },
                        speed: { type: "number" },
                        brandFit: { type: "number" },
                        overall: { type: "number" },
                      },
                      required: ["feasibility", "roi", "risk", "speed", "brandFit", "overall"],
                      additionalProperties: false,
                    },
                    pros: { type: "array", items: { type: "string" } },
                    cons: { type: "array", items: { type: "string" } },
                    estimatedBudget: { type: "number" },
                    estimatedTimeline: { type: "string" },
                    channels: { type: "array", items: { type: "string" } },
                    isRecommended: { type: "boolean" },
                    whyRecommended: { type: "string" },
                    whyOthersRejected: { type: "string" },
                  },
                  required: ["optionIndex", "title", "titleAr", "description", "descriptionAr", "scores", "pros", "cons", "estimatedTimeline", "channels", "isRecommended", "whyRecommended", "whyOthersRejected"],
                  additionalProperties: false,
                },
              },
            },
            required: ["options"],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    const parsed = JSON.parse(content);
    return (parsed.options ?? []).map((opt: any) => ({
      ...opt,
      agentVotes: agentOpinions.slice(0, 5).map((o) => ({
        agentRole: o.agentRole,
        votedFor: o.votedFor,
        reason: o.recommendation,
      })),
    }));
  } catch (err) {
    console.error("[Options Generator] Error:", err);
    return [
      {
        optionIndex: 1, title: "Conservative Approach", titleAr: "النهج المحافظ",
        description: "A low-risk, phased approach focusing on proven channels.",
        descriptionAr: "نهج منخفض المخاطر ومرحلي يركز على القنوات المثبتة.",
        scores: { feasibility: 9, roi: 6, risk: 2, speed: 5, brandFit: 7, overall: 6 },
        pros: ["Low risk", "Easy to implement", "Predictable results"],
        cons: ["Slower growth", "May miss opportunities"],
        estimatedTimeline: "8-12 weeks", channels: ["Email", "SEO", "Organic Social"],
        isRecommended: false, whyRecommended: "", whyOthersRejected: "Too conservative", agentVotes: [],
      },
      {
        optionIndex: 2, title: "Balanced Strategy", titleAr: "الاستراتيجية المتوازنة",
        description: "A balanced mix of paid and organic channels.",
        descriptionAr: "مزيج متوازن من القنوات المدفوعة والعضوية.",
        scores: { feasibility: 8, roi: 7.5, risk: 5, speed: 7, brandFit: 8, overall: 7.5 },
        pros: ["Balanced risk/reward", "Flexible", "Multi-channel"],
        cons: ["Requires coordination", "Medium complexity"],
        estimatedTimeline: "6-8 weeks", channels: ["Paid Social", "SEO", "Email", "Content"],
        isRecommended: true, whyRecommended: "Best balance of risk, ROI, and feasibility", whyOthersRejected: "", agentVotes: [],
      },
      {
        optionIndex: 3, title: "Aggressive Growth", titleAr: "النمو العدواني",
        description: "High-budget, multi-channel blitz for rapid market penetration.",
        descriptionAr: "حملة متعددة القنوات بميزانية عالية.",
        scores: { feasibility: 6, roi: 9, risk: 8, speed: 9, brandFit: 7, overall: 7 },
        pros: ["Fast results", "Maximum reach", "Competitive advantage"],
        cons: ["High budget", "High risk", "Resource intensive"],
        estimatedTimeline: "3-4 weeks", channels: ["Paid Social", "Google Ads", "Influencers", "PR"],
        isRecommended: false, whyRecommended: "", whyOthersRejected: "Risk level too high", agentVotes: [],
      },
    ];
  }
}

// ─── Execution Preview Generator ─────────────────────────────────────────────
export async function generateExecutionPreview(
  proposal: { title: string; description?: string; type: string; budget?: number },
  recommendedOption: ProposalOption,
  companyContext: string
): Promise<{
  campaignStructure: Record<string, unknown>;
  adPreviews: Array<Record<string, unknown>>;
  executionSteps: Array<Record<string, unknown>>;
}> {
  const prompt = `Generate a detailed execution preview for this approved marketing proposal.
PROPOSAL: ${proposal.title} (${proposal.type})
BUDGET: ${proposal.budget ? `$${proposal.budget}` : "TBD"}
RECOMMENDED OPTION: ${recommendedOption.title}
CHANNELS: ${recommendedOption.channels?.join(", ")}
COMPANY: ${companyContext}

Return JSON with: campaignStructure(object with name/objective/targetAudience/budget_breakdown array/kpis array), adPreviews(array of 3 with channel/format/headline/body/cta/estimatedReach/estimatedCPC), executionSteps(array of 6 steps with step/title/description/owner/duration/dependencies array/status).`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a marketing execution specialist. Generate detailed execution plans as JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "execution_preview",
          strict: true,
          schema: {
            type: "object",
            properties: {
              campaignStructure: { type: "object", additionalProperties: true },
              adPreviews: { type: "array", items: { type: "object", additionalProperties: true } },
              executionSteps: { type: "array", items: { type: "object", additionalProperties: true } },
            },
            required: ["campaignStructure", "adPreviews", "executionSteps"],
            additionalProperties: false,
          },
        },
      },
    });
    const rawContent = response.choices[0]?.message?.content;
    const content = typeof rawContent === "string" ? rawContent : "{}";
    return JSON.parse(content);
  } catch (err) {
    console.error("[Execution Preview] Error:", err);
    return {
      campaignStructure: {
        name: proposal.title,
        objective: "Drive brand awareness and conversions",
        targetAudience: "Based on company profile",
        budget_breakdown: [],
        kpis: [{ metric: "Impressions", target: "500,000" }, { metric: "ROAS", target: "3.5x" }],
      },
      adPreviews: [
        { channel: "Meta Ads", format: "Single Image", headline: proposal.title, body: "Click to learn more.", cta: "Learn More", estimatedReach: "50,000-80,000", estimatedCPC: "$0.85" },
      ],
      executionSteps: [
        { step: 1, title: "Brief & Creative Direction", description: "Finalize creative brief", owner: "Creative Director", duration: "3 days", dependencies: [], status: "pending" },
        { step: 2, title: "Asset Production", description: "Produce all creative assets", owner: "Creative Team", duration: "5 days", dependencies: ["Brief"], status: "pending" },
        { step: 3, title: "Campaign Setup", description: "Set up campaigns in ad platforms", owner: "Paid Media", duration: "2 days", dependencies: ["Assets"], status: "pending" },
        { step: 4, title: "QA & Review", description: "Quality check all assets", owner: "QA Team", duration: "1 day", dependencies: ["Setup"], status: "pending" },
        { step: 5, title: "Launch", description: "Go live with all campaigns", owner: "Media Buyer", duration: "1 day", dependencies: ["QA"], status: "pending" },
        { step: 6, title: "Monitor & Optimize", description: "Daily monitoring and optimization", owner: "Performance Team", duration: "Ongoing", dependencies: ["Launch"], status: "pending" },
      ],
    };
  }
}
