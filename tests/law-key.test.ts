import { buildLawKey, extractCanonicalLawTitle } from "../src/laws";

describe("law canonicalization", () => {
  test("extractCanonicalLawTitle removes lifecycle noise", () => {
    const canonical = extractCanonicalLawTitle("US Federal Youth Privacy Modernization Enacted Update");
    expect(canonical).toBe("Youth Privacy Modernization");
  });

  test("buildLawKey is stable for same canonical law", () => {
    const titleA = extractCanonicalLawTitle("US Federal Youth Privacy Modernization Proposal");
    const titleB = extractCanonicalLawTitle("US Federal Youth Privacy Modernization Enacted Update");

    const keyA = buildLawKey("United States", undefined, titleA);
    const keyB = buildLawKey("United States", undefined, titleB);

    expect(keyA).toBe(keyB);
  });
});
