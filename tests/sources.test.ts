import { sources, getSourceById, getSourcesByJurisdiction, getSourcesByTier } from "../src/sources";

describe("sources", () => {
  test("should have at least 20 sources", () => {
    expect(sources.length).toBeGreaterThanOrEqual(20);
  });

  test("each source should have required fields", () => {
    for (const source of sources) {
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
    const source = getSourceById("ftc-children-s-online-privacy-protection-rule-coppa");
    expect(source).toBeDefined();
    expect(source?.name).toContain("FTC");
  });

  test("getSourcesByJurisdiction filters correctly", () => {
    const usSources = getSourcesByJurisdiction("United States");
    expect(usSources.length).toBeGreaterThan(0);
    for (const source of usSources) {
      expect(source.jurisdictionCountry).toBe("United States");
    }
  });

  test("getSourcesByTier filters correctly", () => {
    const tier5Sources = getSourcesByTier(5);
    expect(tier5Sources.length).toBeGreaterThan(0);
    for (const source of tier5Sources) {
      expect(source.reliabilityTier).toBe(5);
    }
  });

  test("should have sources from multiple jurisdictions", () => {
    const countries = new Set(sources.map((s) => s.jurisdictionCountry));
    expect(countries.size).toBeGreaterThanOrEqual(5);
  });
});
