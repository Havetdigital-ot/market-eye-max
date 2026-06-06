# Market Eye Pro — Database Schema

Everything the app stores in Supabase (Postgres). Use this to recreate the
backend on any other Supabase project.

## How to deploy to a new Supabase project

1. Create a new Supabase project.
2. Open **SQL Editor** and run `db/schema.sql` (creates tables, RLS, policies, grants, triggers, functions).
3. In your app `.env`, set:
   ```
   VITE_SUPABASE_URL="https://<new-ref>.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="<new anon key>"
   SUPABASE_URL="https://<new-ref>.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="<new anon key>"
   SUPABASE_SERVICE_ROLE_KEY="<service role key>"   # server only
   FIRECRAWL_API_KEY="<your firecrawl key>"         # server only
   ```
4. (Optional) Enable Google OAuth in Supabase Auth providers.

That's it — the app will work against the new backend.

---

## Tables

All user-scoped tables enforce **Row Level Security**: a user can only read/write
their own rows via `auth.uid() = user_id`.

### `profiles`
One row per auth user. Auto-created by `handle_new_user()` trigger on signup.
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| email | text | |
| full_name | text | |
| company_name | text | |
| role | text | default `'User'` |
| created_at, updated_at | timestamptz | |

### `competitors`
Competitor stores the user is monitoring.
| id, user_id, display_name, url, status ('Active'/'Paused'/'Error'), last_crawled_at, created_at |

### `competitor_products`
Products scraped from each competitor.
| id, competitor_id → competitors, name, url, description, image_url, category, sku, last_updated_at |

### `price_history`
Time series of prices per product.
| id, competitor_product_id → competitor_products, price, currency ('USD'), timestamp |

### `alerts`
Price changes / new product notifications shown in the bell.
| id, user_id, type ('Price Change'/'New Product'), competitor_id, competitor_product_id, competitor_name, product_name, old_price, new_price, is_read, created_at |

### `trends`
Discovered trending products/keywords from TikTok/Reddit/Amazon.
| id, user_id, keyword, platform, product_name, source_url, trend_score, virality_potential, seasonality_score, saved, discovered_at |

### `brand_assets`
AI-generated brand identities.
| id, user_id, source_description, brand_name, customer_persona (jsonb), brand_voice, color_palette (jsonb array of hex), font_choices (jsonb), generated_at |

### `brand_generation_templates`
Seed templates the brand builder picks from. Read by all authenticated users.
| id, sort_order, brand_name, brand_voice, color_palette, font_primary, font_secondary, created_at |

### `seo_content`
Generated blog posts / product descriptions / FAQs.
| id, user_id, product_id → competitor_products, type, topic, title, body, keywords (text[]), status ('Draft'/'Published'), created_at, published_at |

### `background_tasks`
Job queue surfaced in the Tasks page (crawls, scans, generations).
| id, user_id, task_type, status ('Running'/'Completed'/'Failed'), details (jsonb), error_message, dismissed, created_at, updated_at |

---

## Functions & Triggers

- `handle_new_user()` — AFTER INSERT trigger on `auth.users`, inserts a `profiles` row.
- `set_updated_at()` — BEFORE UPDATE trigger on `background_tasks`.
- `seed_demo_data(p_user uuid)` — populates demo competitors/products/alerts/trends for a new user. Called once after first sign-in from the app.

## Secrets used by server code (not in DB)

- `FIRECRAWL_API_KEY` — Firecrawl scraping
- `LOVABLE_API_KEY` — Lovable AI Gateway (optional)
- `SUPABASE_SERVICE_ROLE_KEY` — admin client (server only)

See `db/schema.sql` for the runnable SQL.
