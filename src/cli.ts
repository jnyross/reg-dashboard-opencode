import { openDatabase, initializeSchema } from "./db";
import { runPipeline } from "./pipeline";

const DATABASE_PATH = process.env.DATABASE_PATH;
const sourceIds = process.argv.slice(2);

const db = openDatabase(DATABASE_PATH);
initializeSchema(db);

console.log("Starting crawl pipeline...");
console.log(`Sources: ${sourceIds.length > 0 ? sourceIds.join(", ") : "all"}`);

runPipeline(db, sourceIds.length > 0 ? sourceIds : undefined)
  .then((result) => {
    console.log("\n=== Pipeline Results ===");
    console.log(`Sources processed: ${result.sourcesProcessed}`);
    console.log(`Items crawled: ${result.itemsCrawled}`);
    console.log(`Items analyzed: ${result.itemsAnalyzed}`);
    console.log(`Items saved: ${result.itemsSaved}`);
    if (result.errors.length > 0) {
      console.log("\n=== Errors ===");
      result.errors.forEach((e) => console.log(`  - ${e}`));
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("Pipeline failed:", error);
    process.exit(1);
  });
