"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const app_1 = require("./app");
const seed_1 = require("./seed");
const data_cleaner_1 = require("./data-cleaner");
const PORT = Number(process.env.PORT ?? 3001);
const DATABASE_PATH = process.env.DATABASE_PATH;
const db = (0, db_1.openDatabase)(DATABASE_PATH ?? undefined);
(0, db_1.initializeSchema)(db);
(0, seed_1.seedSampleData)(db);
const cleanupResult = (0, data_cleaner_1.runDataCleanup)(db);
if (cleanupResult.errors.length > 0) {
    console.warn(`Data cleanup finished with ${cleanupResult.errors.length} errors`);
}
console.log(`Data cleanup complete. Updated ${cleanupResult.cleaned} rows.`);
const app = (0, app_1.createApp)(db);
app.listen(PORT, () => {
    console.log(`Global Under-16 Regulation API running on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map