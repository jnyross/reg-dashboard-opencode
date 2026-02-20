"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sources_1 = require("../src/sources");
describe("sources", () => {
    test("should have at least 20 sources", () => {
        expect(sources_1.sources.length).toBeGreaterThanOrEqual(20);
    });
    test("each source should have required fields", () => {
        for (const source of sources_1.sources) {
            expect(source.id).toBeDefined();
            expect(source.name).toBeDefined();
            expect(source.url).toBeDefined();
            expect(source.type).toBeDefined();
            expect(source.authorityType).toBeDefined();
            expect(source.jurisdictionCountry).toBeDefined();
            expect(source.reliabilityTier).toBeGreaterThanOrEqual(1);
            expect(source.reliabilityTier).toBeLessThanOrEqual(5);
        }
    });
    test("getSourceById returns correct source", () => {
        const source = (0, sources_1.getSourceById)("us-federal-ftc");
        expect(source).toBeDefined();
        expect(source?.name).toBe("FTC (Federal Trade Commission)");
    });
    test("getSourcesByJurisdiction filters correctly", () => {
        const usSources = (0, sources_1.getSourcesByJurisdiction)("United States");
        expect(usSources.length).toBeGreaterThan(0);
        for (const source of usSources) {
            expect(source.jurisdictionCountry).toBe("United States");
        }
    });
    test("getSourcesByTier filters correctly", () => {
        const tier5Sources = (0, sources_1.getSourcesByTier)(5);
        expect(tier5Sources.length).toBeGreaterThan(0);
        for (const source of tier5Sources) {
            expect(source.reliabilityTier).toBe(5);
        }
    });
    test("should have sources from multiple jurisdictions", () => {
        const countries = new Set(sources_1.sources.map((s) => s.jurisdictionCountry));
        expect(countries.size).toBeGreaterThanOrEqual(5);
    });
});
//# sourceMappingURL=sources.test.js.map