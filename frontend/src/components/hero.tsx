import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/section";

const HERO_BOX_IMAGES = ["/hero/H1.png", "/hero/H2.png", "/hero/H3.png", "/hero/H4.png"] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/[0.06] via-background to-background dark:from-primary/10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(900px circle at 20% 10%, rgba(22,163,74,0.18), transparent 55%), radial-gradient(700px circle at 80% 30%, rgba(250,204,21,0.12), transparent 50%)",
        }}
      />
      <PageContainer className="relative py-14 sm:py-16 md:py-20 lg:py-24">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex-1 space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              Multi-vendor marketplace · WhatsApp-ready orders
            </p>
            <h1 className="font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Shop local.{" "}
              <span className="text-primary">Sell everywhere.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              LAAS24 connects Somali vendors and buyers with a fast marketplace,
              shareable store links, and one-tap WhatsApp ordering—built for real
              commerce, not just browsing.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" className="rounded-2xl px-8" asChild>
                <Link href="/marketplace">
                  Browse marketplace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl border-primary/25 bg-background/60 px-8"
                asChild
              >
                <Link href="/register?type=vendor">
                  <MessageCircle className="size-4 text-primary" />
                  Open your store
                </Link>
              </Button>
            </div>
            <dl className="grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-8 text-sm">
              <div>
                <dt className="text-muted-foreground">Vendors</dt>
                <dd className="font-heading text-xl font-bold">2 min</dd>
                <dd className="text-xs text-muted-foreground">to go live</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Orders</dt>
                <dd className="font-heading text-xl font-bold">WhatsApp</dd>
                <dd className="text-xs text-muted-foreground">primary flow</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Scale</dt>
                <dd className="font-heading text-xl font-bold">10K+</dd>
                <dd className="text-xs text-muted-foreground">DAU ready</dd>
              </div>
            </dl>
          </div>

          <div className="flex-1">
            <div className="relative mx-auto max-w-md rounded-3xl border border-border/70 bg-card p-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
              <div className="overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-muted/80 to-muted/30 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Preview · Storefront
                    </p>
                    <p className="font-heading text-lg font-bold">
                      laas24.com/store/your-name
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-secondary-foreground">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {HERO_BOX_IMAGES.map((src, i) => (
                    <div
                      key={src}
                      className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-primary/15"
                    >
                      <Image
                        src={src}
                        alt={`Storefront preview ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 45vw, 200px"
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/80 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/80">
                  <span>Share link · Copy · WhatsApp</span>
                  <span className="font-mono text-[10px] text-primary">
                    ●●●
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
