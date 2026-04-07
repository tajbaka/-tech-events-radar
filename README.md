# Tech Events Radar

Personal tool that scrapes tech networking events from Toronto, SF, and NYC.

See [docs/design.md](docs/design.md) for the full design spec.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # fill in DATABASE_URL + keys
npm run db:push        # create tables in Supabase
```

## Running

```bash
npm run scrape   # run the scraper + Slack digest
npm run dev      # start the portal at http://localhost:3000
```

## Project layout

```
config.ts               cities, categories, keyword maps
db/                     drizzle schema + client
scripts/                scraper pipeline + slack
  scrapers/             one file per source
src/app/                Next.js portal
.github/workflows/      daily cron
```
