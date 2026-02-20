import request from "supertest";
import { createApp } from "../src/app";
import { initializeSchema, openDatabase } from "../src/db";
import { seedSampleData } from "../src/seed";
import { validateScoringBounds } from "../src/validation";

function buildTestApp() {
  const db = openDatabase(":memory:");
  initializeSchema(db);
  seedSampleData(db);
  const app = createApp(db);
  return { app, db };
}

describe("scoring validation", () => {
  it("accepts scores from 1 through 5", () => {
    const result = validateScoringBounds({
      impactScore: 1,
      likelihoodScore: 5,
      confidenceScore: 3,
      chiliScore: 2,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects scores outside 1 through 5", () => {
    const result = validateScoringBounds({
      impactScore: 0,
      likelihoodScore: 6,
      confidenceScore: 3.2,
      chiliScore: -1,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(4);
  });
});

describe("API core endpoints", () => {
  it("GET /api/brief includes lastCrawledAt and law-first fields", async () => {
    const { app, db } = buildTestApp();

    const response = await request(app).get("/api/brief?limit=3");
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(3);

    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        lawKey: expect.any(String),
        canonicalTitle: expect.any(String),
        updateCount: expect.any(Number),
      })
    );

    expect(response.body).toHaveProperty("lastCrawledAt");
    db.close();
  });

  it("GET /api/crawl/status returns JSON payload", async () => {
    const { app, db } = buildTestApp();
    const response = await request(app).get("/api/crawl/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        isRunning: false,
      })
    );
    expect(response.body).toHaveProperty("lastCrawledAt");
    db.close();
  });

  it("GET /api/events supports pagination headers", async () => {
    const { app, db } = buildTestApp();

    const response = await request(app).get("/api/events?page=1&limit=2");
    expect(response.status).toBe(200);
    expect(response.headers["x-total-count"]).toBeDefined();
    expect(response.headers["x-total-pages"]).toBeDefined();
    expect(response.body.items).toHaveLength(2);

    db.close();
  });

  it("analytics endpoints return dashboard payloads", async () => {
    const { app, db } = buildTestApp();

    const summary = await request(app).get("/api/analytics/summary");
    expect(summary.status).toBe(200);
    expect(summary.body.totalEvents).toBeGreaterThan(0);

    const stages = await request(app).get("/api/analytics/stages");
    expect(stages.status).toBe(200);
    expect(Array.isArray(stages.body.stages)).toBe(true);

    const jurisdictions = await request(app).get("/api/analytics/jurisdictions");
    expect(jurisdictions.status).toBe(200);
    expect(Array.isArray(jurisdictions.body.jurisdictions)).toBe(true);

    db.close();
  });

  it("/api/laws list + detail returns update timeline", async () => {
    const { app, db } = buildTestApp();

    const laws = await request(app).get("/api/laws?limit=5");
    expect(laws.status).toBe(200);
    expect(Array.isArray(laws.body.items)).toBe(true);
    expect(laws.body.items.length).toBeGreaterThan(0);

    const first = laws.body.items[0];
    expect(first).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        lawKey: expect.any(String),
        updateCount: expect.any(Number),
      })
    );

    const detail = await request(app).get(`/api/laws/${first.id}`);
    expect(detail.status).toBe(200);
    expect(Array.isArray(detail.body.updateTimeline)).toBe(true);
    expect(detail.body.updateTimeline.length).toBeGreaterThan(0);

    db.close();
  });
});

describe("event detail + feedback + edits", () => {
  it("stores and returns submitted feedback for an event", async () => {
    const { app, db } = buildTestApp();
    const eventId = "11111111-1111-1111-1111-111111111101";

    const create = await request(app)
      .post(`/api/events/${eventId}/feedback`)
      .send({ rating: "good", note: "High confidence sample event." })
      .set("Content-Type", "application/json");

    expect(create.status).toBe(201);
    expect(create.body.eventId).toBe(eventId);
    expect(create.body.rating).toBe("good");

    const detail = await request(app).get(`/api/events/${eventId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.feedback).toHaveLength(1);
    expect(detail.body.feedback[0]).toMatchObject({
      eventId,
      rating: "good",
      note: "High confidence sample event.",
    });

    db.close();
  });

  it("PUT /api/events/:id updates event and records stage timeline", async () => {
    const { app, db } = buildTestApp();
    const eventId = "11111111-1111-1111-1111-111111111101";

    const update = await request(app)
      .put(`/api/events/${eventId}`)
      .send({ summary: "Updated summary text", businessImpact: "Updated impact", stage: "introduced" })
      .set("Content-Type", "application/json");

    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);

    const detail = await request(app).get(`/api/events/${eventId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.summary).toContain("Updated summary text");
    expect(Array.isArray(detail.body.regulatoryTimeline)).toBe(true);
    expect(detail.body.regulatoryTimeline.length).toBeGreaterThan(0);

    db.close();
  });
});

describe("saved searches + exports + digest", () => {
  it("CRUD /api/saved-searches works", async () => {
    const { app, db } = buildTestApp();

    const create = await request(app)
      .post("/api/saved-searches")
      .send({ name: "High risk US", query: { jurisdiction: ["United States"], minRisk: 4 } })
      .set("Content-Type", "application/json");

    expect(create.status).toBe(201);
    const id = create.body.id;

    const list = await request(app).get("/api/saved-searches");
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThan(0);

    const remove = await request(app).delete(`/api/saved-searches/${id}`);
    expect(remove.status).toBe(200);

    db.close();
  });

  it("GET /api/export/csv returns CSV content", async () => {
    const { app, db } = buildTestApp();
    const response = await request(app).get("/api/export/csv");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("id,title,country");

    db.close();
  });

  it("GET /api/export/pdf returns PDF payload", async () => {
    const { app, db } = buildTestApp();
    const response = await request(app).get("/api/export/pdf");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");

    db.close();
  });

  it("alerts config and email digest preview endpoints work", async () => {
    const { app, db } = buildTestApp();

    const save = await request(app)
      .post("/api/alerts/config")
      .send({ email: "alerts@example.com", frequency: "weekly", minChili: 4 })
      .set("Content-Type", "application/json");

    expect(save.status).toBe(200);

    const get = await request(app).get("/api/alerts/config");
    expect(get.status).toBe(200);
    expect(get.body.frequency).toBe("weekly");

    const preview = await request(app).get("/api/email-digest/preview?frequency=weekly");
    expect(preview.status).toBe(200);
    expect(preview.body.previewText).toContain("Frequency");

    db.close();
  });
});
