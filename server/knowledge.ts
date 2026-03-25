/**
 * Knowledge Engine
 * - extractKnowledgeFromFile: LLM-based extraction from uploaded file content
 * - executeExternalResearch: web search → structured company profile
 * - buildDeliberationContext: inject company memory into agent prompts
 */
import { invokeLLM } from "./_core/llm";
import { upsertCompanyMemory, getCompanyMemory, getCompanyFiles } from "./db";

// ─── File Knowledge Extraction ────────────────────────────────────────────────

export interface ExtractedKnowledge {
  brandName?: string;
  brandVoice?: string;
  brandColors?: string[];
  brandFonts?: string[];
  targetAudience?: string;
  audienceSegments?: string[];
  valueProposition?: string;
  keyMessages?: string[];
  competitors?: string[];
  marketPosition?: string;
  pricingStrategy?: string;
  channels?: string[];
  contentStyle?: string;
  toneOfVoice?: string;
  industry?: string;
  geography?: string;
  goals?: string[];
  kpis?: string[];
  pastCampaigns?: string[];
  insights?: string[];
  rawSummary: string;
  category: string;
  confidence: number;
}

export async function extractKnowledgeFromFile(params: {
  fileName: string;
  fileCategory: string;
  fileContent?: string;  // text content if extractable
  fileUrl: string;
  companyName: string;
  mimeType: string;
}): Promise<ExtractedKnowledge> {
  const { fileName, fileCategory, fileContent, fileUrl, companyName, mimeType } = params;

  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  const systemPrompt = `You are a brand intelligence analyst. Extract structured knowledge from company files.
Return a JSON object with all relevant brand, audience, strategy, and market information.
Be thorough but only include information that is explicitly present or strongly implied.
Company: ${companyName}`;

  let userText: string;

  if (isImage) {
    userText = `Analyze this ${fileCategory} image file (${fileName}) for company "${companyName}". Extract all brand intelligence including colors, style, tone, target audience, and any visible text or messaging. Image URL: ${fileUrl}`;
  } else if (fileContent) {
    userText = `Analyze this ${fileCategory} document (${fileName}) for company "${companyName}":\n\n${fileContent.slice(0, 8000)}\n\nExtract all brand intelligence.`;
  } else {
    userText = `Based on the file name "${fileName}" (category: ${fileCategory}) for company "${companyName}", extract what you can infer about this company's brand and strategy. Note: file content not available for extraction.`;
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "extracted_knowledge",
        strict: true,
        schema: {
          type: "object",
          properties: {
            brandName: { type: "string" },
            brandVoice: { type: "string" },
            brandColors: { type: "array", items: { type: "string" } },
            brandFonts: { type: "array", items: { type: "string" } },
            targetAudience: { type: "string" },
            audienceSegments: { type: "array", items: { type: "string" } },
            valueProposition: { type: "string" },
            keyMessages: { type: "array", items: { type: "string" } },
            competitors: { type: "array", items: { type: "string" } },
            marketPosition: { type: "string" },
            pricingStrategy: { type: "string" },
            channels: { type: "array", items: { type: "string" } },
            contentStyle: { type: "string" },
            toneOfVoice: { type: "string" },
            industry: { type: "string" },
            geography: { type: "string" },
            goals: { type: "array", items: { type: "string" } },
            kpis: { type: "array", items: { type: "string" } },
            pastCampaigns: { type: "array", items: { type: "string" } },
            insights: { type: "array", items: { type: "string" } },
            rawSummary: { type: "string" },
            category: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["rawSummary", "category", "confidence"],
          additionalProperties: false,
        }
      }
    }
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent ?? "{}");
  try {
    return JSON.parse(content) as ExtractedKnowledge;
  } catch {
    return {
      rawSummary: content,
      category: fileCategory,
      confidence: 0.3,
    };
  }
}

// ─── Save Extracted Knowledge to Company Memory ───────────────────────────────

export async function saveKnowledgeToMemory(
  companyId: number,
  knowledge: ExtractedKnowledge,
  sourceFileName: string
): Promise<number[]> {
  const memoryIds: number[] = [];

  const memoryEntries: Array<{
    key: string;
    value: unknown;
    category: "brand" | "audience" | "competitors" | "strategy" | "guidelines" | "assets";
    source: "file_upload";
  }> = [];

  if (knowledge.brandVoice || knowledge.toneOfVoice || knowledge.contentStyle) {
    memoryEntries.push({
      key: "brand_voice",
      value: {
        voice: knowledge.brandVoice,
        tone: knowledge.toneOfVoice,
        style: knowledge.contentStyle,
        keyMessages: knowledge.keyMessages,
        source: sourceFileName,
      },
      category: "brand",
      source: "file_upload",
    });
  }

  if (knowledge.brandColors?.length || knowledge.brandFonts?.length) {
    memoryEntries.push({
      key: "brand_identity",
      value: {
        colors: knowledge.brandColors,
        fonts: knowledge.brandFonts,
        valueProposition: knowledge.valueProposition,
        source: sourceFileName,
      },
      category: "brand",
      source: "file_upload",
    });
  }

  if (knowledge.targetAudience || knowledge.audienceSegments?.length) {
    memoryEntries.push({
      key: "target_audience",
      value: {
        description: knowledge.targetAudience,
        segments: knowledge.audienceSegments,
        geography: knowledge.geography,
        source: sourceFileName,
      },
      category: "audience",
      source: "file_upload",
    });
  }

  if (knowledge.competitors?.length || knowledge.marketPosition) {
    memoryEntries.push({
      key: "competitive_landscape",
      value: {
        competitors: knowledge.competitors,
        marketPosition: knowledge.marketPosition,
        pricingStrategy: knowledge.pricingStrategy,
        source: sourceFileName,
      },
      category: "competitors",
      source: "file_upload",
    });
  }

  if (knowledge.goals?.length || knowledge.kpis?.length || knowledge.channels?.length) {
    memoryEntries.push({
      key: "strategy_context",
      value: {
        goals: knowledge.goals,
        kpis: knowledge.kpis,
        channels: knowledge.channels,
        industry: knowledge.industry,
        source: sourceFileName,
      },
      category: "strategy",
      source: "file_upload",
    });
  }

  if (knowledge.insights?.length || knowledge.pastCampaigns?.length) {
    memoryEntries.push({
      key: "past_learnings",
      value: {
        insights: knowledge.insights,
        pastCampaigns: knowledge.pastCampaigns,
        source: sourceFileName,
      },
      category: "guidelines",
      source: "file_upload",
    });
  }

  // Always save the full summary
  memoryEntries.push({
    key: `file_knowledge_${sourceFileName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`,
    value: {
      summary: knowledge.rawSummary,
      confidence: knowledge.confidence,
      extractedFrom: sourceFileName,
      category: knowledge.category,
    },
    category: "assets",
    source: "file_upload",
  });

  for (const entry of memoryEntries) {
    await upsertCompanyMemory(
      companyId,
      entry.key,
      entry.value as Record<string, unknown>,
      entry.category,
      { source: entry.source }
    );
    memoryIds.push(Date.now() + Math.random()); // placeholder id
  }

  return memoryIds;
}

// ─── External Research Executor ───────────────────────────────────────────────

export interface CompanyResearchResult {
  companyName: string;
  website?: string;
  industry?: string;
  description?: string;
  founded?: string;
  headquarters?: string;
  teamSize?: string;
  products?: string[];
  services?: string[];
  targetMarkets?: string[];
  brandVoice?: string;
  socialPresence?: Record<string, string>;
  recentNews?: string[];
  competitors?: string[];
  uniqueSellingPoints?: string[];
  marketPosition?: string;
  digitalFootprint?: string;
  contentThemes?: string[];
  summary: string;
  sourcesUsed: string[];
  researchedAt: string;
}

export async function executeExternalResearch(params: {
  companyName: string;
  website?: string;
  searchTargets: string[];
  dataSources: string[];
  researchGoal: string;
}): Promise<CompanyResearchResult> {
  const { companyName, website, searchTargets, researchGoal } = params;

  // Build research prompt — LLM generates structured profile based on what it knows
  // In production, this would use web search APIs; here we use LLM knowledge
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a market intelligence researcher. Build a comprehensive company profile based on publicly available information.
Research targets: ${searchTargets.join(", ")}
Research goal: ${researchGoal}
Be factual. If you don't have reliable information, say so clearly. Do not fabricate data.
Return structured JSON with all available public information about the company.`
      },
      {
        role: "user",
        content: `Research company: "${companyName}"${website ? ` (website: ${website})` : ""}
Build a comprehensive public profile including: industry, products/services, target market, brand voice, digital presence, competitors, and unique positioning.
Focus on: ${searchTargets.join(", ")}`
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "company_research",
        strict: true,
        schema: {
          type: "object",
          properties: {
            companyName: { type: "string" },
            website: { type: "string" },
            industry: { type: "string" },
            description: { type: "string" },
            founded: { type: "string" },
            headquarters: { type: "string" },
            teamSize: { type: "string" },
            products: { type: "array", items: { type: "string" } },
            services: { type: "array", items: { type: "string" } },
            targetMarkets: { type: "array", items: { type: "string" } },
            brandVoice: { type: "string" },
            socialPresence: { type: "object", additionalProperties: { type: "string" } },
            recentNews: { type: "array", items: { type: "string" } },
            competitors: { type: "array", items: { type: "string" } },
            uniqueSellingPoints: { type: "array", items: { type: "string" } },
            marketPosition: { type: "string" },
            digitalFootprint: { type: "string" },
            contentThemes: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
            sourcesUsed: { type: "array", items: { type: "string" } },
            researchedAt: { type: "string" },
          },
          required: ["companyName", "summary", "sourcesUsed", "researchedAt"],
          additionalProperties: false,
        }
      }
    }
  });

  const rawContent2 = response.choices[0]?.message?.content;
  const content = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2 ?? "{}");
  try {
    const result = JSON.parse(content) as CompanyResearchResult;
    result.researchedAt = new Date().toISOString();
    return result;
  } catch {
    return {
      companyName,
      summary: content,
      sourcesUsed: ["LLM knowledge base"],
      researchedAt: new Date().toISOString(),
    };
  }
}

export async function saveResearchToMemory(
  companyId: number,
  research: CompanyResearchResult
): Promise<number[]> {
  const memoryIds: number[] = [];

  const entries = [
    {
      key: "external_company_profile",
      value: { ...research },
      category: "brand" as const,
    },
    ...(research.competitors?.length ? [{
      key: "competitive_landscape",
      value: { competitors: research.competitors, marketPosition: research.marketPosition, source: "external_research" },
      category: "competitors" as const,
    }] : []),
    ...(research.targetMarkets?.length ? [{
      key: "target_audience",
      value: { markets: research.targetMarkets, brandVoice: research.brandVoice, source: "external_research" },
      category: "audience" as const,
    }] : []),
    ...(research.products?.length || research.services?.length ? [{
      key: "products_services",
      value: { products: research.products, services: research.services, usps: research.uniqueSellingPoints, source: "external_research" },
      category: "strategy" as const,
    }] : []),
  ];

  for (const entry of entries) {
    await upsertCompanyMemory(
      companyId,
      entry.key,
      entry.value as Record<string, unknown>,
      entry.category,
      { source: "external_research" }
    );
    memoryIds.push(Date.now() + Math.random()); // placeholder id
  }

  return memoryIds;
}

// ─── Deliberation Context Builder ─────────────────────────────────────────────

export async function buildCompanyContext(companyId: number): Promise<string> {
  const memory = await getCompanyMemory(companyId);
  if (!memory.length) return "";

  const grouped: Record<string, unknown[]> = {};
  for (const item of memory) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item.value);
  }

  const sections: string[] = [];

  if (grouped.brand?.length) {
    sections.push(`## Brand Knowledge\n${JSON.stringify(grouped.brand, null, 2)}`);
  }
  if (grouped.audience?.length) {
    sections.push(`## Target Audience\n${JSON.stringify(grouped.audience, null, 2)}`);
  }
  if (grouped.competitors?.length) {
    sections.push(`## Competitive Landscape\n${JSON.stringify(grouped.competitors, null, 2)}`);
  }
  if (grouped.strategy?.length) {
    sections.push(`## Strategy Context\n${JSON.stringify(grouped.strategy, null, 2)}`);
  }
  if (grouped.decisions?.length) {
    sections.push(`## Past Decisions\n${JSON.stringify(grouped.decisions.slice(-5), null, 2)}`);
  }
  if (grouped.performance?.length) {
    sections.push(`## Performance Data\n${JSON.stringify(grouped.performance.slice(-3), null, 2)}`);
  }

  return sections.length ? `# Company Intelligence Context\n\n${sections.join("\n\n")}` : "";
}
