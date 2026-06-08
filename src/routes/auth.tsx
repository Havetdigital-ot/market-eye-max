import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Sign in — Market Eye Pro" }],
  }),
  component: AuthPage,
});

const DEMO_EMAIL = "joe@marketeye.demo";
const DEMO_PASSWORD = "Demo!MarketEye-2026#Preview";
const DEMO_NAME = "Joe Demo";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [fullName, setFullName] = useState(DEMO_NAME);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app" });
    });
  }, [navigate]);

  async function signInOrAutoCreate(emailVal: string, pwVal: string, nameVal: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: emailVal, password: pwVal });
    if (!error) return;
    // Auto-create the demo account on first use so anyone can click "Sign in"
    const msg = (error.message || "").toLowerCase();
    if (msg.includes("invalid") || msg.includes("not found") || msg.includes("credentials")) {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: emailVal,
        password: pwVal,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
          data: { full_name: nameVal },
        },
      });
      if (signUpErr) throw signUpErr;
      if (data.user) {
        await supabase.rpc("seed_demo_data", { p_user: data.user.id });
      }
      // Some projects require a fresh sign-in after signUp
      const { error: retryErr } = await supabase.auth.signInWithPassword({ email: emailVal, password: pwVal });
      if (retryErr && !data.session) throw retryErr;
      return;
    }
    throw error;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.rpc("seed_demo_data", { p_user: data.user.id });
        }
        toast.success("Account created");
      } else {
        await signInOrAutoCreate(email, password, fullName || DEMO_NAME);
        toast.success("Welcome");
      }
      navigate({ to: "/app" });
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Market Eye Pro</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to your dashboard" : "Create your account"}
          </p>
        </div>
        <div className="mb-4 rounded-md border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">

          Demo mode — credentials are pre-filled. Just click <span className="font-medium text-foreground">Sign in</span> to explore the dashboard.
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}
          {/* honeypot to discourage browser autofill of saved creds */}
          <input type="text" name="username" autoComplete="username" defaultValue={DEMO_EMAIL} style={{ display: "none" }} readOnly />
          <input type="password" name="password" autoComplete="current-password" defaultValue="" style={{ display: "none" }} readOnly />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="demo-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="demo-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {mode === "signin" ? (
            <>
              No account?{" "}
              <button className="text-primary underline" onClick={() => setMode("signup")}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{" "}
              <button className="text-primary underline" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:underline">
            ← Back home
          </Link>
        </div>
      </Card>
    </div>
  );
}
