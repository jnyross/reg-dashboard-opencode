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

    CREATE INDEX IF NOT EXISTS idx_regulation_events_stage
      ON regulation_events(stage);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_jurisdiction_country
      ON regulation_events(jurisdiction_country);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_jurisdiction_state
      ON regulation_events(jurisdiction_state);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_age_bracket
      ON regulation_events(age_bracket);
    CREATE INDEX IF NOT EXISTS idx_regulation_events_status
      ON regulation_events(status);
    CREATE INDEX IF NOT EXISTS idx_feedback_event_id
      ON feedback(event_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_regulation_events_dedup
      ON regulation_events(source_url, jurisdiction_country, title);
  `);
}
function upsertSource(db, source) {
    const now = new Date().toISOString();
    const existing = db.prepare("SELECT id FROM sources WHERE source_id = ?").get(source.sourceId);
    if (existing) {
        db.prepare(`
      UPDATE sources SET name = ?, url = ?, authority_type = ?, jurisdiction_country = ?, 
      jurisdiction_state = ?, reliability_tier = ?, description = ?
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
function generateEventId(url, jurisdiction, title) {
    const hash = node_crypto_1.default.createHash("sha256");
    hash.update(`${url}|${jurisdiction}|${title}`);
    return hash.digest("hex").substring(0, 16);
}
function isAgeBracketUnder16(ageBracket) {
    return ageBracket === "13-15" || ageBracket === "both";
}
function upsertAnalyzedItem(db, item, reliabilityTier) {
    const now = new Date().toISOString();
    const eventId = generateEventId(item.url, item.jurisdictionCountry, item.title);
    const existing = db.prepare("SELECT id, stage, status FROM regulation_events WHERE source_url = ? AND jurisdiction_country = ? AND title = ?")
        .get(item.url, item.jurisdictionCountry, item.title);
    let status = "new";
    let isNew = !existing;
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
    db.prepare(`
    INSERT OR REPLACE INTO regulation_events (
      id, title, jurisdiction_country, jurisdiction_state, stage, age_bracket,
      is_under16_applicable, impact_score, likelihood_score, confidence_score, chili_score,
      summary, business_impact, required_solutions, competitor_responses,
      effective_date, published_date, source_url, raw_content, reliability_tier,
      status, last_crawled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(eventId, item.title, item.jurisdictionCountry, item.jurisdictionState || null, item.stage, item.ageBracket, isAgeBracketUnder16(item.ageBracket) ? 1 : 0, item.impactScore, item.likelihoodScore, item.confidenceScore, item.chiliScore, item.summary, item.businessImpact, JSON.stringify(item.requiredSolutions), JSON.stringify(item.competitorResponses), null, item.publishedDate || null, item.url, item.rawContent.substring(0, 10000), reliabilityTier, status, now, isNew ? now : existing ? now : now, now);
    return { id: eventId, isNew, statusChanged };
}
//# sourceMappingURL=db.js.map