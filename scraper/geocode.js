// One-off geocoding for the venues and localities we search against.
// Nominatim public usage: identify ourselves, one request per second, cache results.
const fs = require("fs");
const path = require("path");

const UA = "PickleballFinder/1.0 (venue directory; local development)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const VENUES = [
  ["gosford-tennis-pickleball-club", "Gosford Tennis & Pickleball Club", "10/13 Racecourse Rd, Gosford NSW 2250"],
  ["peninsula-leisure-centre", "Peninsula Leisure Centre", "243 Blackwall Rd, Woy Woy NSW 2256"],
  ["pcyc-bateau-bay", "PCYC Bateau Bay", "460 The Entrance Rd, Bateau Bay NSW 2261"],
  ["pcyc-lake-macquarie", "PCYC Lake Macquarie", "2B Lake St, Windale NSW 2306"],
  ["cooranbong-park", "Cooranbong Park Sports Complex", "515 Freemans Dr, Cooranbong NSW 2265"],
  ["bar-beach-all-sports", "Bar Beach All Sports", "7 Kilgour Ave, Bar Beach NSW 2300"],
  ["stockton-tennis-club", "Stockton Tennis Club", "Mitchell St, Stockton NSW 2295"],
  ["ywca-hunter", "YWCA Hunter", "24 Dawson St, Cooks Hill NSW 2300"],
  ["cook-phillip-park", "Cook + Phillip Park Sports Stadium", "4 College St, Sydney NSW 2000"],
  ["house-of-pickle-tuggerah", "House of Pickle Tuggerah", "8/144 Pacific Hwy, Tuggerah NSW 2259"],
  ["pickleballerz-cardiff", "Pickleballerz Cardiff", "38 Munibung Rd, Cardiff NSW 2285"],
  ["the-courtyard-broadmeadow", "The Courtyard Broadmeadow", "88 Lambton Rd, Broadmeadow NSW 2305"],
  ["pcyc-port-macquarie", "PCYC Port Macquarie", "12 Owen St, Port Macquarie NSW 2444"],
  ["house-of-pickle-darling-harbour", "House of Pickle Darling Harbour", "4/14 Darling Dr, Sydney NSW 2000"],
  ["pcyc-hawkesbury", "PCYC Hawkesbury", "16 Stewart St, South Windsor NSW 2756"],
  ["tweed-heads-regional-tennis-centre", "Tweed Heads Regional Tennis Centre", "Cunningham St, Tweed Heads South NSW 2486"],
  ["sutherland-basketball-stadium", "Sutherland Basketball Stadium", "Rawson Ave, Sutherland NSW 2232"],
  ["shellharbour-stadium", "Shellharbour Stadium", "110 Croome Rd, Croom NSW 2527"],
  ["blacktown-leisure-centre", "Blacktown Leisure Centre", "Stanhope Pkwy & Sentry Dr, Stanhope Gardens NSW 2768"],
  ["sneaky-cat-pickleball", "Sneaky Cat Pickleball", "58-98 Bennu Cct, Thurgoona NSW 2640"],
  ["ballina-indoor-sports-centre", "Ballina Indoor Sports Centre", "63 Cherry St, Ballina NSW 2478"],
  ["iron-arena-taree", "Iron Arena", "Cnr Bligh St & Recreation Dr, Taree NSW 2430"],
  ["owen-street-port-macquarie", "PCYC Port Macquarie", "12 Owen St, Port Macquarie NSW 2444"],
];

const LOCALITIES = [
  ["sydney", "Sydney NSW 2000"],
  ["darling-harbour", "Darling Harbour NSW 2000"],
  ["cooks-hill", "Cooks Hill NSW 2300"],
  ["newcastle", "Newcastle NSW 2300"],
  ["broadmeadow", "Broadmeadow NSW 2292"],
  ["wickham", "Wickham NSW 2293"],
  ["hamilton", "Hamilton NSW 2303"],
  ["mayfield", "Mayfield NSW 2304"],
  ["stockton", "Stockton NSW 2295"],
  ["bar-beach", "Bar Beach NSW 2300"],
  ["merewether", "Merewether NSW 2291"],
  ["charlestown", "Charlestown NSW 2290"],
  ["cardiff", "Cardiff NSW 2285"],
  ["kotara", "Kotara NSW 2289"],
  ["wallsend", "Wallsend NSW 2287"],
  ["floraville", "Floraville NSW 2280"],
  ["windale", "Windale NSW 2306"],
  ["cooranbong", "Cooranbong NSW 2265"],
  ["morisset", "Morisset NSW 2264"],
  ["toronto", "Toronto NSW 2283"],
  ["warners-bay", "Warners Bay NSW 2282"],
  ["belmont", "Belmont NSW 2280"],
  ["swansea", "Swansea NSW 2281"],
  ["maitland", "Maitland NSW 2320"],
  ["cessnock", "Cessnock NSW 2325"],
  ["nelson-bay", "Nelson Bay NSW 2315"],
  ["gosford", "Gosford NSW 2250"],
  ["kariong", "Kariong NSW 2250"],
  ["woy-woy", "Woy Woy NSW 2256"],
  ["umina-beach", "Umina Beach NSW 2257"],
  ["ettalong-beach", "Ettalong Beach NSW 2257"],
  ["terrigal", "Terrigal NSW 2260"],
  ["avoca-beach", "Avoca Beach NSW 2251"],
  ["erina", "Erina NSW 2250"],
  ["kincumber", "Kincumber NSW 2251"],
  ["bateau-bay", "Bateau Bay NSW 2261"],
  ["the-entrance", "The Entrance NSW 2261"],
  ["long-jetty", "Long Jetty NSW 2261"],
  ["tuggerah", "Tuggerah NSW 2259"],
  ["wyong", "Wyong NSW 2259"],
  ["lake-haven", "Lake Haven NSW 2263"],
  ["parramatta", "Parramatta NSW 2150"],
  ["blacktown", "Blacktown NSW 2148"],
  ["stanhope-gardens", "Stanhope Gardens NSW 2768"],
  ["windsor", "Windsor NSW 2756"],
  ["penrith", "Penrith NSW 2750"],
  ["hornsby", "Hornsby NSW 2077"],
  ["chatswood", "Chatswood NSW 2067"],
  ["manly", "Manly NSW 2095"],
  ["bondi", "Bondi NSW 2026"],
  ["sutherland", "Sutherland NSW 2232"],
  ["cronulla", "Cronulla NSW 2230"],
  ["shellharbour", "Shellharbour NSW 2529"],
  ["wollongong", "Wollongong NSW 2500"],
  ["port-macquarie", "Port Macquarie NSW 2444"],
  ["tweed-heads", "Tweed Heads NSW 2485"],
  ["ballina", "Ballina NSW 2478"],
  ["taree", "Taree NSW 2430"],
  ["thurgoona", "Thurgoona NSW 2640"],
];

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=au&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const data = await res.json();
  return data[0] ? { lat: Number(data[0].lat), lng: Number(data[0].lon), display: data[0].display_name } : null;
}

(async () => {
  const outPath = path.join(__dirname, "..", "data", "geocoded.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : { venues: {}, localities: {} };

  for (const [id, name, address] of VENUES) {
    if (existing.venues[id]?.lat) continue;
    let result = await geocode(`${name}, ${address}`);
    await sleep(1100);
    if (!result) {
      result = await geocode(address);
      await sleep(1100);
    }
    existing.venues[id] = result;
    console.log("venue", id, result ? `${result.lat},${result.lng}` : "NOT FOUND");
  }

  for (const [id, query] of LOCALITIES) {
    if (existing.localities[id]?.lat) continue;
    const result = await geocode(query);
    await sleep(1100);
    existing.localities[id] = result;
    console.log("locality", id, result ? `${result.lat},${result.lng}` : "NOT FOUND");
  }

  fs.writeFileSync(outPath, JSON.stringify(existing, null, 2));
  console.log("saved", outPath);
})();
