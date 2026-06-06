import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketForge AI" },
      { name: "description", content: "MarketForge AI — competitor monitoring, product discovery, brand building, SEO and store generation." },
      { property: "og:title", content: "MarketForge AI" },
      { property: "og:description", content: "Competitor monitoring, product discovery, brand building, SEO and store generation." },
    ],
  }),
  component: MarketForgePage,
});

function MarketForgePage() {
  return (
    <iframe
      src="/mf/index.html"
      title="MarketForge AI"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        border: 0,
        margin: 0,
        padding: 0,
        display: "block",
      }}
    />
  );
}
