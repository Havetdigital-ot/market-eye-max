import { createFileRoute, notFound } from "@tanstack/react-router";
import { getStoreBySlug } from "@/lib/stores.functions";

const APP_URL = "https://market-eye.otmane.net";

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const store = await getStoreBySlug({ data: { slug: params.slug } });
    if (!store) throw notFound();
    return { store };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.store?.name ?? "Store" },
      {
        name: "description",
        content: loaderData?.store?.description ?? "A storefront powered by Market Eye",
      },
      { property: "og:title", content: loaderData?.store?.name ?? "Store" },
      {
        property: "og:description",
        content: loaderData?.store?.description ?? "A storefront powered by Market Eye",
      },
    ],
  }),
  component: StorefrontPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background px-4 text-center">
      <div>
        <h1 className="text-3xl font-bold">Store not found</h1>
        <p className="text-muted-foreground mt-2">
          This storefront isn't available or hasn't been published yet.
        </p>
      </div>
    </div>
  ),
});

function StorefrontPage() {
  const { store } = Route.useLoaderData();
  const palette = Array.isArray(store.palette) ? (store.palette as string[]) : [];
  const primary = palette[0] ?? "#1F2A24";
  const accent = palette[1] ?? "#3E7C5A";
  const surface = palette[3] ?? "#F4EFE6";
  const text = palette[0] ?? "#111";

  return (
    <div style={{ background: surface, color: text }} className="min-h-screen">
      <header className="px-8 py-6 flex items-center justify-between border-b" style={{ borderColor: `${primary}22` }}>
        <div className="text-xl font-bold tracking-tight">{store.name}</div>
        <nav className="flex gap-6 text-sm font-medium opacity-80">
          <a href="#shop">Shop</a>
        </nav>
      </header>

      <section className="px-8 py-20 text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight" style={{ color: primary }}>
          {store.name}
        </h1>
        <p className="mt-6 text-lg opacity-80 max-w-2xl mx-auto">{store.description}</p>
        <button
          className="mt-8 px-8 py-3 rounded-full font-semibold text-white"
          style={{ background: accent }}
        >
          Shop now
        </button>
      </section>

      <section id="shop" className="px-8 pb-20 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Featured</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border"
              style={{ borderColor: `${primary}22`, background: "#fff" }}
            >
              <div className="aspect-square" style={{ background: `${accent}22` }} />
              <div className="p-4">
                <div className="font-semibold">Product {i}</div>
                <div className="text-sm opacity-70 mt-1">${(i * 12 + 18).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer
        className="px-8 py-8 text-center text-sm border-t"
        style={{ borderColor: `${primary}22` }}
      >
        <div className="opacity-70">
          Powered by{" "}
          <a href={APP_URL} className="underline">
            Market Eye
          </a>
        </div>
      </footer>
    </div>
  );
}
