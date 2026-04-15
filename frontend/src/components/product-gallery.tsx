"use client";

import * as React from "react";
import Image from "next/image";
import { ProductImageLightbox } from "@/components/product-image-lightbox";
import { cn } from "@/lib/utils";

type Props = {
  images: string[];
  alt: string;
  className?: string;
};

export function ProductGallery({ images, alt, className }: Props) {
  const list = images.length > 0 ? images : ["/placeholder-product.svg"];
  const [active, setActive] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const safe = Math.min(active, list.length - 1);
  const main = list[safe] ?? list[0];

  return (
    <div className={cn("w-full space-y-3 sm:space-y-4", className)}>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={cn(
          "group relative mx-auto h-[350px] w-full max-w-2xl cursor-zoom-in overflow-hidden rounded-2xl border border-border/80 bg-[#f9fafb] text-left outline-none dark:bg-muted/40",
          "shadow-[0_1px_0_0_hsl(var(--border)),0_24px_48px_-12px_rgba(0,0,0,0.12)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)]",
          "ring-offset-2 transition-opacity hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-primary/50"
        )}
        aria-label={`${alt} — open fullscreen gallery`}
      >
        <Image
          src={main}
          alt={alt}
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 672px"
        />
      </button>

      <ProductImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={list}
        initialIndex={safe}
        productName={alt}
      />
      {list.length > 1 ? (
        <div className="flex flex-wrap gap-2 sm:gap-2.5">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-[70px] w-[70px] shrink-0 overflow-hidden rounded-xl border-2 bg-[#f9fafb] transition-colors dark:bg-muted/35",
                i === safe
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-border/60 opacity-90 hover:opacity-100"
              )}
              aria-label={`View image ${i + 1}`}
              aria-current={i === safe}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover object-center"
                sizes="70px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
