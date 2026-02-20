"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const backfill_1 = require("./backfill");
const DATABASE_PATH = process.env.DATABASE_PATH;
const db = (0, db_1.openDatabase)(DATABASE_PATH);
(0, db_1.initializeSchema)(db);
const result = (0, backfill_1.backfillEventRiskAndJurisdiction)(db);
console.log("Backfill complete:", result);
//# sourceMappingURL=backfill-cli.js.map