import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { CartLink } from "@/components/cart-link";
import { PageContainer } from "@/components/ui/section";
import { AuthNav } from "@/components/auth-nav";

const nav = [
  { href: "/", label: "Home" },
  { href: "/stores", label: "Stores" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/dashboard", label: "Vendor" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      <PageContainer className="flex flex-col gap-0 py-2.5 md:py-3">
        <div className="flex min-h-11 items-center gap-2 sm:min-h-12 sm:gap-3 md:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center"
          >
            <Image
              src="/laas24-logo.png"
              alt="LAAS24"
              width={480}
              height={160}
              priority
              sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 200px"
              className="h-8 w-auto max-h-8 max-w-[min(200px,52vw)] object-contain object-left sm:h-9 sm:max-h-9 sm:max-w-[min(220px,48vw)] md:h-9 md:max-w-[240px] lg:h-10 lg:max-h-10 lg:max-w-[260px]"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden min-w-0 flex-1 lg:block">
            <label className="relative block">
              <span className="sr-only">Search products</span>
              <Input
                type="search"
                placeholder="Search products, stores…"
                className="h-11 rounded-2xl border-border/80 bg-muted/35 pl-4 pr-4 text-sm"
              />
            </label>
          </div>

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <CartLink />
            <div className="flex items-center gap-1 sm:gap-2">
              <AuthNav />
            </div>
          </div>
        </div>

        <div className="mt-2.5 border-t border-border/40 pt-2.5 lg:hidden">
          <Input
            type="search"
            placeholder="Search marketplace…"
            className="h-11 rounded-2xl border-border/80 bg-muted/35"
          />
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
