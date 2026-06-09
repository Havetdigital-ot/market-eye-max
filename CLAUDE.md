# CLAUDE.md — Market Eye Pro

## Project Overview
Market Eye Pro is a competitive intelligence and market research platform for ecommerce brands.
It uses AI/web scraping to monitor competitor catalogs, track prices, discover trends, and generate SEO content.

## Key Commands
```bash
bun run dev        # Start dev server (Vite)
bun run build      # Production build
bun run preview    # Preview production build
bun run lint       # ESLint
bun run format     # Prettier
```

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Router | TanStack Router (file-based) + TanStack Start |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React — NEVER use emojis in UI |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query (React Query v5) |
| Backend/DB | Supabase (PostgreSQL + Auth + Edge Functions) |
| Web Scraping | Firecrawl |
| Build | Vite + Bun |
| Charts | Recharts |
| Toasts | Sonner |

## Folder Structure
```
src/
├── components/
│   ├── app/          # App-specific components (global-search, notifications, etc.)
│   └── ui/           # shadcn/ui primitives (accordion, button, card, etc.)
├── hooks/            # Custom React hooks
├── integrations/
│   └── supabase/     # Supabase client, types, auth middleware
├── lib/              # Utilities, server-side logic, API wrappers
│   └── api/          # API function files (.functions.ts)
├── routes/           # TanStack Router file-based routes
│   └── _authenticated/ # Protected routes (require auth)
├── styles.css        # Global styles + Tailwind imports
├── router.tsx        # Router config
└── server.ts         # Server entry
```

## Route Structure
- `/` — Landing page (`index.tsx`)
- `/auth` — Auth page (`auth.tsx`)
- `/dash` — Public dashboard (`dash.tsx`)
- `/app` — Authenticated shell (`_authenticated/app.tsx`)
  - `/app/` — Dashboard home
  - `/app/competitors` — Competitor monitor
  - `/app/discovery` — Product discovery (TikTok/Reddit/Amazon trends)
  - `/app/brand` — Brand builder (AI-generated brand identities)
  - `/app/seo` — SEO content generator
  - `/app/store` — Store management
  - `/app/tasks` — Task management
  - `/app/alerts` — Alerts / price change notifications

## Coding Conventions
- **TypeScript**: Strict mode. Always type props, API responses, and Supabase queries.
- **Components**: Functional components only. No class components.
- **Styling**: Tailwind utility classes. Use `cn()` from `src/lib/utils.ts` for conditional classes.
- **Icons**: Always use `lucide-react`. Import individually. Never use emoji as UI icons.
- **Forms**: Always use `react-hook-form` + `zod` schema validation.
- **Data fetching**: Always use `useQuery` / `useMutation` from TanStack Query.
- **Supabase client**: Use `src/integrations/supabase/client.ts` on the client side.
- **Server-only**: Files named `*.server.ts` run server-side only (never import in client components).
- **API functions**: Files named `*.functions.ts` are Supabase Edge Function wrappers.
- **Toasts**: Use `sonner` via the `<Toaster />` component. Import `toast` from `sonner`.
- **Dialogs/modals**: Use shadcn `Dialog` or `AlertDialog` — never browser `alert()`.

## Supabase Patterns
- Always use RLS (Row Level Security) — every table must have RLS policies.
- Auth state: read from Supabase session, not localStorage.
- When adding tables, write a migration file in `supabase/migrations/`.
- Use `useQuery` + Supabase client for reads; `useMutation` for writes.

## Error Handling
- Use `sonner` toast for user-facing errors.
- Log errors to console in dev; use `src/lib/error-capture.ts` for production.
- Never swallow errors silently.

## Testing
- No test suite configured yet. Before adding tests, confirm the testing framework choice.

## Environment Variables
```
VITE_SUPABASE_URL              # Supabase project URL (client-side)
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase anon key (client-side)
SUPABASE_PROJECT_ID            # Supabase project ID (server-side)
FIRECRAWL_API_KEY              # Firecrawl API key (server-side, never expose to client)
```

---

## Learned Rules

_This section grows over time. Each rule below was learned from a real mistake._

### Rule 1: Icons over emojis in UI
- **Trigger**: Any UI element that needs an icon
- **Correct behavior**: Use `lucide-react` SVG icons. Emojis only in user-generated content text.
- **Date**: 2026-06-06

### Rule 2: Never expose FIRECRAWL_API_KEY to client
- **Trigger**: Any Firecrawl usage
- **Correct behavior**: All Firecrawl calls go through server-side functions (`*.server.ts` or `*.functions.ts`). The key must never appear in client-side code or `VITE_*` env vars.
- **Date**: 2026-06-06

### Rule 3: Always work on main — commit and push directly
- **Trigger**: Any code change task
- **Correct behavior**: Commit directly to `main` and push. Do NOT create feature branches or PRs unless the user explicitly asks for one. If a feature branch is already open, merge it to main immediately after completing the work.
- **Date**: 2026-06-09
