// Server-only Firecrawl client. Never import from client code.
import Firecrawl from "@mendable/firecrawl-js";

let _client: Firecrawl | undefined;

export function getFirecrawl(): Firecrawl {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FIRECRAWL_API_KEY is not configured. Link the Firecrawl connector.",
    );
  }
  if (!_client) _client = new Firecrawl({ apiKey });
  return _client;
}

export const productExtractionSchema = {
  type: "object",
  properties: {
    products: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          description: { type: "string" },
          image_url: { type: "string" },
          category: { type: "string" },
          sku: { type: "string" },
          price: { type: "number" },
        },
        required: ["name"],
      },
    },
  },
  required: ["products"],
} as const;

export type ExtractedProduct = {
  name: string;
  url?: string;
  description?: string;
  image_url?: string;
  category?: string;
  sku?: string;
  price?: number;
};
