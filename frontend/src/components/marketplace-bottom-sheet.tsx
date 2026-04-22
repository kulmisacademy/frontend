"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarketplaceBottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  titleId?: string;
  children: React.ReactNode;
  /** Sticky footer (e.g. Apply / Reset) */
  footer?: React.ReactNode;
  /** Max height class for panel */
  maxHeightClassName?: string;
};

export function MarketplaceBottomSheet({
  open,
  onOpenChange,
  title,
  titleId = "marketplace-sheet-title",
  children,
  footer,
  maxHeightClassName = "max-h-[min(90dvh,720px)]",
}: MarketplaceBottomSheetProps) {
  const tc = useTranslations("common");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label={tc("close")}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "relative mt-auto flex w-full flex-col rounded-t-2xl border border-border/80 bg-card shadow-2xl",
          maxHeightClassName,
          "animate-[marketplace-sheet-in_0.38s_cubic-bezier(0.32,0.72,0,1)_forwards]"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
          <h2 id={titleId} className="font-heading text-lg font-bold tracking-tight">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 shrink-0 rounded-full"
            onClick={() => onOpenChange(false)}
            aria-label={tc("close")}
          >
            <X className="size-5" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border/60 bg-card/95 px-4 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-sm dark:bg-card/98 dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]">
            <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
