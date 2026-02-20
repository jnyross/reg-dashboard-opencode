"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCanonicalLawTitle = extractCanonicalLawTitle;
exports.buildLawKey = buildLawKey;
exports.ensureLawSchema = ensureLawSchema;
exports.upsertLawWithUpdate = upsertLawWithUpdate;
exports.syncLawsFromEvents = syncLawsFromEvents;
const node_crypto_1 = __importDefault(require("node:crypto"));
const data_cleaner_1 = require("./data-cleaner");
const stageValues = [
    "proposed",
    "introduced",
    "committee_review",
    "passed",
    "enacted",
    "effective",
    "amended",
    "withdrawn",
    "rejected",
];
const ageBracketValues = ["13-15", "16-18", "both", "unknown"];
const statusValues = ["new", "updated", "status_changed", "unchanged"];
function normalizeSpace(value) {
    return value.replace(/\s+/g, " ").trim();
}
function toTitleCase(value) {
    return value
        .split(" ")
        .map((word) => {
        if (!word)
            return "";
        if (word.length <= 2)
            return word.toUpperCase();
        return `${word[0].toUpperCase()}${word.slice(1)}`;
    })
        .join(" ");
}
function normalizeKeyPart(value) {
    if (!value)
        return "";
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
function extractCanonicalLawTitle(title) {
    const cleanedTitle = (0, data_cleaner_1.cleanTitle)(title || "");
    if (!cleanedTitle)
        return "Untitled Law";
    const stripped = cleanedTitle
        .toLowerCase()
        .replace(/\b(us|u\.s\.|usa|united states|state of|federal|eu|european union|uk|united kingdom)\b/g, " ")
        .replace(/\b(proposed|proposal|draft|introduced|committee|review|passed|enacted|effective|amended|withdrawn|rejected)\b/g, " ")
        .replace(/\b(update|updated|clarification|enforcement action|enforcement)\b/g, " ")
        .replace(/[^a-z0-9\s]/g, " ");
    const normalized = normalizeSpace(stripped);
    if (!normalized)
        return cleanedTitle;
    const words = normalized.split(" ").filter(Boolean);
    if (words.length <= 2) {
        return cleanedTitle;
    }
    return toTitleCase(words.join(" "));
}
function buildLawKey(country, state, canonicalTitle) {
    const keySeed = [normalizeKeyPart(country), normalizeKeyPart(state), normalizeKeyPart(canonicalTitle)].join("|");
    const digest = node_crypto_1.default.createHash("sha1").update(keySeed).digest("hex").slice(0, 20);
    return `${normalizeKeyPart(country) || "unknown"}|${normalizeKeyPart(state) || ""}|${digest}`;
}
function buildLawUpdateKey(lawKey, law, canonicalTitle) {
    const seed = [
        lawKey,
        normalizeKeyPart(canonicalTitle),
        normalizeKeyPart(law.title),
        normalizeKeyPart(law.stage),
        normalizeKeyPart(law.sourceUrl),
        normalizeKeyPart(law.publishedDate || ""),
        normalizeKeyPart(law.summary.slice(0, 240)),
        normalizeKeyPart((law.rawContent || "").slice(0, 240)),
    ].join("|");
    return node_crypto_1.default.createHash("sha1").update(seed).digest("hex");
}
function hasColumn(db, table, column) {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.some((row) => row.name === column);
}
function ensureLawSchema(db) {
    const stageList = stageValues.map((value) => `'${value}'`).join(",");
    const ageList = ageBracketValues.map((value) => `'${value}'`).join(",");
    const statusList = statusValues.map((value) => `'${value}'`).join(",");
    db.exec(`
    CREATE TABLE IF NOT EXISTS laws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      law_key TEXT NOT NULL UNIQUE,
      canonical_title TEXT NOT NULL,
      display_title TEXT NOT NULL,
      jurisdiction_country TEXT NOT NULL,
      jurisdiction_state TEXT,
      stage TEXT NOT NULL CHECK (stage IN (${stageList})),
      age_bracket TEXT NOT NULL CHECK (age_bracket IN (${ageList})),
      is_under16_applicable INTEGER NOT NULL CHECK (is_under16_applicable IN (0,1)),
      impact_score INTEGER NOT NULL CHECK (impact_score BETWEEN 1 AND 5),
      likelihood_score INTEGER NOT NULL CHECK (likelihood_score BETWEEN 1 AND 5),
      confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 1 AND 5),
      chili_score INTEGER NOT NULL CHECK (chili_score BETWEEN 1 AND 5),
      summary TEXT,
      business_impact TEXT,
      required_solutions TEXT,
      competitor_responses TEXT,
      effective_date TEXT,
      published_date TEXT,
      source_url TEXT,
      reliability_tier INTEGER NOT NULL CHECK (reliability_tier BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK (status IN (${statusList})) DEFAULT 'new',
      last_crawled_at TEXT,
      first_seen_at TEXT NOT NULL,
      latest_update_at TEXT NOT NULL,
      update_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS law_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      law_id INTEGER NOT NULL,
      update_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      canonical_title TEXT NOT NULL,
      stage TEXT NOT NULL CHECK (stage IN (${stageList})),
      age_bracket TEXT NOT NULL CHECK (age_bracket IN (${ageList})),
      is_under16_applicable INTEGER NOT NULL CHECK (is_under16_applicable IN (0,1)),
      impact_score INTEGER NOT NULL CHECK (impact_score BETWEEN 1 AND 5),
      likelihood_score INTEGER NOT NULL CHECK (likelihood_score BETWEEN 1 AND 5),
      confidence_score INTEGER NOT NULL CHECK (confidence_score BETWEEN 1 AND 5),
      chili_score INTEGER NOT NULL CHECK (chili_score BETWEEN 1 AND 5),
      summary TEXT,
      business_impact TEXT,
      required_solutions TEXT,
      competitor_responses TEXT,
      effective_date TEXT,
      published_date TEXT,
      source_url TEXT,
      raw_content TEXT,
      reliability_tier INTEGER NOT NULL CHECK (reliability_tier BETWEEN 1 AND 5),
      status TEXT NOT NULL CHECK (status IN (${statusList})) DEFAULT 'new',
      captured_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (law_id) REFERENCES laws(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_laws_law_key ON laws(law_key);
    CREATE INDEX IF NOT EXISTS idx_laws_updated_at ON laws(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_laws_latest_update_at ON laws(latest_update_at DESC);
    CREATE INDEX IF NOT EXISTS idx_laws_chili_score ON laws(chili_score DESC);
    CREATE INDEX IF NOT EXISTS idx_law_updates_law_id ON law_updates(law_id);
    CREATE INDEX IF NOT EXISTS idx_law_updates_law_captured ON law_updates(law_id, captured_at DESC);
  `);
    if (!hasColumn(db, "regulation_events", "law_id")) {
        db.exec("ALTER TABLE regulation_events ADD COLUMN law_id INTEGER REFERENCES laws(id) ON DELETE SET NULL");
    }
    db.exec("CREATE INDEX IF NOT EXISTS idx_regulation_events_law_id ON regulation_events(law_id)");
}
function normalizeLawInput(input) {
    const cleanedTitle = (0, data_cleaner_1.cleanTitle)(input.title);
    const cleanedSummary = (0, data_cleaner_1.cleanText)(input.summary || "");
    const safeSummary = cleanedSummary && !(0, data_cleaner_1.isGarbageText)(cleanedSummary)
        ? cleanedSummary
        : (0, data_cleaner_1.generateSummaryFromContent)(input.rawContent || "", cleanedTitle);
    const cleanedImpact = (0, data_cleaner_1.cleanText)(input.businessImpact || "");
    const safeImpact = cleanedImpact && !(0, data_cleaner_1.isGarbageText)(cleanedImpact)
        ? cleanedImpact
        : "Requires review for compliance impact on Meta platforms.";
    const cleanedRaw = (0, data_cleaner_1.cleanText)(input.rawContent || "").slice(0, 10000);
    const inferredUnder16 = (0, data_cleaner_1.isUnder16Related)(cleanedTitle, safeSummary, cleanedRaw, input.sourceUrl);
    const isUnder16Applicable = input.isUnder16Applicable || inferredUnder16;
    const normalizedAgeBracket = isUnder16Applicable && input.ageBracket === "unknown"
        ? "both"
        : input.ageBracket;
    return {
        ...input,
        title: cleanedTitle,
        summary: safeSummary,
        businessImpact: safeImpact,
        rawContent: cleanedRaw,
        isUnder16Applicable,
        ageBracket: normalizedAgeBracket,
        requiredSolutions: input.requiredSolutions || [],
        competitorResponses: input.competitorResponses || [],
        jurisdictionState: input.jurisdictionState || undefined,
    };
}
function refreshLawSnapshotFromLatestUpdate(db, lawId) {
    const latestUpdate = db.prepare(`
      SELECT *
      FROM law_updates
      WHERE law_id = ?
      ORDER BY COALESCE(published_date, captured_at) DESC, id DESC
      LIMIT 1
    `).get(lawId);
    if (!latestUpdate) {
        return;
    }
    const counts = db.prepare("SELECT COUNT(*) AS count FROM law_updates WHERE law_id = ?").get(lawId);
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE laws
      SET
        display_title = ?,
        canonical_title = ?,
        stage = ?,
        age_bracket = ?,
        is_under16_applicable = ?,
        impact_score = ?,
        likelihood_score = ?,
        confidence_score = ?,
        chili_score = ?,
        summary = ?,
        business_impact = ?,
        required_solutions = ?,
        competitor_responses = ?,
        effective_date = ?,
        published_date = ?,
        source_url = ?,
        reliability_tier = ?,
        status = ?,
        latest_update_at = ?,
        update_count = ?,
        updated_at = ?
      WHERE id = ?
    `).run(latestUpdate.title, latestUpdate.canonical_title, latestUpdate.stage, latestUpdate.age_bracket, latestUpdate.is_under16_applicable, latestUpdate.impact_score, latestUpdate.likelihood_score, latestUpdate.confidence_score, latestUpdate.chili_score, latestUpdate.summary, latestUpdate.business_impact, latestUpdate.required_solutions, latestUpdate.competitor_responses, latestUpdate.effective_date, latestUpdate.published_date, latestUpdate.source_url, latestUpdate.reliability_tier, latestUpdate.status, latestUpdate.published_date || latestUpdate.captured_at, counts.count, now, lawId);
}
function upsertLawWithUpdate(db, input, eventId) {
    const law = normalizeLawInput(input);
    const canonicalTitle = extractCanonicalLawTitle(law.title);
    const lawKey = buildLawKey(law.jurisdictionCountry, law.jurisdictionState, canonicalTitle);
    const updateKey = buildLawUpdateKey(lawKey, law, canonicalTitle);
    let lawRow = db.prepare(`SELECT id, first_seen_at FROM laws WHERE law_key = ? LIMIT 1`).get(lawKey);
    let insertedLaw = false;
    if (!lawRow) {
        const createdAt = law.createdAt || law.updatedAt;
        const latestUpdateAt = law.publishedDate || law.updatedAt;
        const insertLaw = db.prepare(`
        INSERT INTO laws (
          law_key, canonical_title, display_title, jurisdiction_country, jurisdiction_state,
          stage, age_bracket, is_under16_applicable, impact_score, likelihood_score,
          confidence_score, chili_score, summary, business_impact, required_solutions,
          competitor_responses, effective_date, published_date, source_url, reliability_tier,
          status, last_crawled_at, first_seen_at, latest_update_at, update_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `);
        const result = insertLaw.run(lawKey, canonicalTitle, law.title, law.jurisdictionCountry, law.jurisdictionState || null, law.stage, law.ageBracket, law.isUnder16Applicable ? 1 : 0, law.impactScore, law.likelihoodScore, law.confidenceScore, law.chiliScore, law.summary, law.businessImpact, JSON.stringify(law.requiredSolutions), JSON.stringify(law.competitorResponses), law.effectiveDate || null, law.publishedDate || null, law.sourceUrl, law.reliabilityTier, law.status, law.lastCrawledAt || null, createdAt, latestUpdateAt, createdAt, law.updatedAt);
        lawRow = { id: Number(result.lastInsertRowid), first_seen_at: createdAt };
        insertedLaw = true;
    }
    const lawId = lawRow.id;
    const existingUpdate = db.prepare(`SELECT id FROM law_updates WHERE update_key = ? LIMIT 1`).get(updateKey);
    let insertedUpdate = false;
    if (!existingUpdate) {
        db.prepare(`
        INSERT INTO law_updates (
          law_id, update_key, title, canonical_title, stage, age_bracket,
          is_under16_applicable, impact_score, likelihood_score, confidence_score, chili_score,
          summary, business_impact, required_solutions, competitor_responses,
          effective_date, published_date, source_url, raw_content, reliability_tier,
          status, captured_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(lawId, updateKey, law.title, canonicalTitle, law.stage, law.ageBracket, law.isUnder16Applicable ? 1 : 0, law.impactScore, law.likelihoodScore, law.confidenceScore, law.chiliScore, law.summary, law.businessImpact, JSON.stringify(law.requiredSolutions), JSON.stringify(law.competitorResponses), law.effectiveDate || null, law.publishedDate || null, law.sourceUrl, law.rawContent || null, law.reliabilityTier, law.status, law.updatedAt, law.createdAt);
        insertedUpdate = true;
    }
    if (eventId) {
        db.prepare("UPDATE regulation_events SET law_id = ? WHERE id = ?").run(lawId, eventId);
    }
    if (insertedLaw || insertedUpdate) {
        refreshLawSnapshotFromLatestUpdate(db, lawId);
    }
    return { lawId, insertedLaw, insertedUpdate, lawKey };
}
function mergeDuplicateLaws(db) {
    const duplicateKeys = db.prepare(`
      SELECT law_key
      FROM laws
      GROUP BY law_key
      HAVING COUNT(*) > 1
    `).all();
    let merged = 0;
    for (const keyRow of duplicateKeys) {
        const candidates = db.prepare(`
        SELECT id, latest_update_at, update_count
        FROM laws
        WHERE law_key = ?
        ORDER BY update_count DESC, latest_update_at DESC, id ASC
      `).all(keyRow.law_key);
        if (candidates.length <= 1)
            continue;
        const keep = candidates[0].id;
        const remove = candidates.slice(1).map((row) => row.id);
        if (remove.length === 0)
            continue;
        const placeholders = remove.map(() => "?").join(",");
        db.prepare(`UPDATE law_updates SET law_id = ? WHERE law_id IN (${placeholders})`).run(keep, ...remove);
        db.prepare(`UPDATE regulation_events SET law_id = ? WHERE law_id IN (${placeholders})`).run(keep, ...remove);
        db.prepare(`DELETE FROM laws WHERE id IN (${placeholders})`).run(...remove);
        refreshLawSnapshotFromLatestUpdate(db, keep);
        merged += remove.length;
    }
    return merged;
}
function syncLawsFromEvents(db) {
    ensureLawSchema(db);
    const rows = db.prepare(`
      SELECT
        id,
        title,
        jurisdiction_country,
        jurisdiction_state,
        stage,
        age_bracket,
        is_under16_applicable,
        impact_score,
        likelihood_score,
        confidence_score,
        chili_score,
        summary,
        business_impact,
        required_solutions,
        competitor_responses,
        effective_date,
        published_date,
        source_url,
        raw_content,
        reliability_tier,
        status,
        last_crawled_at,
        created_at,
        updated_at
      FROM regulation_events
      ORDER BY COALESCE(published_date, updated_at, created_at) ASC, id ASC
    `).all();
    let insertedLaws = 0;
    let insertedUpdates = 0;
    let linkedEvents = 0;
    const tx = db.transaction(() => {
        for (const row of rows) {
            let requiredSolutions = [];
            let competitorResponses = [];
            try {
                requiredSolutions = row.required_solutions ? JSON.parse(row.required_solutions) : [];
                competitorResponses = row.competitor_responses ? JSON.parse(row.competitor_responses) : [];
            }
            catch {
                requiredSolutions = [];
                competitorResponses = [];
            }
            const result = upsertLawWithUpdate(db, {
                title: row.title,
                jurisdictionCountry: row.jurisdiction_country,
                jurisdictionState: row.jurisdiction_state || undefined,
                stage: row.stage,
                ageBracket: row.age_bracket,
                isUnder16Applicable: Boolean(row.is_under16_applicable),
                impactScore: row.impact_score,
                likelihoodScore: row.likelihood_score,
                confidenceScore: row.confidence_score,
                chiliScore: row.chili_score,
                summary: row.summary || "",
                businessImpact: row.business_impact || "",
                requiredSolutions,
                competitorResponses,
                effectiveDate: row.effective_date,
                publishedDate: row.published_date,
                sourceUrl: row.source_url,
                rawContent: row.raw_content || "",
                reliabilityTier: row.reliability_tier,
                status: row.status,
                lastCrawledAt: row.last_crawled_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            }, row.id);
            if (result.insertedLaw)
                insertedLaws += 1;
            if (result.insertedUpdate)
                insertedUpdates += 1;
            linkedEvents += 1;
        }
    });
    tx();
    const mergedDuplicates = mergeDuplicateLaws(db);
    return {
        scanned: rows.length,
        insertedLaws,
        insertedUpdates,
        linkedEvents,
        mergedDuplicates,
    };
}
//# sourceMappingURL=laws.js.map