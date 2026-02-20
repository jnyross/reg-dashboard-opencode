import crypto from "node:crypto";
import DatabaseConstructor from "better-sqlite3";
import { sources, twitterSearchSources, RegulatorySource } from "./sources";
import { crawlSource, CrawledItem } from "./crawler";
import { analyzeItem } from "./analyzer";
import { upsertSource, upsertAnalyzedItem } from "./db";

export interface PipelineResult {
  sourcesProcessed: number;
  itemsCrawled: number;
  itemsAnalyzed: number;
  itemsSaved: number;
  errors: string[];
  startedAt: string;
  completedAt: string;
}

interface CrawledBundle {
  source: RegulatorySource;
  sourceDbId: number;
  items: CrawledItem[];
}

function normalizeForHash(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function hashText(value: string): string {
  return crypto.createHash("sha1").update(normalizeForHash(value)).digest("hex");
}

function buildRegulationKey(country: string, state: string | undefined, title: string): string {
  return [normalizeForHash(country || "unknown"), normalizeForHash(state || ""), normalizeForHash(title || "untitled")].join("|");
}

function buildDeduplicationKey(item: CrawledItem, jurisdictionCountry: string, jurisdictionState: string | undefined): string {
  const regulationKey = buildRegulationKey(jurisdictionCountry, jurisdictionState, item.title);
  const normalizedUrl = item.url.trim().toLowerCase();
  const textHash = hashText(item.content || item.title);
  const identity = normalizedUrl || `text:${textHash}`;
  return `${regulationKey}::${identity}`;
}

export async function runPipeline(
  db: DatabaseConstructor.Database,
  sourceIds?: string[]
): Promise<PipelineResult> {
  const result: PipelineResult = {
    sourcesProcessed: 0,
    itemsCrawled: 0,
    itemsAnalyzed: 0,
    itemsSaved: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    completedAt: "",
  };

  const allSources = [...sources, ...twitterSearchSources];
  const targetSources = sourceIds
    ? allSources.filter((s) => sourceIds.includes(s.id))
    : allSources;

  const crawlConcurrency = Math.max(1, Number(process.env.CRAWL_CONCURRENCY || 10));
  const analysisConcurrency = Math.max(1, Math.min(20, Number(process.env.ANALYSIS_CONCURRENCY || 12)));

  console.log(`Starting pipeline for ${targetSources.length} sources...`);
  console.log(`Crawl concurrency: ${crawlConcurrency}, analysis concurrency: ${analysisConcurrency}`);

  const crawledBundles: CrawledBundle[] = [];

  // Phase 1: crawl all sources in batches
  for (let i = 0; i < targetSources.length; i += crawlConcurrency) {
    const batch = targetSources.slice(i, i + crawlConcurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (source, batchIdx) => {
        const sourceIndex = i + batchIdx + 1;
        console.log(`[${sourceIndex}/${targetSources.length}] Crawling: ${source.name}...`);
        const crawlResult = await crawlSource(source);
        return { source, crawlResult };
      })
    );

    for (const batchResult of batchResults) {
      if (batchResult.status === "rejected") {
        result.errors.push(`Crawl error: ${String(batchResult.reason).slice(0, 200)}`);
        continue;
      }

      const { source, crawlResult } = batchResult.value;
      const sourceDbId = upsertSource(db, {
        sourceId: source.id,
        name: source.name,
        url: source.url,
        authorityType: source.authorityType,
        jurisdictionCountry: source.jurisdictionCountry,
        jurisdictionState: source.jurisdictionState,
        reliabilityTier: source.reliabilityTier,
        description: source.description,
      });

      result.sourcesProcessed += 1;
      result.itemsCrawled += crawlResult.items.length;

      if (crawlResult.errors.length > 0) {
        result.errors.push(...crawlResult.errors.map((e) => `${source.name}: ${e}`));
      }

      if (crawlResult.items.length > 0) {
        crawledBundles.push({ source, sourceDbId, items: crawlResult.items });
        console.log(`  ✓ ${source.name}: ${crawlResult.items.length} items`);
      } else {
        console.log(`  ✗ ${source.name}: 0 items`);
      }
    }
  }

  const analysisQueue = crawledBundles.flatMap((bundle) =>
    bundle.items.map((item) => ({ item, source: bundle.source, sourceDbId: bundle.sourceDbId }))
  );

  const totalItems = analysisQueue.length;
  const seenDeduplicationKeys = new Set<string>();

  console.log(`\nCrawl complete: ${result.itemsCrawled} items from ${result.sourcesProcessed} sources`);
  console.log(`Now analyzing ${totalItems} items with MiniMax M2.5...\n`);

  // Phase 2: analyze all crawled items with global concurrency
  let queueIndex = 0;

  const workers = Array.from(
    { length: Math.min(analysisConcurrency, Math.max(1, totalItems)) },
    async () => {
      while (true) {
        const currentIndex = queueIndex++;
        if (currentIndex >= totalItems) break;

        const { item, source, sourceDbId } = analysisQueue[currentIndex];

        try {
          console.log(`  [${currentIndex + 1}/${totalItems}] Analyzing: ${item.title.slice(0, 70)}...`);
          const analyzed = await analyzeItem(item);
          analyzed.sourceId = sourceDbId.toString();
          result.itemsAnalyzed += 1;

          if (analyzed.isRelevant) {
            const deduplicationKey = buildDeduplicationKey(
              item,
              analyzed.jurisdictionCountry,
              analyzed.jurisdictionState,
            );

            if (seenDeduplicationKeys.has(deduplicationKey)) {
              console.log("    → Skipped (duplicate URL/text/regulation key)");
              continue;
            }
            seenDeduplicationKeys.add(deduplicationKey);

            const saveResult = upsertAnalyzedItem(db, analyzed, source.reliabilityTier);
            result.itemsSaved += 1;
            console.log(
              `    → Saved: ${item.title.slice(0, 60)}${saveResult.statusChanged ? " [STATUS CHANGED]" : ""}`
            );
          } else {
            console.log("    → Skipped (not relevant)");
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Analysis error (${source.name}): ${msg}`);
          console.log(`    → Error: ${msg.slice(0, 120)}`);
        }
      }
    }
  );

  await Promise.all(workers);

  result.completedAt = new Date().toISOString();
  console.log(`Pipeline complete: ${result.itemsSaved} items saved`);

  return result;
}
