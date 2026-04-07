# Tech Events Radar — Design Spec

Personal tool that scrapes tech networking events from Toronto, SF, and NYC, presents them in a filterable portal with an ElevenLabs voice greeting, and sends daily Slack digests.

## Architecture

```
GitHub Actions (daily cron)
       │
       ▼
┌──────────────┐     ┌──────────────────┐
│ Scraper       │────▶│ Supabase Postgres │
│ (Node script) │     │                  │
└──────────────┘     └────────┬─────────┘
                              │
┌──────────────┐              │
│ Slack Notifier│◀────────────┤
│ (post-scrape) │             │
└──────────────┘              │
                              │
┌─────────────────────────────▼──────────┐
│ Next.js App (local dev)                │
│  - Portal UI (cards, filters, toggle)  │
│  - ElevenLabs greeting on load         │
│  - API routes reading from Postgres    │
└────────────────────────────────────────┘
```

### Flow

1. GitHub Actions cron triggers `scripts/scrape.ts` daily at 6am EST
2. Scraper hits 4 sources for all 3 cities
3. Events normalized, categorized, deduped, upserted into Supabase
4. Slack digest sent with matching events (built last)
5. User opens Next.js portal locally to browse/filter events

## Scraper

### Sources

| Source | Method | Notes |
|--------|--------|-------|
| Eventbrite | REST API (public) | Search by city + category keywords, paginated |
| Luma | Web scraping (Playwright) | No public API, hit discover/search pages |
| Meetup | GraphQL API | Public queries by location |
| Posh | Web scraping (Playwright) | Hit city explore pages |

### Pipeline (per source)

1. **Fetch** — hit source for each city (Toronto, SF, NYC)
2. **Normalize** — map to common event schema
3. **Categorize** — keyword matching on title + description, multi-category
4. **Dedupe** — match on title + date + city to avoid cross-source duplicates
5. **Store** — upsert into Supabase Postgres

### Schedule

Daily at 6am EST via GitHub Actions cron. Sources scraped sequentially.

```yaml
on:
  schedule:
    - cron: '0 11 * * *'  # 6am EST (11:00 UTC)
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npx playwright install chromium
      - run: npx tsx scripts/scrape.ts
```

## Database

### Tech

Supabase Postgres via Drizzle ORM.

### Event Schema

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| title | text | Event title |
| description | text | Full description |
| date | date | Event date |
| time | time | Start time |
| end_time | time | nullable |
| city | text | toronto, sf, nyc |
| venue | text | nullable |
| url | text | Link to original event page |
| source | text | eventbrite, luma, meetup, posh |
| categories | text[] | Array of category tags |
| organizer | text | nullable |
| image_url | text | nullable |
| created_at | timestamp | Row creation time |
| scraped_at | timestamp | When this event was last scraped |

### Categories

- AI / ML
- Hackathons
- Big Tech
- Startup / Founder
- Developer Tools / Infra
- Networking / Social
- Workshops / Talks
- GTM / Distribution

Assigned via keyword matching on title + description. An event can have multiple categories. Keywords defined in `config.ts` — easy to tune without touching scraper logic.

## Scraper Health Checks

Two checks run after every scrape:

### 1. Zero-Event Check

After each source completes, verify it returned > 0 events per city. If any source returns 0 for a city, flag it as `degraded`.

### 2. Count-Drop Detection

Compare each source's event count per city against the previous run (stored in a `scrape_runs` table). If a source drops by more than 50% for any city, flag it as `suspicious`.

### Scrape Runs Table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| source | text | eventbrite, luma, meetup, posh |
| city | text | toronto, sf, nyc |
| event_count | integer | Number of events returned |
| status | text | healthy, degraded, suspicious |
| ran_at | timestamp | When this run happened |

### Alert Output

```
Scrape complete:
  eventbrite: healthy  (TO: 34, SF: 52, NYC: 61)
  luma:       healthy  (TO: 12, SF: 28, NYC: 19)
  meetup:     healthy  (TO: 18, SF: 22, NYC: 31)
  posh:       degraded (TO: 0, SF: 8, NYC: 11)  <- 0 events TO
```

If any source is `degraded` or `suspicious`, a separate Slack alert is sent (when webhook is configured). Always logged in GitHub Actions output regardless.

## Portal UI

### Stack

Next.js, TypeScript, Tailwind CSS, Drizzle ORM.

### Layout

Single page:

- **Top bar:** City toggle (Toronto / SF / NYC), date range (defaults to 14 days)
- **Filter bar:** Category chips, multi-select toggle
- **Event list:** Cards sorted by date (soonest first)

### Event Card

- Title
- Date / time
- Venue
- Source badge (Luma / Eventbrite / Meetup / Posh)
- Category tags
- Link to original event page

### Voice Greeting

On first load of the day, ElevenLabs TTS plays: "Good morning Arian, here are your events for today."

- Client-side fetch to ElevenLabs API
- API key and voice ID sourced from env vars (same as content-pipeline repo)
- Cached per day — doesn't re-trigger on refresh
- Uses `localStorage` to track last greeting date

## Slack Integration (built last)

- Webhook URL provided as env var
- Runs after scraper completes
- One message per city with events grouped by category
- Only sends events matching active category filters
- Format:

```
Toronto — April 5-7

AI / ML
- "Building with LLMs" — Luma — Apr 5, 7pm — 123 King St
- "GenAI Founders Meetup" — Eventbrite — Apr 6, 6pm — MaRS Centre

Hackathons
- "Weekend AI Hack" — Posh — Apr 5-6 — Shopify HQ
```

## Project Structure

```
tech-events-radar/
├── scripts/
│   ├── scrape.ts              # Main scraper entry point
│   ├── scrapers/
│   │   ├── eventbrite.ts
│   │   ├── luma.ts
│   │   ├── meetup.ts
│   │   └── posh.ts
│   ├── categorizer.ts         # Keyword-based category tagging
│   ├── deduper.ts             # Cross-source dedup
│   └── slack.ts               # Slack digest sender
├── src/
│   └── app/
│       ├── page.tsx           # Main portal page
│       ├── api/
│       │   └── events/
│       │       └── route.ts   # GET events from Postgres
│       └── components/
│           ├── EventCard.tsx
│           ├── CityToggle.tsx
│           ├── CategoryFilter.tsx
│           └── VoiceGreeting.tsx
├── db/
│   └── schema.ts              # Drizzle schema
├── drizzle.config.ts
├── config.ts                  # Cities, categories, keyword maps
├── .env                       # Supabase URL, ElevenLabs keys, Slack webhook
├── .github/
│   └── workflows/
│       └── scrape.yml         # Daily cron workflow
└── package.json
```

## Environment Variables

```
DATABASE_URL=           # Supabase Postgres connection string
ELEVENLABS_API_KEY=     # From content-pipeline
ELEVENLABS_VOICE_ID=    # From content-pipeline
SLACK_WEBHOOK_URL=      # Added last
```

## Non-Goals (for now)

- No user auth — personal tool, runs locally
- No event RSVP or ticket purchasing
- No mobile app
- No real-time scraping — daily batch is sufficient
- No AI-powered categorization — keyword matching first, upgrade later if needed
