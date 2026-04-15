import Link from "next/link";
import { PageContainer } from "@/components/ui/section";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/stores", label: "Stores" },
  { href: "/register?type=vendor", label: "Become a vendor" },
  { href: "/account/orders", label: "My orders" },
  { href: "/login", label: "Sign in" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/25">
      <PageContainer className="py-12">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-md space-y-3">
            <p className="font-heading text-lg font-bold">LAAS24</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A modern multi-vendor marketplace for Somalia and beyond—optimized
              for speed, sharing, and WhatsApp-first ordering.
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
        © {new Date().getFullYear()} LAAS24. All rights reserved.
      </div>
    </footer>
  );
}
