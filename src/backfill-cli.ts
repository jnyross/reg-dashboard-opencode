import { openDatabase, initializeSchema } from "./db";
import { backfillEventRiskAndJurisdiction } from "./backfill";

const DATABASE_PATH = process.env.DATABASE_PATH;

const db = openDatabase(DATABASE_PATH);
initializeSchema(db);

const result = backfillEventRiskAndJurisdiction(db);
console.log("Backfill complete:", result);
