"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationBarProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** 1 … 4 5 6 … 10 style when many pages */
function buildPageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
      result.push("gap");
    }
    result.push(sorted[i]!);
  }
  return result;
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationBarProps) {
  const t = useTranslations("common");
  if (totalPages <= 1) return null;

  const items = buildPageList(currentPage, totalPages);

  return (
    <nav
      className={cn(
        "flex flex-col items-center gap-4 sm:flex-row sm:justify-center",
        className
      )}
      aria-label={t("pagination")}
    >
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 rounded-2xl border-border/80 shadow-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={t("previousPage")}
        >
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-1 px-1">
          {items.map((item, i) =>
            item === "gap" ? (
              <span
                key={`gap-${i}`}
                className="flex size-10 items-center justify-center text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  "flex min-w-10 items-center justify-center rounded-2xl px-2 py-2 text-sm font-semibold tabular-nums transition-all",
                  item === currentPage
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                aria-current={item === currentPage ? "page" : undefined}
              >
                {item}
              </button>
            )
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 rounded-2xl border-border/80 shadow-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={t("nextPage")}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
