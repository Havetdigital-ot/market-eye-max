import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Market Eye" },
      { name: "description", content: "Market Eye — competitor monitoring, product discovery, brand building, SEO and store generation." },
      { property: "og:title", content: "Market Eye" },
      { property: "og:description", content: "Competitor monitoring, product discovery, brand building, SEO and store generation." },
    ],
  }),
  component: MarketEyePage,
});

function MarketEyePage() {
  return (
    <iframe
      src="/mf/index.html"
      title="Market Eye"
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
