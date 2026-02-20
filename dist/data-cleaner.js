"use strict";
/**
 * Data Cleaner — Fixes data quality issues in the regulation_events table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeHtmlEntities = decodeHtmlEntities;
exports.stripJavaScript = stripJavaScript;
exports.stripHtmlAndCss = stripHtmlAndCss;
exports.cleanText = cleanText;
exports.isGarbageText = isGarbageText;
exports.cleanTitle = cleanTitle;
exports.generateSummaryFromContent = generateSummaryFromContent;
exports.isUnder16Related = isUnder16Related;
exports.runDataCleanup = runDataCleanup;
/** Decode HTML entities */
function decodeHtmlEntities(text) {
    if (!text)
        return text;
    return text
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/&#(\d+);/g, (_match, dec) => String.fromCharCode(parseInt(dec, 10)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_match, hex) => String.fromCharCode(parseInt(hex, 16)));
}
/** Strip JavaScript code patterns from text */
function stripJavaScript(text) {
    if (!text)
        return text;
    let cleaned = text;
    cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, "");
    cleaned = cleaned.replace(/\(function\s*\([^)]*\)\s*\{[\s\S]*?\}\)\s*\([^)]*\)\s*;?/g, "");
    cleaned = cleaned.replace(/window\.dataLayer\s*=[\s\S]*?;/g, "");
    cleaned = cleaned.replace(/function\s+gtag\s*\(\)\s*\{[\s\S]*?\}/g, "");
    cleaned = cleaned.replace(/gtag\s*\([^)]*\)\s*;?/g, "");
    cleaned = cleaned.replace(/initializeGoogleAnalytics\s*\([^)]*\)\s*;?/g, "");
    cleaned = cleaned.replace(/document\.addEventListener\s*\([^)]*(?:function\s*\([^)]*\)\s*\{[\s\S]*?\})\s*\)\s*;?/g, "");
    cleaned = cleaned.replace(/var\s+\w+\s*=\s*[\s\S]*?;/g, "");
    cleaned = cleaned.replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}/g, "");
    cleaned = cleaned.replace(/\$\s*\([^)]*\)\s*\.[^;]*;/g, "");
    cleaned = cleaned.replace(/document\.querySelector\([^)]*\)/g, "");
    return cleaned;
}
/** Strip HTML tags and CSS */
function stripHtmlAndCss(text) {
    if (!text)
        return text;
    let cleaned = text;
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
    cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    cleaned = cleaned.replace(/<header[\s\S]*?<\/header>/gi, "");
    cleaned = cleaned.replace(/[.#@]?[a-zA-Z][\w.:>+~,\s-]*\s*\{[^}]*\}/g, "");
    cleaned = cleaned.replace(/@media[^{]*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/g, "");
    cleaned = cleaned.replace(/@[a-z-]+[^{;]*[{;]/gi, "");
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    cleaned = cleaned.replace(/\[[^\]]*\]\([^)]*\)/g, " ");
    cleaned = cleaned.replace(/<[^>]+>/g, " ");
    cleaned = cleaned.replace(/(?:^|\s)[a-z][a-z-]*\s*:\s*[^;{}\n]{1,80};/gi, " ");
    cleaned = cleaned.replace(/[.#][a-zA-Z_][\w-]*\s*\{[^}]*\}/g, "");
    cleaned = cleaned.replace(/https?:\/\/[^\s)'"]+\.(js|css|png|jpg|gif|svg|woff2?|ttf|eot)/gi, "");
    cleaned = cleaned.replace(/a2a[_\w]*(?:\|\||\.)\s*[^;]*;?/g, "");
    cleaned = cleaned.replace(/\w+_config\s*\|\|\s*\{[^}]*\}/g, "");
    cleaned = cleaned.replace(/\{[^}]{0,50}:[^}]{0,50}\}/g, "");
    return cleaned;
}
/** Full text cleaning pipeline */
function cleanText(text) {
    if (!text)
        return "";
    let cleaned = text;
    cleaned = stripJavaScript(cleaned);
    cleaned = stripHtmlAndCss(cleaned);
    cleaned = decodeHtmlEntities(cleaned);
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/^[\s|.,:;!?-]+/, "").trim();
    return cleaned;
}
/** Check if text looks like garbage (JS/HTML/CSS instead of readable text) */
function isGarbageText(text) {
    if (!text || text.length < 20)
        return true;
    const garbagePatterns = [
        /\(function\s*\(/,
        /window\.dataLayer/,
        /gtag\s*\(/,
        /document\.addEventListener/,
        /getElementsByTagName/,
        /\.querySelector\(/,
        /googletagmanager\.com/,
        /GTM-[A-Z0-9]+/,
        /initializeGoogleAnalytics/,
        /\.insertBefore\(/,
        /\.createElement\(/,
        /OptanonWrapper/,
        /<script/i,
        /<style/i,
        /<div\s/i,
        /\.jss\d+/,
        /a2a_config/,
        /\.callbacks\s*=/,
        /\.overlays\s*=/,
        /img:is\(/,
        /contain-intrinsic-size/,
        /font-style:\s*italic/,
        /text-decoration:\s*none/,
        /border-bottom:/,
        /padding-bottom:/,
        /margin-bottom:/,
        /font-size:\s*\d/,
        /color:\s*#[0-9a-f]/i,
        /\.minor_vote/,
        /#action-panel/,
        /div\.grid/,
        /#summary\s*\{/,
        /sourceURL/,
        /sourceMap/,
        /webpack/,
        /"imports"\s*:/,
        /Toggle navigation/,
        /\[Skip to/,
        /otSDKStub/,
        /querySelectorAll/,
        /window\.\s*querySelectorAll/,
        /schema\.org/,
        /"@context"/,
    ];
    // Even one match of egregious patterns = garbage
    if (/\(function\s*\(/.test(text) || /googletagmanager/.test(text) || /a2a_config/.test(text))
        return true;
    if (/otSDKStub/.test(text) || /sourceURL/.test(text) || /"@context"/.test(text))
        return true;
    const matchCount = garbagePatterns.filter(p => p.test(text)).length;
    if (matchCount >= 1)
        return true;
    // Low word density check
    const first200 = text.substring(0, 200);
    const words = first200.split(/\s+/).filter(w => /^[a-zA-Z]{3,}$/.test(w));
    if (words.length < 5 && text.length > 50)
        return true;
    // High special character ratio
    const alphaCount = (first200.match(/[a-zA-Z]/g) || []).length;
    const specialCount = (first200.match(/[{}()[\];:=<>\\|/]/g) || []).length;
    if (specialCount > alphaCount * 0.3 && text.length > 50)
        return true;
    return false;
}
/** Clean a title */
function cleanTitle(title) {
    if (!title)
        return title;
    let cleaned = decodeHtmlEntities(title);
    cleaned = cleaned.replace(/\s*\|\s*(Federal Trade Commission|FTC)$/i, "");
    cleaned = cleaned.replace(/\s*-\s*GovTrack\.us$/i, "");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    cleaned = cleaned.replace(/^Federal Register\s*::\s*/i, "");
    return cleaned;
}
/** Known regulation summaries */
const KNOWN_SUMMARIES = {
    "coppa": "The Children's Online Privacy Protection Act (COPPA) regulates the collection of personal information from children under 13 by websites and online services. The FTC enforces COPPA and has finalized amendments strengthening protections including limits on monetizing children's data.",
    "children's privacy": "Federal Trade Commission guidance on children's online privacy protection, covering COPPA compliance requirements, enforcement actions, and business resources for protecting children's personal information online.",
    "kids' privacy": "FTC Kids' Privacy (COPPA) enforcement and guidance covering the Children's Online Privacy Protection Rule, parental consent requirements, and restrictions on collecting children's personal information.",
    "kids online safety act": "The Kids Online Safety Act (KOSA) would require social media platforms to provide minors with options to protect their information and disable addictive features. It establishes a duty of care for platforms to prevent harm to minors.",
    "kosa": "The Kids Online Safety Act (KOSA) establishes a duty of care for online platforms to prevent harm to minors, requiring safety features, parental tools, and independent auditing.",
    "safe for kids": "New York's SAFE for Kids Act prohibits addictive algorithmic feeds for minors without parental consent, requires age verification, and restricts notification timing for young users.",
    "scope act": "Texas SCOPE Act (Securing Children Online through Parental Empowerment) requires parental consent for minors under 18 to use digital services, with age verification requirements effective September 1, 2024.",
    "bill summaries": "Legislative bill summaries covering children's online safety and privacy regulations including age verification, parental consent requirements, and platform safety obligations.",
    "age-appropriate design": "The California Age-Appropriate Design Code Act (AADC) requires businesses to assess and mitigate risks to children from online products and services, including data protection impact assessments.",
    "online safety act": "The UK Online Safety Act establishes comprehensive duties for online platforms to protect children from harmful content, with Ofcom as regulator. Child safety regime fully in effect by Summer 2025.",
    "online safety law": "Comprehensive online safety legislation tracker covering state and federal laws protecting children and minors in digital environments.",
    "ofcom": "Ofcom's Children's Safety Codes of Practice under the UK Online Safety Act set out requirements for protecting children from harmful online content, with compliance deadlines from July 2025.",
    "ico": "The UK Information Commissioner's Office Children's Code (Age Appropriate Design Code) establishes 15 standards for online services likely to be accessed by children.",
    "digital services act": "The EU Digital Services Act (DSA) Article 28 requires online platforms to implement measures protecting minors, including age-appropriate design, restrictions on profiling, and transparency requirements.",
    "article 28": "DSA Article 28 mandates that online platform providers ensure a high level of privacy, safety, and security for minors, including prohibition of profiling-based advertising targeting minors.",
    "edpb": "European Data Protection Board guidance on children's data processing, including interplay between GDPR and DSA requirements for protecting minors' personal data online.",
    "data protection board": "European Data Protection Board guidance on children's data processing, including interplay between GDPR and DSA requirements for protecting minors' personal data online.",
    "cnil": "The French data protection authority (CNIL) has published recommendations to enhance protection of children online, covering age verification, profiling restrictions, and parental controls.",
    "digital rights of children": "The French data protection authority (CNIL) guidance on digital rights of children, covering data protection, age verification, and online safety measures.",
    "esafety": "Australia's eSafety Commissioner implements social media age restrictions banning users under 16 from platforms including Facebook, Instagram, Threads, TikTok, and others. Effective December 2025.",
    "social media age": "Government regulations on minimum age requirements for social media platform access, including age verification and enforcement mechanisms.",
    "social media ban": "Government regulations banning or restricting social media access for children below specified ages, with platform compliance obligations.",
    "australia": "Australia's Online Safety Amendment Act 2024 introduces a minimum age of 16 for social media platforms, with systemic age assurance requirements and platform compliance obligations.",
    "brazil": "Brazil's ECA Digital law establishes comprehensive protections for children and adolescents in digital environments, including restrictions on data processing, profiling, and targeted advertising.",
    "india": "India's Digital Personal Data Protection Act 2023 and Rules 2025 establish requirements for processing children's data including verifiable parental consent and restrictions on targeted advertising for under-18s.",
    "dpdp": "India's Digital Personal Data Protection (DPDP) Act and Rules establish requirements for children's data processing including parental consent, prohibitions on tracking, and restrictions on targeted advertising.",
    "singapore": "Singapore PDPC Advisory Guidelines on children's personal data in the digital environment clarify PDPA application including consent requirements and data protection obligations.",
    "pdpc": "Singapore PDPC Advisory Guidelines on children's personal data in the digital environment clarify PDPA application including consent requirements and data protection obligations.",
    "south korea": "South Korea's Youth Protection Act establishes comprehensive protections for minors in digital environments with digital safety provisions.",
    "china": "China's Regulations on Protection of Minors Online establish comprehensive rules for online platforms including minor mode requirements, content restrictions, and time limits.",
    "minors online": "Regulations on the protection of minors in online environments, covering platform obligations, content restrictions, and age-appropriate design requirements.",
    "dpc ireland": "Ireland's Data Protection Commission guidance on child-oriented data processing establishes 14 core principles for organizations handling children's personal data.",
    "data protection commission": "Ireland's Data Protection Commission (DPC) guidance and enforcement on children's data protection under GDPR.",
    "canada": "Canadian online harms legislation addressing child online safety, age verification, and platform accountability for protecting minors.",
    "gdpr": "The EU General Data Protection Regulation includes specific protections for children's data under Article 8, with member states setting consent ages between 13 and 16.",
    "garante": "Italian Data Protection Authority (Garante) enforcement and guidance on children's data protection, including social media restrictions for minors.",
    "aepd": "Spanish Data Protection Agency (AEPD) analysis on protection of children and adolescents in the digital environment, covering data protection principles for minors.",
    "bfdi": "German Federal Commissioner for Data Protection (BfDI) guidance and enforcement on data protection including children's privacy in digital environments.",
    "dutch data protection": "Dutch Data Protection Authority (Autoriteit Persoonsgegevens) enforcement under UAVG where age of consent is 16 in the Netherlands.",
    "protecting children online": "Government and regulatory authority guidance on protecting children in online environments, covering platform safety obligations and parental controls.",
    "securing children": "Legislative measures for securing children online through parental empowerment, including age verification and consent requirements for digital services.",
    "federal register": "Federal Register publication of regulatory rules and amendments related to children's online privacy and safety.",
    "minors' privacy": "Analysis of legislative developments in minors' privacy and online safety across federal and state jurisdictions.",
    "children's code": "Age-appropriate design code establishing standards for online services likely to be accessed by children, covering data protection and safety requirements.",
    "consent to use data": "Mapping of minimum age requirements for consent to use data on children across jurisdictions, including variations in consent ages.",
    "5rights": "5Rights Foundation advocacy and research on children's digital rights, including global toolkit for child online safety policymakers.",
    "child online safety toolkit": "Global toolkit for policymakers on implementing child online safety regulations, covering best practices and legislative frameworks.",
    "ncmec": "National Center for Missing & Exploited Children (NCMEC) operates the CyberTipline for reporting child exploitation, analyzing millions of reports annually.",
    "icmec": "International Centre for Missing & Exploited Children (ICMEC) coordinates global efforts for child online safety and protection.",
    "missing": "Center for missing and exploited children coordination and reporting, including CyberTipline operations and online safety advocacy.",
    "future of privacy": "Future of Privacy Forum research on youth privacy, education technology, and children's data protection policy.",
    "fpf": "Future of Privacy Forum research on youth privacy, education technology, and children's data protection policy.",
    "humane tech": "Center for Humane Technology research on technology harms to youth, including effects of social media on minors' mental health and wellbeing.",
    "ledger of harms": "Documented negative effects of technology on society including specific harms to children from social media, persuasive design, and algorithmic amplification.",
    "common sense": "Common Sense Media research and advocacy for children's privacy legislation, providing guidance for families on media and technology use.",
    "epic": "Electronic Privacy Information Center (EPIC) advocacy for children's privacy including COPPA enforcement and strengthened protections for minors online.",
    "cdt": "Center for Democracy & Technology research on child safety policy, providing insights on balancing children's online safety with privacy and expression rights.",
    "iwf": "Internet Watch Foundation (IWF) work on UK Online Safety Act implementation, focusing on detection and removal of child sexual abuse material online.",
    "weprotect": "WeProtect Global Alliance annual threat assessment on child sexual exploitation online, coordinating multi-stakeholder response to emerging threats.",
    "cipl": "Centre for Information Policy Leadership tracking of global initiatives for children's data protection across ICO, DPC, CNIL, and other authorities.",
    "dataguidance": "DataGuidance global privacy and regulatory research platform providing jurisdiction-by-jurisdiction profiles on data protection laws including children's provisions.",
    "dla piper": "DLA Piper global overview of data protection laws including jurisdiction-specific children's data provisions and compliance requirements.",
    "norton rose": "Norton Rose Fulbright analysis of emerging privacy, data protection, and cybersecurity developments including children's data provisions.",
    "privacy matters": "DLA Piper Privacy Matters analysis covering global children's data developments and regulatory compliance requirements.",
    "byte back": "State privacy law tracker covering proposed and enacted legislation including children's privacy provisions across US states.",
    "mayer brown": "Analysis of state and federal children's privacy enforcement actions and legislative developments.",
    "covington": "Legal analysis of federal and state developments in minors' privacy legislation and enforcement.",
    "troutman": "Analysis of children's privacy laws and regulations across US states including AADC-style laws and COPPA amendments.",
    "alston": "Strategic guide to minors' privacy and online safety laws across US states with enacted social media regulations.",
    "hunton": "Legal analysis of children's privacy regulatory developments including COPPA amendments and international children's data protection measures.",
    "orrick": "Online Safety Law Center comprehensive tracker of US state children's online safety legislation.",
    "tiktok": "TikTok's children's privacy policy covering under-13 restrictions, parental controls, and age-appropriate content moderation across global markets.",
    "reuters": "Global overview of legislative developments in children's social media regulation across multiple jurisdictions.",
    "techpolicy": "Technology policy analysis and tracking of children's online safety legislation including KOSA and state-level bills.",
    "apac": "Analysis of emerging trends in children's data privacy across Asia-Pacific jurisdictions including consent requirements and regulatory frameworks.",
    "africa": "Overview of data protection laws across African nations including children's data provisions under POPIA, NDPA, and Kenya DPA.",
    "nigeria": "Nigeria Data Protection Act 2023 compliance requirements including provisions for children's personal data processing.",
    "uae": "UAE data protection law guidance covering PDPL and DIFC DPA including children's data provisions.",
    "south africa": "South Africa's POPIA (Protection of Personal Information Act) regulations including additional protections for children's personal data.",
    "belgium": "Belgian data protection under GDPR with age of consent at 13, including APD/GBA enforcement decisions involving minors.",
    "netherlands": "Dutch data protection under UAVG (implementation of GDPR) with age of consent at 16 for data processing.",
    "arkansas": "Arkansas Social Media Safety Act amendments (SB 611) narrowing age scope to under-16 following federal court injunction.",
    "un ": "United Nations initiatives on child and youth safety online, including ITU guidelines and UNICEF research on digital protection.",
    "itu": "International Telecommunication Union (ITU) Child Online Protection guidelines providing comprehensive frameworks for all stakeholders.",
    "unicef": "UNICEF guidelines and research on protecting children in digital environments, including joint initiatives with ITU and other organizations.",
    "oecd": "OECD reports on digital safety by design for children, covering safety-by-design approaches and policy recommendations.",
    "washington post": "News coverage of major technology companies agreeing to teen safety measures including independent mental health assessments.",
    "policy monitor": "EU-funded policy monitoring of children's online safety regulations across European member states.",
    "better internet": "Better Internet for Kids EU co-funded portal with policy profiles for children's online safety across member states.",
    "iapp": "International Association of Privacy Professionals (IAPP) resources on children's privacy including analysis of global regulatory developments.",
    "minor mode": "Analysis of platform minor mode requirements and implementation approaches for protecting young users in digital environments.",
    "gdprhub": "GDPRhub case law database for data protection decisions involving minors, including jurisdiction-specific consent age requirements.",
};
/** Generate a proper summary from raw content when the existing one is garbage */
function generateSummaryFromContent(rawContent, title) {
    if (!rawContent && !title)
        return "No summary available.";
    const titleLower = (title || "").toLowerCase();
    const contentLower = (rawContent || "").toLowerCase();
    const combinedLower = `${titleLower} ${contentLower}`;
    const sportsNoisePattern = /\b(juve|juventus|fiorentina|atalanta|campionato|serie\s*a|coppa\s*italia|derby|goal|calcio|pisa)\b/;
    // Try to match against known summaries FIRST
    for (const [keyword, summary] of Object.entries(KNOWN_SUMMARIES)) {
        const normalizedKeyword = keyword.toLowerCase();
        if (!titleLower.includes(normalizedKeyword)) {
            continue;
        }
        // Guard against false positives for the string "coppa" in football/sports contexts.
        if (normalizedKeyword === "coppa" &&
            sportsNoisePattern.test(combinedLower) &&
            !/\b(children|child|kid|privacy|ftc|online\s*privacy|protection\s*rule)\b/.test(combinedLower)) {
            continue;
        }
        return summary;
    }
    const cleaned = cleanText(rawContent || "");
    // Check if cleaned content is also garbage
    if (!cleaned || cleaned.length < 50 || isGarbageText(cleaned)) {
        return `Regulatory event: ${cleanTitle(title)}. Further analysis required for compliance impact assessment.`;
    }
    // Extract first meaningful sentences
    const sentences = cleaned.split(/[.!?]+/).filter(s => {
        const trimmed = s.trim();
        if (trimmed.length < 20)
            return false;
        if (/[{}]|function|var |const |let |import |export |module/.test(trimmed))
            return false;
        if (/font-|margin|padding|border|color:|display:|width:|height:/.test(trimmed))
            return false;
        if (/Skip to|Navigation|Menu|Cookie|Accept|Decline/.test(trimmed))
            return false;
        if (/config|callback|overlay|template|querySelector|addEventListener/.test(trimmed))
            return false;
        if (/sourceURL|sourceMap|webpack|imports/.test(trimmed))
            return false;
        return true;
    });
    let summary = "";
    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (summary.length + trimmed.length > 400)
            break;
        summary += trimmed + ". ";
    }
    if (!summary.trim() || isGarbageText(summary)) {
        return `Regulatory event: ${cleanTitle(title)}. Further analysis required for compliance impact assessment.`;
    }
    return summary.trim();
}
/** Determine if related to under-16 */
function isUnder16Related(title, summary, rawContent, sourceUrl) {
    const combinedRaw = `${title} ${summary} ${rawContent} ${sourceUrl}`.toLowerCase();
    const combined = combinedRaw
        .replace(/[’`]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/\s+/g, " ");
    const sportsNoisePattern = /\b(juve|juventus|fiorentina|atalanta|campionato|serie\s*a|coppa\s*italia|derby|goal|calcio|pisa|lazio|inter)\b/;
    const childContextPattern = /\b(children|child|kid|minor|teen|privacy|coppa\s*rule|online\s*safety|age\s*verification|parental\s*consent|under\s*1[3-8])\b/;
    if (sportsNoisePattern.test(combined) && !childContextPattern.test(combined)) {
        return false;
    }
    const strongPatterns = [
        /\bcoppa\b(?=.*\b(children|child|privacy|ftc|rule)\b)/,
        /children'?s\s+online\s+privacy/,
        /children'?s\s+privacy/,
        /child\s+safety/,
        /child\s+protection/,
        /kids?\s+online/,
        /kids?'?\s+privacy/,
        /\bminor(s)?\b/,
        /\byouth\b/,
        /\bteens?\b/,
        /under\s*1[3-8]/,
        /under-1[3-8]/,
        /13-15/,
        /13-18/,
        /16-18/,
        /age\s+verification/,
        /age\s+assurance/,
        /age\s*-?\s*restricted/,
        /parental\s+consent/,
        /parental\s+control(s)?/,
        /children'?s\s+code/,
        /age\s+appropriate\s+design/,
        /\baadc\b/,
        /scope\s+act/,
        /online\s+safety\s+act/,
        /kids\s+online\s+safety\s+act/,
        /\bkosa\b/,
        /safe\s+for\s+kids/,
        /digital\s+services\s+act/,
        /\bdsa\b/,
        /protection\s+of\s+minors/,
        /protecting\s+children/,
        /social\s+media\s+age/,
        /social\s+media\s+ban/,
        /children\s+and\s+adolescents/,
        /children'?s\s+data/,
        /child\s+data/,
        /student\s+privacy/,
        /education\s+technology/,
        /school\s+children/,
        /student\s+data/,
        /\besafety\b/,
        /\bofcom\b/,
        /\bncmec\b/,
        /\bicmec\b/,
        /\b5rights\b/,
        /child\s+exploitation/,
    ];
    return strongPatterns.some((pattern) => pattern.test(combined));
}
/** Run the data cleanup migration */
function runDataCleanup(db) {
    const result = { cleaned: 0, errors: [] };
    const rows = db.prepare(`
    SELECT id, title, summary, business_impact, raw_content, source_url, 
           is_under16_applicable, age_bracket, jurisdiction_country
    FROM regulation_events
  `).all();
    const updateStmt = db.prepare(`
    UPDATE regulation_events 
    SET title = ?, summary = ?, business_impact = ?, is_under16_applicable = ?, age_bracket = ?
    WHERE id = ?
  `);
    const updateNoTitleStmt = db.prepare(`
    UPDATE regulation_events
    SET summary = ?, business_impact = ?, is_under16_applicable = ?, age_bracket = ?
    WHERE id = ?
  `);
    const findDuplicateStmt = db.prepare(`
    SELECT id, summary, business_impact, is_under16_applicable, age_bracket
    FROM regulation_events
    WHERE id != ?
      AND COALESCE(source_url, '') = COALESCE(?, '')
      AND jurisdiction_country = ?
      AND title = ?
    LIMIT 1
  `);
    const reassignFeedbackStmt = db.prepare(`UPDATE feedback SET event_id = ? WHERE event_id = ?`);
    const deleteRowStmt = db.prepare(`DELETE FROM regulation_events WHERE id = ?`);
    const getCurrentRowStmt = db.prepare(`SELECT id FROM regulation_events WHERE id = ?`);
    const transaction = db.transaction(() => {
        for (const row of rows) {
            try {
                const stillExists = getCurrentRowStmt.get(row.id);
                if (!stillExists) {
                    continue;
                }
                const cleanedTitle = cleanTitle(row.title);
                let cleanedSummary = row.summary;
                if (!row.summary || isGarbageText(row.summary)) {
                    cleanedSummary = generateSummaryFromContent(row.raw_content || "", cleanedTitle);
                }
                else {
                    const testCleaned = cleanText(row.summary);
                    cleanedSummary = isGarbageText(testCleaned)
                        ? generateSummaryFromContent(row.raw_content || "", cleanedTitle)
                        : testCleaned;
                }
                let cleanedImpact = row.business_impact;
                if (!row.business_impact || isGarbageText(row.business_impact)) {
                    cleanedImpact = "Requires review for compliance impact on Meta platforms.";
                }
                else {
                    const testCleaned = cleanText(row.business_impact);
                    cleanedImpact = isGarbageText(testCleaned)
                        ? "Requires review for compliance impact on Meta platforms."
                        : testCleaned;
                }
                const shouldBeUnder16 = isUnder16Related(cleanedTitle, cleanedSummary || "", row.raw_content || "", row.source_url || "");
                const newIsUnder16 = shouldBeUnder16 ? 1 : row.is_under16_applicable;
                let ageBracket = row.age_bracket;
                if (shouldBeUnder16 && ageBracket === "unknown") {
                    ageBracket = "both";
                }
                const changed = cleanedTitle !== row.title ||
                    cleanedSummary !== row.summary ||
                    cleanedImpact !== row.business_impact ||
                    newIsUnder16 !== row.is_under16_applicable ||
                    ageBracket !== row.age_bracket;
                if (!changed) {
                    continue;
                }
                try {
                    updateStmt.run(cleanedTitle, cleanedSummary, cleanedImpact, newIsUnder16, ageBracket, row.id);
                    result.cleaned++;
                }
                catch (updateError) {
                    const message = updateError instanceof Error ? updateError.message : String(updateError);
                    if (!message.includes("UNIQUE constraint failed")) {
                        throw updateError;
                    }
                    const duplicate = findDuplicateStmt.get(row.id, row.source_url || null, row.jurisdiction_country, cleanedTitle);
                    if (duplicate) {
                        const mergedSummary = !duplicate.summary || isGarbageText(duplicate.summary)
                            ? cleanedSummary
                            : cleanText(duplicate.summary);
                        const mergedImpact = !duplicate.business_impact || isGarbageText(duplicate.business_impact)
                            ? cleanedImpact
                            : cleanText(duplicate.business_impact);
                        const mergedUnder16 = Math.max(duplicate.is_under16_applicable, newIsUnder16);
                        const mergedAge = duplicate.age_bracket === "unknown" && ageBracket !== "unknown" ? ageBracket : duplicate.age_bracket;
                        updateNoTitleStmt.run(mergedSummary, mergedImpact, mergedUnder16, mergedAge, duplicate.id);
                        reassignFeedbackStmt.run(duplicate.id, row.id);
                        deleteRowStmt.run(row.id);
                        result.cleaned++;
                        continue;
                    }
                    // Fallback if duplicate cannot be located: update everything except title
                    updateNoTitleStmt.run(cleanedSummary, cleanedImpact, newIsUnder16, ageBracket, row.id);
                    result.cleaned++;
                }
            }
            catch (error) {
                result.errors.push(`Error cleaning ${row.id}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    });
    transaction();
    console.log(`Data cleanup: ${result.cleaned} records cleaned, ${result.errors.length} errors`);
    return result;
}
//# sourceMappingURL=data-cleaner.js.map