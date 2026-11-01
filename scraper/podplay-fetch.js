// PodPlay renders public community events for an anonymous visitor.
// We use the same anonymous visitor session the public page establishes and read
// the public events API it calls. No login, no member data.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const POD_ID = "df6a046e-aca1-4b72-851d-45ee6436264e";
const BASE = "https://houseofpickle.podplay.app";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let token = null;
  page.on("request", (r) => {
    if (!token && r.url().includes("/apis/v2/events")) {
      const auth = r.headers()["authorization"];
      if (auth?.startsWith("Bearer ")) token = auth.slice(7);
    }
  });
  await page.goto(`${BASE}/community/events?location=tuggerah`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(7000);
  if (!token) throw new Error("Could not obtain anonymous PodPlay session");

  const startTime = new Date(Date.now() - 86400000).toISOString();
  const endTime = new Date(Date.now() + 90 * 86400000).toISOString();
  const items = [];
  for (let pageNo = 1; pageNo <= 5; pageNo++) {
    const url = `${BASE}/apis/v2/events?selfOnly=true&excludeClosedSeries=true&includeCanceledInvitations=false&podId=${POD_ID}&excludeUnlisted=true&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}&page=${pageNo}&ipp=100`;
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}`, accept: "application/json" } });
    const json = await res.json();
    const batch = json.items || json.data || [];
    items.push(...batch);
    console.log("list page", pageNo, res.status, batch.length, "total", items.length);
    if (batch.length < 100) break;
  }

  const outDir = path.join(__dirname, "cache");
  fs.mkdirSync(outDir, { recursive: true });
  const cachePath = path.join(outDir, "podplay.json");
  const previous = fs.existsSync(cachePath) ? JSON.parse(fs.readFileSync(cachePath, "utf8")) : { details: {} };
  const details = previous.details || {};
  const targets = items.filter((e) => ["EVENT", "CLASS"].includes(e.type) && e.isCanceled !== true);
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const e = targets[cursor++];

      const res = await fetch(`${BASE}/apis/v2/events/${e.id}`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
      if (res.ok) details[e.id] = await res.json();
      else console.log("detail failed", e.id, res.status);
      await sleep(120);
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  console.log("details", Object.keys(details).length, "/", targets.length);

  fs.writeFileSync(path.join(outDir, "podplay.json"), JSON.stringify({ fetchedAt: new Date().toISOString(), items, details }, null, 2));
  console.log("saved", items.length, "events");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
