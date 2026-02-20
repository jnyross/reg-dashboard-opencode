import request from "supertest";
import { createApp } from "../src/app";
import { initializeSchema, openDatabase } from "../src/db";
import { syncLawsFromEvents } from "../src/laws";

describe("law model", () => {
  test("collapses 1 law with many updates", async () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);

    const insert = db.prepare(
      `
      INSERT INTO regulation_events (
        id, title, jurisdiction_country, jurisdiction_state, stage, age_bracket,
        is_under16_applicable, impact_score, likelihood_score, confidence_score, chili_score,
        summary, business_impact, required_solutions, competitor_responses,
        effective_date, published_date, source_url, raw_content, reliability_tier,
        status, source_id, last_crawled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    );

    insert.run(
      "law-update-1",
      "US Federal Youth Privacy Modernization Proposal",
      "United States",
      null,
      "proposed",
      "13-15",
      1,
      4,
      4,
      4,
      4,
      "Initial proposal for youth privacy modernization.",
      "Could require age assurance updates.",
      "[]",
      "[]",
      null,
      "2026-01-10",
      "https://example.com/law-a",
      "Draft language for youth privacy modernization",
      5,
      "new",
      null,
      "2026-01-10T08:00:00.000Z",
      "2026-01-10T08:00:00.000Z",
      "2026-01-10T08:00:00.000Z",
    );

    insert.run(
      "law-update-2",
      "US Federal Youth Privacy Modernization Enacted Update",
      "United States",
      null,
      "enacted",
      "13-15",
      1,
      5,
      5,
      4,
      5,
      "Final enacted text and penalties announced.",
      "Enforcement posture is now immediate.",
      "[]",
      "[]",
      "2026-04-01",
      "2026-03-28",
      "https://example.com/law-a-update",
      "Final law text for youth privacy modernization",
      5,
      "status_changed",
      null,
      "2026-03-28T08:00:00.000Z",
      "2026-03-28T08:00:00.000Z",
      "2026-03-28T08:00:00.000Z",
    );

    const sync = syncLawsFromEvents(db);
    expect(sync.scanned).toBe(2);

    const app = createApp(db);

    const list = await request(app).get("/api/laws?search=youth privacy modernization&limit=10");
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBe(1);
    expect(list.body.items[0].updateCount).toBeGreaterThanOrEqual(2);

    const lawId = list.body.items[0].id;
    const detail = await request(app).get(`/api/laws/${lawId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.updateTimeline.length).toBeGreaterThanOrEqual(2);

    const stages = detail.body.updateTimeline.map((update: { stage: string }) => update.stage);
    expect(stages).toContain("proposed");
    expect(stages).toContain("enacted");

    db.close();
  });
});
