"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeItem = analyzeItem;
exports.analyzeItems = analyzeItems;
const STAGE_KEYWORDS = {
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
const PRODUCT_KEYWORDS = {
    "Facebook": ["facebook", "fb", "meta facebook"],
    "Instagram": ["instagram", "ig"],
    "WhatsApp": ["whatsapp", "wa"],
    "Threads": ["threads"],
    "Meta Quest": ["quest", "vr", "virtual reality", "metaverse"],
    "Reality Labs": ["reality labs"],
    "Meta AI": ["meta ai", "llama", "ai assistant"],
    "Advertising": ["advertising", "ad", "ads", "targeting"],
};
function detectStage(text) {
    const lowerText = text.toLowerCase();
    for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
        if (keywords.some((kw) => lowerText.includes(kw))) {
            return stage;
        }
    }
    return "proposed";
}
function detectAgeBracket(text) {
    const lowerText = text.toLowerCase();
    const hasUnder16 = /\b(under\s*16|under\s*13|under\s*15|13.*15|13-?15|younger\s*than\s*1[56])\b/.test(lowerText);
    const has16to18 = /\b(16.*18|16-?18|16\s*to\s*18|teenager|youth|adolescent)\b/.test(lowerText);
    const hasAllAges = /\b(minor|child|children|childhood|age\s*appropriate|safe\s*for\s*kids)\b/.test(lowerText);
    if (hasUnder16 && has16to18)
        return "both";
    if (hasUnder16)
        return "13-15";
    if (has16to18 || hasAllAges)
        return "16-18";
    return "unknown";
}
function detectProducts(text) {
    const detected = [];
    for (const [product, keywords] of Object.entries(PRODUCT_KEYWORDS)) {
        if (keywords.some((kw) => text.toLowerCase().includes(kw))) {
            detected.push(product);
        }
    }
    return [...new Set(detected)];
}
function extractJurisdiction(text) {
    const countryPatterns = {
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

Determine if this item is about teen/child/minor online regulation that could affect Meta (Facebook, Instagram, WhatsApp, Threads, Messenger). Be INCLUSIVE — it is far better to include a borderline-relevant item than to miss a real regulation.

Mark as RELEVANT if the content relates to ANY of:
- Laws, bills, regulations, or enforcement about children/teens/minors online
- Data protection laws with children's provisions (GDPR Art.8, COPPA, LGPD, DPDP, etc.)
- Platform safety obligations for users under 18
- Age verification, parental consent, or children's data protection
- Social media restrictions for minors
- AI regulation with provisions affecting minors
- Online safety acts, digital services acts, content moderation rules
- Advertising/profiling restrictions for children
- Even if text is noisy or partial — if source/title suggests child/teen regulation, mark RELEVANT

If NOT relevant, return only: {"isRelevant": false}

If RELEVANT, extract jurisdiction, stage, age bracket, affected products, summary, impact, solutions, competitor responses, and scores.

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
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
const ANALYSIS_TIMEOUT_MS = Number(process.env.ANALYSIS_TIMEOUT_MS || 120_000);
const ANALYSIS_RETRIES = Number(process.env.ANALYSIS_RETRIES || 3);
let minimaxAuthFailed = false;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function analyzeItem(item) {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey || minimaxAuthFailed) {
        return createFallbackAnalysis(item);
    }
    try {
        // Include source context (name, URL, description) for better relevance determination
        const inputText = [
            `Source: ${item.sourceName || "Unknown"}`,
            `Source Description: ${item.sourceDescription || ""}`,
            `URL: ${item.url}`,
            `Title: ${item.title}`,
            "",
            item.content.substring(0, 8000),
        ].join("\n");
        let parsed;
        let lastError;
        for (let attempt = 1; attempt <= ANALYSIS_RETRIES; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);
            try {
                const response = await fetch("https://api.minimax.io/anthropic/v1/messages", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                        "x-api-key": apiKey,
                        "anthropic-version": "2023-06-01",
                    },
                    body: JSON.stringify({
                        model: "MiniMax-M2.5",
                        max_tokens: 2048,
                        messages: [
                            {
                                role: "user",
                                content: `${ANALYSIS_PROMPT}\n\n--- CRAWLED TEXT ---\n${inputText}`,
                            },
                        ],
                    }),
                    signal: controller.signal,
                });
                if (!response.ok) {
                    const errBody = await response.text().catch(() => "");
                    throw new Error(`API error: ${response.status} ${errBody.slice(0, 200)}`);
                }
                const data = await response.json();
                const rawContent = data.content?.find((c) => c.type === "text")?.text || data.content?.[0]?.text || "";
                if (!rawContent) {
                    throw new Error("Empty response from API");
                }
                // Strip markdown fences if present
                let cleanContent = rawContent.trim();
                if (cleanContent.startsWith("```")) {
                    cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
                }
                // Extract JSON object
                const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
                if (!jsonMatch)
                    throw new Error("No JSON found in response");
                parsed = JSON.parse(jsonMatch[0]);
                lastError = undefined;
                break;
            }
            catch (error) {
                lastError = error;
                const message = error instanceof Error ? error.message : String(error);
                const isAuthError = /API error:\s*401/.test(message) || /authentication_error/i.test(message);
                if (isAuthError) {
                    minimaxAuthFailed = true;
                    break;
                }
                if (attempt < ANALYSIS_RETRIES) {
                    await sleep(1500 * attempt);
                }
            }
            finally {
                clearTimeout(timer);
            }
        }
        if (!parsed) {
            throw lastError instanceof Error ? lastError : new Error(String(lastError));
        }
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
        // Normalize stage to allowed values
        const allowedStages = new Set(["proposed", "introduced", "committee_review", "passed", "enacted", "effective", "amended", "withdrawn", "rejected"]);
        let stage = String(parsed.stage || "proposed").toLowerCase().replace(/\s+/g, "_");
        if (!allowedStages.has(stage)) {
            // Try common mappings
            if (/enforc|in.force|active|implement/i.test(stage))
                stage = "effective";
            else if (/sign|law|legislat/i.test(stage))
                stage = "enacted";
            else if (/pass|approv|adopt/i.test(stage))
                stage = "passed";
            else if (/draft|consult|review/i.test(stage))
                stage = "proposed";
            else if (/amend|revis|updat/i.test(stage))
                stage = "amended";
            else
                stage = "proposed";
        }
        // Normalize ageBracket
        const allowedBrackets = new Set(["13-15", "16-18", "both", "unknown"]);
        let ageBracket = String(parsed.ageBracket || "unknown");
        if (!allowedBrackets.has(ageBracket))
            ageBracket = "both";
        return {
            sourceId: item.sourceId,
            url: item.url,
            title: item.title,
            rawContent: item.content,
            publishedDate: item.publishedDate,
            isRelevant: true,
            jurisdictionCountry: parsed.jurisdictionCountry || "Unknown",
            jurisdictionState: parsed.jurisdictionState,
            stage: stage,
            ageBracket: ageBracket,
            affectedProducts: Array.isArray(parsed.affectedProducts) ? parsed.affectedProducts : [],
            summary: parsed.summary || "",
            businessImpact: parsed.businessImpact || "",
            requiredSolutions: Array.isArray(parsed.requiredSolutions) ? parsed.requiredSolutions : [],
            competitorResponses: Array.isArray(parsed.competitorResponses) ? parsed.competitorResponses : [],
            impactScore: Math.min(5, Math.max(1, Math.round(parsed.impactScore || 3))),
            likelihoodScore: Math.min(5, Math.max(1, Math.round(parsed.likelihoodScore || 3))),
            confidenceScore: Math.min(5, Math.max(1, Math.round(parsed.confidenceScore || 3))),
            chiliScore: Math.min(5, Math.max(1, Math.round(parsed.chiliScore || 3))),
            analyzedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        console.error("Analysis failed, using fallback:", error);
        return createFallbackAnalysis(item);
    }
}
function createFallbackAnalysis(item) {
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
async function analyzeItems(items) {
    const results = [];
    for (const item of items) {
        const analyzed = await analyzeItem(item);
        results.push(analyzed);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return results;
}
//# sourceMappingURL=analyzer.js.map