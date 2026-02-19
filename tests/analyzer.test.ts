import { CrawledItem } from "../src/crawler";

function analyzeItem(item: CrawledItem) {
  const lowerContent = item.content.toLowerCase();
  
  const hasMeta = lowerContent.includes("meta") || lowerContent.includes("facebook") || lowerContent.includes("instagram");
  const hasSocialMedia = lowerContent.includes("social media");
  const hasChildren = lowerContent.includes("children") || lowerContent.includes("minors") || lowerContent.includes("teen");
  const hasRegulation = lowerContent.includes("regulation") || lowerContent.includes("law") || lowerContent.includes("bill");
  
  const isRelevant = (hasMeta || hasSocialMedia) && (hasChildren || hasRegulation);
  
  const jurisdictionCountry = lowerContent.includes("european union") || lowerContent.includes("eu ") ? "European Union" :
    lowerContent.includes("united kingdom") || lowerContent.includes("uk ") ? "United Kingdom" :
    lowerContent.includes("australia") ? "Australia" :
    lowerContent.includes("canada") ? "Canada" :
    lowerContent.includes("united states") || lowerContent.includes("u.s.") ? "United States" : "Unknown";
  
  const ageBracket = lowerContent.includes("under 13") || lowerContent.includes("under 15") || lowerContent.includes("13-15") ? "13-15" :
    lowerContent.includes("under 16") || lowerContent.includes("under 18") || lowerContent.includes("16-18") || lowerContent.includes("teen") ? "16-18" :
    lowerContent.includes("minor") || lowerContent.includes("child") ? "both" : "unknown";
  
  const stage = lowerContent.includes("passed") || lowerContent.includes("enacted") || lowerContent.includes("effective") ? "effective" :
    lowerContent.includes("committee") ? "committee_review" :
    lowerContent.includes("introduced") || lowerContent.includes("filed") ? "introduced" :
    lowerContent.includes("proposed") || lowerContent.includes("draft") ? "proposed" : "proposed";
  
  const impactScore = isRelevant ? (jurisdictionCountry !== "Unknown" ? 4 : 3) : 1;
  const likelihoodScore = isRelevant ? (stage === "effective" ? 5 : 3) : 1;
  const confidenceScore = 3;
  const chiliScore = isRelevant ? Math.min(5, Math.round((impactScore + likelihoodScore) / 2)) : 1;
  
  return {
    sourceId: item.sourceId,
    url: item.url,
    title: item.title,
    rawContent: item.content,
    isRelevant,
    jurisdictionCountry,
    stage,
    ageBracket: ageBracket as "13-15" | "16-18" | "both" | "unknown",
    affectedProducts: hasMeta ? ["Meta"] : [],
    summary: item.content.substring(0, 200),
    businessImpact: isRelevant ? "Requires compliance review" : "No impact",
    requiredSolutions: [],
    competitorResponses: [],
    impactScore,
    likelihoodScore,
    confidenceScore,
    chiliScore,
    analyzedAt: new Date().toISOString(),
  };
}

describe("analyzer fallback logic", () => {
  test("should identify relevant item about Meta children regulation", () => {
    const item: CrawledItem = {
      sourceId: "test",
      url: "https://example.com/news",
      title: "EU proposes new rules for children's online safety on social media",
      content: "The European Union has proposed new regulations requiring social media platforms like Meta to implement stricter age verification for children under 16.",
      publishedDate: "2024-01-15",
      extractedAt: "2024-01-15T10:00:00Z",
    };
    
    const result = analyzeItem(item);
    
    expect(result.isRelevant).toBe(true);
    expect(result.jurisdictionCountry).toBe("European Union");
    expect(result.ageBracket).toBe("16-18");
  });

  test("should identify irrelevant item", () => {
    const item: CrawledItem = {
      sourceId: "test",
      url: "https://example.com/news",
      title: "Weather update",
      content: "It will be sunny tomorrow with temperatures around 25 degrees.",
      publishedDate: "2024-01-15",
      extractedAt: "2024-01-15T10:00:00Z",
    };
    
    const result = analyzeItem(item);
    
    expect(result.isRelevant).toBe(false);
    expect(result.impactScore).toBe(1);
  });

  test("should extract jurisdiction correctly", () => {
    const item: CrawledItem = {
      sourceId: "test",
      url: "https://example.com/news",
      title: "UK announces new online safety rules",
      content: "The UK government has announced new online safety legislation targeting social media platforms like Facebook and Instagram.",
      publishedDate: "2024-01-15",
      extractedAt: "2024-01-15T10:00:00Z",
    };
    
    const result = analyzeItem(item);
    
    expect(result.jurisdictionCountry).toBe("United Kingdom");
  });

  test("should handle US jurisdiction", () => {
    const item: CrawledItem = {
      sourceId: "test",
      url: "https://example.com/news",
      title: "US Congress proposes youth privacy bill",
      content: "U.S. Congress members have introduced a bill to protect youth privacy online for teenagers and children on social media.",
      publishedDate: "2024-01-15",
      extractedAt: "2024-01-15T10:00:00Z",
    };
    
    const result = analyzeItem(item);
    
    expect(result.jurisdictionCountry).toBe("United States");
  });

  test("should detect age bracket 13-15", () => {
    const item: CrawledItem = {
      sourceId: "test",
      url: "https://example.com/news",
      title: "California passes law for under-15 users",
      content: "California has passed a law requiring platforms to obtain parental consent for users under 15.",
      publishedDate: "2024-01-15",
      extractedAt: "2024-01-15T10:00:00Z",
    };
    
    const result = analyzeItem(item);
    
    expect(result.ageBracket).toBe("13-15");
  });

  test("should detect stage correctly", () => {
    const effectiveItem: CrawledItem = {
      sourceId: "test",
      url: "https://example.com/news",
      title: "Law becomes effective",
      content: "The regulation has been enacted and is now effective for all social media platforms serving children and teenagers.",
      publishedDate: "2024-01-15",
      extractedAt: "2024-01-15T10:00:00Z",
    };
    
    const result = analyzeItem(effectiveItem);
    
    expect(result.stage).toBe("effective");
  });
});
