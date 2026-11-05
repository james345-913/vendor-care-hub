import type { ReactNode } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  MessageSquareWarning,
  Megaphone,
  UserRound,
  Users,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/hooks/use-member";
import { cn } from "@/lib/utils";

const baseNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { to: "/announcements", label: "Notices", icon: Megaphone },
  { to: "/profile", label: "My profile", icon: UserRound },
] as const;

export function AppShell() {
  const { data } = useMember();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const linkCls =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const activeCls = "bg-sidebar-accent text-sidebar-accent-foreground";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden flex-col bg-sidebar bg-weave p-5 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-warm font-display text-lg font-extrabold text-accent-foreground">
            SU
          </span>
          <span className="font-display text-lg font-bold text-sidebar-foreground">Market Guard</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {baseNav.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: activeCls }}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          {data?.isAdmin && (
            <>
              <p className="mt-6 px-3 text-xs font-bold uppercase tracking-widest text-sidebar-primary">
                Officials
              </p>
              <Link to="/members" className={linkCls} activeProps={{ className: activeCls }}>
                <Users className="h-4 w-4" /> Members
              </Link>
            </>
          )}
        </nav>
        <div className="border-t border-sidebar-border pt-4">
          <p className="truncate px-3 text-sm font-semibold text-sidebar-foreground">
            {data?.profile?.full_name || data?.user.email}
          </p>
          <p className="px-3 text-xs text-sidebar-foreground/60">{data?.profile?.membership_number}</p>
          <button onClick={signOut} className={cn(linkCls, "mt-2 w-full")}>
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="font-display text-lg font-bold text-primary">
          Market Guard
        </Link>
        <button onClick={signOut} className="flex items-center gap-1 text-sm text-muted-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </header>

      <main className="px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-card lg:hidden">
        {(data?.isAdmin
          ? [baseNav[0], baseNav[1], baseNav[2], { to: "/members", label: "Members", icon: Users } as const]
          : baseNav
        ).map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
