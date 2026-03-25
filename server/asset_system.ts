/**
 * Asset System — Manages creative assets, detects gaps, links to content
 * Reads from companyFiles (uploaded), cross-references content requirements.
 */
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { companyFiles, contentCalendar, companies, assetIntake } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import * as fs from "fs";

async function D() { const d = await getDb(); if (!d) throw new Error("Database not available"); return d; }

function llmText(r: any): string {
  const c = r?.choices?.[0]?.message?.content;
  return typeof c === "string" ? c : JSON.stringify(c ?? "");
}
function parseJSON<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw); } catch { return fallback; }
}

export type AssetItem = {
  id: number; fileName: string; fileUrl: string; mimeType: string;
  fileSize: number; category: string; description: string | null; isImage: boolean;
};

export type AssetGapReport = {
  available: AssetItem[];
  requiredByContent: string[];
  missing: string[];
  gaps: string[];
  recommendations: string[];
  readinessScore: number; // 0-100
};

// ─── Get Available Assets ──────────────────────────────────────────────────────

export async function getCompanyAssets(companyId: number): Promise<AssetItem[]> {
  const db = await D();
  const files = await db.select().from(companyFiles).where(eq(companyFiles.companyId, companyId));
  return files.map(f => ({
    id: f.id,
    fileName: f.fileName,
    fileUrl: f.fileUrl,
    mimeType: f.mimeType,
    fileSize: f.fileSize,
    category: f.category,
    description: f.description ?? null,
    isImage: f.mimeType.startsWith("image/"),
  }));
}

// ─── Asset Gap Detection ───────────────────────────────────────────────────────

export async function detectAssetGaps(companyId: number): Promise<AssetGapReport> {
  const db = await D();

  const contentItems = await db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId));
  const requiredByContent = Array.from(new Set(contentItems.flatMap(i => (i.requiredAssets as string[]) ?? [])));

  const available = await getCompanyAssets(companyId);
  const availableDescriptors = [
    ...available.map(a => a.fileName.toLowerCase()),
    ...available.map(a => a.category.toLowerCase()),
    ...available.filter(a => a.description).map(a => a.description!.toLowerCase()),
  ];

  const missing = requiredByContent.filter(req => {
    const tokens = req.toLowerCase().split(/\s+/);
    return !availableDescriptors.some(d => tokens.some(t => d.includes(t)));
  });

  const [co] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);

  const analysis = await invokeLLM({
    messages: [
      { role: "system", content: "You are a creative asset manager for a marketing team. Respond with valid JSON only." },
      { role: "user", content: `Analyze asset readiness for ${co?.name ?? "this company"} (${co?.industry ?? "unknown industry"}):

Available assets (${available.length} files):
${available.slice(0, 15).map(a => `- ${a.fileName} [${a.category}]`).join("\n") || "None uploaded"}

Required by content calendar:
${requiredByContent.join(", ") || "No content planned yet"}

Already identified missing: ${missing.join(", ") || "none"}

Based on the industry and marketing context, identify:
1. Critical gaps that will block campaign launch (be specific)
2. Asset recommendations to improve performance

JSON: {
  "gaps": ["specific gap 1 (e.g., 'No hero video for awareness campaigns')"],
  "recommendations": ["recommendation 1"],
  "readinessScore": 0-100
}
Return ONLY JSON.` },
    ],
    response_format: { type: "json_object" },
  });

  const llmResult = parseJSON<any>(llmText(analysis), { gaps: [], recommendations: [], readinessScore: 0 });

  return {
    available,
    requiredByContent,
    missing,
    gaps: llmResult.gaps ?? [],
    recommendations: llmResult.recommendations ?? [],
    readinessScore: typeof llmResult.readinessScore === "number" ? llmResult.readinessScore : (available.length > 0 ? 40 : 0),
  };
}

// ─── Asset Mapping to Content ──────────────────────────────────────────────────

export async function runAssetMapping(companyId: number): Promise<{ mapped: number; gaps: AssetGapReport }> {
  const db = await D();

  const contentItems = await db.select().from(contentCalendar).where(eq(contentCalendar.companyId, companyId));
  const available = await getCompanyAssets(companyId);
  const gaps = await detectAssetGaps(companyId);

  const imageAssets = available.filter(a => a.isImage);
  let mapped = 0;

  // Clear old asset intake records for this company
  try {
    await db.delete(assetIntake).where(eq(assetIntake.companyId, companyId));
  } catch {
    console.warn("[asset_system] asset_intake table may not exist yet — run npm run db:push to create it");
  }

  // For each content item, create an asset intake record
  for (const item of contentItems) {
    const required = (item.requiredAssets as string[]) ?? [];

    for (const assetName of required) {
      // Try to find a matching uploaded file
      const match = available.find(asset => {
        const desc = [asset.fileName, asset.category, asset.description ?? ""].join(" ").toLowerCase();
        return assetName.toLowerCase().split(/\s+/).some(token => token.length > 2 && desc.includes(token));
      });

      try {
        await db.insert(assetIntake).values({
          companyId,
          contentItemId: item.id,
          fileId: match?.id ?? undefined,
          assetName,
          assetType: inferAssetType(assetName),
          source: match ? "uploaded" : "missing",
          mappedTo: [item.id],
          gapStatus: match ? "available" : "missing",
          recommendation: match ? undefined : generateAssetRecommendation(assetName, item.platform ?? ""),
        } as any);
      } catch {
        console.warn("[asset_system] Could not insert asset_intake record — table may not exist yet");
      }

      if (match) {
        // Update content item's visual notes with the matched asset
        const updatedNotes = `${item.visualNotes ?? ""}\n[Asset available: ${match.fileName}]`.trim();
        await db.update(contentCalendar)
          .set({ visualNotes: updatedNotes, updatedAt: new Date() })
          .where(and(eq(contentCalendar.id, item.id), eq(contentCalendar.companyId, companyId)));
        mapped++;
      }
    }

    // If item has no required assets listed, create a generic record
    if (required.length === 0) {
      try {
        await db.insert(assetIntake).values({
          companyId,
          contentItemId: item.id,
          assetName: `Generic visual for ${item.platform} ${item.funnelStage} post`,
          assetType: inferAssetType(item.platform ?? ""),
          source: "missing",
          mappedTo: [item.id],
          gapStatus: "partial",
          recommendation: `Create a ${item.funnelStage}-stage visual optimized for ${item.platform}`,
        } as any);
      } catch {
        /* non-critical */
      }
    }
  }

  return { mapped, gaps };
}

function inferAssetType(hint: string): string {
  const h = hint.toLowerCase();
  if (h.includes("video") || h.includes("reel") || h.includes("tiktok") || h.includes("youtube")) return "video";
  if (h.includes("logo")) return "logo";
  if (h.includes("banner") || h.includes("cover")) return "banner";
  if (h.includes("story") || h.includes("stories")) return "story_graphic";
  if (h.includes("product")) return "product_photo";
  if (h.includes("lifestyle")) return "lifestyle_photo";
  if (h.includes("infographic")) return "infographic";
  if (h.includes("carousel")) return "carousel_set";
  return "graphic";
}

function generateAssetRecommendation(assetName: string, platform: string): string {
  const type = inferAssetType(assetName);
  const specs: Record<string, string> = {
    video: `Create a ${platform === "TikTok" || platform === "Instagram" ? "9:16 vertical" : "16:9"} video (15-30 seconds)`,
    logo: "Provide logo in PNG with transparent background, minimum 500×500px",
    banner: "Create banner at 1200×628px for feed, 1080×1080px for square",
    story_graphic: "Design 1080×1920px story graphic with CTA placement",
    product_photo: "Professional product photo on white/neutral background, minimum 1000×1000px",
    lifestyle_photo: "Lifestyle photo showing product in use, authentic and on-brand",
    infographic: "Vertical infographic at 1080×1350px for feed",
    carousel_set: "Set of 3-5 matching slides at 1080×1080px",
    graphic: `Custom graphic optimized for ${platform} — 1080×1080px for feed`,
  };
  return specs[type] ?? `Create ${assetName} optimized for ${platform}`;
}

export async function getAssetIntakeByCompany(companyId: number) {
  const db = await D();
  try {
    return await db.select().from(assetIntake).where(eq(assetIntake.companyId, companyId));
  } catch {
    console.warn("[asset_system] asset_intake table may not exist yet — run npm run db:push");
    return [];
  }
}

export async function getAssetIntakeByContent(companyId: number, contentItemId: number) {
  const db = await D();
  try {
    return await db.select().from(assetIntake)
      .where(and(eq(assetIntake.companyId, companyId), eq(assetIntake.contentItemId, contentItemId)));
  } catch {
    console.warn("[asset_system] asset_intake table may not exist yet — run npm run db:push");
    return [];
  }
}

// ─── Scan Local Upload Folder ─────────────────────────────────────────────────

export async function scanLocalUploadsDir(uploadsPath: string): Promise<string[]> {
  try {
    if (!fs.existsSync(uploadsPath)) return [];
    return fs.readdirSync(uploadsPath).filter(f => !f.startsWith("."));
  } catch {
    return [];
  }
}
