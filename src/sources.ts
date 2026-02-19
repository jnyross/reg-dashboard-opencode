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
  // US Federal - Tier 5 (Official)
  {
    id: "us-federal-ftc",
    name: "FTC (Federal Trade Commission)",
    url: "https://www.ftc.gov/news-events/press-releases",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 5,
    description: "FTC press releases on children's privacy and online safety",
  },
  {
    id: "us-federal-congress",
    name: "US Congress",
    url: "https://www.congress.gov/browse?link=FIL",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 5,
    description: "Congressional bills related to children online safety",
  },
  // US States - Tier 4-5
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
    id: "ny-attorney-general",
    name: "New York Attorney General",
    url: "https://ag.ny.gov/rss/news",
    type: "rss",
    authorityType: "state",
    jurisdictionCountry: "United States",
    jurisdictionState: "New York",
    reliabilityTier: 5,
    description: "NY AG consumer protection announcements",
  },
  {
    id: "tx-attorney-general",
    name: "Texas Attorney General",
    url: "https://www.texasattorneygeneral.gov/news/feed",
    type: "rss",
    authorityType: "state",
    jurisdictionCountry: "United States",
    jurisdictionState: "Texas",
    reliabilityTier: 5,
    description: "Texas AG announcements",
  },
  // EU - Tier 5 (Official)
  {
    id: "eu-digital",
    name: "European Commission - Digital Services",
    url: "https://digital-strategy.ec.europa.eu/en/news/rss.xml",
    type: "rss",
    authorityType: "supranational",
    jurisdictionCountry: "European Union",
    reliabilityTier: 5,
    description: "EU Digital Services Act news",
  },
  {
    id: "eu-edpb",
    name: "European Data Protection Board",
    url: "https://edpb.europa.eu/news/rss_en.xml",
    type: "rss",
    authorityType: "supranational",
    jurisdictionCountry: "European Union",
    reliabilityTier: 5,
    description: "EDPB opinions and decisions",
  },
  {
    id: "eu-okp",
    name: "European Parliament - Digital Agenda",
    url: "https://www.europarl.europa.eu/rss/default/en/news/press.xml",
    type: "rss",
    authorityType: "supranational",
    jurisdictionCountry: "European Union",
    reliabilityTier: 5,
    description: "European Parliament digital policy news",
  },
  // UK - Tier 5 (Official)
  {
    id: "uk-ofcom",
    name: "Ofcom",
    url: "https://www.ofcom.org.uk/rss.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "United Kingdom",
    reliabilityTier: 5,
    description: "Ofcom online safety and media regulation",
  },
  {
    id: "uk-ico",
    name: "ICO (Information Commissioner's Office)",
    url: "https://ico.org.uk/news/rss.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "United Kingdom",
    reliabilityTier: 5,
    description: "UK data protection and privacy enforcement",
  },
  // Australia - Tier 5 (Official)
  {
    id: "au-eSafety",
    name: "eSafety Commissioner",
    url: "https://www.esafety.gov.au/about/blog/rss.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Australia",
    reliabilityTier: 5,
    description: "Australian online safety for children",
  },
  {
    id: "au-privacy-commissioner",
    name: "Office of the Australian Information Commissioner",
    url: "https://www.oaic.gov.au/rss/news.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Australia",
    reliabilityTier: 5,
    description: "Australian privacy regulation news",
  },
  // Canada - Tier 5 (Official)
  {
    id: "ca-privacy-commissioner",
    name: "Office of the Privacy Commissioner of Canada",
    url: "https://www.priv.gc.ca/en/rss/",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Canada",
    reliabilityTier: 5,
    description: "Canadian privacy enforcement and guidance",
  },
  {
    id: "ca-crtc",
    name: "CRTC (Canadian Radio-television)",
    url: "https://crtc.gc.ca/rss/eng/rss.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Canada",
    reliabilityTier: 5,
    description: "Canadian broadcast and telecommunications regulation",
  },
  // Singapore - Tier 5 (Official)
  {
    id: "sg-pdpc",
    name: "PDPC (Personal Data Protection Commission)",
    url: "https://www.pdpc.gov.sg/General/RSS",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Singapore",
    reliabilityTier: 5,
    description: "Singapore data protection news",
  },
  // Ireland - Tier 5 (Official)
  {
    id: "ie-dpc",
    name: "Data Protection Commission Ireland",
    url: "https://www.dataprotection.ie/rss/Articles.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Ireland",
    reliabilityTier: 5,
    description: "Irish data protection enforcement",
  },
  // Germany - Tier 5 (Official)
  {
    id: "de-bfdi",
    name: "BfDI (Federal Data Protection Commissioner)",
    url: "https://www.bfdi.bund.de/EN/RSS/RSS-node.html",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Germany",
    reliabilityTier: 5,
    description: "German federal data protection news",
  },
  // France - Tier 5 (Official)
  {
    id: "fr-cnil",
    name: "CNIL (Commission Nationale de l'Informatique)",
    url: "https://www.cnil.fr/fr/actus/rss",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "France",
    reliabilityTier: 5,
    description: "French data protection authority news",
  },
  // Netherlands - Tier 5 (Official)
  {
    id: "nl-ap",
    name: "AP (Autoriteit Persoonsgegevens)",
    url: "https://autoriteitpersoonsgegevens.nl/nl/rss.xml",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Netherlands",
    reliabilityTier: 5,
    description: "Dutch data protection authority",
  },
  // Japan - Tier 5 (Official)
  {
    id: "jp-ppc",
    name: "PPC (Personal Information Protection Commission)",
    url: "https://www.ppc.go.jp/en/about/foundation/",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "Japan",
    reliabilityTier: 5,
    description: "Japanese privacy regulation",
  },
  // News Search Queries - Tier 3 (General News)
  {
    id: "search-children-privacy",
    name: "News Search: Children Privacy Regulation",
    url: "https://news.google.com/rss/search?q=children+online+privacy+regulation+Meta+Facebook",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "Google News search for children online privacy regulation",
    searchQuery: "children online privacy regulation Meta Facebook teenagers",
  },
  {
    id: "search-age-verification",
    name: "News Search: Age Verification Laws",
    url: "https://news.google.com/rss/search?q=age+verification+social+media+law",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "Google News search for age verification laws",
    searchQuery: "age verification social media law teenagers 2024 2025",
  },
  {
    id: "search-online-safety",
    name: "News Search: Online Safety Children",
    url: "https://news.google.com/rss/search?q=online+safety+children+social+media+regulation",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "Google News search for online safety regulation",
    searchQuery: "online safety children social media regulation bill 2024 2025",
  },
  // Legal/Industry Publications - Tier 4
  {
    id: "iapp-privacy",
    name: "IAPP (International Association of Privacy Professionals)",
    url: "https://iapp.org/news/rss/",
    type: "rss",
    authorityType: "national",
    jurisdictionCountry: "Global",
    reliabilityTier: 4,
    description: "Privacy professional news and analysis",
  },
  {
    id: "lawfare-children",
    name: "Lawfare - Children Online Safety",
    url: "https://www.lawfareblog.com/search/children%20online%20safety",
    type: "html",
    authorityType: "national",
    jurisdictionCountry: "United States",
    reliabilityTier: 4,
    description: "Legal analysis of children's online safety regulation",
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
