"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databasePathDefault = void 0;
exports.openDatabase = openDatabase;
exports.initializeSchema = initializeSchema;
exports.upsertSource = upsertSource;
exports.upsertAnalyzedItem = upsertAnalyzedItem;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const data_cleaner_1 = require("./data-cleaner");
exports.databasePathDefault = node_path_1.default.join(process.cwd(), "data", "reg-regulation-dashboard.sqlite");
const allowedStages = [
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
const allowedAuthorities = ["national", "state", "local", "supranational"];
const allowedAgeBrackets = ["13-15", "16-18", "both", "unknown"];
const allowedStatuses = ["new", "updated", "status_changed", "unchanged"];
function openDatabase(databasePath = exports.databasePathDefault) {
    if (databasePath !== ":memory:") {
        const directory = node_path_1.default.dirname(databasePath);
        if (!node_fs_1.default.existsSync(directory)) {
            node_fs_1.default.mkdirSync(directory, { recursive: true });
        }
    }
    const db = new better_sqlite3_1.default(databasePath);
    db.pragma("foreign_keys = ON");
    db.pragma("journal_mode = WAL");
    db.pragma("busy_timeout = 5000");
    return db;
}
function initializeSchema(db) {
    const authorityList = allowedAuthorities.map((a) => `'${a}'`).join(",");
    const stageList = allowedStages.map((s) => `'${s}'`).join(",");
    const ageBracketList = allowedAgeBrackets.map((a) => `'${a}'`).join(",");
    const statusList = allowedStatuses.map((s) => `'${s}'`).join(",");
    db.exec(`
    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      authority_type TEXT NOT NULL CHECK (authority_type IN (${authorityList})),
      jurisdiction_country TEXT NOT NULL,
      jurisdiction_state TEXT,
      reliability_tier INTEGER NOT NULL CHECK (reliability_tier BETWEEN 1 AND 5),
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS regulation_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      jurisdiction_country TEXT NOT NULL,
      jurisdiction_state TEXT,
      stage TEXT NOT NULL CHECK (stage IN (${stageList})),
      age_bracket TEXT NOT NULL CHECK (age_bracket IN (${ageBracketList})),
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
      source_id INTEGER,
      last_crawled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES regulation_events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS crawl_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
      started_at TEXT NOT NULL,
      completed_at TEXT,
      source_ids TEXT,
      sources_processed INTEGER,
      items_crawled INTEGER,
      items_analyzed INTEGER,
      items_saved INTEGER,
      error_count INTEGER,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS event_stage_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      previous_stage TEXT,
      new_stage TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      note TEXT,
      FOREIGN KEY (event_id) REFERENCES regulation_events (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      filters_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS alert_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
      min_chili INTEGER NOT NULL DEFAULT 4 CHECK (min_chili BETWEEN 1 AND 5),
      webhook_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
      event_id TEXT,
      created_at TEXT NOT NULL,
      read_at TEXT,
      FOREIGN KEY (event_id) REFERENCES regulation_events (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS event_edits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      edited_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES regulation_events (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_regulation_events_stage ON regulation_events(stage);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_jurisdiction_country ON regulation_events(jurisdiction_country);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_jurisdiction_state ON regulation_events(jurisdiction_state);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_age_bracket ON regulation_events(age_bracket);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_status ON regulation_events(status);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_updated_at ON regulation_events(updated_at);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_chili_score ON regulation_events(chili_score);
    CREATE INDEX IF NOT EXISTS idx_feedback_event_id ON feedback(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_edits_event_id ON event_edits(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_stage_history_event_changed ON event_stage_history(event_id, changed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_crawl_runs_started_at ON crawl_runs(started_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_regulation_events_dedup ON regulation_events(source_url, jurisdiction_country, title);
  `);
    const existingAlertConfig = db.prepare("SELECT id FROM alert_configs LIMIT 1").get();
    if (!existingAlertConfig) {
        const now = new Date().toISOString();
        db.prepare("INSERT INTO alert_configs (email, frequency, min_chili, webhook_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(null, "daily", 4, null, now, now);
    }
}
function upsertSource(db, source) {
    const now = new Date().toISOString();
    const existing = db.prepare("SELECT id FROM sources WHERE source_id = ?").get(source.sourceId);
    if (existing) {
        db.prepare(`
      UPDATE sources
      SET name = ?, url = ?, authority_type = ?, jurisdiction_country = ?, jurisdiction_state = ?, reliability_tier = ?, description = ?
      WHERE source_id = ?
    `).run(source.name, source.url, source.authorityType, source.jurisdictionCountry, source.jurisdictionState || null, source.reliabilityTier, source.description || null, source.sourceId);
        return existing.id;
    }
    const result = db.prepare(`
    INSERT INTO sources (source_id, name, url, authority_type, jurisdiction_country, jurisdiction_state, reliability_tier, description, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(source.sourceId, source.name, source.url, source.authorityType, source.jurisdictionCountry, source.jurisdictionState || null, source.reliabilityTier, source.description || null, now);
    return Number(result.lastInsertRowid);
}
function generateEventId(jurisdiction, jurisdictionState, title) {
    const hash = node_crypto_1.default.createHash("sha256");
    hash.update(`${jurisdiction}|${jurisdictionState || ""}|${title.toLowerCase()}`);
    return hash.digest("hex").substring(0, 16);
}
function normalizeSummary(item) {
    const candidate = (0, data_cleaner_1.cleanText)(item.summary || "");
    if (!candidate || (0, data_cleaner_1.isGarbageText)(candidate)) {
        return (0, data_cleaner_1.generateSummaryFromContent)(item.rawContent, item.title);
    }
    return candidate;
}
function normalizeBusinessImpact(item) {
    const candidate = (0, data_cleaner_1.cleanText)(item.businessImpact || "");
    if (!candidate || (0, data_cleaner_1.isGarbageText)(candidate)) {
        return "Requires review for compliance impact on Meta platforms.";
    }
    return candidate;
}
function upsertAnalyzedItem(db, item, reliabilityTier) {
    const now = new Date().toISOString();
    const cleanedTitle = (0, data_cleaner_1.cleanTitle)(item.title);
    const cleanedSummary = normalizeSummary(item);
    const cleanedImpact = normalizeBusinessImpact(item);
    const cleanedRawContent = (0, data_cleaner_1.cleanText)(item.rawContent).substring(0, 10000);
    const generatedEventId = generateEventId(item.jurisdictionCountry, item.jurisdictionState, cleanedTitle);
    const jurisdictionState = item.jurisdictionState || "";
    const existing = db.prepare(`SELECT id, stage, created_at
     FROM regulation_events
     WHERE jurisdiction_country = ?
       AND COALESCE(jurisdiction_state, '') = ?
       AND lower(title) = lower(?)
     ORDER BY updated_at DESC
     LIMIT 1`).get(item.jurisdictionCountry, jurisdictionState, cleanedTitle);
    const eventId = existing?.id ?? generatedEventId;
    let status = "new";
    const isNew = !existing;
    let statusChanged = false;
    if (existing) {
        if (existing.stage !== item.stage) {
            status = "status_changed";
            statusChanged = true;
        }
        else {
            status = "unchanged";
        }
    }
    const inferredUnder16 = (0, data_cleaner_1.isUnder16Related)(cleanedTitle, cleanedSummary, cleanedRawContent, item.url);
    const isUnder16Applicable = item.ageBracket === "13-15" || item.ageBracket === "both" || inferredUnder16 ? 1 : 0;
    const normalizedAgeBracket = inferredUnder16 && item.ageBracket === "unknown" ? "both" : item.ageBracket;
    const sourceIdNumber = Number.parseInt(item.sourceId, 10);
    const sourceId = Number.isNaN(sourceIdNumber) ? null : sourceIdNumber;
    const createdAt = existing?.created_at ?? now;
    db.prepare(`
    INSERT INTO regulation_events (
      id, title, jurisdiction_country, jurisdiction_state, stage, age_bracket,
      is_under16_applicable, impact_score, likelihood_score, confidence_score, chili_score,
      summary, business_impact, required_solutions, competitor_responses,
      effective_date, published_date, source_url, raw_content, reliability_tier,
      status, source_id, last_crawled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      jurisdiction_country = excluded.jurisdiction_country,
      jurisdiction_state = excluded.jurisdiction_state,
      stage = excluded.stage,
      age_bracket = excluded.age_bracket,
      is_under16_applicable = excluded.is_under16_applicable,
      impact_score = excluded.impact_score,
      likelihood_score = excluded.likelihood_score,
      confidence_score = excluded.confidence_score,
      chili_score = excluded.chili_score,
      summary = excluded.summary,
      business_impact = excluded.business_impact,
      required_solutions = excluded.required_solutions,
      competitor_responses = excluded.competitor_responses,
      effective_date = excluded.effective_date,
      published_date = excluded.published_date,
      source_url = excluded.source_url,
      raw_content = excluded.raw_content,
      reliability_tier = excluded.reliability_tier,
      status = excluded.status,
      source_id = excluded.source_id,
      last_crawled_at = excluded.last_crawled_at,
      updated_at = excluded.updated_at
  `).run(eventId, cleanedTitle, item.jurisdictionCountry, item.jurisdictionState || null, item.stage, normalizedAgeBracket, isUnder16Applicable, item.impactScore, item.likelihoodScore, item.confidenceScore, item.chiliScore, cleanedSummary, cleanedImpact, JSON.stringify(item.requiredSolutions || []), JSON.stringify(item.competitorResponses || []), null, item.publishedDate || null, item.url, cleanedRawContent, reliabilityTier, status, sourceId, now, createdAt, now);
    if (isNew) {
        db.prepare("INSERT INTO event_stage_history (event_id, previous_stage, new_stage, changed_at, note) VALUES (?, ?, ?, ?, ?)").run(eventId, null, item.stage, now, "Initial ingestion");
    }
    else if (statusChanged && existing) {
        db.prepare("INSERT INTO event_stage_history (event_id, previous_stage, new_stage, changed_at, note) VALUES (?, ?, ?, ?, ?)").run(eventId, existing.stage, item.stage, now, "Stage updated via pipeline");
    }
    return { id: eventId, isNew, statusChanged };
}
//# sourceMappingURL=db.js.map