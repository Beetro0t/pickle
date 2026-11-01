# Pickleball Finder

NSW pickleball sessions, tournaments, coaching and venues.

Website: https://beetro0t.github.io/pickle/

## Refresh listings

Click **Refresh listings** on the website. Sign in to GitHub with repository write access, select **Run workflow**, then confirm **Run workflow**. The manual workflow scrapes the public sources, validates and commits the data, rebuilds the site and publishes it. There is no schedule, and visits to the site never run the scraper. The initial website has empty listing tiles and no event or venue records. Only a requested scrape populates the site.

The button opens GitHub's authenticated controls; no access token is exposed in the public website. Source failures are shown in the workflow log and the Sources page. Some sources may block automated requests or use cached data. Booking availability should always be confirmed with the organiser.

## Development

Use Node.js 22, then `npm ci`, `npm run dev`. The default local path is http://localhost:3000/pickle/. `npm run typecheck` checks TypeScript and `npm run build` exports to `out/` for GitHub Pages. Dynamic search, filters and pagination run in the browser; event and venue detail pages are generated during each build.

Submissions and corrections open a public GitHub issue draft for review and submission. Never include private contact or attendee information. The site has no server or private submission database.

GitHub Pages must use **GitHub Actions** as its publishing source. The public repository uses standard GitHub-hosted Linux runners and Pages without a paid hosting service.
