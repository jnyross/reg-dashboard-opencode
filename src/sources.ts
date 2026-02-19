export type SourceType = "rss" | "html" | "search" | "api";

export type ReliabilityTier = 1 | 2 | 3 | 4 | 5;

export interface RegulatorySource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  authorityType: "national" | "state" | "local" | "supranational";
  jurisdictionCountry: string;
  jurisdictionState?: string;
  reliabilityTier: ReliabilityTier;
  description: string;
  searchQuery?: string;
}

export const sources: RegulatorySource[] = [
  // ── US Federal ──────────────────────────────────────────
  {
    id: "us-ftc-coppa",
    name: "FTC COPPA Rule",
    url: "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 5,
    description: "FTC COPPA rule page — primary US federal child privacy regulation",
  },
  {
    id: "us-ftc-press",
    name: "FTC Press Releases",
    url: "https://www.ftc.gov/news-events/news/press-releases",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 5,
    description: "FTC press releases on children's privacy and online safety",
  },
  {
    id: "us-news-kosa",
    name: "News: KOSA Kids Online Safety Act",
    url: "https://news.google.com/rss/search?q=KOSA+Kids+Online+Safety+Act+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 3,
    description: "News coverage of Kids Online Safety Act",
  },
  {
    id: "us-news-coppa2",
    name: "News: COPPA 2.0",
    url: "https://news.google.com/rss/search?q=COPPA+2.0+children+privacy+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 3,
    description: "News about COPPA 2.0 extending protections to teens under 17",
  },
  {
    id: "us-fed-register",
    name: "Federal Register - Children Privacy",
    url: "https://www.federalregister.gov/documents/search.rss?conditions%5Bterm%5D=children+online+privacy+social+media",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 5,
    description: "Federal Register search for children's online privacy documents",
  },

  // ── US States ───────────────────────────────────────────
  {
    id: "ca-attorney-general",
    name: "California Attorney General",
    url: "https://oag.ca.gov/news/feed",
    type: "rss",
    authorityType: "state",
    jurisdictionCountry: "United States",
    jurisdictionState: "California",
    reliabilityTier: 5,
    description: "California AG announcements on privacy and children",
  },
  {
    id: "ca-aadc",
    name: "California AADC",
    url: "https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202120220AB2273",
    type: "html",
    authorityType: "state",
    jurisdictionCountry: "United States",
    jurisdictionState: "California",
    reliabilityTier: 5,
    description: "California Age-Appropriate Design Code Act (AB-2273)",
  },
  {
    id: "us-news-state-child-safety",
    name: "News: US State Child Safety Laws",
    url: "https://news.google.com/rss/search?q=US+state+child+safety+social+media+law+2024+2025",
    type: "rss",
    authorityType: "state",
    jurisdictionCountry: "United States",
    reliabilityTier: 3,
    description: "News about US state-level child safety legislation",
  },

  // ── EU ──────────────────────────────────────────────────
  {
    id: "eu-dsa",
    name: "EU Digital Services Act",
    url: "https://digital-strategy.ec.europa.eu/en/policies/digital-services-act-package",
    type: "html",
    authorityType: "supranational",
    jurisdictionCountry: "European Union",
    reliabilityTier: 5,
    description: "EU DSA — platform obligations including minor protection provisions",
  },
  {
    id: "eu-gdpr",
    name: "EU GDPR Children's Data",
    url: "https://commission.europa.eu/law/law-topic/data-protection_en",
    type: "html",
    authorityType: "supranational",
    jurisdictionCountry: "European Union",
    reliabilityTier: 5,
    description: "GDPR Article 8 — conditions for child's consent",
  },
  {
    id: "eu-news-dsa-children",
    name: "News: EU DSA Children",
    url: "https://news.google.com/rss/search?q=EU+Digital+Services+Act+children+minors+2024+2025",
    type: "rss",
    authorityType: "supranational",
    jurisdictionCountry: "European Union",
    reliabilityTier: 3,
    description: "News about EU DSA child protection provisions",
  },

  // ── EU National DPAs ────────────────────────────────────
  {
    id: "ie-dpc",
    name: "Ireland DPC",
    url: "https://www.dataprotection.ie/en/news-media/press-releases",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "Ireland",
    reliabilityTier: 5,
    description: "Irish DPC — lead EU supervisory authority for Meta",
  },
  {
    id: "de-news-children-data",
    name: "News: Germany Children Data Protection",
    url: "https://news.google.com/rss/search?q=Germany+children+data+protection+BfDI+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Germany",
    reliabilityTier: 3,
    description: "German children's data protection news",
  },
  {
    id: "fr-news-cnil-children",
    name: "News: France CNIL Children",
    url: "https://news.google.com/rss/search?q=CNIL+France+children+data+protection+minors+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "France",
    reliabilityTier: 3,
    description: "French CNIL children's data protection coverage",
  },

  // ── UK ──────────────────────────────────────────────────
  {
    id: "uk-osa",
    name: "UK Online Safety Act",
    url: "https://www.legislation.gov.uk/ukpga/2023/50/contents/enacted",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United Kingdom",
    reliabilityTier: 5,
    description: "UK Online Safety Act 2023",
  },
  {
    id: "uk-ico-code",
    name: "UK ICO Children's Code",
    url: "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United Kingdom",
    reliabilityTier: 5,
    description: "UK ICO Age-Appropriate Design Code guidance",
  },
  {
    id: "uk-news-online-safety",
    name: "News: UK Online Safety",
    url: "https://news.google.com/rss/search?q=UK+Online+Safety+Act+children+Ofcom+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "United Kingdom",
    reliabilityTier: 3,
    description: "UK Online Safety Act and Ofcom enforcement news",
  },

  // ── Australia ───────────────────────────────────────────
  {
    id: "au-osa",
    name: "Australia Online Safety Act",
    url: "https://www.legislation.gov.au/C2021A00076/latest/text",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "Australia",
    reliabilityTier: 5,
    description: "Australia Online Safety Act 2021",
  },
  {
    id: "au-news-social-media-ban",
    name: "News: Australia Social Media Ban",
    url: "https://news.google.com/rss/search?q=Australia+social+media+ban+children+under+16+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Australia",
    reliabilityTier: 3,
    description: "Australia social media ban for under-16s coverage",
  },

  // ── Canada ──────────────────────────────────────────────
  {
    id: "ca-online-harms",
    name: "Canada Online Harms Act",
    url: "https://www.parl.ca/legisinfo/en/bill/44-1/c-63",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "Canada",
    reliabilityTier: 5,
    description: "Canada Bill C-63 Online Harms Act",
  },

  // ── APAC ────────────────────────────────────────────────
  {
    id: "sg-news-online-safety",
    name: "News: Singapore Online Safety",
    url: "https://news.google.com/rss/search?q=Singapore+online+safety+children+PDPC+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Singapore",
    reliabilityTier: 3,
    description: "Singapore online safety regulation coverage",
  },
  {
    id: "jp-news-children",
    name: "News: Japan Children Online Safety",
    url: "https://news.google.com/rss/search?q=Japan+children+online+safety+regulation+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Japan",
    reliabilityTier: 3,
    description: "Japan children's online safety coverage",
  },
  {
    id: "kr-news-youth",
    name: "News: South Korea Youth Online",
    url: "https://news.google.com/rss/search?q=South+Korea+youth+online+protection+gaming+children+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "South Korea",
    reliabilityTier: 3,
    description: "South Korea youth online protection coverage",
  },
  {
    id: "cn-news-children",
    name: "News: China Children Internet",
    url: "https://news.google.com/rss/search?q=China+children+internet+regulation+minor+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "China",
    reliabilityTier: 3,
    description: "China children's internet regulation coverage",
  },
  {
    id: "in-news-children",
    name: "News: India Children Online",
    url: "https://news.google.com/rss/search?q=India+DPDP+children+online+safety+regulation+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "India",
    reliabilityTier: 3,
    description: "India DPDP Act and children's data protection",
  },

  // ── Global News ─────────────────────────────────────────
  {
    id: "search-children-privacy",
    name: "News: Children Privacy Regulation Meta",
    url: "https://news.google.com/rss/search?q=Meta+child+safety+regulation+teen+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "Meta child safety regulation news",
  },
  {
    id: "search-age-verification",
    name: "News: Age Verification Laws",
    url: "https://news.google.com/rss/search?q=age+verification+social+media+children+law+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "Global age verification laws coverage",
  },
  {
    id: "search-online-safety",
    name: "News: Online Safety Children",
    url: "https://news.google.com/rss/search?q=online+safety+children+social+media+regulation+2024+2025",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "Global online safety regulation coverage",
  },
];

export function getSourceById(id: string): RegulatorySource | undefined {
  return sources.find((s) => s.id === id);
}

export function getSourcesByJurisdiction(country: string): RegulatorySource[] {
  return sources.filter((s) => s.jurisdictionCountry === country);
}

export function getSourcesByTier(minTier: ReliabilityTier): RegulatorySource[] {
  return sources.filter((s) => s.reliabilityTier >= minTier);
}
