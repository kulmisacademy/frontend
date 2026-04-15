"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  images: string[];
  /** Shown when `open` becomes true */
  initialIndex?: number;
  productName?: string;
};

export function ProductImageLightbox({
  open,
  onClose,
  images,
  initialIndex = 0,
  productName = "Product",
}: Props) {
  const list = images.length > 0 ? images : ["/placeholder-product.svg"];
  const [active, setActive] = React.useState(0);
  const safe = Math.min(active, list.length - 1);
  const touchStartX = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (open) {
      const i = Math.min(Math.max(0, initialIndex), list.length - 1);
      setActive(i);
    }
  }, [open, initialIndex, list.length]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setActive((p) => (p + 1) % list.length);
      }
      if (e.key === "ArrowLeft") {
        setActive((p) => (p - 1 + list.length) % list.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, list.length, onClose]);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function goNext() {
    setActive((prev) => (prev + 1) % list.length);
  }

  function goPrev() {
    setActive((prev) => (prev - 1 + list.length) % list.length);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const threshold = 48;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
    touchStartX.current = null;
  }

  if (!open || typeof document === "undefined") return null;

  const src = list[safe] ?? list[0];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} — image preview`}
      className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex shrink-0 items-center justify-end gap-2 p-3 sm:p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {list.length > 1 ? (
          <span className="mr-auto text-sm tabular-nums text-white/80">
            {safe + 1} / {list.length}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="Close"
        >
          <X className="size-6" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 sm:px-6"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {list.length > 1 ? (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-1 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4 sm:size-12"
            aria-label="Previous image"
          >
            <ChevronLeft className="size-7 sm:size-8" />
          </button>
        ) : null}

        <div
          key={safe}
          className={cn(
            "laas-lightbox-image-swap relative h-[min(80vh,720px)] w-full max-w-5xl"
          )}
        >
          <Image
            src={src}
            alt={productName}
            fill
            className="object-contain object-center p-2 transition-opacity duration-300 ease-out"
            sizes="100vw"
            priority
          />
        </div>

        {list.length > 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-1 z-10 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4 sm:size-12"
            aria-label="Next image"
          >
            <ChevronRight className="size-7 sm:size-8" />
          </button>
        ) : null}
      </div>

      {list.length > 1 ? (
        <div
          className="flex shrink-0 justify-center gap-2 overflow-x-auto px-4 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {list.map((thumb, i) => (
            <button
              key={`${thumb}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-zinc-900 transition-colors sm:h-16 sm:w-16",
                i === safe
                  ? "border-white ring-2 ring-white/40"
                  : "border-white/20 opacity-70 hover:opacity-100"
              )}
              aria-label={`Image ${i + 1}`}
              aria-current={i === safe}
            >
              <Image
                src={thumb}
                alt=""
                fill
                className="object-cover object-center"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body
  );
}
