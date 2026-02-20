"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const pipeline_1 = require("./pipeline");
const DATABASE_PATH = process.env.DATABASE_PATH;
const sourceIds = process.argv.slice(2);
const db = (0, db_1.openDatabase)(DATABASE_PATH);
(0, db_1.initializeSchema)(db);
console.log("Starting crawl pipeline...");
console.log(`Sources: ${sourceIds.length > 0 ? sourceIds.join(", ") : "all"}`);
(0, pipeline_1.runPipeline)(db, sourceIds.length > 0 ? sourceIds : undefined)
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
//# sourceMappingURL=cli.js.map