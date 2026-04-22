"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("vendorNav");
  const pathname = usePathname();
  const links = [
    { href: "/dashboard", label: t("overview") },
    { href: "/dashboard/products", label: t("products") },
    { href: "/dashboard/orders", label: t("orders") },
    { href: "/dashboard/settings", label: t("settings") },
  ];
  return (
    <>
      <div className="border-b border-border/80 bg-muted/30">
        <PageContainer className="flex flex-wrap gap-2 py-3 md:gap-3">
          {links.map((l) => {
            const active =
              l.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </PageContainer>
      </div>
      {children}
    </>
  );
}
