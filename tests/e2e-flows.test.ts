import request from "supertest";
import { createApp } from "../src/app";
import { initializeSchema, openDatabase } from "../src/db";
import { seedSampleData } from "../src/seed";

function buildTestApp() {
  const db = openDatabase(":memory:");
  initializeSchema(db);
  seedSampleData(db);
  const app = createApp(db);
  return { app, db };
}

describe("E2E key flows", () => {
  test("critical cleanup, under16 inference, and brief lastCrawledAt", async () => {
    const { app, db } = buildTestApp();

    db.prepare(
      `
      INSERT INTO regulation_events (
        id, title, jurisdiction_country, jurisdiction_state, stage, age_bracket,
        is_under16_applicable, impact_score, likelihood_score, confidence_score, chili_score,
        summary, business_impact, required_solutions, competitor_responses,
        effective_date, published_date, source_url, raw_content, reliability_tier,
        status, source_id, last_crawled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(
      "dirty-test-id",
      "Kids&#039; Privacy &quot;Rule&quot;",
      "United States",
      null,
      "proposed",
      "unknown",
      0,
      4,
      4,
      4,
      4,
      "(function(){window.dataLayer=[];})(); <script>alert(1)</script>",
      "<div>impact</div>",
      "[]",
      "[]",
      null,
      "2026-02-20",
      "https://example.com/coppa",
      "COPPA update for children under 16 with parental consent requirements.",
      5,
      "new",
      null,
      "2026-02-20T10:00:00.000Z",
      "2026-02-20T10:00:00.000Z",
      "2026-02-20T10:00:00.000Z"
    );

    const brief = await request(app).get("/api/brief?limit=20");
    expect(brief.status).toBe(200);
    expect(brief.body.lastCrawledAt).toBeDefined();

    const event = brief.body.items.find((item: { id: string }) => item.id === "dirty-test-id");
    expect(event).toBeDefined();
    expect(event.title).toContain("Kids' Privacy");
    expect(event.title).not.toContain("&#039;");
    expect(event.summary).not.toMatch(/<script|function\(/i);
    expect(event.isUnder16Applicable).toBe(true);

    db.close();
  });

  test("crawl status endpoint returns JSON payload", async () => {
    const { app, db } = buildTestApp();

    const response = await request(app).get("/api/crawl/status");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("totalEvents");
    expect(response.body).toHaveProperty("lastCrawledAt");

    db.close();
  });

  test("events search/filter and pagination headers", async () => {
    const { app, db } = buildTestApp();

    const response = await request(app).get(
      "/api/events?search=privacy&minRisk=3&maxRisk=5&sortBy=risk&page=1&limit=5"
    );

    expect(response.status).toBe(200);
    expect(response.headers["x-total-count"]).toBeDefined();
    expect(response.headers["x-total-pages"]).toBeDefined();
    expect(response.body).toHaveProperty("items");
    expect(Array.isArray(response.body.items)).toBe(true);

    db.close();
  });

  test("saved searches create/list/delete flow", async () => {
    const { app, db } = buildTestApp();

    const create = await request(app)
      .post("/api/saved-searches")
      .send({ name: "high-risk-us", filters: { jurisdiction: ["United States"], minRisk: 4 } })
      .set("Content-Type", "application/json");

    expect(create.status).toBe(201);
    expect(create.body.name).toBe("high-risk-us");

    const list = await request(app).get("/api/saved-searches");
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);

    const remove = await request(app).delete(`/api/saved-searches/${create.body.id}`);
    expect(remove.status).toBe(200);

    db.close();
  });

  test("event edit flow updates timeline and detail", async () => {
    const { app, db } = buildTestApp();
    const eventId = "11111111-1111-1111-1111-111111111101";

    const update = await request(app)
      .put(`/api/events/${eventId}`)
      .send({
        stage: "enacted",
        summary: "Updated analyst summary.",
        businessImpact: "Analyst-reviewed impact.",
      })
      .set("Content-Type", "application/json");

    expect(update.status).toBe(200);
    expect(update.body.event.stage).toBe("enacted");

    const detail = await request(app).get(`/api/events/${eventId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.regulatoryTimeline.length).toBeGreaterThan(0);
    expect(detail.body.summary).toContain("Updated analyst summary");

    db.close();
  });

  test("csv export returns attachment", async () => {
    const { app, db } = buildTestApp();

    const response = await request(app).get("/api/export/csv?minRisk=4");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("id,title,country");

    db.close();
  });
});
