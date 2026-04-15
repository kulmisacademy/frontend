import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { Store } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BANNER_FALLBACK = "/placeholder-banner.svg";

type StoreCardProps = {
  store: Store;
  className?: string;
};

export function StoreCard({ store, className }: StoreCardProps) {
  const cover = store.bannerUrl?.trim() || BANNER_FALLBACK;

  return (
    <div
      className={cn(
        "group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card sm:rounded-2xl",
        "shadow-card transition-all duration-300 ease-out will-change-transform",
        "hover:scale-[1.02] hover:shadow-card-hover",
        className
      )}
    >
      <div className="relative">
        <Link
          href={`/store/${store.slug}`}
          className="relative block h-[140px] w-full shrink-0 overflow-hidden bg-gradient-to-br from-muted to-muted/60 sm:h-[160px]"
          aria-label={`${store.name} store`}
        >
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
        </Link>

        <div className="relative z-10 -mt-[26px] flex justify-center px-4 sm:-mt-7">
          <div className="relative size-[50px] shrink-0 overflow-hidden rounded-full border-[3px] border-card bg-card shadow-md ring-1 ring-border/50">
            <Image
              src={store.logo}
              alt={store.name}
              fill
              sizes="50px"
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-4 pb-4 pt-1 text-center sm:px-5 sm:pb-5 sm:pt-2">
        <Link
          href={`/store/${store.slug}`}
          className="font-heading line-clamp-2 text-[14px] font-bold leading-tight text-foreground transition-colors hover:text-primary sm:text-lg sm:leading-tight"
        >
          {store.name}
        </Link>
        <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-[11px] leading-snug text-muted-foreground sm:mt-2.5 sm:gap-2 sm:text-sm">
          <MapPin
            className="mt-0.5 size-3.5 shrink-0 text-primary/80 sm:size-4"
            aria-hidden
          />
          <span className="line-clamp-2 min-w-0">
            {store.city}
            <span className="text-border"> · </span>
            <span className="text-muted-foreground/90">{store.region}</span>
          </span>
        </p>
        <p className="mt-1.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:mt-3 sm:text-xs">
          {store.productCount} product{store.productCount === 1 ? "" : "s"}
        </p>
        <Button
          className="mt-3 h-9 w-full gap-1.5 rounded-xl px-3 text-[11px] font-semibold shadow-sm sm:mt-5 sm:h-11 sm:rounded-2xl sm:text-sm"
          asChild
        >
          <Link href={`/store/${store.slug}`}>
            <span className="truncate sm:hidden">View</span>
            <span className="hidden truncate sm:inline">View store</span>
            <ArrowRight className="size-3.5 shrink-0 sm:size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
