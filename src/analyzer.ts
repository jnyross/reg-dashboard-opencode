import { CrawledItem } from "./crawler";

export type AgeBracket = "13-15" | "16-18" | "both" | "unknown";

export type RegulationStage =
  | "proposed"
  | "introduced"
  | "committee_review"
  | "passed"
  | "enacted"
  | "effective"
  | "amended"
  | "withdrawn"
  | "rejected";

export interface AnalyzedItem {
  sourceId: string;
  url: string;
  title: string;
  rawContent: string;
  publishedDate?: string;
  isRelevant: boolean;
  jurisdictionCountry: string;
  jurisdictionState?: string;
  stage: RegulationStage;
  ageBracket: AgeBracket;
  affectedProducts: string[];
  summary: string;
  businessImpact: string;
  requiredSolutions: string[];
  competitorResponses: string[];
  impactScore: number;
  likelihoodScore: number;
  confidenceScore: number;
  chiliScore: number;
  analyzedAt: string;
}

const STAGE_KEYWORDS: Record<RegulationStage, string[]> = {
  proposed: ["proposed", "draft", "consultation", "request for comment"],
  introduced: ["introduced", "filed", "submitted", "bill introduced"],
  committee_review: ["committee", "subcommittee", "markup", "amendment"],
  passed: ["passed", "approved", "adopted", "voted"],
  enacted: ["enacted", "signed", "promulgated"],
  effective: ["effective", "in force", "commenced"],
  amended: ["amended", "modified", "revised", "updated"],
  withdrawn: ["withdrawn", "repealed", "struck"],
  rejected: ["rejected", "denied", "dismissed", "struck down"],
};

const PRODUCT_KEYWORDS: Record<string, string[]> = {
  "Facebook": ["facebook", "fb", "meta facebook"],
  "Instagram": ["instagram", "ig"],
  "WhatsApp": ["whatsapp", "wa"],
  "Threads": ["threads"],
  "Meta Quest": ["quest", "vr", "virtual reality", "metaverse"],
  "Reality Labs": ["reality labs"],
  "Meta AI": ["meta ai", "llama", "ai assistant"],
  "Advertising": ["advertising", "ad", "ads", "targeting"],
};

function detectStage(text: string): RegulationStage {
  const lowerText = text.toLowerCase();

  for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
    if (keywords.some((kw) => lowerText.includes(kw))) {
      return stage as RegulationStage;
    }
  }

  return "proposed";
}

function detectAgeBracket(text: string): AgeBracket {
  const lowerText = text.toLowerCase();

  const hasUnder16 = /\b(under\s*16|under\s*13|under\s*15|13.*15|13-?15|younger\s*than\s*1[56])\b/.test(lowerText);
  const has16to18 = /\b(16.*18|16-?18|16\s*to\s*18|teenager|youth|adolescent)\b/.test(lowerText);
  const hasAllAges = /\b(minor|child|children|childhood|age\s*appropriate|safe\s*for\s*kids)\b/.test(lowerText);

  if (hasUnder16 && has16to18) return "both";
  if (hasUnder16) return "13-15";
  if (has16to18 || hasAllAges) return "16-18";
  return "unknown";
}

function detectProducts(text: string): string[] {
  const detected: string[] = [];

  for (const [product, keywords] of Object.entries(PRODUCT_KEYWORDS)) {
    if (keywords.some((kw) => text.toLowerCase().includes(kw))) {
      detected.push(product);
    }
  }

  return [...new Set(detected)];
}

function extractJurisdiction(text: string): { country: string; state?: string } {
  const countryPatterns: Record<string, RegExp> = {
    "United States": /\b(united\s*states|u\.?s\.?|usa|america)\b/i,
    "European Union": /\b(european\s*union|eu|european\s*commission|europe)\b/i,
    "United Kingdom": /\b(united\s*kingdom|u\.?k\.?|britain|england|ofcom)\b/i,
    Australia: /\b(australia|australian|aussie)\b/i,
    Canada: /\b(canada|canadian|crtc)\b/i,
    Germany: /\b(germany|german|deutschland|bundestag)\b/i,
    France: /\b(france|french|france\s*cnil)\b/i,
    Ireland: /\b(ireland|irish|data\s*protection\s*commission)\b/i,
    Singapore: /\b(singapore|singaporean|pdpc)\b/i,
    Japan: /\b(japan|japanese|ppm)\b/i,
    Brazil: /\b(brazil|brazilian|lgpd)\b/i,
    India: /\b(india|indian|digital\s*personal\s*data)\b/i,
  };

  for (const [country, pattern] of Object.entries(countryPatterns)) {
    if (pattern.test(text)) {
      const stateMatch = text.match(/\b(california|new\s*york|texas|florida|washington)\b/i);
      if (country === "United States" && stateMatch) {
        return { country, state: stateMatch[1] };
      }
      return { country };
    }
  }

  return { country: "Unknown" };
}

const ANALYSIS_PROMPT = `You are an expert analyst reviewing regulatory news for Meta. Analyze this regulatory item and extract structured data.

Determine if this item is about teen/child online regulation affecting Meta (Facebook, Instagram, WhatsApp, etc.). If NOT relevant, return only: {"isRelevant": false}

If RELEVANT, extract:
- jurisdiction (country and optionally state)
- stage (proposed/introduced/committee_review/passed/enacted/effective/amended/withdrawn/rejected)
- age bracket (13-15 / 16-18 / both)
- affected Meta products
- summary (2-3 sentences)
- business impact
- required solutions
- competitor responses mentioned

Also score:
- impact (1-5): How much this affects Meta's business
- likelihood (1-5): How likely this is to become law
- confidence (1-5): How confident you are in this analysis
- chili (1-5): Spiciness/urgency level

Return ONLY valid JSON in this exact format:
{
  "isRelevant": true/false,
  "jurisdictionCountry": "Country name",
  "jurisdictionState": "State (if US)",
  "stage": "stage name",
  "ageBracket": "13-15/16-18/both/unknown",
  "affectedProducts": ["product1", "product2"],
  "summary": "2-3 sentence summary",
  "businessImpact": "1-2 sentence impact",
  "requiredSolutions": ["solution1"],
  "competitorResponses": ["response1"],
  "impactScore": 1-5,
  "likelihoodScore": 1-5,
  "confidenceScore": 1-5,
  "chiliScore": 1-5
}`;

export async function analyzeItem(item: CrawledItem): Promise<AnalyzedItem> {
  const apiKey = process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    return createFallbackAnalysis(item);
  }

  try {
    const response = await fetch("https://api.minimax.io/anthropic", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "minimax-coding-plan/MiniMax-M2.5",
        messages: [
          { role: "system", content: ANALYSIS_PROMPT },
          {
            role: "user",
            content: `Title: ${item.title}\n\nContent: ${item.content.substring(0, 3000)}`,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as {
      content?: Array<{ text?: string }>;
    };
    
    const content = data.content?.[0]?.text || "";
    const parsed = JSON.parse(content);

    if (!parsed.isRelevant) {
      return {
        sourceId: item.sourceId,
        url: item.url,
        title: item.title,
        rawContent: item.content,
        publishedDate: item.publishedDate,
        isRelevant: false,
        jurisdictionCountry: "Unknown",
        stage: "proposed",
        ageBracket: "unknown",
        affectedProducts: [],
        summary: "",
        businessImpact: "",
        requiredSolutions: [],
        competitorResponses: [],
        impactScore: 1,
        likelihoodScore: 1,
        confidenceScore: 1,
        chiliScore: 1,
        analyzedAt: new Date().toISOString(),
      };
    }

    return {
      sourceId: item.sourceId,
      url: item.url,
      title: item.title,
      rawContent: item.content,
      publishedDate: item.publishedDate,
      isRelevant: true,
      jurisdictionCountry: parsed.jurisdictionCountry || "Unknown",
      jurisdictionState: parsed.jurisdictionState,
      stage: parsed.stage || "proposed",
      ageBracket: parsed.ageBracket || "unknown",
      affectedProducts: parsed.affectedProducts || [],
      summary: parsed.summary || "",
      businessImpact: parsed.businessImpact || "",
      requiredSolutions: parsed.requiredSolutions || [],
      competitorResponses: parsed.competitorResponses || [],
      impactScore: Math.min(5, Math.max(1, parsed.impactScore || 3)),
      likelihoodScore: Math.min(5, Math.max(1, parsed.likelihoodScore || 3)),
      confidenceScore: Math.min(5, Math.max(1, parsed.confidenceScore || 3)),
      chiliScore: Math.min(5, Math.max(1, parsed.chiliScore || 3)),
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Analysis failed, using fallback:", error);
    return createFallbackAnalysis(item);
  }
}

function createFallbackAnalysis(item: CrawledItem): AnalyzedItem {
  const jurisdiction = extractJurisdiction(item.content);
  const stage = detectStage(item.content);
  const ageBracket = detectAgeBracket(item.content);
  const products = detectProducts(item.content);

  const hasMeta = item.content.toLowerCase().includes("meta");
  const hasSocialMedia = item.content.toLowerCase().includes("social media");

  const isRelevant = hasMeta || hasSocialMedia || ageBracket !== "unknown" || products.length > 0;

  return {
    sourceId: item.sourceId,
    url: item.url,
    title: item.title,
    rawContent: item.content,
    publishedDate: item.publishedDate,
    isRelevant,
    jurisdictionCountry: jurisdiction.country,
    jurisdictionState: jurisdiction.state,
    stage,
    ageBracket,
    affectedProducts: products,
    summary: item.content.substring(0, 500),
    businessImpact: isRelevant ? "Requires review for compliance impact" : "No direct impact identified",
    requiredSolutions: [],
    competitorResponses: [],
    impactScore: isRelevant ? 3 : 1,
    likelihoodScore: isRelevant ? 3 : 1,
    confidenceScore: 2,
    chiliScore: isRelevant ? 3 : 1,
    analyzedAt: new Date().toISOString(),
  };
}

export async function analyzeItems(items: CrawledItem[]): Promise<AnalyzedItem[]> {
  const results: AnalyzedItem[] = [];

  for (const item of items) {
    const analyzed = await analyzeItem(item);
    results.push(analyzed);

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return results;
}
