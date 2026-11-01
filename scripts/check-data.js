const fs = require("node:fs");
const data = JSON.parse(fs.readFileSync("data/events.json", "utf8"));
const report = JSON.parse(fs.readFileSync("data/scrape-report.json", "utf8"));
if (!Array.isArray(data.events) || !data.events.length) throw new Error("No events returned; keeping published listings unchanged.");
if (Date.now() - Date.parse(data.generatedAt) > 3600000) throw new Error("Dataset was not refreshed.");
const live = report.sourceRuns.filter(run => run.ok && !/cache|stale|failed/i.test(run.status));
if (!live.length) throw new Error("No live sources succeeded; keeping published listings unchanged.");
console.log(`${data.events.length} event series; ${live.length} live source checks; ${report.failures.length} source failures.`);
for (const failure of report.failures) console.log(`Source warning: ${failure.sourceId}: ${failure.message}`);
