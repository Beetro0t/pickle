// Render a JS-heavy public page, capture visible text and JSON API responses.
// Usage: node render.js <name> <url> [waitMs]
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const [name, url, waitMs = "6000"] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (compatible; PickleballFinderBot/1.0; +https://pickleballfinder.example/bot)",
    viewport: { width: 1280, height: 1800 },
  });
  const api = [];
  page.on("response", async (res) => {
    const ct = res.headers()["content-type"] || "";
    if (ct.includes("json")) {
      try {
        const body = await res.text();
        api.push({ url: res.url(), status: res.status(), body: body.slice(0, 20000) });
      } catch {}
    }
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(Number(waitMs));
  const text = await page.evaluate(() => document.body.innerText);
  fs.writeFileSync(`raw/render_${name}.txt`, text);
  fs.writeFileSync(`raw/render_${name}_api.json`, JSON.stringify(api, null, 2));
  console.log(text.slice(0, 5000));
  console.log("--- API endpoints ---");
  for (const a of api) {
    console.log(a.status, a.url, a.body.length);
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
