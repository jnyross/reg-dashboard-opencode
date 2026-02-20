"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/db");
describe("database dedup logic", () => {
    let db;
    beforeEach(() => {
        db = (0, db_1.openDatabase)(":memory:");
        (0, db_1.initializeSchema)(db);
    });
    afterEach(() => {
        db.close();
    });
    test("should insert new item", () => {
        const item = {
            sourceId: "test-source",
            url: "https://example.com/article1",
            title: "Test Regulation Article",
            rawContent: "Content here",
            isRelevant: true,
            jurisdictionCountry: "United States",
            jurisdictionState: "California",
            stage: "proposed",
            ageBracket: "13-15",
            affectedProducts: ["Instagram"],
            summary: "Test summary",
            businessImpact: "Test impact",
            requiredSolutions: ["Solution 1"],
            competitorResponses: [],
            impactScore: 4,
            likelihoodScore: 3,
            confidenceScore: 4,
            chiliScore: 4,
            analyzedAt: new Date().toISOString(),
        };
        const result = (0, db_1.upsertAnalyzedItem)(db, item, 5);
        expect(result.isNew).toBe(true);
        expect(result.statusChanged).toBe(false);
        const count = db.prepare("SELECT COUNT(*) as count FROM regulation_events").get();
        expect(count.count).toBe(1);
    });
    test("should dedupe by URL and jurisdiction", () => {
        const item1 = {
            sourceId: "test-source",
            url: "https://example.com/article1",
            title: "Test Regulation Article",
            rawContent: "Content here",
            isRelevant: true,
            jurisdictionCountry: "United States",
            stage: "proposed",
            ageBracket: "13-15",
            affectedProducts: [],
            summary: "First version",
            businessImpact: "",
            requiredSolutions: [],
            competitorResponses: [],
            impactScore: 3,
            likelihoodScore: 3,
            confidenceScore: 3,
            chiliScore: 3,
            analyzedAt: new Date().toISOString(),
        };
        const result1 = (0, db_1.upsertAnalyzedItem)(db, item1, 5);
        expect(result1.isNew).toBe(true);
        const item2 = {
            sourceId: "test-source",
            url: "https://example.com/article1",
            title: "Test Regulation Article",
            rawContent: "Updated content",
            isRelevant: true,
            jurisdictionCountry: "United States",
            stage: "introduced",
            ageBracket: "13-15",
            affectedProducts: [],
            summary: "Updated version",
            businessImpact: "",
            requiredSolutions: [],
            competitorResponses: [],
            impactScore: 4,
            likelihoodScore: 4,
            confidenceScore: 4,
            chiliScore: 4,
            analyzedAt: new Date().toISOString(),
        };
        const result2 = (0, db_1.upsertAnalyzedItem)(db, item2, 5);
        expect(result2.isNew).toBe(false);
        expect(result2.statusChanged).toBe(true);
        const count = db.prepare("SELECT COUNT(*) as count FROM regulation_events").get();
        expect(count.count).toBe(1);
        const updated = db.prepare("SELECT * FROM regulation_events WHERE id = ?").get(result2.id);
        expect(updated.stage).toBe("introduced");
    });
    test("should track status change when stage changes", () => {
        const item1 = {
            sourceId: "test-source",
            url: "https://example.com/article2",
            title: "Another Article",
            rawContent: "Content",
            isRelevant: true,
            jurisdictionCountry: "United Kingdom",
            stage: "proposed",
            ageBracket: "16-18",
            affectedProducts: [],
            summary: "Summary",
            businessImpact: "",
            requiredSolutions: [],
            competitorResponses: [],
            impactScore: 3,
            likelihoodScore: 3,
            confidenceScore: 3,
            chiliScore: 3,
            analyzedAt: new Date().toISOString(),
        };
        (0, db_1.upsertAnalyzedItem)(db, item1, 5);
        const item2 = {
            sourceId: "test-source",
            url: "https://example.com/article2",
            title: "Another Article",
            rawContent: "Content v2",
            isRelevant: true,
            jurisdictionCountry: "United Kingdom",
            stage: "passed",
            ageBracket: "16-18",
            affectedProducts: [],
            summary: "Summary v2",
            businessImpact: "",
            requiredSolutions: [],
            competitorResponses: [],
            impactScore: 4,
            likelihoodScore: 4,
            confidenceScore: 4,
            chiliScore: 4,
            analyzedAt: new Date().toISOString(),
        };
        const result = (0, db_1.upsertAnalyzedItem)(db, item2, 5);
        expect(result.statusChanged).toBe(true);
        const row = db.prepare("SELECT stage, status FROM regulation_events").get();
        expect(row.stage).toBe("passed");
        expect(row.status).toBe("status_changed");
    });
    test("should not mark as status change when same stage", () => {
        const item1 = {
            sourceId: "test-source",
            url: "https://example.com/article3",
            title: "Third Article",
            rawContent: "Content",
            isRelevant: true,
            jurisdictionCountry: "Germany",
            stage: "proposed",
            ageBracket: "both",
            affectedProducts: [],
            summary: "Summary",
            businessImpact: "",
            requiredSolutions: [],
            competitorResponses: [],
            impactScore: 3,
            likelihoodScore: 3,
            confidenceScore: 3,
            chiliScore: 3,
            analyzedAt: new Date().toISOString(),
        };
        (0, db_1.upsertAnalyzedItem)(db, item1, 5);
        const item2 = {
            sourceId: "test-source",
            url: "https://example.com/article3",
            title: "Third Article",
            rawContent: "Updated content",
            isRelevant: true,
            jurisdictionCountry: "Germany",
            stage: "proposed",
            ageBracket: "both",
            affectedProducts: [],
            summary: "Updated summary",
            businessImpact: "",
            requiredSolutions: [],
            competitorResponses: [],
            impactScore: 4,
            likelihoodScore: 4,
            confidenceScore: 4,
            chiliScore: 4,
            analyzedAt: new Date().toISOString(),
        };
        const result = (0, db_1.upsertAnalyzedItem)(db, item2, 5);
        expect(result.statusChanged).toBe(false);
        expect(result.isNew).toBe(false);
        const row = db.prepare("SELECT status FROM regulation_events").get();
        expect(row.status).toBe("unchanged");
    });
});
//# sourceMappingURL=dedup.test.js.map