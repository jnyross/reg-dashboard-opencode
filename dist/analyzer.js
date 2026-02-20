"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeCountry = canonicalizeCountry;
exports.resolveCanonicalJurisdiction = resolveCanonicalJurisdiction;
exports.deriveRiskScores = deriveRiskScores;
exports.analyzeItem = analyzeItem;
exports.analyzeItems = analyzeItems;
const data_cleaner_1 = require("./data-cleaner");
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
    Facebook: ["facebook", "fb", "meta facebook"],
    Instagram: ["instagram", "ig"],
    WhatsApp: ["whatsapp", "wa"],
    Threads: ["threads"],
    "Meta Quest": ["quest", "vr", "virtual reality", "metaverse"],
    "Reality Labs": ["reality labs"],
    "Meta AI": ["meta ai", "llama", "ai assistant"],
    Advertising: ["advertising", "ad", "ads", "targeting"],
};
const UNKNOWN_COUNTRY_VALUES = new Set([
    "",
    "unknown",
    "n/a",
    "na",
    "none",
    "null",
    "not specified",
    "unspecified",
]);
const COUNTRY_ALIASES = [
    { country: "United States", pattern: /\b(united\s*states|u\.?s\.?a?|america|us federal|congress|ftc)\b/i },
    { country: "European Union", pattern: /\b(european\s*union|eu|european\s*commission|europa\.eu|edpb|dsa)\b/i },
    { country: "United Kingdom", pattern: /\b(united\s*kingdom|u\.?k\.?|britain|england|ofcom|ico\.org\.uk|gov\.uk)\b/i },
    { country: "Australia", pattern: /\b(australia|australian|esafety|oaic)\b/i },
    { country: "Canada", pattern: /\b(canada|canadian|crtc|priv\.gc\.ca)\b/i },
    { country: "Germany", pattern: /\b(germany|german|deutschland|bundestag|bfdi)\b/i },
    { country: "France", pattern: /\b(france|french|cnil)\b/i },
    { country: "Ireland", pattern: /\b(ireland|irish|data\s*protection\s*commission)\b/i },
    { country: "Italy", pattern: /\b(italy|italian|garante)\b/i },
    { country: "Spain", pattern: /\b(spain|spanish|aepd)\b/i },
    { country: "Netherlands", pattern: /\b(netherlands|dutch|autoriteit\s*persoonsgegevens)\b/i },
    { country: "Belgium", pattern: /\b(belgium|belgian)\b/i },
    { country: "Singapore", pattern: /\b(singapore|singaporean|pdpc)\b/i },
    { country: "Japan", pattern: /\b(japan|japanese|ppc)\b/i },
    { country: "Brazil", pattern: /\b(brazil|brazilian|lgpd|anpd)\b/i },
    { country: "India", pattern: /\b(india|indian|digital\s*personal\s*data|dpdp)\b/i },
    { country: "China", pattern: /\b(china|chinese|cac|pipl)\b/i },
    { country: "South Korea", pattern: /\b(south\s*korea|korean|pipc)\b/i },
    { country: "South Africa", pattern: /\b(south\s*africa|popia)\b/i },
    { country: "Nigeria", pattern: /\b(nigeria|nigerian)\b/i },
    { country: "UAE", pattern: /\b(uae|united\s*arab\s*emirates|dubai|abu\s*dhabi)\b/i },
    { country: "Global", pattern: /\b(global|worldwide|cross-border)\b/i },
    { country: "International", pattern: /\b(international|un|oecd|g7|g20|wef)\b/i },
    { country: "APAC", pattern: /\b(apac|asia[-\s]?pacific)\b/i },
    { country: "Latin America", pattern: /\b(latin\s*america|latam)\b/i },
    { country: "Africa", pattern: /\b(africa)\b/i },
    { country: "Africa & Middle East", pattern: /\b(africa\s*&\s*middle\s*east|middle\s*east\s*&\s*africa|mea)\b/i },
];
const US_STATE_ALIASES = {
    ca: "California",
    california: "California",
    ny: "New York",
    "new york": "New York",
    tx: "Texas",
    texas: "Texas",
    fl: "Florida",
    florida: "Florida",
    wa: "Washington",
    washington: "Washington",
    ar: "Arkansas",
    arkansas: "Arkansas",
};
const SEVERE_RISK_KEYWORDS = [
    "fine",
    "penalty",
    "sanction",
    "enforcement",
    "mandatory",
    "must",
    "prohibit",
    "ban",
    "criminal",
    "violation",
    "injunction",
    "consent decree",
    "age verification",
    "default safety",
    "algorithmic audit",
    "strict liability",
];
const MODERATE_RISK_KEYWORDS = [
    "bill",
    "act",
    "regulation",
    "law",
    "consultation",
    "guidance",
    "framework",
    "code",
    "children",
    "minors",
    "teens",
    "under 16",
    "social media",
    "privacy",
];
function clampScore(value, fallback = 3) {
    if (typeof value !== "number" || Number.isNaN(value))
        return fallback;
    return Math.min(5, Math.max(1, Math.round(value)));
}
function hasKeyword(text, keywords) {
    const lower = text.toLowerCase();
    return keywords.some((keyword) => lower.includes(keyword));
}
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
    const hasUnder16 = /\b(under\s*16|under\s*13|under\s*14|under\s*15|13.*15|13-?15|younger\s*than\s*1[56])\b/.test(lowerText);
    const has16to18 = /\b(16.*18|16-?18|16\s*to\s*18|teenager|youth|adolescent|under\s*18)\b/.test(lowerText);
    const hasMinorLanguage = /\b(minor|minors|child|children|childhood|age\s*appropriate|safe\s*for\s*kids|kids\s*online|parental\s*consent)\b/.test(lowerText);
    if (hasUnder16 && has16to18)
        return "both";
    if (hasUnder16)
        return "13-15";
    if (has16to18 && hasMinorLanguage)
        return "both";
    if (has16to18)
        return "16-18";
    if (hasMinorLanguage)
        return "both";
    return "unknown";
}
function detectProducts(text) {
    const detected = [];
    const lower = text.toLowerCase();
    for (const [product, keywords] of Object.entries(PRODUCT_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw))) {
            detected.push(product);
        }
    }
    return [...new Set(detected)];
}
function normalizeState(value) {
    if (!value)
        return undefined;
    const normalized = value.replace(/\s+/g, " ").trim().toLowerCase();
    return US_STATE_ALIASES[normalized];
}
function canonicalizeCountry(value) {
    if (!value)
        return undefined;
    const cleaned = value.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned)
        return undefined;
    const lowered = cleaned.toLowerCase();
    if (UNKNOWN_COUNTRY_VALUES.has(lowered)) {
        return undefined;
    }
    for (const entry of COUNTRY_ALIASES) {
        if (entry.pattern.test(cleaned)) {
            return entry.country;
        }
    }
    return cleaned;
}
function inferCountryFromUrl(url) {
    if (!url)
        return undefined;
    try {
        const { hostname } = new URL(url);
        const host = hostname.toLowerCase();
        if (host.endsWith("gov.uk") || host.endsWith("ico.org.uk") || host.endsWith("parliament.uk"))
            return "United Kingdom";
        if (host.endsWith("europa.eu") || host.endsWith("edpb.europa.eu"))
            return "European Union";
        if (host.endsWith("gc.ca") || host.endsWith("canada.ca") || host.endsWith("priv.gc.ca"))
            return "Canada";
        if (host.endsWith("gouv.fr") || host.endsWith("cnil.fr"))
            return "France";
        if (host.endsWith("bund.de") || host.endsWith("bfdi.bund.de"))
            return "Germany";
        if (host.endsWith("gov.au") || host.endsWith("esafety.gov.au") || host.endsWith("oaic.gov.au"))
            return "Australia";
        if (host.endsWith("gov.sg") || host.includes("pdpc.gov.sg"))
            return "Singapore";
        if (host.endsWith("gov.br") || host.endsWith("anpd.gov.br"))
            return "Brazil";
        if (host.endsWith("gov.in"))
            return "India";
        if (host.endsWith("gov") || host.endsWith("state.gov") || host.endsWith("federalregister.gov"))
            return "United States";
        if (host === "x.com" || host.endsWith("x.com") || host === "twitter.com" || host.endsWith("twitter.com"))
            return "Global";
    }
    catch {
        return undefined;
    }
    return undefined;
}
function inferJurisdictionFromText(text) {
    if (!text.trim())
        return {};
    for (const entry of COUNTRY_ALIASES) {
        if (entry.pattern.test(text)) {
            const stateMatch = text.match(/\b(california|new\s*york|texas|florida|washington|arkansas|ca|ny|tx|fl|wa|ar)\b/i);
            const state = stateMatch?.[1] ? normalizeState(stateMatch[1]) : undefined;
            if (entry.country === "United States") {
                return { country: "United States", state };
            }
            return { country: entry.country };
        }
    }
    return {};
}
function resolveCanonicalJurisdiction(signals) {
    const hintedCountry = canonicalizeCountry(signals.hintedCountry);
    const hintedState = normalizeState(signals.hintedState);
    const sourceCountry = canonicalizeCountry(signals.sourceCountry);
    const sourceState = normalizeState(signals.sourceState);
    const textInference = inferJurisdictionFromText(signals.text || "");
    const textCountry = canonicalizeCountry(textInference.country);
    const textState = normalizeState(textInference.state);
    const urlCountry = inferCountryFromUrl(signals.url);
    const country = hintedCountry || textCountry || sourceCountry || urlCountry || "Unknown";
    const state = country === "United States"
        ? hintedState || textState || sourceState
        : undefined;
    return { country, state };
}
function resolveJurisdictionForItem(item, parsedCountry, parsedState) {
    return resolveCanonicalJurisdiction({
        text: [item.sourceName, item.sourceDescription, item.title, item.content].join("\n"),
        url: item.url,
        hintedCountry: parsedCountry,
        hintedState: parsedState,
        sourceCountry: item.sourceJurisdictionCountry,
        sourceState: item.sourceJurisdictionState,
    });
}
function normalizeStage(value) {
    const allowedStages = new Set([
        "proposed",
        "introduced",
        "committee_review",
        "passed",
        "enacted",
        "effective",
        "amended",
        "withdrawn",
        "rejected",
    ]);
    let stage = String(value || "proposed").toLowerCase().replace(/\s+/g, "_");
    if (!allowedStages.has(stage)) {
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
    return stage;
}
function normalizeAgeBracket(value) {
    const allowedBrackets = new Set(["13-15", "16-18", "both", "unknown"]);
    const ageBracket = String(value || "unknown");
    return (allowedBrackets.has(ageBracket) ? ageBracket : "both");
}
function deriveRiskScores(signals) {
    if (!signals.isRelevant) {
        return {
            impactScore: 1,
            likelihoodScore: 1,
            confidenceScore: 1,
            chiliScore: 1,
        };
    }
    const stage = normalizeStage(signals.stage);
    const ageBracket = normalizeAgeBracket(signals.ageBracket);
    const lowerText = (signals.text || "").toLowerCase();
    const isLateStage = stage === "effective" || stage === "enacted" || stage === "passed";
    const baselineLikelihoodByStage = {
        proposed: 2,
        introduced: 3,
        committee_review: 3,
        passed: 4,
        enacted: 4,
        effective: 4,
        amended: 3,
        withdrawn: 1,
        rejected: 1,
    };
    let impactScore = clampScore(signals.baseImpact, 2);
    let likelihoodScore = clampScore(signals.baseLikelihood, baselineLikelihoodByStage[stage]);
    if (ageBracket === "13-15" || ageBracket === "both") {
        impactScore = Math.min(5, impactScore + 1);
    }
    const severeRisk = hasKeyword(lowerText, SEVERE_RISK_KEYWORDS);
    const moderateRisk = hasKeyword(lowerText, MODERATE_RISK_KEYWORDS);
    if (moderateRisk) {
        impactScore = Math.max(impactScore, 3);
    }
    if (severeRisk) {
        impactScore = Math.max(impactScore, 4);
        likelihoodScore = Math.max(likelihoodScore, 4);
    }
    let derivedChili = clampScore(Math.round((impactScore + likelihoodScore) / 2), 3);
    if (severeRisk && isLateStage) {
        derivedChili = Math.max(derivedChili, 5);
    }
    else if (severeRisk || (isLateStage && (ageBracket === "13-15" || ageBracket === "both"))) {
        derivedChili = Math.max(derivedChili, 4);
    }
    const modelChili = clampScore(signals.baseChili, 0);
    const chiliScore = modelChili === 0 ? derivedChili : Math.max(modelChili, derivedChili);
    return {
        impactScore,
        likelihoodScore,
        confidenceScore: clampScore(signals.baseConfidence, 3),
        chiliScore,
    };
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
        const inputText = [
            `Source: ${item.sourceName || "Unknown"}`,
            `Source Description: ${item.sourceDescription || ""}`,
            `Source Jurisdiction: ${item.sourceJurisdictionCountry || ""}${item.sourceJurisdictionState ? ` / ${item.sourceJurisdictionState}` : ""}`,
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
                const data = (await response.json());
                const rawContent = data.content?.find((c) => c.type === "text")?.text || data.content?.[0]?.text || "";
                if (!rawContent) {
                    throw new Error("Empty response from API");
                }
                let cleanContent = rawContent.trim();
                if (cleanContent.startsWith("```")) {
                    cleanContent = cleanContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
                }
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
            const jurisdiction = resolveJurisdictionForItem(item);
            return {
                sourceId: item.sourceId,
                url: item.url,
                title: item.title,
                rawContent: item.content,
                publishedDate: item.publishedDate,
                isRelevant: false,
                jurisdictionCountry: jurisdiction.country,
                jurisdictionState: jurisdiction.state,
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
        const stage = normalizeStage(parsed.stage);
        const ageBracket = normalizeAgeBracket(parsed.ageBracket);
        const jurisdiction = resolveJurisdictionForItem(item, parsed.jurisdictionCountry, parsed.jurisdictionState);
        const risk = deriveRiskScores({
            text: [item.title, item.content, parsed.summary || "", parsed.businessImpact || ""].join("\n"),
            stage,
            ageBracket,
            isRelevant: true,
            baseImpact: parsed.impactScore,
            baseLikelihood: parsed.likelihoodScore,
            baseConfidence: parsed.confidenceScore,
            baseChili: parsed.chiliScore,
        });
        return {
            sourceId: item.sourceId,
            url: item.url,
            title: item.title,
            rawContent: item.content,
            publishedDate: item.publishedDate,
            isRelevant: true,
            jurisdictionCountry: jurisdiction.country,
            jurisdictionState: jurisdiction.state,
            stage,
            ageBracket,
            affectedProducts: Array.isArray(parsed.affectedProducts) ? parsed.affectedProducts : [],
            summary: parsed.summary || "",
            businessImpact: parsed.businessImpact || "",
            requiredSolutions: Array.isArray(parsed.requiredSolutions) ? parsed.requiredSolutions : [],
            competitorResponses: Array.isArray(parsed.competitorResponses) ? parsed.competitorResponses : [],
            impactScore: risk.impactScore,
            likelihoodScore: risk.likelihoodScore,
            confidenceScore: risk.confidenceScore,
            chiliScore: risk.chiliScore,
            analyzedAt: new Date().toISOString(),
        };
    }
    catch (error) {
        console.error("Analysis failed, using fallback:", error);
        return createFallbackAnalysis(item);
    }
}
function createFallbackAnalysis(item) {
    const fullText = [item.sourceName, item.sourceDescription, item.title, item.content].join("\n");
    const stage = detectStage(fullText);
    const ageBracket = detectAgeBracket(fullText);
    const products = detectProducts(fullText);
    const jurisdiction = resolveJurisdictionForItem(item);
    const lowerContent = fullText.toLowerCase();
    const hasMeta = lowerContent.includes("meta") || lowerContent.includes("facebook") || lowerContent.includes("instagram") || lowerContent.includes("threads");
    const hasSocialMedia = lowerContent.includes("social media") || lowerContent.includes("platform");
    const hasRegulatorySignal = hasKeyword(lowerContent, MODERATE_RISK_KEYWORDS) || hasKeyword(lowerContent, SEVERE_RISK_KEYWORDS);
    const isRelevant = hasMeta || hasSocialMedia || hasRegulatorySignal || ageBracket !== "unknown" || products.length > 0;
    const cleanedSummary = (0, data_cleaner_1.cleanText)(item.content).substring(0, 500);
    const risk = deriveRiskScores({
        text: fullText,
        stage,
        ageBracket,
        isRelevant,
    });
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
        summary: cleanedSummary,
        businessImpact: isRelevant
            ? "Requires review for compliance impact on Meta platforms."
            : "No direct impact identified.",
        requiredSolutions: [],
        competitorResponses: [],
        impactScore: risk.impactScore,
        likelihoodScore: risk.likelihoodScore,
        confidenceScore: risk.confidenceScore,
        chiliScore: risk.chiliScore,
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