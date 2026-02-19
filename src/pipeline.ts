import DatabaseConstructor from "better-sqlite3";
import { sources, getSourceById } from "./sources";
import { crawlSource, crawlAllSources, CrawlResult } from "./crawler";
import { analyzeItem, AnalyzedItem } from "./analyzer";
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

  const targetSources = sourceIds
    ? sources.filter((s) => sourceIds.includes(s.id))
    : sources;

  console.log(`Starting pipeline for ${targetSources.length} sources...`);

  for (const source of targetSources) {
    try {
      console.log(`Crawling source: ${source.name}...`);
      
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

      const crawlResult: CrawlResult = await crawlSource(source);
      result.sourcesProcessed++;
      result.itemsCrawled += crawlResult.items.length;

      if (crawlResult.errors.length > 0) {
        result.errors.push(...crawlResult.errors.map((e) => `${source.name}: ${e}`));
      }

      console.log(`  Found ${crawlResult.items.length} items to analyze`);
      for (let idx = 0; idx < crawlResult.items.length; idx++) {
        const item = crawlResult.items[idx];
        try {
          console.log(`  [${idx+1}/${crawlResult.items.length}] Analyzing: ${item.title.slice(0, 70)}...`);
          const analyzed = await analyzeItem(item);
          analyzed.sourceId = sourceDbId.toString();
          result.itemsAnalyzed++;

          if (analyzed.isRelevant) {
            const saveResult = upsertAnalyzedItem(db, analyzed, source.reliabilityTier);
            result.itemsSaved++;
            console.log(`    → Saved (relevant)${saveResult.statusChanged ? ' [STATUS CHANGED]' : ''}`);
          } else {
            console.log(`    → Skipped (not relevant)`);
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Analysis error (${source.name}): ${msg}`);
          console.log(`    → Error: ${msg.slice(0, 100)}`);
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      result.errors.push(`Source error (${source.name}): ${msg}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  result.completedAt = new Date().toISOString();
  console.log(`Pipeline complete: ${result.itemsSaved} items saved`);

  return result;
}
