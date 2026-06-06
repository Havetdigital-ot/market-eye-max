import {
  createFileRoute,
  Outlet,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Palette,
  FileText,
  Bell,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppShell,
});

const nav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app/competitors", label: "Competitors", icon: Users },
  { to: "/app/discovery", label: "Product Discovery", icon: Sparkles },
  { to: "/app/brand", label: "Brand Builder", icon: Palette },
  { to: "/app/seo", label: "SEO Content", icon: FileText },
];

function AppShell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["badge", "alerts"] });
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "background_tasks" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["badge", "tasks"] });
          queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "competitor_products" },
        () => queryClient.invalidateQueries({ queryKey: ["products"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trends" },
        () => queryClient.invalidateQueries({ queryKey: ["trends"] }),
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon">
          <SidebarHeader className="p-4">
            <div className="font-semibold">Market Eye</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => {
                    const active = item.exact
                      ? pathname === item.to
                      : pathname.startsWith(item.to);
                    const badge =
                      item.to === "/app"
                        ? unreadAlerts
                        : item.to === "/app/competitors"
                          ? runningTasks
                          : 0;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={active}>
                          <Link to={item.to} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.label}</span>
                            {badge > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {badge}
                              </Badge>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-2">
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              {unreadAlerts} unread · {runningTasks} running
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
