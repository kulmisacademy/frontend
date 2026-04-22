"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "@/components/ui/section";

export function SiteFooter() {
  const t = useTranslations("footer");
  const links = [
    { href: "/marketplace", label: t("marketplace") },
    { href: "/stores", label: t("stores") },
    { href: "/affiliate/register", label: t("affiliate") },
    { href: "/register?type=vendor", label: t("becomeVendor") },
    { href: "/account/orders", label: t("myOrders") },
    { href: "/login", label: t("signIn") },
  ];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/25">
      <PageContainer className="py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md space-y-3">
            <p className="font-heading text-lg font-bold">LAAS24</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("tagline")}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </PageContainer>
      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        {t("rights", { year })}
      </div>
    </footer>
  );
}
