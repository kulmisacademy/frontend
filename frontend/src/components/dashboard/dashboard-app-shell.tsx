"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  MessageSquare,
  Store,
  Sparkles,
  Menu,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Home,
  Users,
  Settings,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useOptionalAdminSession } from "@/components/dashboard/admin-session-context";

const STORAGE_KEY = "laas24-sidebar-collapsed";

export type DashboardNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const vendorNav: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/plan", label: "My Plan", icon: CreditCard },
  { href: "/dashboard/plans", label: "Plans", icon: Sparkles },
  { href: "/dashboard/settings", label: "Store settings", icon: Store },
];

const adminNav: DashboardNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/stores", label: "Stores", icon: Store },
  { href: "/admin/plans", label: "Plans", icon: Sparkles },
  { href: "/admin/subscription-requests", label: "Upgrades", icon: CreditCard },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({
  items,
  collapsed,
  onNavigate,
}: {
  items: DashboardNavItem[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const active =
          item.href === "/dashboard" || item.href === "/admin"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon className="size-5 shrink-0" aria-hidden />
            {!collapsed ? <span>{item.label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarColumn({
  variant,
  collapsed,
  setCollapsed,
  onMobileNavigate,
  className,
}: {
  variant: "vendor" | "admin";
  collapsed: boolean;
  setCollapsed: (v: boolean | ((b: boolean) => boolean)) => void;
  onMobileNavigate?: () => void;
  className?: string;
}) {
  const items = variant === "vendor" ? vendorNav : adminNav;
  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-border/80 bg-card",
        className
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border/80 px-3",
          collapsed ? "justify-center" : "justify-between gap-2"
        )}
      >
        {!collapsed ? (
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 font-heading text-lg font-bold tracking-tight"
          >
            <span className="text-primary">LAAS24</span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-base font-semibold">
              {variant === "vendor" ? "Vendor" : "Admin"}
            </span>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary"
            title="LAAS24"
          >
            L
          </Link>
        )}
        <button
          type="button"
          className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? (
            <PanelLeft className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <NavLinks
          items={items}
          collapsed={collapsed}
          onNavigate={onMobileNavigate}
        />
      </div>
      <div
        className={cn(
          "shrink-0 border-t border-border/80 p-2",
          collapsed ? "flex flex-col items-center gap-2" : "space-y-1"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start gap-2 text-muted-foreground",
            collapsed && "justify-center px-0"
          )}
          asChild
          title="Homepage"
        >
          <Link href="/">
            <Home className="size-4 shrink-0" />
            {!collapsed ? "Home" : null}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function DashboardAppShell({
  variant,
  children,
}: {
  variant: "vendor" | "admin";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, loading: authLoading } = useAuth();
  const adminSession = useOptionalAdminSession();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  /** Vendor routes: JWT must be a vendor (API already enforces; this avoids leaking UI to customers). */
  React.useEffect(() => {
    if (variant !== "vendor") return;
    if (authLoading) return;
    if (!user) {
      const next = pathname || "/dashboard";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (user.role !== "vendor") {
      if (user.role === "admin") {
        router.replace("/admin");
      } else {
        router.replace("/marketplace");
      }
    }
  }, [variant, authLoading, user, router, pathname]);

  const vendorRouteBlocked =
    variant === "vendor" &&
    (authLoading || !user || user.role !== "vendor");

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  async function handleLogout() {
    if (variant === "admin" && adminSession) {
      await adminSession.logout();
      router.push("/admin-secure-login");
      router.refresh();
      return;
    }
    await logout();
    router.push("/");
    router.refresh();
  }

  const base = variant === "vendor" ? "/dashboard" : "/admin";

  if (vendorRouteBlocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Spinner className="size-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Mobile */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <button
          type="button"
          className="rounded-lg p-2 text-foreground hover:bg-muted"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="size-6" />
        </button>
        <span className="font-heading font-semibold">
          {variant === "vendor" ? "Vendor" : "Admin"}
        </span>
        <div className="ml-auto">
          <Button variant="ghost" size="sm" className="rounded-xl" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-[60] flex h-full w-[min(280px,88vw)] flex-col border-r border-border/80 shadow-2xl lg:hidden">
            <SidebarColumn
              variant={variant}
              collapsed={false}
              setCollapsed={setCollapsed}
              onMobileNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </>
      ) : null}

      <div className="flex min-h-0 flex-1 lg:min-h-dvh">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 border-r border-border/80 transition-[width] duration-300 ease-out lg:block",
            collapsed ? "w-[4.75rem]" : "w-60"
          )}
        >
          <SidebarColumn
            variant={variant}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            className="h-full min-h-dvh border-r-0"
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="hidden h-14 items-center justify-between gap-4 border-b border-border/80 px-6 lg:flex">
            <p className="truncate text-sm text-muted-foreground">
              {variant === "admin" && adminSession?.user?.email ? (
                <>
                  Signed in as{" "}
                  <span className="font-medium text-foreground">
                    {adminSession.user.email}
                  </span>
                </>
              ) : user?.email ? (
                <>
                  Signed in as{" "}
                  <span className="font-medium text-foreground">{user.email}</span>
                </>
              ) : null}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" asChild>
                <Link href={base}>Overview</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground"
                type="button"
                onClick={() => void handleLogout()}
              >
                <LogOut className="mr-1 size-4" />
                Sign out
              </Button>
            </div>
          </div>

          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1400px] min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
