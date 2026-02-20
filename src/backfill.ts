import DatabaseConstructor from "better-sqlite3";
import { deriveRiskScores, resolveCanonicalJurisdiction } from "./analyzer";
import { sources, twitterSearchSources } from "./sources";

export interface BackfillResult {
  scanned: number;
  updated: number;
  riskUpdated: number;
  jurisdictionUpdated: number;
  unknownBefore: number;
  unknownAfter: number;
  highRiskBefore: number;
  highRiskAfter: number;
}

type EventBackfillRow = {
  id: string;
  title: string;
  summary: string | null;
  business_impact: string | null;
  raw_content: string | null;
  source_url: string | null;
  stage: string;
  age_bracket: string;
  impact_score: number;
  likelihood_score: number;
  confidence_score: number;
  chili_score: number;
  jurisdiction_country: string;
  jurisdiction_state: string | null;
  source_country: string | null;
  source_state: string | null;
};

type SourceJurisdiction = {
  country: string;
  state?: string;
};

function getHost(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function buildSourceHostMap(): Map<string, SourceJurisdiction> {
  const map = new Map<string, SourceJurisdiction>();
  for (const source of [...sources, ...twitterSearchSources]) {
    const host = getHost(source.url);
    if (!host) continue;
    map.set(host, {
      country: source.jurisdictionCountry,
      state: source.jurisdictionState,
    });
  }
  return map;
}

function findSourceFallback(hostMap: Map<string, SourceJurisdiction>, sourceUrl: string | null): SourceJurisdiction | undefined {
  if (!sourceUrl) return undefined;
  const host = getHost(sourceUrl);
  if (!host) return undefined;

  if (hostMap.has(host)) {
    return hostMap.get(host);
  }

  const hostParts = host.split(".");
  for (let i = 1; i < hostParts.length - 1; i += 1) {
    const candidate = hostParts.slice(i).join(".");
    if (hostMap.has(candidate)) {
      return hostMap.get(candidate);
    }
  }

  return undefined;
}

function readMetrics(db: DatabaseConstructor.Database): {
  unknown: number;
  highRisk: number;
} {
  const row = db
    .prepare(
      `
      SELECT
        SUM(CASE WHEN jurisdiction_country = 'Unknown' THEN 1 ELSE 0 END) AS unknownCount,
        SUM(CASE WHEN chili_score >= 4 THEN 1 ELSE 0 END) AS highRiskCount
      FROM regulation_events
    `,
    )
    .get() as { unknownCount: number | null; highRiskCount: number | null };

  return {
    unknown: Number(row.unknownCount || 0),
    highRisk: Number(row.highRiskCount || 0),
  };
}

export function backfillEventRiskAndJurisdiction(db: DatabaseConstructor.Database): BackfillResult {
  const before = readMetrics(db);
  const hostMap = buildSourceHostMap();

  const rows = db
    .prepare(
      `
      SELECT
        e.id,
        e.title,
        e.summary,
        e.business_impact,
        e.raw_content,
        e.source_url,
        e.stage,
        e.age_bracket,
        e.impact_score,
        e.likelihood_score,
        e.confidence_score,
        e.chili_score,
        e.jurisdiction_country,
        e.jurisdiction_state,
        s.jurisdiction_country AS source_country,
        s.jurisdiction_state AS source_state
      FROM regulation_events e
      LEFT JOIN sources s ON s.id = e.source_id
    `,
    )
    .all() as EventBackfillRow[];

  const update = db.prepare(
    `
      UPDATE regulation_events
      SET
        jurisdiction_country = ?,
        jurisdiction_state = ?,
        impact_score = ?,
        likelihood_score = ?,
        confidence_score = ?,
        chili_score = ?,
        updated_at = ?
      WHERE id = ?
    `,
  );

  let updated = 0;
  let riskUpdated = 0;
  let jurisdictionUpdated = 0;
  const now = new Date().toISOString();

  const tx = db.transaction((workRows: EventBackfillRow[]) => {
    for (const row of workRows) {
      const fallbackFromHost = findSourceFallback(hostMap, row.source_url);
      const normalizedJurisdiction = resolveCanonicalJurisdiction({
        text: [row.title, row.summary || "", row.business_impact || "", row.raw_content || ""].join("\n"),
        url: row.source_url || undefined,
        hintedCountry: row.jurisdiction_country,
        hintedState: row.jurisdiction_state || undefined,
        sourceCountry: row.source_country || fallbackFromHost?.country,
        sourceState: row.source_state || fallbackFromHost?.state,
      });

      const risk = deriveRiskScores({
        text: [row.title, row.summary || "", row.business_impact || "", row.raw_content || ""].join("\n"),
        stage: row.stage,
        ageBracket: row.age_bracket,
        isRelevant: true,
        baseImpact: row.impact_score,
        baseLikelihood: row.likelihood_score,
        baseConfidence: row.confidence_score,
        baseChili: row.chili_score,
      });

      const jurisdictionChanged =
        row.jurisdiction_country !== normalizedJurisdiction.country ||
        (row.jurisdiction_state || null) !== (normalizedJurisdiction.state || null);

      const riskChanged =
        row.impact_score !== risk.impactScore ||
        row.likelihood_score !== risk.likelihoodScore ||
        row.confidence_score !== risk.confidenceScore ||
        row.chili_score !== risk.chiliScore;

      if (!jurisdictionChanged && !riskChanged) {
        continue;
      }

      update.run(
        normalizedJurisdiction.country,
        normalizedJurisdiction.state || null,
        risk.impactScore,
        risk.likelihoodScore,
        risk.confidenceScore,
        risk.chiliScore,
        now,
        row.id,
      );

      updated += 1;
      if (jurisdictionChanged) jurisdictionUpdated += 1;
      if (riskChanged) riskUpdated += 1;
    }
  });

  tx(rows);

  const after = readMetrics(db);

  return {
    scanned: rows.length,
    updated,
    riskUpdated,
    jurisdictionUpdated,
    unknownBefore: before.unknown,
    unknownAfter: after.unknown,
    highRiskBefore: before.highRisk,
    highRiskAfter: after.highRisk,
  };
}
