// Omit detail routes until their first real records exist. Next.js static
// exports require at least one parameter for each included dynamic route.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const dataset = JSON.parse(fs.readFileSync(path.join(root, "data/events.json"), "utf8"));
const temporary = path.join(root, ".build-routes");
const moved = [];
let status = 1;
try {
  for (const collection of ["events", "venues"]) {
    if (dataset[collection].length) continue;
    fs.mkdirSync(temporary, { recursive: true });
    const source = path.join(root, "src/app", collection, "[id]");
    const destination = path.join(temporary, collection);
    fs.renameSync(source, destination);
    moved.push({ source, destination });
  }
  const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  status = result.status ?? 1;
} finally {
  for (const { source, destination } of moved) fs.renameSync(destination, source);
  if (fs.existsSync(temporary) && fs.readdirSync(temporary).length === 0) fs.rmdirSync(temporary);
}
process.exitCode = status;
