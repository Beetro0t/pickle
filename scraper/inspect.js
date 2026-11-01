// Quick inspection helper: prints title, JSON-LD blocks, tables and main text.
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const file = process.argv[2];
const html = fs.readFileSync(path.join(__dirname, "raw", file), "utf8");
const $ = cheerio.load(html);
console.log("TITLE:", $("title").text().trim());
console.log("H1:", $("h1").first().text().trim());
const jsonld = [];
$('script[type="application/ld+json"]').each((i, el) => jsonld.push($(el).text().slice(0, 1500)));
console.log("JSON-LD blocks:", jsonld.length);
jsonld.forEach((j, i) => console.log(`--- ld${i} ---\n${j}`));
console.log("TABLES:", $("table").length);
$("table").slice(0, 4).each((i, t) => console.log(`--- table ${i} ---\n${$(t).text().replace(/\s+/g, " ").trim().slice(0, 900)}`));
const main = $("main").length ? $("main") : $("body");
console.log("--- TEXT ---");
console.log(main.text().replace(/\s+/g, " ").trim().slice(0, 4000));
