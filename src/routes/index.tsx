import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Market Eye — Competitor & Trend Intelligence" },
      { name: "description", content: "Track competitors, discover trending products, and ship SEO content from one dashboard." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">Market Eye</h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-xl">
        Real-time competitor monitoring, trend discovery, and brand tooling — powered by Firecrawl & Supabase.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild size="lg"><Link to="/auth">Get started</Link></Button>
        <Button asChild size="lg" variant="outline"><Link to="/auth">Sign in</Link></Button>
      </div>
    </div>
  );
}
