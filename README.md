# Market Eye Pro

Market Eye Pro is a competitive intelligence and market research platform designed for ecommerce brands. It leverages AI and web scraping to monitor competitor catalogs, track price changes, discover trending products, and generate high-converting SEO and brand content.

## Features

- **Competitor Monitor**: Track competitor product catalogs, pricing history, and new additions using Firecrawl AI extraction. Receive alerts when competitors change prices or launch new products.
- **Product Discovery**: Scan social platforms (TikTok, Reddit) and marketplaces (Amazon) to identify viral trends and high-potential products before they peak.
- **Brand Builder**: Instantly generate complete brand identities—including name, voice, color palettes, and typography—by analyzing top brands in your specific niche.
- **SEO Content Generator**: Automatically generate high-quality, SEO-optimized blog posts, FAQs, and product descriptions based on top-ranking competitor content.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, TanStack Router
- **Backend & Database**: Supabase (PostgreSQL, Auth, Edge Functions)
- **AI & Data Extraction**: Firecrawl (Web scraping and LLM extraction)
- **Build Tool**: Vite

## Getting Started

### Prerequisites
- Node.js (v18+)
- Bun or npm
- A Supabase account
- A Firecrawl API key

### Installation

1. Clone the repository and install dependencies:
   ```bash
   bun install
   ```

2. Set up your environment variables by creating a `.env.local` file:
   ```env
   VITE_SUPABASE_URL="your-supabase-url"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-supabase-anon-key"
   SUPABASE_PROJECT_ID="your-supabase-project-id"
   FIRECRAWL_API_KEY="your-firecrawl-api-key"
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

4. Build for production:
   ```bash
   bun run build
   bun run start
   ```

## License
All rights reserved.
