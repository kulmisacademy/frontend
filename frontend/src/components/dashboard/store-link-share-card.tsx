"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/context/dashboard-i18n-context";
import { storePublicUrl } from "@/lib/urls";

type Props = {
  slug: string;
  storeName?: string | null;
};

export function StoreLinkShareCard({ slug, storeName }: Props) {
  const { t } = useDashboardI18n();
  const url = React.useMemo(() => storePublicUrl(slug), [slug]);
  const [copyState, setCopyState] = React.useState<"idle" | "ok" | "err">("idle");

  React.useEffect(() => {
    if (copyState === "idle") return;
    const id = window.setTimeout(() => setCopyState("idle"), 3500);
    return () => window.clearTimeout(id);
  }, [copyState]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("ok");
    } catch {
      setCopyState("err");
    }
  }

  const waHref = React.useMemo(() => {
    const intro = t("vendorDashboard.storeLinkWaMessage");
    const name = storeName?.trim();
    const body = name
      ? `${intro}\n${name}\n${url}`
      : `${intro}\n${url}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(body)}`;
  }, [storeName, t, url]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {t("vendorDashboard.storeLinkCardTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t("vendorDashboard.storeLinkCardHint")}
          </p>
        </div>
      </div>

      <p className="mt-4 break-all rounded-xl border border-border/60 bg-muted/25 px-4 py-3 font-mono text-sm text-foreground">
        {url}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          onClick={() => void handleCopy()}
        >
          <Copy className="size-4" />
          {t("vendorDashboard.storeLinkCopy")}
        </Button>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href={`/store/${slug}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
            {t("vendorDashboard.storeLinkOpen")}
          </Link>
        </Button>
        <Button variant="whatsapp" className="rounded-2xl" asChild>
          <a href={waHref} target="_blank" rel="noopener noreferrer">
            {t("vendorDashboard.storeLinkWhatsApp")}
          </a>
        </Button>
      </div>

      {copyState !== "idle" ? (
        <p
          className={
            copyState === "ok"
              ? "mt-3 text-sm font-medium text-primary"
              : "mt-3 text-sm font-medium text-destructive"
          }
          role="status"
          aria-live="polite"
        >
          {copyState === "ok"
            ? t("vendorDashboard.storeLinkCopied")
            : t("vendorDashboard.storeLinkCopyFailed")}
        </p>
      ) : null}
    </div>
  );
}
