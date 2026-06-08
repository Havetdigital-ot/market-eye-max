import {
  createFileRoute,
  Outlet,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Radar,
  Sparkles,
  Star,
  FileText,
  LogOut,
  Search,
  Store as StoreIcon,
  ListChecks,
  Bell,
} from "lucide-react";
import marketEyeIcon from "@/assets/market-eye-icon.png.asset.json";
import { toast } from "sonner";
import { GlobalSearch } from "@/components/app/global-search";
import { NotificationsPopover } from "@/components/app/notifications-popover";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badgeKey?: "tasks" | "alerts";
};

const NAV: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/competitors", label: "Competitor Monitor", icon: Radar },
  { to: "/app/discovery", label: "Product Discovery", icon: Sparkles },
  { to: "/app/brand", label: "Brand Builder", icon: Star },
  { to: "/app/seo", label: "SEO Content", icon: FileText },
  { to: "/app/store", label: "Store Generator", icon: StoreIcon },
  { to: "/app/alerts", label: "Alerts", icon: Bell, badgeKey: "alerts" },
  { to: "/app/tasks", label: "Task Log", icon: ListChecks, badgeKey: "tasks" },
];

const TITLES: Record<string, string> = {
  "/app": "Dashboard",
  "/app/competitors": "Competitor Monitor",
  "/app/discovery": "Product Discovery",
  "/app/brand": "Brand Builder",
  "/app/seo": "SEO Content",
  "/app/store": "Store Generator",
  "/app/alerts": "Alerts",
  "/app/tasks": "Task Log",
};


function AppShell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["me", "profile"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: unreadAlerts = 0 } = useQuery({
    queryKey: ["badge", "alerts"],
    queryFn: async () => {
      const { count } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  const { data: runningTasks = 0 } = useQuery({
    queryKey: ["badge", "tasks"],
    queryFn: async () => {
      const { count } = await supabase
        .from("background_tasks")
        .select("id", { count: "exact", head: true })
        .eq("dismissed", false)
        .in("status", ["Running", "Pending"]);
      return count ?? 0;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("app-sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["badge", "alerts"] });
        queryClient.invalidateQueries({ queryKey: ["alerts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "background_tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["badge", "tasks"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["crawl-tasks"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "competitor_products" }, () =>
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "trends" }, () =>
        queryClient.invalidateQueries({ queryKey: ["trends"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const fullName =
    ((profile?.user_metadata as any)?.full_name as string | undefined) ??
    profile?.email ??
    "User";
  const company = ((profile?.user_metadata as any)?.company_name as string | undefined) ?? "Workspace";
  const initials = fullName
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const title = TITLES[pathname] ?? "Market Eye";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: "var(--canvas)" }}>
        <Sidebar collapsible="icon">
          {/* Brand */}
          <SidebarHeader className="px-5 pt-5 pb-4">
            <Link to="/app" className="flex items-center gap-2.5">
              <img
                src={marketEyeIcon.url}
                alt="Market Eye"
                className="w-9 h-9 object-contain shrink-0"
              />
              <div className="leading-tight flex items-baseline gap-1.5">
                <span className="text-white font-extrabold text-[17px] tracking-tight">
                  Market Eye
                </span>
              </div>
            </Link>
          </SidebarHeader>

          {/* Nav */}
          <SidebarContent className="px-3 gap-0">
            <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-sidebar-foreground/60 px-3 pt-4 pb-1.5">
              {company}
            </div>
            <nav className="flex flex-col gap-0.5">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.to
                  : pathname.startsWith(item.to);
                const badge =
                  item.badgeKey === "tasks" ? runningTasks
                  : item.badgeKey === "alerts" ? unreadAlerts
                  : 0;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    className={`relative flex items-center gap-[11px] px-3 py-[9px] rounded-[9px] text-sm font-medium transition-colors
                      ${active
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"}`}
                  >
                    {active && (
                      <span
                        className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r"
                        style={{ background: "oklch(0.62 0.176 264)" }}
                      />
                    )}
                    <Icon className="h-[18px] w-[18px] opacity-85 shrink-0" />
                    <span className="flex-1 whitespace-nowrap">{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto min-w-[19px] h-[19px] px-1.5 rounded-full grid place-items-center text-[11px] font-bold font-mono text-white"
                        style={{ background: "oklch(0.62 0.176 264)" }}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </SidebarContent>

          {/* User chip */}
          <SidebarFooter className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] hover:bg-sidebar-accent cursor-pointer group">
              <div className="w-8 h-8 rounded-full grid place-items-center text-white font-bold text-[13px] shrink-0"
                style={{
                  background:
                    "linear-gradient(150deg, oklch(0.6 0.13 200), oklch(0.55 0.15 280))",
                }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-white leading-tight truncate">
                  {fullName}
                </div>
                <div className="text-[12px] text-sidebar-foreground/60 truncate">
                  {company}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"
                onClick={handleSignOut}
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <header className="h-16 px-6 flex items-center gap-4 border-b bg-background/60 backdrop-blur sticky top-0 z-30">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-bold tracking-tight">{title}</h1>
            <div className="flex-1" />
            <SearchBox onOpen={() => setSearchOpen(true)} />
            <NotificationsPopover count={unreadAlerts} />
          </header>
          <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

          <main className="flex-1 overflow-auto p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function SearchBox({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="hidden md:flex items-center gap-2 px-3.5 h-10 rounded-full bg-background border w-[360px] hover:bg-muted/40 transition-colors text-left"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm text-muted-foreground">
        Search competitors, products, trends…
      </span>
      <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-muted-foreground bg-muted">
        ⌘K
      </kbd>
    </button>
  );
}
