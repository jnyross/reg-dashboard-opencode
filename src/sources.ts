export type SourceType = "rss" | "html" | "search" | "api" | "twitter_search";
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

const TWITTER_RECENT_SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent";

export const twitterSearchSources: RegulatorySource[] = [
  {
    id: "twitter-under16-coppa-age-verification",
    name: "X Search — Under 16 / COPPA",
    url: TWITTER_RECENT_SEARCH_URL,
    type: "twitter_search",
    authorityType: "supranational",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "X recent search for under-16 and COPPA regulation updates",
    searchQuery:
      '"under 16" OR "under 16s" OR COPPA OR "age verification" (regulation OR law OR bill OR legislation) -is:retweet',
  },
  {
    id: "twitter-meta-child-safety-minors",
    name: "X Search — Meta Child Safety",
    url: TWITTER_RECENT_SEARCH_URL,
    type: "twitter_search",
    authorityType: "supranational",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "X recent search for Meta/Facebook/Instagram/WhatsApp child safety and minors privacy",
    searchQuery:
      '(Meta OR Facebook OR Instagram OR WhatsApp) ("child safety" OR "children\'s privacy" OR "minor" OR "age restriction") -is:retweet',
  },
  {
    id: "twitter-dsa-osa-kosa-teens",
    name: "X Search — DSA / OSA / KOSA",
    url: TWITTER_RECENT_SEARCH_URL,
    type: "twitter_search",
    authorityType: "supranational",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "X recent search for DSA/Online Safety Act/KOSA updates affecting children and teens",
    searchQuery:
      '("Digital Services Act" OR DSA OR "Online Safety Act" OR "KOSA") (children OR minors OR teens) -is:retweet',
  },
  {
    id: "twitter-tiktok-snap-youtube-compliance",
    name: "X Search — TikTok/Snap/YouTube Compliance",
    url: TWITTER_RECENT_SEARCH_URL,
    type: "twitter_search",
    authorityType: "supranational",
    jurisdictionCountry: "Global",
    reliabilityTier: 3,
    description: "X recent search for age verification and child-protection compliance on major platforms",
    searchQuery:
      '(TikTok OR Snapchat OR YouTube) ("age verification" OR "parental consent" OR "child protection") compliance -is:retweet',
  },
];

export const sources: RegulatorySource[] = [
  {
    "id": "ftc-children-s-online-privacy-protection-rule-coppa",
    "name": "FTC — Children's Online Privacy Protection Rule (COPPA)",
    "url": "https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule-coppa",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 5,
    "description": "Primary COPPA rule text and amendments. Compliance deadline April 22, 2026."
  },
  {
    "id": "ftc-kids-privacy-coppa-news-updates",
    "name": "FTC Kids' Privacy (COPPA) News & Updates",
    "url": "https://www.ftc.gov/news-events/topics/protecting-consumer-privacy-security/kids-privacy-coppa",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 5,
    "description": "Rolling feed of FTC press releases, enforcement actions, and commissioner statements on COPPA."
  },
  {
    "id": "ftc-children-s-privacy-guidance-portal",
    "name": "FTC Children's Privacy Guidance Portal",
    "url": "https://www.ftc.gov/business-guidance/privacy-security/childrens-privacy",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 5,
    "description": "Compliance resources for businesses, FAQs, and parent guides."
  },
  {
    "id": "federal-register-coppa-rule-amendments",
    "name": "Federal Register: COPPA Rule Amendments",
    "url": "https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 5,
    "description": "Final published amendments. Effective June 23, 2025; compliance deadline April 22, 2026."
  },
  {
    "id": "kosa-bill-page-119th-congress",
    "name": "KOSA Bill Page — 119th Congress",
    "url": "https://www.congress.gov/bill/119th-congress/senate-bill/1748",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 5,
    "description": "Reintroduced May 2025. Cloudflare-protected so web_fetch returned 403, but URL is confirmed valid via search metadata."
  },
  {
    "id": "govtrack-kosa-tracker",
    "name": "GovTrack KOSA Tracker",
    "url": "https://www.govtrack.us/congress/bills/119/s1748",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Independent tracking of bill status, prognosis, and legislative history. Verified 200 OK."
  },
  {
    "id": "techpolicy-press-kosa-tracker",
    "name": "TechPolicy.Press KOSA Tracker",
    "url": "https://www.techpolicy.press/tracker/kids-online-safety-act-kosa-s-1409/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Detailed timeline with amendments, quotes, and political context. Verified 200 OK."
  },
  {
    "id": "ftc-coppa-finalization-press-release-jan-2025",
    "name": "FTC COPPA Finalization Press Release (Jan 2025)",
    "url": "https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 5,
    "description": "Key announcement of final rule changes limiting monetization of children's data."
  },
  {
    "id": "california-aadc-legislative-text",
    "name": "California AADC — Legislative Text",
    "url": "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202120220AB2273",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "jurisdictionState": "California",
    "reliabilityTier": 5,
    "description": "Full text of the California Age-Appropriate Design Code Act. Currently enjoined but on appeal."
  },
  {
    "id": "ny-ag-protecting-children-online-safe-for-kids-act",
    "name": "NY AG — Protecting Children Online (SAFE for Kids Act)",
    "url": "https://ag.ny.gov/resources/individuals/consumer-issues/technology/protecting-children-online",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "jurisdictionState": "New York",
    "reliabilityTier": 5,
    "description": "NY Attorney General's rulemaking and enforcement page. Signed into law June 2024."
  },
  {
    "id": "ny-senate-safe-for-kids-act-s7694a",
    "name": "NY Senate — SAFE for Kids Act S7694A",
    "url": "https://www.nysenate.gov/legislation/bills/2023/S7694/amendment/A",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "jurisdictionState": "New York",
    "reliabilityTier": 5,
    "description": "Prohibits addictive feeds to minors without parental consent. Cloudflare-protected (403 on fetch)."
  },
  {
    "id": "texas-ag-scope-act-hb-18",
    "name": "Texas AG — SCOPE Act (HB 18)",
    "url": "https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/securing-children-online-through-parental-empowerment",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "jurisdictionState": "Texas",
    "reliabilityTier": 5,
    "description": "Effective September 1, 2024. Requires parental consent for minors under 18 on digital services."
  },
  {
    "id": "florida-senate-hb-3-bill-summary",
    "name": "Florida Senate — HB 3 Bill Summary",
    "url": "https://www.flsenate.gov/Committees/billsummaries/2024/html/3354",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "jurisdictionState": "Florida",
    "reliabilityTier": 5,
    "description": "Bans social media accounts for children under 14; requires parental consent for 14-15."
  },
  {
    "id": "orrick-online-safety-law-center-state-by-state-tracker",
    "name": "Orrick Online Safety Law Center — State-by-State Tracker",
    "url": "https://onlinesafety.orrick.com/",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Comprehensive interactive tracker of all US state children's online safety legislation. Verified 200 OK."
  },
  {
    "id": "covington-state-federal-minors-privacy-developments-2025",
    "name": "Covington — State & Federal Minors' Privacy Developments 2025",
    "url": "https://www.insideprivacy.com/childrens-privacy/state-and-federal-developments-in-minors-privacy-in-2025/",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Annual roundup covering all 15+ states with enacted children's social media laws."
  },
  {
    "id": "covington-state-federal-minors-privacy-developments-2024",
    "name": "Covington — State & Federal Minors' Privacy Developments 2024",
    "url": "https://www.insideprivacy.com/childrens-privacy/state-and-federal-developments-in-minors-privacy-in-2024/",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "2024 roundup covering CA AADC injunction, FL HB 3, and more."
  },
  {
    "id": "alston-bird-strategic-guide-to-minors-privacy-laws",
    "name": "Alston & Bird — Strategic Guide to Minors' Privacy Laws",
    "url": "https://www.alston.com/en/insights/publications/2025/11/minors-privacy-online-safety-laws",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Lists all 15 states with enacted social media laws for minors. Verified 200 OK."
  },
  {
    "id": "troutman-pepper-2025-children-s-privacy-laws-analysis",
    "name": "Troutman Pepper — 2025 Children's Privacy Laws Analysis",
    "url": "https://www.troutmanprivacy.com/2025/09/analyzing-the-2025-childrens-privacy-laws-and-regulations/",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Covers AR, CT, LA, MT, NE, OR, TX, UT, VT laws/amendments from 2025 session."
  },
  {
    "id": "mayer-brown-state-ftc-children-s-privacy-actions",
    "name": "Mayer Brown — State & FTC Children's Privacy Actions",
    "url": "https://www.mayerbrown.com/en/insights/publications/2025/02/protecting-the-next-generation-how-states-and-the-ftc-are-holding-businesses-accountable-for-childrens-online-privacy",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Covers Maryland Kids Code, IL, SC, VT bills, and FTC enforcement actions."
  },
  {
    "id": "ec-guidelines-on-protection-of-minors-under-dsa",
    "name": "EC Guidelines on Protection of Minors under DSA",
    "url": "https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 5,
    "description": "Published July 14, 2025. Non-binding guidelines for Article 28(1) DSA compliance."
  },
  {
    "id": "dsa-article-28-full-text",
    "name": "DSA Article 28 — Full Text",
    "url": "https://www.eu-digital-services-act.com/Digital_Services_Act_Article_28.html",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 5,
    "description": "Regulation (EU) 2022/2065 Article 28 text. Verified 200 OK."
  },
  {
    "id": "european-data-protection-board-children",
    "name": "European Data Protection Board — Children",
    "url": "https://www.edpb.europa.eu/our-work-tools/our-documents/topic/children_en",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 5,
    "description": "EDPB guidelines, statements, and opinions on children's data. Including DSA-GDPR interplay guidance."
  },
  {
    "id": "edpb-statement-keeping-children-s-data-safe-online",
    "name": "EDPB Statement — Keeping Children's Data Safe Online",
    "url": "https://www.edpb.europa.eu/news/news/2026/data-protection-day-2026-keeping-childrens-personal-data-safe-online_en",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 5,
    "description": "2026 statement on upcoming EDPB guidelines on children's data processing."
  },
  {
    "id": "better-internet-for-kids-country-policy-profiles",
    "name": "Better Internet for Kids — Country Policy Profiles",
    "url": "https://better-internet-for-kids.europa.eu/en/knowledge-hub/italy-policy-monitor-country-profile",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 4,
    "description": "EU co-funded portal with policy profiles for each EU member state."
  },
  {
    "id": "cnil-digital-rights-of-children",
    "name": "CNIL — Digital Rights of Children",
    "url": "https://www.cnil.fr/en/topics/digital-rights-children",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "France",
    "reliabilityTier": 5,
    "description": "8 recommendations for protecting children online. Verified 200 OK."
  },
  {
    "id": "cnil-8-recommendations-to-enhance-protection-of-children-online",
    "name": "CNIL — 8 Recommendations to Enhance Protection of Children Online",
    "url": "https://www.cnil.fr/en/cnil-publishes-8-recommendations-enhance-protection-children-online",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "France",
    "reliabilityTier": 5,
    "description": "Includes recommendations on profiling, age verification, and parental controls."
  },
  {
    "id": "dpc-ireland-fundamentals-for-child-oriented-data-processing",
    "name": "DPC Ireland — Fundamentals for Child-Oriented Data Processing",
    "url": "https://www.dataprotection.ie/en/dpc-guidance/fundamentals-child-oriented-approach-data-processing",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Ireland",
    "reliabilityTier": 5,
    "description": "14 core principles for child-centred data processing. Verified 200 OK."
  },
  {
    "id": "bfdi-federal-commissioner-for-data-protection-germany",
    "name": "BfDI — Federal Commissioner for Data Protection (Germany)",
    "url": "https://www.bfdi.bund.de/EN/Home/home_node.html",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Germany",
    "reliabilityTier": 5,
    "description": "German Federal data protection authority. Active in Meta Facebook cases. Verified 200 OK."
  },
  {
    "id": "garante-privacy-italian-dpa-english",
    "name": "Garante Privacy — Italian DPA (English)",
    "url": "https://www.garanteprivacy.it/web/garante-privacy-en",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Italy",
    "reliabilityTier": 5,
    "description": "Active on children's social media enforcement (TikTok ban, Replika case). Verified 200 OK."
  },
  {
    "id": "aepd-analysis-on-protection-of-children-in-digital-environment",
    "name": "AEPD — Analysis on Protection of Children in Digital Environment",
    "url": "https://www.aepd.es/en/press-and-communication/press-releases/aepd-publishes-analysis-on-protection-of-children-and-adolescents-in-the-digital-environment",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Spain",
    "reliabilityTier": 5,
    "description": "October 2024 analysis on data protection principles for minors. Verified 200 OK."
  },
  {
    "id": "dutch-data-protection-authority",
    "name": "Dutch Data Protection Authority",
    "url": "https://www.autoriteitpersoonsgegevens.nl/en",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Netherlands",
    "reliabilityTier": 5,
    "description": "Age of consent is 16 in Netherlands under UAVG. Active enforcement. Verified 200 OK."
  },
  {
    "id": "eu-fundamental-rights-agency-consent-to-use-data-on-children",
    "name": "EU Fundamental Rights Agency — Consent to Use Data on Children",
    "url": "https://fra.europa.eu/en/publication/2017/mapping-minimum-age-requirements-concerning-rights-child-eu/consent-use-data-children",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 5,
    "description": "Maps consent ages across all EU member states (ranges from 13 to 16)."
  },
  {
    "id": "gov-uk-online-safety-act-explainer",
    "name": "GOV.UK — Online Safety Act Explainer",
    "url": "https://www.gov.uk/government/publications/online-safety-act-explainer/online-safety-act-explainer",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 5,
    "description": "Official government explainer. Child safety regime fully in effect by Summer 2025. Verified 200 OK."
  },
  {
    "id": "ofcom-children-s-safety-codes-statement",
    "name": "Ofcom — Children's Safety Codes Statement",
    "url": "https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/statement-protecting-children-from-harms-online",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 5,
    "description": "Children's Safety Codes of Practice. In force from July 25, 2025. Verified 200 OK."
  },
  {
    "id": "ofcom-protection-of-children-duties-quick-guide",
    "name": "Ofcom — Protection of Children Duties Quick Guide",
    "url": "https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/quick-guide-to-childrens-safety-codes",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 5,
    "description": "Summary of all regulatory documents for children's protection duties."
  },
  {
    "id": "ofcom-online-safety-act-implementation-roadmap",
    "name": "Ofcom — Online Safety Act Implementation Roadmap",
    "url": "https://www.ofcom.org.uk/online-safety/illegal-and-harmful-content/roadmap-to-regulation",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 5,
    "description": "Three-phase implementation plan: Illegal Harms → Children's Safety → Categorised Services."
  },
  {
    "id": "ico-children-s-code-age-appropriate-design-code",
    "name": "ICO — Children's Code (Age Appropriate Design Code)",
    "url": "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 5,
    "description": "15 standards for online services likely accessed by children. Verified 200 OK."
  },
  {
    "id": "ico-age-appropriate-design-code-full-text",
    "name": "ICO — Age Appropriate Design Code (Full Text)",
    "url": "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 5,
    "description": "The full code text with all 15 standards."
  },
  {
    "id": "esafety-social-media-age-restrictions",
    "name": "eSafety — Social Media Age Restrictions",
    "url": "https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Australia",
    "reliabilityTier": 5,
    "description": "Under-16 social media ban implementation. In effect December 10, 2025. Timeout on first fetch attempt but known valid government URL."
  },
  {
    "id": "esafety-social-media-age-restrictions-faqs",
    "name": "eSafety — Social Media Age Restrictions FAQs",
    "url": "https://www.esafety.gov.au/about-us/industry-regulation/social-media-age-restrictions/faqs",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Australia",
    "reliabilityTier": 5,
    "description": "Covers 10 age-restricted platforms including Facebook, Instagram, Threads."
  },
  {
    "id": "esafety-how-social-media-age-restrictions-affect-you",
    "name": "eSafety — How Social Media Age Restrictions Affect You",
    "url": "https://www.esafety.gov.au/young-people/social-media-age-restrictions",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Australia",
    "reliabilityTier": 5,
    "description": "Lists all 10 restricted platforms: Facebook, Instagram, Kick, Reddit, Snapchat, Threads, TikTok, Twitch, X, YouTube."
  },
  {
    "id": "dept-of-infrastructure-social-media-minimum-age",
    "name": "Dept. of Infrastructure — Social Media Minimum Age",
    "url": "https://www.infrastructure.gov.au/media-communications/internet/online-safety/social-media-minimum-age",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Australia",
    "reliabilityTier": 5,
    "description": "Official government policy page on Online Safety Amendment Act 2024."
  },
  {
    "id": "canadian-heritage-online-harms-proposed-bill",
    "name": "Canadian Heritage — Online Harms Proposed Bill",
    "url": "https://www.canada.ca/en/canadian-heritage/services/online-harms.html",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Canada",
    "reliabilityTier": 5,
    "description": "Bill C-63 died on Order Paper January 2025. New legislation expected. Timeout on fetch but known valid .gc.ca URL."
  },
  {
    "id": "doj-canada-bill-c-63-charter-statement",
    "name": "DOJ Canada — Bill C-63 Charter Statement",
    "url": "https://www.justice.gc.ca/eng/csj-sjc/pl/charter-charte/c63.html",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Canada",
    "reliabilityTier": 5,
    "description": "Charter analysis of Online Harms Act provisions."
  },
  {
    "id": "opc-canada-issue-sheets-on-bill-s-210",
    "name": "OPC Canada — Issue Sheets on Bill S-210",
    "url": "https://www.priv.gc.ca/en/privacy-and-transparency-at-the-opc/proactive-disclosure/opc-parl-bp/secu_20240527/is_20240527/?id=7777-6-642162",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Canada",
    "reliabilityTier": 5,
    "description": "Comparison of S-210, C-63, and C-27 re: children's data. Verified 200 OK."
  },
  {
    "id": "canadian-centre-for-child-protection-age-verification",
    "name": "Canadian Centre for Child Protection — Age Verification",
    "url": "https://www.protectchildren.ca/en/press-and-media/blog/2024/online-harms-bill-age-verification",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Canada",
    "reliabilityTier": 4,
    "description": "Advocacy for legislated age assurance in Online Harms Act."
  },
  {
    "id": "china-law-translate-regulations-on-protection-of-minors-online",
    "name": "China Law Translate — Regulations on Protection of Minors Online",
    "url": "https://www.chinalawtranslate.com/en/online-protection-of-minors/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "China",
    "reliabilityTier": 4,
    "description": "Full English translation. In effect January 1, 2024. Verified 200 OK."
  },
  {
    "id": "china-law-translate-minors-online-protection-overview",
    "name": "China Law Translate — Minors Online Protection Overview",
    "url": "https://www.chinalawtranslate.com/en/overview-of-protections-for-minors-online/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "China",
    "reliabilityTier": 4,
    "description": "Comparison table of all Chinese children's online protection regulations."
  },
  {
    "id": "singapore-pdpc-children-s-data-guidelines",
    "name": "Singapore PDPC — Children's Data Guidelines",
    "url": "https://www.pdpc.gov.sg/guidelines-and-consultation/2024/03/advisory-guidelines-on-the-pdpa-for-childrens-personal-data-in-the-digital-environment",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Singapore",
    "reliabilityTier": 5,
    "description": "Issued March 28, 2024. Clarifies PDPA application to children's data in digital environment. Verified 200 OK."
  },
  {
    "id": "singapore-pdpc-advisory-guidelines-pdf",
    "name": "Singapore PDPC — Advisory Guidelines PDF",
    "url": "https://www.pdpc.gov.sg/-/media/files/pdpc/pdf-files/advisory-guidelines/advisory-guidelines-on-the-pdpa-for-children's-personal-data-in-the-digital-environment_mar24.pdf",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Singapore",
    "reliabilityTier": 5,
    "description": "Full PDF version of the guidelines."
  },
  {
    "id": "klri-south-korea-youth-protection-act",
    "name": "KLRI — South Korea Youth Protection Act",
    "url": "https://elaw.klri.re.kr/eng_service/lawView.do?hseq=38401&lang=ENG",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "South Korea",
    "reliabilityTier": 5,
    "description": "Full English translation. Shutdown law (gaming curfew for under-16s) repealed 2022; new provisions in force. Verified 200 OK."
  },
  {
    "id": "k-s-partners-children-s-data-under-dpdp-act-2023-and-rules-2025",
    "name": "K&S Partners — Children's Data Under DPDP Act 2023 and Rules 2025",
    "url": "https://ksandk.com/data-protection-and-data-privacy/childrens-data-protection-under-indias-dpdp-rules/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "India",
    "reliabilityTier": 3,
    "description": "Analysis of Rules 10-12 covering parental consent, prohibitions on tracking and targeted ads for under-18s."
  },
  {
    "id": "observer-research-foundation-dpdp-rules-child-data-safety",
    "name": "Observer Research Foundation — DPDP Rules Child Data Safety",
    "url": "https://www.orfonline.org/expert-speak/dpdp-rules-and-the-future-of-child-data-safety",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "India",
    "reliabilityTier": 3,
    "description": "Expert analysis of implementation challenges for India's child data protections."
  },
  {
    "id": "a-o-shearman-children-s-data-privacy-trends-across-apac",
    "name": "A&O Shearman — Children's Data Privacy Trends Across APAC",
    "url": "https://www.aoshearman.com/en/insights/ao-shearman-on-data/navigating-consent-emerging-trends-in-childrens-data-privacy-across-apac",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "APAC",
    "reliabilityTier": 4,
    "description": "Covers Singapore, Japan, Philippines, Thailand, and others. September 2025."
  },
  {
    "id": "covington-brazil-adopts-law-protecting-minors-online",
    "name": "Covington — Brazil Adopts Law Protecting Minors Online",
    "url": "https://www.insideprivacy.com/childrens-privacy/brazil-adopts-law-protecting-minors-online/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Brazil",
    "reliabilityTier": 4,
    "description": "ECA Digital law signed September 2025. Comprehensive children's online protection. Applies regardless of where product developed."
  },
  {
    "id": "iapp-inside-brazil-s-child-online-safety-bill",
    "name": "IAPP — Inside Brazil's Child Online Safety Bill",
    "url": "https://iapp.org/news/a/inside-brazil-s-child-online-safety-bill",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Brazil",
    "reliabilityTier": 4,
    "description": "Analysis of Bill 2628/2022 establishing safeguards for children in digital environments."
  },
  {
    "id": "hrw-brazil-passes-landmark-law-to-protect-children-online",
    "name": "HRW — Brazil Passes Landmark Law to Protect Children Online",
    "url": "https://www.hrw.org/news/2025/09/17/brazil-passes-landmark-law-to-protect-children-online",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Brazil",
    "reliabilityTier": 3,
    "description": "Independent analysis of Brazil's children's online safety law."
  },
  {
    "id": "future-of-privacy-forum-latam-dpa-report-2024",
    "name": "Future of Privacy Forum — LatAm DPA Report 2024",
    "url": "https://fpf.org/wp-content/uploads/2024/05/Final-_-LatAm-DPA-Report-_-2024.pdf",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "Latin America",
    "reliabilityTier": 3,
    "description": "Covers ANPD Brazil, Argentina, Colombia, Mexico, Chile enforcement and inspections."
  },
  {
    "id": "dla-piper-data-protection-laws-south-africa",
    "name": "DLA Piper — Data Protection Laws: South Africa",
    "url": "https://www.dlapiperdataprotection.com/index.html?t=law&c=ZA",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "South Africa",
    "reliabilityTier": 4,
    "description": "POPIA regulates processing of personal information for natural and legal persons. Children's data subject to additional protections."
  },
  {
    "id": "africa-hr-data-protection-laws-across-africa",
    "name": "Africa HR — Data Protection Laws Across Africa",
    "url": "https://africa-hr.com/blog/data-laws-across-africa/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "Africa",
    "reliabilityTier": 3,
    "description": "Covers South Africa POPIA, Nigeria NDPA, Kenya DPA, Ghana, Morocco. September 2025."
  },
  {
    "id": "al-tamimi-african-nations-data-protection-roundup",
    "name": "Al Tamimi — African Nations Data Protection Roundup",
    "url": "https://www.tamimi.com/law-update-articles/african-nations-apply-the-gold-standard-of-data-protection-a-round-up/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "Africa & Middle East",
    "reliabilityTier": 4,
    "description": "Covers South Africa POPIA, Kenya DPA 2019, and Middle Eastern jurisdictions."
  },
  {
    "id": "secure-privacy-uae-data-protection-law-guide",
    "name": "Secure Privacy — UAE Data Protection Law Guide",
    "url": "https://secureprivacy.ai/blog/uae-data-protection-law-guide",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "UAE",
    "reliabilityTier": 3,
    "description": "Comprehensive guide covering UAE PDPL, DIFC DPA. Includes children's data provisions."
  },
  {
    "id": "secure-privacy-nigeria-data-protection-law-guide",
    "name": "Secure Privacy — Nigeria Data Protection Law Guide",
    "url": "https://secureprivacy.ai/blog/nigeria-data-protection-law",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Nigeria",
    "reliabilityTier": 3,
    "description": "Nigeria Data Protection Act 2023 compliance guide."
  },
  {
    "id": "un-child-and-youth-safety-online",
    "name": "UN — Child and Youth Safety Online",
    "url": "https://www.un.org/en/global-issues/child-and-youth-safety-online",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 5,
    "description": "Links to ITU guidelines, UNICEF reports, and global initiatives. Verified 200 OK."
  },
  {
    "id": "itu-cop-guidelines",
    "name": "ITU COP Guidelines",
    "url": "https://www.itu-cop-guidelines.com/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 5,
    "description": "Comprehensive guidelines for all stakeholders. Training modules and resources. Verified 200 OK."
  },
  {
    "id": "unicef-industry-guidelines-for-child-online-protection",
    "name": "UNICEF — Industry Guidelines for Child Online Protection",
    "url": "https://www.unicef.org/documents/guidelines-industry-online-child-protection",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 5,
    "description": "ITU/UNICEF joint guidelines. Cloudflare-protected (403 on fetch) but known valid unicef.org URL."
  },
  {
    "id": "unicef-innocenti-digital-citizens-research",
    "name": "UNICEF Innocenti — Digital Citizens Research",
    "url": "https://www.unicef.org/innocenti/stories/protecting-young-digital-citizens",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 5,
    "description": "Research on children's privacy with CNIL, EDPB, GPA, Council of Europe, UNESCO, OECD."
  },
  {
    "id": "oecd-digital-safety-by-design-for-children",
    "name": "OECD — Digital Safety by Design for Children",
    "url": "https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/06/towards-digital-safety-by-design-for-children_f1c86498/c167b650-en.pdf",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 5,
    "description": "2024 report on safety-by-design approaches. References Council of Europe guidelines."
  },
  {
    "id": "oecd-protecting-children-online-report",
    "name": "OECD — Protecting Children Online Report",
    "url": "https://www.oecd.org/content/dam/oecd/en/publications/reports/2020/06/protecting-children-online_0c385619/9e0e49a9-en.pdf",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 5,
    "description": "Analysis of risks since 2012 OECD Council Recommendation on Protection of Children Online."
  },
  {
    "id": "5rights-foundation-home",
    "name": "5Rights Foundation — Home",
    "url": "https://5rightsfoundation.com/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 3,
    "description": "Leading NGO for children's digital rights. Advocated for DSA, AADC, and UK Online Safety Act. Verified 200 OK."
  },
  {
    "id": "5rights-research-portal",
    "name": "5Rights — Research Portal",
    "url": "https://5rightsfoundation.com/our-work/research/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 3,
    "description": "Joint LSE/5Rights Digital Futures for Children centre."
  },
  {
    "id": "5rights-child-online-safety-toolkit",
    "name": "5Rights — Child Online Safety Toolkit",
    "url": "https://5rightsfoundation.com/in-action/making-child-online-safety-a-reality-global-toolkit-launched.html",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 3,
    "description": "Policymaker toolkit for building safe & inclusive digital world. Launched January 2025."
  },
  {
    "id": "epic-electronic-privacy-information-center-children-s-privacy",
    "name": "EPIC — Electronic Privacy Information Center: Children's Privacy",
    "url": "https://epic.org/issues/data-protection/childrens-privacy/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Major COPPA advocacy organization. Cloudflare-protected (403 on fetch) but known valid epic.org URL."
  },
  {
    "id": "cdt-the-kids-are-online-child-safety-policy-insights",
    "name": "CDT — The Kids Are Online: Child Safety Policy Insights",
    "url": "https://cdt.org/insights/the-kids-are-online-research-driven-insights-on-child-safety-policy/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Research symposium report on children's online safety policy (September 2024). Cloudflare-protected (403 on fetch) but known valid cdt.org URL."
  },
  {
    "id": "common-sense-home",
    "name": "Common Sense — Home",
    "url": "https://www.commonsense.org/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Research-based guidance for families. Major advocate for children's privacy legislation. Verified 200 OK."
  },
  {
    "id": "center-for-humane-technology-youth-consequences",
    "name": "Center for Humane Technology — Youth Consequences",
    "url": "https://www.humanetech.com/youth/seeing-the-consequences",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Research on persuasive technology harms to youth. Verified 200 OK."
  },
  {
    "id": "center-for-humane-technology-ledger-of-harms",
    "name": "Center for Humane Technology — Ledger of Harms",
    "url": "https://ledger.humanetech.com/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Documented negative effects of technology on society including children. Verified 200 OK."
  },
  {
    "id": "ncmec-home",
    "name": "NCMEC — Home",
    "url": "https://www.missingkids.org/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Operates CyberTipline. 32M+ reports analyzed annually. Verified 200 OK."
  },
  {
    "id": "iwf-online-safety-act-explained",
    "name": "IWF — Online Safety Act Explained",
    "url": "https://www.iwf.org.uk/policy-work/the-online-safety-act-osa-explained/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United Kingdom",
    "reliabilityTier": 4,
    "description": "UK-based. Focuses on CSAM removal. Active on OSA implementation. Verified 200 OK."
  },
  {
    "id": "weprotect-global-threat-assessment",
    "name": "WeProtect — Global Threat Assessment",
    "url": "https://www.weprotect.org/global-threat-assessment-23/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "Multi-stakeholder alliance. Annual threat assessment on child sexual exploitation online. Verified 200 OK."
  },
  {
    "id": "fpf-youth-privacy",
    "name": "FPF — Youth Privacy",
    "url": "https://fpf.org/issue/education/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Research on children's privacy, education technology, and policy. Verified 200 OK."
  },
  {
    "id": "cipl-protecting-children-s-data-privacy",
    "name": "CIPL — Protecting Children's Data Privacy",
    "url": "https://www.informationpolicycentre.com/protecting-childrens-data-privacy.html",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 3,
    "description": "Tracks ICO, DPC, CNIL, and global initiatives for children's data protection."
  },
  {
    "id": "icmec",
    "name": "ICMEC",
    "url": "https://www.icmec.org/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "Global coalition for child online safety with IWF, NCMEC, WeProtect, Thorn, ECPAT."
  },
  {
    "id": "iapp-children-s-privacy-resources",
    "name": "IAPP — Children's Privacy Resources",
    "url": "https://iapp.org/resources/topics/childrens-privacy/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "URL returned 404 on fetch (new site structure); search confirms content exists. Use https://iapp.org/resources/ and filter by children's privacy."
  },
  {
    "id": "dataguidance-global-privacy-regulatory-research",
    "name": "DataGuidance — Global Privacy & Regulatory Research",
    "url": "https://www.dataguidance.com",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "Essential regulatory research platform. Per-jurisdiction profiles. Verified 200 OK."
  },
  {
    "id": "dla-piper-data-protection-laws-of-the-world-2025",
    "name": "DLA Piper — Data Protection Laws of the World (2025)",
    "url": "https://www.dlapiperdataprotection.com/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "Interactive heatmap and jurisdiction-by-jurisdiction handbook. Verified 200 OK."
  },
  {
    "id": "dla-piper-privacy-matters-blog",
    "name": "DLA Piper — Privacy Matters Blog",
    "url": "https://privacymatters.dlapiper.com/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "Active blog covering children's data developments globally (including China CAC reporting)."
  },
  {
    "id": "norton-rose-fulbright-data-protection-report",
    "name": "Norton Rose Fulbright — Data Protection Report",
    "url": "https://www.dataprotectionreport.com/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "Thought leadership on emerging privacy, data protection, and cybersecurity. Verified 200 OK."
  },
  {
    "id": "nrf-singapore-children-s-personal-data-in-digital-environment",
    "name": "NRF — Singapore Children's Personal Data in Digital Environment",
    "url": "https://www.nortonrosefulbright.com/en/knowledge/publications/9a61f19c/the-protection-of-childrens-personal-data-in-the-digital-environment",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Singapore",
    "reliabilityTier": 4,
    "description": "Analysis of PDPC Advisory Guidelines."
  },
  {
    "id": "gdprhub-data-protection-in-belgium",
    "name": "GDPRhub — Data Protection in Belgium",
    "url": "https://gdprhub.eu/Data_Protection_in_Belgium",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Belgium",
    "reliabilityTier": 3,
    "description": "Age of consent is 13 in Belgium. Case law database for APD/GBA decisions involving minors."
  },
  {
    "id": "gdprhub-data-protection-in-the-netherlands",
    "name": "GDPRhub — Data Protection in the Netherlands",
    "url": "https://gdprhub.eu/Data_Protection_in_the_Netherlands",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "Netherlands",
    "reliabilityTier": 3,
    "description": "Age of consent is 16 in Netherlands (UAVG Article 5)."
  },
  {
    "id": "hunton-ftc-coppa-rule-final-amendments",
    "name": "Hunton — FTC COPPA Rule Final Amendments",
    "url": "https://www.hunton.com/privacy-and-information-security-law/ftc-publishes-final-coppa-rule-amendments",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Detailed analysis. Effective June 21, 2025; compliance deadline April 22, 2026."
  },
  {
    "id": "hunton-china-draft-measures-for-identifying-platforms-subject-to-minors",
    "name": "Hunton — China Draft Measures for Identifying Platforms Subject to Minors Regulations",
    "url": "https://www.hunton.com/privacy-and-information-security-law/china-issued-draft-rules-for-identifying-online-service-providers-subject-to-the-regulations-on-the-protection-of-minors-online",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "China",
    "reliabilityTier": 4,
    "description": "CAC Draft Measures September 2025 for identifying platforms with substantial minor users."
  },
  {
    "id": "hunton-arkansas-amends-social-media-safety-act",
    "name": "Hunton — Arkansas Amends Social Media Safety Act",
    "url": "https://www.hunton.com/privacy-and-information-security-law/arkansas-amends-social-media-safety-act-following-permanent-injunction-by-federal-court",
    "type": "html",
    "authorityType": "state",
    "jurisdictionCountry": "United States",
    "jurisdictionState": "Arkansas",
    "reliabilityTier": 4,
    "description": "SB 611 amending Act after injunction. Age scope narrowed to under-16."
  },
  {
    "id": "byte-back-law-state-privacy-law-tracker",
    "name": "Byte Back Law — State Privacy Law Tracker",
    "url": "https://www.bytebacklaw.com/2025/01/proposed-state-privacy-law-update-january-20-2025/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Rolling tracker of proposed state privacy bills including children's provisions."
  },
  {
    "id": "mayer-brown-state-privacy-law-updates-children-focus",
    "name": "Mayer Brown — State Privacy Law Updates (Children Focus)",
    "url": "https://www.mayerbrown.com/en/insights/publications/2025/10/2025-mid-year-review-us-state-privacy-law-updates-part-2",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 4,
    "description": "Covers CT, MD, NE, VT AADC-style laws; MN, NM, NY proposals."
  },
  {
    "id": "google-news-rss-children-online-safety-regulation",
    "name": "Google News RSS — Children Online Safety Regulation",
    "url": "https://news.google.com/rss/search?q=%22children+online+safety%22+regulation&hl=en-US&gl=US&ceid=US:en",
    "type": "rss",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 2,
    "description": "Auto-updating RSS feed. Add to feed reader for monitoring."
  },
  {
    "id": "google-news-rss-social-media-kids-law",
    "name": "Google News RSS — Social Media Kids Law",
    "url": "https://news.google.com/rss/search?q=%22social+media%22+%22kids%22+law&hl=en-US&gl=US&ceid=US:en",
    "type": "rss",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 2,
    "description": "Auto-updating RSS feed for social media children's legislation news."
  },
  {
    "id": "google-news-rss-coppa-regulation",
    "name": "Google News RSS — COPPA Regulation",
    "url": "https://news.google.com/rss/search?q=COPPA+regulation&hl=en-US&gl=US&ceid=US:en",
    "type": "rss",
    "authorityType": "supranational",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 2,
    "description": "COPPA-specific news feed."
  },
  {
    "id": "google-news-rss-teen-online-safety",
    "name": "Google News RSS — Teen Online Safety",
    "url": "https://news.google.com/rss/search?q=%22teen+online+safety%22&hl=en-US&gl=US&ceid=US:en",
    "type": "rss",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 2,
    "description": "Broader coverage of teen safety topics."
  },
  {
    "id": "google-news-rss-children-data-protection-gdpr",
    "name": "Google News RSS — Children Data Protection GDPR",
    "url": "https://news.google.com/rss/search?q=%22children%22+%22data+protection%22+GDPR&hl=en-US&gl=US&ceid=US:en",
    "type": "rss",
    "authorityType": "supranational",
    "jurisdictionCountry": "European Union",
    "reliabilityTier": 2,
    "description": "EU-focused children's data protection news."
  },
  {
    "id": "google-news-rss-meta-children-safety",
    "name": "Google News RSS — Meta Children Safety",
    "url": "https://news.google.com/rss/search?q=Meta+children+safety&hl=en-US&gl=US&ceid=US:en",
    "type": "rss",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 2,
    "description": "Meta-specific children's safety news. Critical for competitive intelligence."
  },
  {
    "id": "reuters-global-children-s-social-media-legislation-tracker",
    "name": "Reuters — Global Children's Social Media Legislation Tracker",
    "url": "https://www.reuters.com/world/asia-pacific/australia-europe-countries-move-curb-childrens-social-media-access-2026-02-17/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 3,
    "description": "Feb 2026 overview of global legislative developments."
  },
  {
    "id": "techpolicy-press-what-to-expect-from-us-states-in-2026",
    "name": "TechPolicy.Press — What to Expect from US States in 2026",
    "url": "https://www.techpolicy.press/what-to-expect-from-us-states-on-child-online-safety-in-2026/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "Expert roundtable on 2026 state legislative outlook. January 2026."
  },
  {
    "id": "tiktok-children-s-privacy-policy-global",
    "name": "TikTok — Children's Privacy Policy (Global)",
    "url": "https://www.tiktok.com/legal/page/global/childrens-privacy-policy/en",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 3,
    "description": "Under 13 policy (US). Under 13 \"Restricted Mode\" globally. Updated October 2024."
  },
  {
    "id": "washington-post-meta-tiktok-snap-agree-to-teen-safety-ratings",
    "name": "Washington Post — Meta, TikTok, Snap Agree to Teen Safety Ratings",
    "url": "https://www.washingtonpost.com/technology/2026/02/10/meta-tiktok-snap-teen-safety/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "United States",
    "reliabilityTier": 3,
    "description": "February 2026. Three companies agree to independent mental health assessments for teen users."
  },
  {
    "id": "itif-china-s-minor-mode-blueprint-or-cautionary-tale",
    "name": "ITIF — China's Minor Mode: Blueprint or Cautionary Tale?",
    "url": "https://itif.org/publications/2025/05/09/chinas-minors-mode-blueprint-or-cautionary-tale/",
    "type": "html",
    "authorityType": "national",
    "jurisdictionCountry": "China",
    "reliabilityTier": 3,
    "description": "Analysis of China's CAC \"minor mode\" requirements launched April 2025."
  },
  {
    "id": "fiscalnote-integrating-australia-s-age-restriction-into-global-complianc",
    "name": "FiscalNote — Integrating Australia's Age Restriction into Global Compliance",
    "url": "https://fiscalnote.com/blog/beyond-the-ban-integrating-australias-social-media-age-restriction-into-global-compliance-strategy",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "Australia",
    "reliabilityTier": 3,
    "description": "Strategic compliance guide for ARSMPs. January 2026."
  },
  {
    "id": "covington-global-privacy-regulators-launch-enforcement-sweep-on-children",
    "name": "Covington — Global Privacy Regulators Launch Enforcement Sweep on Children's Data",
    "url": "https://www.insideprivacy.com/childrens-privacy/global-privacy-regulators-launch-enforcement-sweep-focused-on-childrens-data-protection/",
    "type": "html",
    "authorityType": "supranational",
    "jurisdictionCountry": "International",
    "reliabilityTier": 4,
    "description": "November 2025. GPEN members including FTC, CA AG, CPPA, ICO, CNIL, DPC coordinated enforcement sweep."
  }
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
