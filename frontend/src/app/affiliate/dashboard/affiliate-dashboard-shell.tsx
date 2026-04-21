"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { clearAffiliateSession } from "@/lib/affiliate-auth-storage";

const links = [{ href: "/affiliate/dashboard", label: "Overview" }];

export function AffiliateDashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearAffiliateSession();
    router.push("/affiliate/login");
    router.refresh();
  }

  return (
    <div className="min-h-[100dvh] bg-muted/20 pb-[env(safe-area-inset-bottom)]">
      <div className="border-b border-border/80 bg-card/80 backdrop-blur-sm">
        <PageContainer className="flex flex-col gap-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4 sm:py-4">
          <div className="min-w-0 pr-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
              LAAS24 Affiliates
            </p>
            <p className="font-heading text-base font-bold leading-tight sm:text-lg">
              Partner dashboard
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <div className="flex flex-wrap gap-2">
              {links.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "inline-flex min-h-10 min-w-0 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    {l.label}
                  </Link>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 w-full shrink-0 rounded-2xl sm:h-10 sm:min-h-10 sm:w-auto"
              onClick={logout}
            >
              Log out
            </Button>
          </div>
        </PageContainer>
      </div>
      <PageContainer className="py-6 sm:py-8">{children}</PageContainer>
    </div>
  );
}
