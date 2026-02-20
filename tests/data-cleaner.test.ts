import { openDatabase, initializeSchema } from "../src/db";
import { runDataCleanup, decodeHtmlEntities, cleanText, isGarbageText, isUnder16Related } from "../src/data-cleaner";

describe("data cleaner utilities", () => {
  it("decodes html entities", () => {
    expect(decodeHtmlEntities("Kids&#039; Privacy &amp; Safety")).toBe("Kids' Privacy & Safety");
  });

  it("detects garbage javascript/html", () => {
    const garbage = "(function(w,d,s,l,i){w[l]=w[l]||[];window.dataLayer=[];document.addEventListener('DOMContentLoaded',()=>{});})();";
    expect(isGarbageText(garbage)).toBe(true);
  });

  it("cleans noisy html/css snippets", () => {
    const text = "<style>.jss1{font-size:10px}</style><div>Children's safety law update</div>";
    expect(cleanText(text)).toContain("Children's safety law update");
  });

  it("detects under16 relevance", () => {
    expect(isUnder16Related("COPPA update", "children data", "", "")).toBe(true);
    expect(isUnder16Related("Weather update", "sunny", "", "")).toBe(false);
  });
});

describe("runDataCleanup", () => {
  it("fixes html entities and under16 flag in stored rows", () => {
    const db = openDatabase(":memory:");
    initializeSchema(db);

    db.prepare(`
      INSERT INTO regulation_events (
        id, title, jurisdiction_country, stage, age_bracket, is_under16_applicable,
        impact_score, likelihood_score, confidence_score, chili_score,
        summary, business_impact, required_solutions, competitor_responses,
        source_url, raw_content, reliability_tier, status, last_crawled_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "test-1",
      "Kids&#039; Privacy | Federal Trade Commission",
      "United States",
      "proposed",
      "unknown",
      0,
      4,
      4,
      4,
      4,
      "(function(w,d,s,l,i){window.dataLayer=[];})();",
      "font-size: 12px;",
      "[]",
      "[]",
      "https://ftc.gov/case",
      "COPPA update for children under 13",
      5,
      "new",
      new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString()
    );

    const result = runDataCleanup(db);
    expect(result.cleaned).toBeGreaterThan(0);

    const row = db.prepare("SELECT title, is_under16_applicable, summary FROM regulation_events WHERE id = 'test-1'").get() as {
      title: string;
      is_under16_applicable: number;
      summary: string;
    };

    expect(row.title).toContain("Kids' Privacy");
    expect(row.is_under16_applicable).toBe(1);
    expect(row.summary.toLowerCase()).toContain("coppa");

    db.close();
  });
});
