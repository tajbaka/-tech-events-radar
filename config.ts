export const CITIES = ["toronto", "sf", "nyc"] as const;
export type City = (typeof CITIES)[number];

export const CITY_LABELS: Record<City, string> = {
  toronto: "Toronto",
  sf: "San Francisco",
  nyc: "New York",
};

// Lat/lng + search strings used by scrapers
export const CITY_META: Record<
  City,
  { lat: number; lng: number; eventbriteLocation: string; lumaSlug: string; meetupQuery: string }
> = {
  toronto: {
    lat: 43.6532,
    lng: -79.3832,
    eventbriteLocation: "Toronto--Canada",
    lumaSlug: "toronto",
    meetupQuery: "Toronto, ON, CA",
  },
  sf: {
    lat: 37.7749,
    lng: -122.4194,
    eventbriteLocation: "San-Francisco--CA",
    lumaSlug: "sf",
    meetupQuery: "San Francisco, CA, US",
  },
  nyc: {
    lat: 40.7128,
    lng: -74.006,
    eventbriteLocation: "New-York--NY",
    lumaSlug: "nyc",
    meetupQuery: "New York, NY, US",
  },
};

export const CATEGORIES = [
  "AI / ML",
  "Hackathons",
  "Big Tech",
  "Startup / Founder",
  "Developer Tools / Infra",
  "Networking / Social",
  "Workshops / Talks",
  "GTM / Distribution",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Keyword map — case-insensitive substring match on (title + " " + description).
// Tune freely without touching scraper logic.
export const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  "AI / ML": [
    "ai", "a.i.", "artificial intelligence", "machine learning", "ml ",
    "llm", "llms", "genai", "gen ai", "generative", "gpt", "openai",
    "anthropic", "claude", "rag", "vector", "embedding", "fine-tun",
    "neural", "deep learning", "prompt engineering", "agents", "agentic",
    "transformer", "diffusion", "stable diffusion", "midjourney",
  ],
  Hackathons: ["hackathon", "hack night", "hack day", "hack-a-thon", "build weekend", "buildathon", "jam "],
  "Big Tech": [
    "google", "microsoft", "apple", "meta", "amazon", "aws", "azure",
    "nvidia", "netflix", "stripe", "shopify", "uber", "airbnb", "salesforce",
  ],
  "Startup / Founder": [
    "founder", "founders", "startup", "start-up", "yc ", "y combinator",
    "techstars", "seed ", "series a", "pitch", "demo day", "accelerator",
    "incubator", "vc ", "venture", "angel", "fundrais",
  ],
  "Developer Tools / Infra": [
    "devtools", "dev tools", "developer tool", "infrastructure", "infra ",
    "kubernetes", "k8s", "docker", "terraform", "devops", "sre",
    "observability", "database", "postgres", "redis", "api ", "sdk",
    "open source", "oss ", "platform engineering",
  ],
  "Networking / Social": [
    "networking", "meetup", "mixer", "social", "happy hour", "drinks",
    "coffee chat", "community", "meet & greet", "meet and greet",
  ],
  "Workshops / Talks": [
    "workshop", "talk", "lecture", "seminar", "masterclass", "training",
    "tutorial", "fireside", "panel", "conference", "keynote",
  ],
  "GTM / Distribution": [
    "gtm", "go-to-market", "go to market", "marketing", "growth",
    "distribution", "sales", "product-led", "plg ", "b2b sales",
    "demand gen", "content marketing",
  ],
};

export const DEFAULT_DATE_RANGE_DAYS = 14;

export const SOURCES = ["eventbrite", "luma", "meetup"] as const;
export type Source = (typeof SOURCES)[number];
