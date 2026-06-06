---
name: market-eye-memory-index
description: Long-term memory index for Market Eye Pro project
metadata:
  type: project
---

# Memory Index — Market Eye Pro

## Tech Preferences
- Always use `bun` — never npm or yarn for this project
- Tailwind CSS v4 (not v3 — config syntax is different)
- Lucide React for all icons — never emoji in UI

## Architecture Decisions
- Firecrawl API key is server-side only — all calls go through `*.server.ts` or `*.functions.ts`
- TanStack Router file-based routing — routes live in `src/routes/`
- Protected routes use `_authenticated/` prefix folder
- Supabase client: `src/integrations/supabase/client.ts` (client-side), `client.server.ts` (server-side)

## Patterns Confirmed
- `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- `useQuery` + Supabase client for reads; `useMutation` for writes
- Toast notifications via `sonner` — import `toast` from `"sonner"`
- Forms: always `react-hook-form` + `zod` schema

## Project State (as of 2026-06-06)
- P0 features shipped: auth, app shell, all main module UIs, global search, notifications bell
- P1 (real data wiring) is the current focus: Firecrawl pipelines, price detection, trend discovery

## Communication Preferences
- Direct, concise. No filler. Short answers preferred.
- Show code over explaining it.
- Challenge bad ideas explicitly.
