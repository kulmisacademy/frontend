"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";
import type { CatalogPlan } from "@/lib/plan-types";
import {
  SUBSCRIPTION_CONTACT_PHONE,
  SUBSCRIPTION_CONTACT_WHATSAPP,
} from "@/lib/subscription";
import { cn } from "@/lib/utils";

function formatPlanPrice(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  defaultStoreName: string;
  defaultPhone: string;
  onSubmitted: () => void | Promise<void>;
  /** Paid plans from GET /api/vendor/plan-catalog */
  catalogPlans?: CatalogPlan[];
  /** When opening from a specific plan card */
  initialPlanId?: string | null;
  defaultRequestType?: "plan" | "verified";
};

export function UpgradePlanModal({
  open,
  onOpenChange,
  token,
  defaultStoreName,
  defaultPhone,
  onSubmitted,
  catalogPlans = [],
  initialPlanId,
  defaultRequestType = "plan",
}: Props) {
  const [mounted, setMounted] = React.useState(false);
  const [storeName, setStoreName] = React.useState(defaultStoreName);
  const [phone, setPhone] = React.useState(defaultPhone);
  const [notes, setNotes] = React.useState("");
  const [requestType, setRequestType] = React.useState<"plan" | "verified">("plan");
  const [targetPlanId, setTargetPlanId] = React.useState("");
  const [durationMonths, setDurationMonths] = React.useState("12");
  const [submitting, setSubmitting] = React.useState(false);
  const [submitErr, setSubmitErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (open) {
      setStoreName(defaultStoreName);
      setPhone(defaultPhone || "");
      setNotes("");
      setRequestType(defaultRequestType);
      setDurationMonths("12");
      setSubmitErr(null);
      setDone(false);
      const first = catalogPlans[0]?.id ?? "";
      const hint =
        initialPlanId && catalogPlans.some((p) => p.id === initialPlanId)
          ? initialPlanId
          : first;
      setTargetPlanId(hint);
    }
  }, [open, defaultStoreName, defaultPhone, catalogPlans, initialPlanId, defaultRequestType]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitErr(null);
    try {
      const dm = Number(durationMonths);
      const body: Record<string, unknown> = {
        request_type: requestType,
        contact_phone: phone.trim(),
        duration_months:
          requestType === "verified"
            ? [1, 3, 6, 12].includes(dm)
              ? dm
              : 1
            : Math.max(1, Math.min(120, dm || 1)),
        notes:
          [notes.trim(), `Store: ${storeName.trim()}`]
            .filter(Boolean)
            .join(" · ") || undefined,
      };
      if (requestType === "plan") {
        if (!targetPlanId) {
          throw new Error("Select a plan");
        }
        body.target_plan_id = targetPlanId;
      }
      await apiFetch("/api/vendor/subscription-request", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      });
      setDone(true);
      await onSubmitted();
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || !open) return null;

  const body = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        aria-label="Close"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-plan-title"
        className={cn(
          "relative z-[101] w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl",
          "transition-all duration-200 ease-out motion-reduce:transition-none"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/80 px-5 py-4">
          <h2
            id="upgrade-plan-title"
            className="font-heading text-lg font-bold tracking-tight"
          >
            Request upgrade
          </h2>
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[min(70dvh,560px)] overflow-y-auto px-5 py-5">
          {done ? (
            <div className="space-y-4 text-sm leading-relaxed">
              <p className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 font-medium text-foreground">
                We received your request. Our team will confirm shortly.
              </p>
              <p className="text-muted-foreground">
                Call or WhatsApp{" "}
                <span className="font-semibold text-foreground">
                  {SUBSCRIPTION_CONTACT_PHONE}
                </span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="rounded-xl" asChild>
                  <a
                    href={SUBSCRIPTION_CONTACT_WHATSAPP}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open WhatsApp
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Request type
                </legend>
                <div className="flex gap-3 text-sm">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="rt"
                      checked={requestType === "plan"}
                      onChange={() => setRequestType("plan")}
                    />
                    Paid plan (limits)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="rt"
                      checked={requestType === "verified"}
                      onChange={() => setRequestType("verified")}
                    />
                    Verified badge only
                  </label>
                </div>
              </fieldset>

              {requestType === "plan" ? (
                <>
                  {catalogPlans.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No paid plans are available yet. Please contact support.
                    </p>
                  ) : (
                    <label className="block space-y-1">
                      <span className="text-sm font-medium">Plan</span>
                      <select
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        value={targetPlanId}
                        onChange={(e) => setTargetPlanId(e.target.value)}
                        required
                      >
                        {catalogPlans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatPlanPrice(p.price ?? 0)}) — {p.productLimit}{" "}
                            products, {p.videoLimit} videos
                            {p.aiDailyLimit != null
                              ? `, ${p.aiDailyLimit} AI/day (UTC)`
                              : p.aiUnlimited
                                ? ", AI unlimited"
                                : `, ${p.aiLimit ?? 0} AI total`}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Requested billing period (months)</span>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      className="rounded-xl"
                    />
                  </label>
                </>
              ) : (
                <label className="block space-y-1">
                  <span className="text-sm font-medium">Badge duration</span>
                  <select
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                  >
                    <option value="1">1 month</option>
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                  </select>
                </label>
              )}

              <div className="space-y-2">
                <label htmlFor="up-store" className="text-sm font-medium">
                  Store name
                </label>
                <Input
                  id="up-store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="rounded-xl"
                  required
                  minLength={1}
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="up-phone" className="text-sm font-medium">
                  Phone
                </label>
                <Input
                  id="up-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl"
                  placeholder="+252…"
                  required
                  minLength={5}
                  maxLength={40}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="up-notes" className="text-sm font-medium">
                  Notes (optional)
                </label>
                <Input
                  id="up-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="rounded-xl"
                  placeholder="Best time to call"
                  maxLength={2000}
                />
              </div>
              {submitErr ? (
                <p className="text-sm text-destructive">{submitErr}</p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl"
                  disabled={submitting || (requestType === "plan" && catalogPlans.length === 0)}
                >
                  {submitting ? (
                    <>
                      <Spinner className="size-4" />
                      Submitting…
                    </>
                  ) : (
                    "Submit request"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
