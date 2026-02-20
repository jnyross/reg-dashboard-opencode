"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const pipeline_1 = require("./pipeline");
const backfill_1 = require("./backfill");
const data_cleaner_1 = require("./data-cleaner");
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
const stageUrgency = {
    proposed: 9,
    introduced: 8,
    committee_review: 7,
    passed: 6,
    enacted: 5,
    effective: 4,
    amended: 3,
    withdrawn: 2,
    rejected: 1,
};
const stageColor = {
    proposed: "#1d4ed8",
    introduced: "#0ea5e9",
    committee_review: "#64748b",
    passed: "#0d9488",
    enacted: "#dc2626",
    effective: "#16a34a",
    amended: "#6d28d9",
    withdrawn: "#7f1d1d",
    rejected: "#9f1239",
};
const allowedAgeBrackets = new Set(["13-15", "16-18", "both", "unknown"]);
const allowedRatings = new Set(["good", "bad"]);
const defaultBriefLimit = 5;
const crawlState = {
    running: false,
    runId: null,
};
function ensureAuxiliaryTables(db) {
    db.exec(`
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
      FOREIGN KEY (event_id) REFERENCES regulation_events(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_event_stage_history_event_changed
      ON event_stage_history(event_id, changed_at DESC);

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
      frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
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
      FOREIGN KEY (event_id) REFERENCES regulation_events(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_created_at
      ON notifications(created_at DESC);
  `);
    const existingConfig = db.prepare("SELECT id FROM alert_configs LIMIT 1").get();
    if (!existingConfig) {
        const now = new Date().toISOString();
        db.prepare("INSERT INTO alert_configs (email, frequency, min_chili, webhook_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").run(null, "daily", 4, null, now, now);
    }
}
function parsePaging(value, defaultValue, maxValue) {
    if (value === undefined) {
        return defaultValue;
    }
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return defaultValue;
    }
    return maxValue === undefined ? parsed : Math.min(parsed, maxValue);
}
function parseSingleInt(value, min, max) {
    if (value === undefined)
        return undefined;
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed))
        return undefined;
    if (min !== undefined && parsed < min)
        return undefined;
    if (max !== undefined && parsed > max)
        return undefined;
    return parsed;
}
function parseList(value) {
    if (!value)
        return [];
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}
function parseStageList(value) {
    return parseList(value).filter((entry) => allowedStages.includes(entry));
}
function parseAgeBracketList(value) {
    return parseList(value).filter((entry) => allowedAgeBrackets.has(entry));
}
function jsonArray(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed))
            return [];
        return parsed.filter((entry) => typeof entry === "string");
    }
    catch {
        return [];
    }
}
function safeText(value) {
    return value ? (0, data_cleaner_1.cleanText)(value) : "";
}
function sanitizeEvent(row) {
    const cleanedTitle = (0, data_cleaner_1.cleanTitle)(row.title);
    const cleanedSummary = row.summary && !(0, data_cleaner_1.isGarbageText)(row.summary)
        ? (0, data_cleaner_1.cleanText)(row.summary)
        : (0, data_cleaner_1.generateSummaryFromContent)(row.raw_content ?? "", cleanedTitle);
    const cleanedBusinessImpact = row.business_impact && !(0, data_cleaner_1.isGarbageText)(row.business_impact)
        ? (0, data_cleaner_1.cleanText)(row.business_impact)
        : "Requires review for compliance impact on Meta platforms.";
    const inferredUnder16 = (0, data_cleaner_1.isUnder16Related)(cleanedTitle, cleanedSummary, row.raw_content ?? "", row.source_url ?? "");
    const isUnder16Applicable = Boolean(row.is_under16_applicable) || inferredUnder16;
    const normalizedAgeBracket = isUnder16Applicable && row.age_bracket === "unknown" ? "both" : row.age_bracket;
    const requiredSolutions = jsonArray(row.required_solutions);
    const competitorResponses = jsonArray(row.competitor_responses);
    return {
        id: row.id,
        title: cleanedTitle,
        jurisdiction: {
            country: row.jurisdiction_country,
            state: row.jurisdiction_state,
            flag: jurisdictionFlag(row.jurisdiction_country),
        },
        stage: row.stage,
        stageColor: stageColor[row.stage],
        ageBracket: normalizedAgeBracket,
        isUnder16Applicable,
        scores: {
            impact: row.impact_score,
            likelihood: row.likelihood_score,
            confidence: row.confidence_score,
            chili: row.chili_score,
        },
        summary: cleanedSummary,
        businessImpact: cleanedBusinessImpact,
        requiredSolutions,
        competitorResponses,
        effectiveDate: row.effective_date,
        publishedDate: row.published_date,
        source: {
            url: row.source_url,
            reliabilityTier: row.reliability_tier,
        },
        reliabilityTier: row.reliability_tier,
        status: row.status,
        lastCrawledAt: row.last_crawled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function jurisdictionFlag(country) {
    const mapping = {
        "United States": "🇺🇸",
        "European Union": "🇪🇺",
        "United Kingdom": "🇬🇧",
        Australia: "🇦🇺",
        Canada: "🇨🇦",
        India: "🇮🇳",
        Singapore: "🇸🇬",
        France: "🇫🇷",
        Germany: "🇩🇪",
        Ireland: "🇮🇪",
        Netherlands: "🇳🇱",
        Italy: "🇮🇹",
        Spain: "🇪🇸",
        Brazil: "🇧🇷",
        China: "🇨🇳",
        Japan: "🇯🇵",
    };
    return mapping[country] ?? "🌍";
}
function getLastCrawledAt(db) {
    const row = db.prepare("SELECT MAX(last_crawled_at) AS lastCrawledAt FROM regulation_events").get();
    return row?.lastCrawledAt ?? null;
}
function startCrawlRun(db, sourceIds) {
    const now = new Date().toISOString();
    const result = db
        .prepare("INSERT INTO crawl_runs (status, started_at, source_ids) VALUES (?, ?, ?)")
        .run("running", now, sourceIds?.length ? JSON.stringify(sourceIds) : null);
    return Number(result.lastInsertRowid);
}
function finishCrawlRun(db, runId, payload) {
    const completedAt = new Date().toISOString();
    db.prepare(`
      UPDATE crawl_runs
      SET status = ?, completed_at = ?, sources_processed = ?, items_crawled = ?,
          items_analyzed = ?, items_saved = ?, error_count = ?, error_message = ?
      WHERE id = ?
    `).run(payload.status, completedAt, payload.sourcesProcessed ?? null, payload.itemsCrawled ?? null, payload.itemsAnalyzed ?? null, payload.itemsSaved ?? null, payload.errorCount ?? null, payload.errorMessage ?? null, runId);
}
function getLatestCrawlRun(db) {
    return db.prepare("SELECT * FROM crawl_runs ORDER BY id DESC LIMIT 1").get();
}
function buildWhereClause(filters) {
    const clauses = [];
    const params = [];
    if (filters.jurisdictions.length > 0) {
        const placeholders = filters.jurisdictions.map(() => "?").join(", ");
        clauses.push(`(e.jurisdiction_country IN (${placeholders}) OR e.jurisdiction_state IN (${placeholders}))`);
        params.push(...filters.jurisdictions, ...filters.jurisdictions);
    }
    if (filters.stages.length > 0) {
        const placeholders = filters.stages.map(() => "?").join(", ");
        clauses.push(`e.stage IN (${placeholders})`);
        params.push(...filters.stages);
    }
    if (filters.ageBrackets.length > 0) {
        const placeholders = filters.ageBrackets.map(() => "?").join(", ");
        clauses.push(`e.age_bracket IN (${placeholders})`);
        params.push(...filters.ageBrackets);
    }
    if (filters.minRisk !== undefined) {
        clauses.push("e.chili_score >= ?");
        params.push(filters.minRisk);
    }
    if (filters.maxRisk !== undefined) {
        clauses.push("e.chili_score <= ?");
        params.push(filters.maxRisk);
    }
    if (filters.dateFrom) {
        clauses.push("COALESCE(e.published_date, e.updated_at) >= ?");
        params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
        clauses.push("COALESCE(e.published_date, e.updated_at) <= ?");
        params.push(filters.dateTo);
    }
    if (filters.search) {
        const like = `%${filters.search.toLowerCase()}%`;
        clauses.push("(lower(e.title) LIKE ? OR lower(COALESCE(e.summary, '')) LIKE ? OR lower(COALESCE(e.business_impact, '')) LIKE ? OR lower(COALESCE(e.raw_content, '')) LIKE ? OR lower(COALESCE(e.source_url, '')) LIKE ?)");
        params.push(like, like, like, like, like);
    }
    if (filters.under16Only) {
        clauses.push("(e.is_under16_applicable = 1 OR e.age_bracket IN ('13-15', 'both'))");
    }
    return {
        where: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
        params,
    };
}
function resolveSort(sortBy, sortDirection) {
    const direction = sortDirection?.toLowerCase() === "asc" ? "ASC" : "DESC";
    const mapping = {
        updated: `e.updated_at ${direction}`,
        updated_at: `e.updated_at ${direction}`,
        date: `COALESCE(e.published_date, e.updated_at) ${direction}`,
        publishedDate: `COALESCE(e.published_date, e.updated_at) ${direction}`,
        risk: `e.chili_score ${direction}, e.impact_score ${direction}`,
        jurisdiction: `e.jurisdiction_country ${direction}, e.jurisdiction_state ${direction}`,
        stage: `CASE e.stage
      WHEN 'proposed' THEN 1
      WHEN 'introduced' THEN 2
      WHEN 'committee_review' THEN 3
      WHEN 'passed' THEN 4
      WHEN 'enacted' THEN 5
      WHEN 'effective' THEN 6
      WHEN 'amended' THEN 7
      WHEN 'withdrawn' THEN 8
      WHEN 'rejected' THEN 9
      ELSE 99 END ${direction}`,
        recently_updated: "e.updated_at DESC",
    };
    return mapping[sortBy ?? ""] ?? "e.updated_at DESC";
}
function setPaginationHeaders(res, page, limit, total) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.setHeader("X-Total-Count", String(total));
    res.setHeader("X-Total-Pages", String(totalPages));
    res.setHeader("X-Page", String(page));
    res.setHeader("X-Limit", String(limit));
    const links = [];
    if (page > 1)
        links.push(`</api/events?page=${page - 1}&limit=${limit}>; rel=\"prev\"`);
    if (page < totalPages)
        links.push(`</api/events?page=${page + 1}&limit=${limit}>; rel=\"next\"`);
    if (links.length > 0) {
        res.setHeader("Link", links.join(", "));
    }
}
function createBriefSelect(sqlLimit) {
    return `
    SELECT
      e.id,
      e.title,
      e.jurisdiction_country,
      e.jurisdiction_state,
      e.stage,
      e.age_bracket,
      e.is_under16_applicable,
      e.chili_score,
      e.summary,
      e.business_impact,
      e.effective_date,
      e.published_date,
      e.source_url,
      e.raw_content,
      e.reliability_tier,
      e.status,
      e.last_crawled_at,
      e.updated_at,
      e.created_at,
      e.impact_score,
      e.likelihood_score,
      e.confidence_score,
      e.required_solutions,
      e.competitor_responses,
      CASE e.stage
        WHEN 'proposed' THEN 9
        WHEN 'introduced' THEN 8
        WHEN 'committee_review' THEN 7
        WHEN 'passed' THEN 6
        WHEN 'enacted' THEN 5
        WHEN 'effective' THEN 4
        WHEN 'amended' THEN 3
        WHEN 'withdrawn' THEN 2
        WHEN 'rejected' THEN 1
      END AS urgency_rank
    FROM regulation_events e
    ORDER BY
      e.chili_score DESC,
      urgency_rank DESC,
      e.updated_at DESC,
      e.id ASC
    LIMIT ${sqlLimit};
  `;
}
function wrapText(text, maxLength) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLength) {
            if (current)
                lines.push(current);
            current = word;
        }
        else {
            current = next;
        }
    }
    if (current)
        lines.push(current);
    return lines;
}
function escapePdfText(value) {
    return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function buildSimplePdf(title, contentLines) {
    const lines = [title, "", ...contentLines].flatMap((line) => wrapText(line, 92)).slice(0, 58);
    const streamLines = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];
    for (const line of lines) {
        streamLines.push(`(${escapePdfText(line)}) Tj`);
        streamLines.push("T*");
    }
    streamLines.push("ET");
    const contentStream = streamLines.join("\n");
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let i = 0; i < objects.length; i += 1) {
        offsets.push(Buffer.byteLength(pdf, "utf8"));
        pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i < offsets.length; i += 1) {
        pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
}
async function sendWebhookIfConfigured(db, payload) {
    const config = db.prepare("SELECT webhook_url FROM alert_configs LIMIT 1").get();
    if (!config?.webhook_url)
        return;
    try {
        await fetch(config.webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`Webhook delivery failed: ${msg}`);
    }
}
function createHighRiskNotifications(db, startedAt, minChili) {
    const highRiskRows = db
        .prepare(`
      SELECT id, title, chili_score
      FROM regulation_events
      WHERE updated_at >= ?
        AND chili_score >= ?
      ORDER BY updated_at DESC
      LIMIT 20
    `)
        .all(startedAt, minChili);
    const now = new Date().toISOString();
    const insert = db.prepare("INSERT INTO notifications (title, message, severity, event_id, created_at) VALUES (?, ?, ?, ?, ?)");
    for (const row of highRiskRows) {
        const severity = row.chili_score >= 5 ? "critical" : "warning";
        insert.run("High-risk regulation detected", `${(0, data_cleaner_1.cleanTitle)(row.title)} (${row.chili_score}🌶️)`, severity, row.id, now);
    }
    return highRiskRows.length;
}
function createApp(db) {
    ensureAuxiliaryTables(db);
    (0, data_cleaner_1.runDataCleanup)(db);
    const startupBackfill = (0, backfill_1.backfillEventRiskAndJurisdiction)(db);
    if (startupBackfill.updated > 0) {
        console.log(`Startup backfill updated ${startupBackfill.updated}/${startupBackfill.scanned} events `
            + `(risk: ${startupBackfill.riskUpdated}, jurisdiction: ${startupBackfill.jurisdictionUpdated}, `
            + `unknown: ${startupBackfill.unknownBefore}→${startupBackfill.unknownAfter}, `
            + `high-risk: ${startupBackfill.highRiskBefore}→${startupBackfill.highRiskAfter})`);
    }
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use(express_1.default.static(node_path_1.default.join(process.cwd(), "web")));
    app.get("/api/health", (req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString(),
            version: "v2",
            crawlRunning: crawlState.running,
            lastCrawledAt: getLastCrawledAt(db),
        });
    });
    app.get("/api/crawl/status", (req, res) => {
        const lastRun = getLatestCrawlRun(db);
        const totalEvents = db.prepare("SELECT COUNT(*) AS total FROM regulation_events").get().total;
        const highRiskCount = db.prepare("SELECT COUNT(*) AS total FROM regulation_events WHERE chili_score >= 4").get().total;
        res.json({
            status: crawlState.running ? "running" : lastRun?.status ?? "idle",
            isRunning: crawlState.running,
            activeRunId: crawlState.runId,
            totalEvents,
            highRiskCount,
            lastCrawledAt: getLastCrawledAt(db),
            lastRun,
            timestamp: new Date().toISOString(),
        });
    });
    app.get("/api/brief", (req, res) => {
        const limit = parsePaging(req.query.limit, defaultBriefLimit, 20);
        const rows = db.prepare(createBriefSelect(limit)).all();
        const items = rows.map((row) => {
            const event = sanitizeEvent(row);
            return {
                ...event,
                urgencyScore: stageUrgency[row.stage] ?? 0,
                chiliScore: row.chili_score,
            };
        });
        res.json({
            generatedAt: new Date().toISOString(),
            lastCrawledAt: getLastCrawledAt(db),
            items,
            total: rows.length,
            limit,
        });
    });
    app.get("/api/events", (req, res) => {
        const minRisk = parseSingleInt(req.query.minRisk, 1, 5);
        const maxRisk = parseSingleInt(req.query.maxRisk, 1, 5);
        if (req.query.minRisk !== undefined && minRisk === undefined) {
            return res.status(400).json({ error: "minRisk must be an integer between 1 and 5" });
        }
        if (req.query.maxRisk !== undefined && maxRisk === undefined) {
            return res.status(400).json({ error: "maxRisk must be an integer between 1 and 5" });
        }
        if (minRisk !== undefined && maxRisk !== undefined && minRisk > maxRisk) {
            return res.status(400).json({ error: "minRisk cannot be greater than maxRisk" });
        }
        const stagesRaw = typeof req.query.stage === "string" ? req.query.stage : undefined;
        const stages = parseStageList(stagesRaw);
        if (stagesRaw && stages.length === 0) {
            return res.status(400).json({ error: "stage must use valid lifecycle values" });
        }
        const ageBracketsRaw = typeof req.query.ageBracket === "string" ? req.query.ageBracket : undefined;
        const ageBrackets = parseAgeBracketList(ageBracketsRaw);
        if (ageBracketsRaw && ageBrackets.length === 0) {
            return res.status(400).json({ error: "ageBracket must use valid values" });
        }
        const filters = {
            search: typeof req.query.search === "string" ? req.query.search.trim() : undefined,
            jurisdictions: parseList(typeof req.query.jurisdiction === "string" ? req.query.jurisdiction : undefined),
            stages,
            ageBrackets,
            minRisk,
            maxRisk,
            dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
            dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
            under16Only: String(req.query.under16Only ?? "").toLowerCase() === "true",
        };
        const page = parsePaging(req.query.page, 1);
        const limit = parsePaging(req.query.limit, 10, 100);
        const offset = (page - 1) * limit;
        const { where, params } = buildWhereClause(filters);
        const total = db.prepare(`SELECT COUNT(*) AS total FROM regulation_events e ${where}`).get(...params).total;
        const orderBy = resolveSort(typeof req.query.sortBy === "string" ? req.query.sortBy : undefined, typeof req.query.sortDirection === "string" ? req.query.sortDirection : undefined);
        const rows = db
            .prepare(`
        SELECT
          e.id,
          e.title,
          e.jurisdiction_country,
          e.jurisdiction_state,
          e.stage,
          e.age_bracket,
          e.is_under16_applicable,
          e.impact_score,
          e.likelihood_score,
          e.confidence_score,
          e.chili_score,
          e.summary,
          e.business_impact,
          e.required_solutions,
          e.competitor_responses,
          e.effective_date,
          e.published_date,
          e.source_url,
          e.raw_content,
          e.reliability_tier,
          e.status,
          e.last_crawled_at,
          e.updated_at,
          e.created_at
        FROM regulation_events e
        ${where}
        ORDER BY ${orderBy}, e.id ASC
        LIMIT ? OFFSET ?
      `)
            .all(...params, limit, offset);
        setPaginationHeaders(res, page, limit, total);
        res.json({
            items: rows.map((row) => sanitizeEvent(row)),
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
            lastCrawledAt: getLastCrawledAt(db),
        });
    });
    app.get("/api/events/:id", (req, res) => {
        const row = db
            .prepare(`
        SELECT
          e.id,
          e.title,
          e.jurisdiction_country,
          e.jurisdiction_state,
          e.stage,
          e.age_bracket,
          e.is_under16_applicable,
          e.impact_score,
          e.likelihood_score,
          e.confidence_score,
          e.chili_score,
          e.summary,
          e.business_impact,
          e.required_solutions,
          e.competitor_responses,
          e.effective_date,
          e.published_date,
          e.source_url,
          e.raw_content,
          e.reliability_tier,
          e.status,
          e.last_crawled_at,
          e.updated_at,
          e.created_at
        FROM regulation_events e
        WHERE e.id = ?
      `)
            .get(req.params.id);
        if (!row) {
            return res.status(404).json({ error: "event not found" });
        }
        const feedbackRows = db
            .prepare(`
        SELECT id, event_id, rating, note, created_at
        FROM feedback
        WHERE event_id = ?
        ORDER BY created_at DESC, id DESC
      `)
            .all(req.params.id);
        const relatedRows = db
            .prepare(`
        SELECT
          e.id,
          e.title,
          e.jurisdiction_country,
          e.jurisdiction_state,
          e.stage,
          e.age_bracket,
          e.is_under16_applicable,
          e.impact_score,
          e.likelihood_score,
          e.confidence_score,
          e.chili_score,
          e.summary,
          e.business_impact,
          e.required_solutions,
          e.competitor_responses,
          e.effective_date,
          e.published_date,
          e.source_url,
          e.raw_content,
          e.reliability_tier,
          e.status,
          e.last_crawled_at,
          e.updated_at,
          e.created_at
        FROM regulation_events e
        WHERE e.id <> ?
          AND (
            e.jurisdiction_country = ?
            OR e.stage = ?
            OR lower(e.title) LIKE ?
          )
        ORDER BY e.chili_score DESC, e.updated_at DESC
        LIMIT 5
      `)
            .all(req.params.id, row.jurisdiction_country, row.stage, `%${(0, data_cleaner_1.cleanTitle)(row.title).slice(0, 16).toLowerCase()}%`);
        const timelineRows = db
            .prepare(`
        SELECT id, event_id, previous_stage, new_stage, changed_at, note
        FROM event_stage_history
        WHERE event_id = ?
        ORDER BY changed_at ASC, id ASC
      `)
            .all(req.params.id);
        const timeline = timelineRows.length > 0
            ? timelineRows.map((entry) => ({
                id: entry.id,
                eventId: entry.event_id,
                previousStage: entry.previous_stage,
                newStage: entry.new_stage,
                changedAt: entry.changed_at,
                note: entry.note,
            }))
            : [
                {
                    id: 0,
                    eventId: row.id,
                    previousStage: null,
                    newStage: row.stage,
                    changedAt: row.created_at,
                    note: "Initial ingestion",
                },
            ];
        res.json({
            ...sanitizeEvent(row),
            relatedEvents: relatedRows.map((related) => sanitizeEvent(related)),
            regulatoryTimeline: timeline,
            feedback: feedbackRows.map((feedback) => ({
                id: feedback.id,
                eventId: feedback.event_id,
                rating: feedback.rating,
                note: feedback.note,
                createdAt: feedback.created_at,
            })),
        });
    });
    app.put("/api/events/:id", (req, res) => {
        const id = req.params.id;
        const current = db
            .prepare("SELECT id, stage FROM regulation_events WHERE id = ?")
            .get(id);
        if (!current) {
            return res.status(404).json({ error: "event not found" });
        }
        const payload = req.body;
        if (payload.stage && !allowedStages.includes(payload.stage)) {
            return res.status(400).json({ error: "Invalid stage value" });
        }
        if (payload.ageBracket && !allowedAgeBrackets.has(payload.ageBracket)) {
            return res.status(400).json({ error: "Invalid ageBracket value" });
        }
        const now = new Date().toISOString();
        const requiredSolutions = Array.isArray(payload.requiredSolutions)
            ? JSON.stringify(payload.requiredSolutions)
            : undefined;
        const competitorResponses = Array.isArray(payload.competitorResponses)
            ? JSON.stringify(payload.competitorResponses)
            : undefined;
        db.prepare(`
      UPDATE regulation_events
      SET
        title = COALESCE(?, title),
        summary = COALESCE(?, summary),
        business_impact = COALESCE(?, business_impact),
        stage = COALESCE(?, stage),
        age_bracket = COALESCE(?, age_bracket),
        is_under16_applicable = COALESCE(?, is_under16_applicable),
        required_solutions = COALESCE(?, required_solutions),
        competitor_responses = COALESCE(?, competitor_responses),
        updated_at = ?
      WHERE id = ?
    `).run(payload.title ? (0, data_cleaner_1.cleanTitle)(payload.title) : null, payload.summary ? (0, data_cleaner_1.cleanText)(payload.summary) : null, payload.businessImpact ? (0, data_cleaner_1.cleanText)(payload.businessImpact) : null, payload.stage ?? null, payload.ageBracket ?? null, payload.isUnder16Applicable === undefined ? null : payload.isUnder16Applicable ? 1 : 0, requiredSolutions ?? null, competitorResponses ?? null, now, id);
        if (payload.stage && payload.stage !== current.stage) {
            db.prepare("INSERT INTO event_stage_history (event_id, previous_stage, new_stage, changed_at, note) VALUES (?, ?, ?, ?, ?)").run(id, current.stage, payload.stage, now, "Analyst edit");
        }
        const updated = db
            .prepare(`
        SELECT
          e.id,
          e.title,
          e.jurisdiction_country,
          e.jurisdiction_state,
          e.stage,
          e.age_bracket,
          e.is_under16_applicable,
          e.impact_score,
          e.likelihood_score,
          e.confidence_score,
          e.chili_score,
          e.summary,
          e.business_impact,
          e.required_solutions,
          e.competitor_responses,
          e.effective_date,
          e.published_date,
          e.source_url,
          e.raw_content,
          e.reliability_tier,
          e.status,
          e.last_crawled_at,
          e.updated_at,
          e.created_at
        FROM regulation_events e
        WHERE e.id = ?
      `)
            .get(id);
        res.json({ success: true, event: sanitizeEvent(updated) });
    });
    app.post("/api/events/:id/feedback", (req, res) => {
        const { id } = req.params;
        const body = req.body;
        const rating = typeof body.rating === "string" ? body.rating.toLowerCase() : "";
        const note = typeof body.note === "string" ? body.note.trim() : undefined;
        if (!allowedRatings.has(rating)) {
            return res.status(400).json({ error: "rating must be good or bad" });
        }
        const eventExists = db.prepare("SELECT 1 FROM regulation_events WHERE id = ?").get(id);
        if (!eventExists) {
            return res.status(404).json({ error: "event not found" });
        }
        const createdAt = new Date().toISOString();
        const result = db
            .prepare("INSERT INTO feedback (event_id, rating, note, created_at) VALUES (?, ?, ?, ?)")
            .run(id, rating, note ?? null, createdAt);
        res.status(201).json({
            id: result.lastInsertRowid,
            eventId: id,
            rating,
            note: note ?? null,
            createdAt,
        });
    });
    app.post("/api/crawl", async (req, res) => {
        if (crawlState.running) {
            return res.status(409).json({ error: "A crawl is already running", runId: crawlState.runId });
        }
        const body = req.body;
        const sourceIds = Array.isArray(body.sourceIds)
            ? body.sourceIds.filter((entry) => typeof entry === "string" && entry.length > 0)
            : undefined;
        crawlState.running = true;
        const runId = startCrawlRun(db, sourceIds);
        crawlState.runId = runId;
        try {
            const startedAt = new Date().toISOString();
            const result = await (0, pipeline_1.runPipeline)(db, sourceIds);
            const cleanup = (0, data_cleaner_1.runDataCleanup)(db);
            const backfill = (0, backfill_1.backfillEventRiskAndJurisdiction)(db);
            const config = db.prepare("SELECT * FROM alert_configs LIMIT 1").get();
            const minChili = config?.min_chili ?? 4;
            const notificationCount = createHighRiskNotifications(db, startedAt, minChili);
            const status = result.errors.length > 0 ? "partial" : "completed";
            finishCrawlRun(db, runId, {
                status,
                sourcesProcessed: result.sourcesProcessed,
                itemsCrawled: result.itemsCrawled,
                itemsAnalyzed: result.itemsAnalyzed,
                itemsSaved: result.itemsSaved,
                errorCount: result.errors.length,
                errorMessage: result.errors.length > 0 ? result.errors.join("\n").slice(0, 2000) : undefined,
            });
            await sendWebhookIfConfigured(db, {
                type: "crawl.completed",
                runId,
                status,
                itemsSaved: result.itemsSaved,
                highRiskNotifications: notificationCount,
                backfill,
                completedAt: new Date().toISOString(),
            });
            res.json({
                success: true,
                runId,
                status,
                ...result,
                cleanup,
                backfill,
                highRiskNotifications: notificationCount,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Pipeline failed";
            finishCrawlRun(db, runId, {
                status: "failed",
                errorCount: 1,
                errorMessage: message,
            });
            res.status(500).json({ error: message, runId });
        }
        finally {
            crawlState.running = false;
            crawlState.runId = null;
        }
    });
    app.get("/api/jurisdictions", (req, res) => {
        const countries = db
            .prepare("SELECT jurisdiction_country AS country, COUNT(*) AS count FROM regulation_events GROUP BY jurisdiction_country ORDER BY count DESC, country ASC")
            .all();
        const states = db
            .prepare("SELECT jurisdiction_state AS state, COUNT(*) AS count FROM regulation_events WHERE jurisdiction_state IS NOT NULL AND jurisdiction_state <> '' GROUP BY jurisdiction_state ORDER BY count DESC, state ASC")
            .all();
        res.json({
            countries,
            states,
            generatedAt: new Date().toISOString(),
        });
    });
    app.get("/api/analytics/summary", (req, res) => {
        const row = db
            .prepare(`
        SELECT
          COUNT(*) AS totalEvents,
          ROUND(AVG(chili_score), 2) AS averageRiskScore,
          SUM(CASE WHEN chili_score >= 4 THEN 1 ELSE 0 END) AS highRiskCount,
          MAX(updated_at) AS newestEventUpdatedAt
        FROM regulation_events
      `)
            .get();
        const topJurisdiction = db
            .prepare(`
        SELECT jurisdiction_country AS country, COUNT(*) AS count
        FROM regulation_events
        GROUP BY jurisdiction_country
        ORDER BY count DESC, country ASC
        LIMIT 1
      `)
            .get();
        res.json({
            totalEvents: row.totalEvents ?? 0,
            averageRiskScore: Number(row.averageRiskScore ?? 0),
            highRiskCount: row.highRiskCount ?? 0,
            topJurisdiction: topJurisdiction?.country ?? "N/A",
            topJurisdictionCount: topJurisdiction?.count ?? 0,
            newestEventUpdatedAt: row.newestEventUpdatedAt,
            lastCrawledAt: getLastCrawledAt(db),
        });
    });
    app.get("/api/analytics/trends", (req, res) => {
        const trends = db
            .prepare(`
        SELECT
          substr(COALESCE(published_date, updated_at), 1, 7) AS month,
          COUNT(*) AS count,
          ROUND(AVG(chili_score), 2) AS avgRisk,
          SUM(CASE WHEN chili_score >= 4 THEN 1 ELSE 0 END) AS highRiskCount
        FROM regulation_events
        GROUP BY month
        ORDER BY month ASC
      `)
            .all();
        res.json({ trends });
    });
    app.get("/api/analytics/jurisdictions", (req, res) => {
        const jurisdictions = db
            .prepare(`
        SELECT
          jurisdiction_country AS country,
          COUNT(*) AS count,
          ROUND(AVG(chili_score), 2) AS avgRisk,
          MAX(chili_score) AS maxRisk,
          SUM(CASE WHEN chili_score >= 4 THEN 1 ELSE 0 END) AS highRiskCount
        FROM regulation_events
        GROUP BY jurisdiction_country
        ORDER BY avgRisk DESC, count DESC, country ASC
      `)
            .all();
        res.json({ jurisdictions });
    });
    app.get("/api/analytics/stages", (req, res) => {
        const stages = db
            .prepare(`
        SELECT stage, COUNT(*) AS count, ROUND(AVG(chili_score), 2) AS avgRisk
        FROM regulation_events
        GROUP BY stage
        ORDER BY count DESC
      `)
            .all();
        res.json({ stages });
    });
    app.get("/api/analytics/pipeline", (req, res) => {
        const stageCounts = db
            .prepare("SELECT stage, COUNT(*) AS count FROM regulation_events GROUP BY stage")
            .all();
        const countMap = new Map(stageCounts.map((entry) => [entry.stage, entry.count]));
        const pipeline = allowedStages.map((stage, index) => {
            const count = countMap.get(stage) ?? 0;
            const previousCount = index === 0 ? count : countMap.get(allowedStages[index - 1]) ?? count;
            const conversionRate = previousCount === 0 ? 0 : Number(((count / previousCount) * 100).toFixed(1));
            return { stage, count, conversionRate };
        });
        res.json({ pipeline });
    });
    app.get("/api/competitors", (req, res) => {
        const rows = db
            .prepare(`
        SELECT id, title, jurisdiction_country, competitor_responses, updated_at
        FROM regulation_events
        WHERE competitor_responses IS NOT NULL AND competitor_responses <> '[]'
        ORDER BY updated_at DESC
      `)
            .all();
        const comparison = {};
        for (const row of rows) {
            const responses = jsonArray(row.competitor_responses);
            for (const response of responses) {
                const match = response.match(/^([^:]+):\s*(.+)$/);
                const competitor = match?.[1]?.trim() || "Unattributed";
                const detail = match?.[2]?.trim() || response;
                if (!comparison[competitor]) {
                    comparison[competitor] = [];
                }
                comparison[competitor].push({
                    eventId: row.id,
                    eventTitle: (0, data_cleaner_1.cleanTitle)(row.title),
                    jurisdiction: row.jurisdiction_country,
                    response: (0, data_cleaner_1.cleanText)(detail),
                    updatedAt: row.updated_at,
                });
            }
        }
        res.json({ comparison });
    });
    app.get("/api/alerts/config", (req, res) => {
        const config = db.prepare("SELECT * FROM alert_configs LIMIT 1").get();
        res.json(config);
    });
    app.post("/api/alerts/config", (req, res) => {
        const body = req.body;
        if (body.frequency && !["daily", "weekly"].includes(body.frequency)) {
            return res.status(400).json({ error: "frequency must be daily or weekly" });
        }
        if (body.minChili !== undefined && (body.minChili < 1 || body.minChili > 5)) {
            return res.status(400).json({ error: "minChili must be between 1 and 5" });
        }
        const now = new Date().toISOString();
        const current = db.prepare("SELECT * FROM alert_configs LIMIT 1").get();
        db.prepare(`
      UPDATE alert_configs
      SET email = ?, frequency = ?, min_chili = ?, webhook_url = ?, updated_at = ?
      WHERE id = ?
    `).run(body.email ?? current.email, body.frequency ?? current.frequency, body.minChili ?? current.min_chili, body.webhookUrl === undefined ? current.webhook_url : body.webhookUrl, now, current.id);
        const updated = db.prepare("SELECT * FROM alert_configs WHERE id = ?").get(current.id);
        res.json(updated);
    });
    app.get("/api/alerts", (req, res) => {
        const limit = parsePaging(req.query.limit, 20, 100);
        const rows = db
            .prepare("SELECT id, title, message, severity, event_id, created_at, read_at FROM notifications ORDER BY created_at DESC LIMIT ?")
            .all(limit);
        res.json({
            items: rows.map((row) => ({
                id: row.id,
                title: row.title,
                message: row.message,
                severity: row.severity,
                eventId: row.event_id,
                createdAt: row.created_at,
                readAt: row.read_at,
            })),
        });
    });
    app.post("/api/alerts/:id/read", (req, res) => {
        const id = parseSingleInt(req.params.id, 1);
        if (!id) {
            return res.status(400).json({ error: "invalid id" });
        }
        const now = new Date().toISOString();
        db.prepare("UPDATE notifications SET read_at = ? WHERE id = ?").run(now, id);
        res.json({ success: true, id, readAt: now });
    });
    app.get("/api/saved-searches", (req, res) => {
        const rows = db
            .prepare("SELECT id, name, filters_json, created_at, updated_at FROM saved_searches ORDER BY updated_at DESC")
            .all();
        res.json({
            items: rows.map((row) => ({
                id: row.id,
                name: row.name,
                filters: JSON.parse(row.filters_json),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            })),
        });
    });
    app.post("/api/saved-searches", (req, res) => {
        const body = req.body;
        const name = (body.name ?? "").trim();
        if (!name) {
            return res.status(400).json({ error: "name is required" });
        }
        const filters = body.filters ?? {};
        const now = new Date().toISOString();
        db.prepare(`
      INSERT INTO saved_searches (name, filters_json, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(name) DO UPDATE SET
        filters_json = excluded.filters_json,
        updated_at = excluded.updated_at
    `).run(name, JSON.stringify(filters), now, now);
        const saved = db
            .prepare("SELECT id, name, filters_json, created_at, updated_at FROM saved_searches WHERE name = ?")
            .get(name);
        res.status(201).json({
            id: saved.id,
            name: saved.name,
            filters: JSON.parse(saved.filters_json),
            createdAt: saved.created_at,
            updatedAt: saved.updated_at,
        });
    });
    app.delete("/api/saved-searches/:id", (req, res) => {
        const id = parseSingleInt(req.params.id, 1);
        if (!id) {
            return res.status(400).json({ error: "invalid id" });
        }
        const result = db.prepare("DELETE FROM saved_searches WHERE id = ?").run(id);
        if (result.changes === 0) {
            return res.status(404).json({ error: "saved search not found" });
        }
        res.json({ success: true, id });
    });
    app.get("/api/email-digest/preview", (req, res) => {
        const frequency = (typeof req.query.frequency === "string" && ["daily", "weekly"].includes(req.query.frequency)
            ? req.query.frequency
            : "daily");
        const windowStart = new Date();
        windowStart.setDate(windowStart.getDate() - (frequency === "daily" ? 1 : 7));
        const since = windowStart.toISOString();
        const events = db
            .prepare(`
        SELECT id, title, chili_score, jurisdiction_country, stage, updated_at
        FROM regulation_events
        WHERE updated_at >= ?
        ORDER BY chili_score DESC, updated_at DESC
        LIMIT 25
      `)
            .all(since);
        const lines = [
            `Frequency: ${frequency}`,
            `Window start: ${since}`,
            `Events in window: ${events.length}`,
            "",
            ...events.slice(0, 10).map((event, index) => `${index + 1}. ${(0, data_cleaner_1.cleanTitle)(event.title)} (${event.chili_score}🌶️, ${event.jurisdiction_country}, ${event.stage})`),
        ];
        res.json({
            frequency,
            since,
            totalEvents: events.length,
            previewText: lines.join("\n"),
            events: events.map((event) => ({
                id: event.id,
                title: (0, data_cleaner_1.cleanTitle)(event.title),
                chiliScore: event.chili_score,
                jurisdiction: event.jurisdiction_country,
                stage: event.stage,
                updatedAt: event.updated_at,
            })),
        });
    });
    app.get("/api/export/csv", (req, res) => {
        const filters = {
            search: typeof req.query.search === "string" ? req.query.search.trim() : undefined,
            jurisdictions: parseList(typeof req.query.jurisdiction === "string" ? req.query.jurisdiction : undefined),
            stages: parseStageList(typeof req.query.stage === "string" ? req.query.stage : undefined),
            ageBrackets: parseAgeBracketList(typeof req.query.ageBracket === "string" ? req.query.ageBracket : undefined),
            minRisk: parseSingleInt(req.query.minRisk, 1, 5),
            maxRisk: parseSingleInt(req.query.maxRisk, 1, 5),
            dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
            dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
            under16Only: String(req.query.under16Only ?? "").toLowerCase() === "true",
        };
        const { where, params } = buildWhereClause(filters);
        const rows = db
            .prepare(`
        SELECT
          e.id,
          e.title,
          e.jurisdiction_country,
          e.jurisdiction_state,
          e.stage,
          e.age_bracket,
          e.is_under16_applicable,
          e.chili_score,
          e.summary,
          e.business_impact,
          e.published_date,
          e.updated_at,
          e.source_url
        FROM regulation_events e
        ${where}
        ORDER BY e.updated_at DESC
        LIMIT 5000
      `)
            .all(...params);
        const header = [
            "id",
            "title",
            "country",
            "state",
            "stage",
            "age_bracket",
            "is_under16_applicable",
            "chili_score",
            "summary",
            "business_impact",
            "published_date",
            "updated_at",
            "source_url",
        ];
        const escapeCell = (value) => {
            const text = value === null ? "" : String(value);
            if (/[",\n]/.test(text)) {
                return `"${text.replace(/"/g, '""')}"`;
            }
            return text;
        };
        const lines = [header.join(",")];
        for (const row of rows) {
            lines.push([
                row.id,
                (0, data_cleaner_1.cleanTitle)(row.title),
                row.jurisdiction_country,
                row.jurisdiction_state,
                row.stage,
                row.age_bracket,
                row.is_under16_applicable,
                row.chili_score,
                safeText(row.summary),
                safeText(row.business_impact),
                row.published_date,
                row.updated_at,
                row.source_url,
            ]
                .map(escapeCell)
                .join(","));
        }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename=reg-events-${Date.now()}.csv`);
        res.send(lines.join("\n"));
    });
    app.get("/api/export/pdf", (req, res) => {
        const filters = {
            search: typeof req.query.search === "string" ? req.query.search.trim() : undefined,
            jurisdictions: parseList(typeof req.query.jurisdiction === "string" ? req.query.jurisdiction : undefined),
            stages: parseStageList(typeof req.query.stage === "string" ? req.query.stage : undefined),
            ageBrackets: parseAgeBracketList(typeof req.query.ageBracket === "string" ? req.query.ageBracket : undefined),
            minRisk: parseSingleInt(req.query.minRisk, 1, 5),
            maxRisk: parseSingleInt(req.query.maxRisk, 1, 5),
            dateFrom: typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
            dateTo: typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
            under16Only: String(req.query.under16Only ?? "").toLowerCase() === "true",
        };
        const { where, params } = buildWhereClause(filters);
        const summary = db
            .prepare(`
        SELECT
          COUNT(*) AS totalEvents,
          ROUND(AVG(chili_score), 2) AS avgRisk,
          SUM(CASE WHEN chili_score >= 4 THEN 1 ELSE 0 END) AS highRisk
        FROM regulation_events e
        ${where}
      `)
            .get(...params);
        const topEvents = db
            .prepare(`
        SELECT title, jurisdiction_country, stage, chili_score, updated_at
        FROM regulation_events e
        ${where}
        ORDER BY chili_score DESC, updated_at DESC
        LIMIT 12
      `)
            .all(...params);
        const activeFilters = [];
        if (filters.minRisk !== undefined)
            activeFilters.push(`minRisk=${filters.minRisk}`);
        if (filters.maxRisk !== undefined)
            activeFilters.push(`maxRisk=${filters.maxRisk}`);
        if (filters.jurisdictions.length > 0)
            activeFilters.push(`jurisdiction=${filters.jurisdictions.join("|")}`);
        if (filters.stages.length > 0)
            activeFilters.push(`stage=${filters.stages.join("|")}`);
        if (filters.ageBrackets.length > 0)
            activeFilters.push(`ageBracket=${filters.ageBrackets.join("|")}`);
        if (filters.under16Only)
            activeFilters.push("under16Only=true");
        if (filters.search)
            activeFilters.push(`search=${filters.search}`);
        if (filters.dateFrom)
            activeFilters.push(`dateFrom=${filters.dateFrom}`);
        if (filters.dateTo)
            activeFilters.push(`dateTo=${filters.dateTo}`);
        const lines = [
            `Generated: ${new Date().toISOString()}`,
            `Last crawled: ${getLastCrawledAt(db) ?? "N/A"}`,
            `Filters: ${activeFilters.length > 0 ? activeFilters.join(", ") : "none"}`,
            "",
            "Executive Summary",
            `- Total events: ${summary.totalEvents}`,
            `- Average risk score: ${summary.avgRisk ?? 0}`,
            `- High-risk events (4-5): ${summary.highRisk ?? 0}`,
            "",
            "Trend and Heatmap Highlights",
            "- Risk heatmap available in dashboard (jurisdiction grid).",
            "- Trend chart available in dashboard (events by month).",
            "- Stage pipeline available in dashboard.",
            "",
            "Top High-Risk Events",
            ...(topEvents.length > 0
                ? topEvents.map((event, index) => `${index + 1}. ${(0, data_cleaner_1.cleanTitle)(event.title)} | ${event.jurisdiction_country} | ${event.stage} | ${event.chili_score}🌶️ | ${event.updated_at}`)
                : ["No events matched the selected filter set."]),
        ];
        const pdfBuffer = buildSimplePdf("Regulatory Intelligence Executive Brief", lines);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=executive-brief-${Date.now()}.pdf`);
        res.send(pdfBuffer);
    });
    app.get("/api/reports/trend-analysis", (req, res) => {
        const trends = db
            .prepare(`
        SELECT
          substr(COALESCE(published_date, updated_at), 1, 7) AS month,
          COUNT(*) AS count,
          ROUND(AVG(chili_score), 2) AS avgRisk,
          SUM(CASE WHEN chili_score >= 4 THEN 1 ELSE 0 END) AS highRiskCount
        FROM regulation_events
        GROUP BY month
        ORDER BY month ASC
      `)
            .all();
        const withDelta = trends.map((trend, index) => {
            const previous = index > 0 ? trends[index - 1] : null;
            const countDelta = previous ? trend.count - previous.count : 0;
            return {
                ...trend,
                monthOverMonthDelta: countDelta,
            };
        });
        res.json({ trends: withDelta });
    });
    app.get("/api/reports/jurisdiction/:country", (req, res) => {
        const country = req.params.country;
        const rows = db
            .prepare(`
        SELECT
          e.id,
          e.title,
          e.jurisdiction_country,
          e.jurisdiction_state,
          e.stage,
          e.age_bracket,
          e.is_under16_applicable,
          e.impact_score,
          e.likelihood_score,
          e.confidence_score,
          e.chili_score,
          e.summary,
          e.business_impact,
          e.required_solutions,
          e.competitor_responses,
          e.effective_date,
          e.published_date,
          e.source_url,
          e.raw_content,
          e.reliability_tier,
          e.status,
          e.last_crawled_at,
          e.updated_at,
          e.created_at
        FROM regulation_events e
        WHERE e.jurisdiction_country = ?
        ORDER BY e.chili_score DESC, e.updated_at DESC
      `)
            .all(country);
        const summary = {
            totalEvents: rows.length,
            avgRisk: rows.length
                ? Number((rows.reduce((acc, row) => acc + row.chili_score, 0) / rows.length).toFixed(2))
                : 0,
            highRiskCount: rows.filter((row) => row.chili_score >= 4).length,
        };
        res.json({
            country,
            summary,
            events: rows.map((row) => sanitizeEvent(row)),
        });
    });
    app.get("/api/reports/custom", (req, res) => {
        const fields = parseList(typeof req.query.fields === "string" ? req.query.fields : undefined);
        const format = typeof req.query.format === "string" ? req.query.format.toLowerCase() : "json";
        const allowedFields = new Set([
            "id",
            "title",
            "jurisdiction_country",
            "jurisdiction_state",
            "stage",
            "age_bracket",
            "chili_score",
            "summary",
            "business_impact",
            "updated_at",
            "published_date",
            "source_url",
        ]);
        const selected = fields.filter((field) => allowedFields.has(field));
        const finalFields = selected.length > 0 ? selected : ["id", "title", "jurisdiction_country", "stage", "chili_score", "updated_at"];
        const selectSql = finalFields.map((field) => `e.${field}`).join(", ");
        const rows = db
            .prepare(`SELECT ${selectSql} FROM regulation_events e ORDER BY e.updated_at DESC LIMIT 2000`)
            .all();
        if (format === "csv") {
            const escapeCell = (value) => {
                const text = value === null ? "" : String(value);
                if (/[",\n]/.test(text))
                    return `"${text.replace(/"/g, '""')}"`;
                return text;
            };
            const lines = [finalFields.join(",")];
            for (const row of rows) {
                lines.push(finalFields.map((field) => escapeCell((row[field] ?? ""))).join(","));
            }
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.send(lines.join("\n"));
            return;
        }
        res.json({ fields: finalFields, total: rows.length, rows });
    });
    return app;
}
//# sourceMappingURL=app.js.map