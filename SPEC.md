# SPEC.md — Market Eye Pro

> Blueprint snapshot. Read-only once building starts. Update only for major pivots.

## What It Is
Market Eye Pro is a SaaS competitive intelligence platform for ecommerce brands.
It automates the painful manual work of monitoring competitors, spotting trends,
and generating content — giving ecom operators an unfair data advantage.

---

## Tech Stack
| Concern | Choice | Why |
|---------|--------|-----|
| Frontend | React 19 + TypeScript | Type safety, ecosystem |
| Router | TanStack Router (file-based) | Type-safe routes, SSR-ready |
| SSR framework | TanStack Start | Full-stack React, Vite-native |
| Styling | Tailwind CSS v4 | Utility-first, fast iteration |
| UI Kit | shadcn/ui (Radix UI) | Accessible, copy-owned components |
| Icons | Lucide React | Consistent, tree-shakeable |
| State/cache | TanStack Query v5 | Server state, caching, mutations |
| Forms | React Hook Form + Zod | Performance, validation |
| Database | Supabase PostgreSQL | Managed, RLS, realtime |
| Auth | Supabase Auth | Built-in, JWT, OAuth |
| Edge Functions | Supabase Edge Functions | Server-side logic, secrets |
| Web Scraping | Firecrawl | AI-powered extraction |
| Build | Vite + Bun | Fast builds, fast installs |
| Charts | Recharts | D3-based, React-native |
| Toasts | Sonner | Modern, animated |
| Deployment | Vercel (frontend) + Supabase cloud | Managed infra |

---

## Data Sources & APIs
| Source | Purpose |
|--------|---------|
| Firecrawl | Scrape competitor product pages, extract structured data |
| Supabase DB | Store competitors, products, trends, alerts, tasks |
| Supabase Auth | User sessions, multi-tenancy |
| TikTok / Reddit / Amazon | Trend discovery (scraped via Firecrawl) |

---

## Folder Structure
```
market-eye-max/
├── src/
│   ├── components/
│   │   ├── app/         # Feature-specific components
│   │   └── ui/          # shadcn/ui primitives
│   ├── hooks/           # Custom hooks
│   ├── integrations/
│   │   └── supabase/    # DB client, types, auth
│   ├── lib/             # Shared utilities, server logic
│   │   └── api/         # Edge function wrappers
│   ├── routes/          # File-based routes (TanStack Router)
│   │   └── _authenticated/  # Auth-guarded routes
│   └── styles.css
├── supabase/
│   ├── migrations/      # SQL migrations
│   └── functions/       # Edge functions
├── public/
├── CLAUDE.md
├── SPEC.md
└── .claude/
    ├── settings.json
    ├── hooks/
    └── soul.md
```

---

## Pages / Screens

### Landing (`/`)
```
+--------------------------------------------------+
| [Logo]  Market Eye Pro        [Sign In] [Get Started] |
+--------------------------------------------------+
| Hero: "Know your competitors before they know you"|
| CTA: Start free trial                             |
+--------------------------------------------------+
| Features grid: Monitor | Discover | Brand | SEO   |
+--------------------------------------------------+
| Pricing section                                   |
+--------------------------------------------------+
| Footer                                            |
+--------------------------------------------------+
```

### App Shell (`/app/*`)
```
+------------------+----------------------------------+
| Sidebar          |  Topbar: [Search ⌘K] [🔔] [Avatar] |
|                  +----------------------------------+
| Dashboard        |                                  |
| Competitors      |   <Route content>                |
| Discovery        |                                  |
| Brand Builder    |                                  |
| SEO Generator    |                                  |
| Store            |                                  |
| Tasks            |                                  |
| Alerts           |                                  |
+------------------+----------------------------------+
```

---

## Key Data Models (Supabase)

### `competitors`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| name | text | Brand name |
| domain | text | Website URL |
| created_at | timestamptz | |

### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| competitor_id | uuid | FK → competitors |
| name | text | |
| price | numeric | |
| url | text | |
| scraped_at | timestamptz | |

### `alerts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| title | text | |
| message | text | |
| severity | text | info/warning/critical |
| read | boolean | DEFAULT false |
| created_at | timestamptz | |

### `trends`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| keyword | text | |
| source | text | tiktok/reddit/amazon |
| score | numeric | Trend strength |
| discovered_at | timestamptz | |

---

## UI/UX Design System
- **Color palette**: Defined in Tailwind CSS v4 config + CSS variables
- **Typography**: System font stack, Tailwind `text-*` utilities
- **Component style**: shadcn/ui defaults — neutral palette, subtle borders
- **Spacing**: Tailwind spacing scale (4px base)
- **Border radius**: `rounded-lg` as default for cards, `rounded-md` for inputs
- **Shadows**: Minimal — `shadow-sm` for cards

---

## Environment Variables
```bash
# Client-side (safe to expose, prefixed VITE_)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Server-side only (never prefix with VITE_)
SUPABASE_PROJECT_ID=
FIRECRAWL_API_KEY=
```

---

## Development Phases

### P0 — Core (shipped)
- [x] Auth (Supabase)
- [x] App shell + routing
- [x] Competitor Monitor UI
- [x] Product Discovery UI
- [x] Brand Builder UI (AI generation)
- [x] SEO Content Generator UI
- [x] Global Search (⌘K)
- [x] Notifications bell (alerts popover)

### P1 — Real data wiring
- [ ] Firecrawl scraping pipeline (competitor products)
- [ ] Price change detection + alert creation
- [ ] Trend discovery pipeline (TikTok/Reddit/Amazon)
- [ ] AI brand generation (connected to real LLM)
- [ ] SEO content generation (connected to real LLM)

### P2 — Production readiness
- [ ] Billing / subscription (Stripe)
- [ ] Email notifications (Resend)
- [ ] Scheduled scraping jobs (Supabase cron / Edge Functions)
- [ ] Multi-workspace support

### P3 — Nice to have
- [ ] CSV export
- [ ] Browser extension for manual scraping
- [ ] API access for power users

---

## Constraints & Known Limitations
- Firecrawl API key is server-side only — all scraping goes through Edge Functions
- TanStack Start SSR requires careful client/server boundary management (`*.server.ts`)
- Supabase free tier limits: 500MB DB, 2GB bandwidth, 500K edge function invocations/month
- TikTok scraping is rate-limited and may require proxy rotation at scale
