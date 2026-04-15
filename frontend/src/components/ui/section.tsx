import * as React from "react";
import { cn } from "@/lib/utils";

/** Vertical padding aligned with the product detail page for marketing routes */
export const MARKETING_PAGE_PY = "py-8 md:py-12 lg:py-14";

type SectionProps = React.HTMLAttributes<HTMLElement> & {
  as?: "section" | "div";
  bleed?: boolean;
};

export function PageContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1200px] px-4",
        className
      )}
      {...props}
    />
  );
}

export function Section({
  as: Comp = "section",
  bleed,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Comp
      className={cn(!bleed && MARKETING_PAGE_PY, className)}
      {...props}
    >
      {children}
    </Comp>
  );
}
