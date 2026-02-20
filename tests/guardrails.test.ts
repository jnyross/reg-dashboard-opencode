import request from "supertest";
import { createApp } from "../src/app";
import { initializeSchema, openDatabase } from "../src/db";
import { seedSampleData } from "../src/seed";
import { backfillEventRiskAndJurisdiction } from "../src/backfill";

describe("regression guardrails", () => {
  test("high-risk analytics bucket is non-zero and minRisk filter returns rows", async () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);
    seedSampleData(db);
    const app = createApp(db);

    const summary = await request(app).get("/api/analytics/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.highRiskCount).toBeGreaterThan(0);

    const highRiskList = await request(app).get("/api/events?minRisk=4&limit=25");
    expect(highRiskList.status).toBe(200);
    expect(Array.isArray(highRiskList.body.items)).toBe(true);
    expect(highRiskList.body.items.length).toBeGreaterThan(0);
    for (const item of highRiskList.body.items) {
      expect(item.scores.chili).toBeGreaterThanOrEqual(4);
    }

    const csv = await request(app).get("/api/export/csv?minRisk=4");
    expect(csv.status).toBe(200);
    const csvLines = csv.text.trim().split("\n");
    expect(csvLines.length).toBeGreaterThan(1);

    const pdf = await request(app).get("/api/export/pdf?minRisk=4");
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");

    db.close();
  });

  test("unknown jurisdiction ratio improves after backfill", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);

    const insert = db.prepare(`
      INSERT INTO regulation_events (
        id, title, jurisdiction_country, jurisdiction_state, stage, age_bracket,
        is_under16_applicable, impact_score, likelihood_score, confidence_score, chili_score,
        summary, business_impact, required_solutions, competitor_responses,
        effective_date, published_date, source_url, raw_content, reliability_tier,
        status, source_id, last_crawled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    const fixtures = [
      { id: "bf-1", url: "https://www.ftc.gov/news-events/news/press-releases/test", country: "Unknown", stage: "effective" },
      { id: "bf-2", url: "https://www.gov.uk/government/news/test", country: "Unknown", stage: "enacted" },
      { id: "bf-3", url: "https://commission.europa.eu/law/law-topic/data-protection/test", country: "Unknown", stage: "proposed" },
      { id: "bf-4", url: "https://www.oaic.gov.au/privacy/childrens-privacy/test", country: "Unknown", stage: "introduced" },
      { id: "bf-5", url: "https://x.com/example/status/123", country: "Unknown", stage: "committee_review" },
      { id: "bf-6", url: "https://www.priv.gc.ca/en/privacy-topics/collecting-personal-information/consent/test", country: "Unknown", stage: "amended" },
    ];

    for (const row of fixtures) {
      insert.run(
        row.id,
        "Law imposes mandatory age verification and fines for child safety violations",
        row.country,
        null,
        row.stage,
        "both",
        1,
        3,
        3,
        3,
        3,
        "Children's online safety law update",
        "May require significant compliance changes",
        null,
        null,
        row.url,
        "The regulation introduces penalties and mandatory platform controls for minors.",
        4,
        "new",
        null,
        now,
        now,
        now,
      );
    }

    const before = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN jurisdiction_country = 'Unknown' THEN 1 ELSE 0 END) AS unknownCount FROM regulation_events").get() as { total: number; unknownCount: number };
    expect(before.unknownCount).toBeGreaterThan(0);

    const result = backfillEventRiskAndJurisdiction(db);
    expect(result.updated).toBeGreaterThan(0);

    const after = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN jurisdiction_country = 'Unknown' THEN 1 ELSE 0 END) AS unknownCount FROM regulation_events").get() as { total: number; unknownCount: number };
    const ratio = after.total > 0 ? after.unknownCount / after.total : 0;

    expect(ratio).toBeLessThanOrEqual(0.25);

    db.close();
  });
});
