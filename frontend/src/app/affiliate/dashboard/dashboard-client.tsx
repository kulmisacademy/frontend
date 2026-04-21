"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  Copy,
  Loader2,
  Share2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { affiliateApiFetch } from "@/lib/affiliate-api";
import { getAffiliateToken } from "@/lib/affiliate-auth-storage";
import { AffiliateDashboardShell } from "./affiliate-dashboard-shell";
import { cn } from "@/lib/utils";

type Overview = {
  affiliate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    ref_code: string;
  };
  referral_url: string;
  stats: {
    total_referrals: number;
    referrals_by_status: Record<string, number>;
    total_earnings: number;
    pending_earnings: number;
    withdrawable: number;
    paid_out: number;
    has_open_withdrawal: boolean;
    min_withdrawal: number;
  };
};

type ReferralRow = {
  id: string;
  store_id: string;
  status: string;
  store: { store_name: string; slug: string | null; plan_slug: string | null } | null;
};

type CommissionRow = {
  id: string;
  store_id: string | null;
  plan_slug: string | null;
  plan_price: number | null;
  amount: number;
  status: string;
  source: string;
  store_name: string | null;
  plan_name: string | null;
};

function statusClass(status: string) {
  switch (status) {
    case "verified":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
    case "pending":
      return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
    case "requested":
    case "approved":
      return "bg-sky-500/15 text-sky-800 dark:text-sky-300";
    case "paid":
      return "bg-violet-500/15 text-violet-800 dark:text-violet-300";
    case "rejected":
      return "bg-destructive/15 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function AffiliateDashboardClient() {
  const router = useRouter();
  /**
   * Token is read only in useEffect so the first client paint matches SSR:
   * never call getAffiliateToken() during render (storage can differ per environment).
   */
  const [mounted, setMounted] = React.useState(false);
  const [clientToken, setClientToken] = React.useState<string | null>(null);
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [referrals, setReferrals] = React.useState<ReferralRow[]>([]);
  const [commissions, setCommissions] = React.useState<CommissionRow[]>([]);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [method, setMethod] = React.useState<"evc_plus" | "sahal" | "whatsapp">(
    "evc_plus"
  );
  const [payPhone, setPayPhone] = React.useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = React.useState(false);
  const [withdrawErr, setWithdrawErr] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!getAffiliateToken()) return;
    setLoadErr(null);
    try {
      const [o, r, c] = await Promise.all([
        affiliateApiFetch<Overview>("/api/affiliate/overview"),
        affiliateApiFetch<{ referrals: ReferralRow[] }>("/api/affiliate/referrals"),
        affiliateApiFetch<{ commissions: CommissionRow[] }>(
          "/api/affiliate/commissions"
        ),
      ]);
      setOverview(o);
      setReferrals(r.referrals);
      setCommissions(c.commissions);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const token = getAffiliateToken();
    setMounted(true);
    setClientToken(token);
    if (!token) {
      router.replace("/affiliate/login");
      return;
    }
    void refresh();
    // Intentionally mount-only: `refresh` is stable (empty deps); avoid re-reading storage on parent re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once after mount
  }, []);

  async function copyLink() {
    const url = overview?.referral_url;
    if (!url || !navigator.clipboard) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const url = overview?.referral_url;
    if (!url) return;
    const text = `Join LAAS24 marketplace with my link: ${url}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function submitWithdrawal(e: React.FormEvent) {
    e.preventDefault();
    setWithdrawErr(null);
    setWithdrawSubmitting(true);
    try {
      await affiliateApiFetch("/api/affiliate/withdrawals", {
        method: "POST",
        body: JSON.stringify({ method, phone: payPhone }),
      });
      setWithdrawOpen(false);
      setPayPhone("");
      await refresh();
    } catch (err) {
      setWithdrawErr(
        err instanceof Error ? err.message : "Withdrawal request failed"
      );
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  const s = overview?.stats;
  const minW = s?.min_withdrawal ?? 0;
  const withdrawableAmt = s?.withdrawable ?? 0;
  const canWithdraw =
    withdrawableAmt > 0 &&
    withdrawableAmt >= minW &&
    !s?.has_open_withdrawal;

  const showBootSpinner = !mounted || !clientToken;
  const showContentSpinner = mounted && !!clientToken && loading;

  return (
    <AffiliateDashboardShell>
      {showBootSpinner || showContentSpinner ? (
        <div className="flex justify-center py-16 sm:py-20">
          <Spinner className="size-10" />
        </div>
      ) : loadErr ? (
        <p className="text-pretty px-1 text-center text-sm text-destructive sm:text-base">
          {loadErr}
        </p>
      ) : (
        <div className="min-w-0 space-y-8 animate-in fade-in duration-500 sm:space-y-10">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
              Hello, {overview?.affiliate.name ?? "there"}
            </h1>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              Track referred stores and earnings in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {(
              [
                {
                  title: "Withdrawable",
                  value: s?.withdrawable ?? 0,
                  icon: Wallet,
                  hint: `Min. payout $${minW.toFixed(2)}`,
                  format: "money" as const,
                },
                {
                  title: "Pending review",
                  value: s?.pending_earnings ?? 0,
                  icon: Loader2,
                  hint: "Stores still qualifying",
                  format: "money" as const,
                },
                {
                  title: "Paid out",
                  value: s?.paid_out ?? 0,
                  icon: Check,
                  hint: "Completed payouts",
                  format: "money" as const,
                },
                {
                  title: "Referred stores",
                  value: s?.total_referrals ?? 0,
                  icon: Building2,
                  hint: "All-time signups",
                  format: "int" as const,
                },
              ] as const
            ).map((card) => (
              <Card
                key={card.title}
                className="overflow-hidden border-border/80 transition-transform duration-300 hover:-translate-y-0.5"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2 sm:p-6 sm:pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">
                    {card.title}
                  </CardTitle>
                  <card.icon className="size-4 shrink-0 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 sm:px-6 sm:pb-6">
                  <p className="font-heading text-xl font-bold tabular-nums sm:text-2xl">
                    {card.format === "int"
                      ? String(card.value)
                      : `$${Number(card.value).toFixed(2)}`}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    {card.hint}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="min-w-0 border-border/80">
            <CardHeader className="space-y-2 p-4 sm:p-6">
              <CardTitle className="flex items-start gap-2 text-lg sm:items-center sm:text-xl">
                <Share2 className="mt-0.5 size-5 shrink-0 sm:mt-0" />
                <span>Your referral link</span>
              </CardTitle>
              <CardDescription className="text-pretty text-xs leading-relaxed sm:text-sm">
                Share this URL. We store it for 90 days when someone visits with{" "}
                <code className="rounded bg-muted px-1">?ref=</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-3 p-4 pt-0 sm:flex-row sm:items-center sm:gap-3 sm:p-6 sm:pt-0">
              <Input
                readOnly
                value={overview?.referral_url ?? ""}
                className="min-h-11 min-w-0 flex-1 break-all font-mono text-xs sm:min-h-10 sm:text-sm"
              />
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 min-h-11 w-full rounded-2xl sm:h-10 sm:min-h-10 sm:w-auto"
                  onClick={() => void copyLink()}
                >
                  {copied ? (
                    <Check className="mr-2 size-4" />
                  ) : (
                    <Copy className="mr-2 size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  className="h-11 min-h-11 w-full rounded-2xl bg-[#25D366] text-white hover:bg-[#20bd5a] sm:h-10 sm:min-h-10 sm:w-auto"
                  onClick={shareWhatsApp}
                >
                  WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h2 className="font-heading text-lg font-bold sm:text-xl">
              Request withdrawal
            </h2>
            <Button
              className="h-auto min-h-11 w-full whitespace-normal rounded-2xl px-4 py-2.5 text-center text-sm leading-snug sm:min-h-10 sm:w-auto sm:whitespace-nowrap sm:py-2 sm:text-sm"
              disabled={!canWithdraw}
              onClick={() => setWithdrawOpen(true)}
            >
              <span className="sm:hidden">
                {s?.has_open_withdrawal
                  ? "Withdrawal in progress"
                  : !canWithdraw
                    ? `Min. $${minW.toFixed(2)} to withdraw`
                    : "Withdraw all available"}
              </span>
              <span className="hidden sm:inline">
                {s?.has_open_withdrawal
                  ? "Withdrawal in progress"
                  : !canWithdraw
                    ? `Need $${minW.toFixed(2)}+ available`
                    : "Withdraw all available"}
              </span>
            </Button>
          </div>

          {withdrawOpen ? (
            <Card className="mx-auto w-full min-w-0 max-w-lg border-primary/30">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Payout details</CardTitle>
                <CardDescription className="text-pretty text-xs leading-relaxed sm:text-sm">
                  Full available balance (
                  <strong>${(s?.withdrawable ?? 0).toFixed(2)}</strong>) will be
                  requested. Choose how you want to receive funds.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                <form className="space-y-4" onSubmit={(e) => void submitWithdrawal(e)}>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Payment method</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["evc_plus", "EVC Plus"],
                          ["sahal", "Sahal"],
                          ["whatsapp", "WhatsApp"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setMethod(value)}
                          className={cn(
                            "min-h-11 w-full rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors sm:min-h-10 sm:w-auto sm:px-4",
                            method === value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:bg-muted/80"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="payout-phone">
                      Phone number
                    </label>
                    <Input
                      id="payout-phone"
                      value={payPhone}
                      onChange={(e) => setPayPhone(e.target.value)}
                      required
                      placeholder="+252…"
                      inputMode="tel"
                      className="h-11 min-h-11 rounded-xl text-base sm:h-10 sm:min-h-10 sm:text-sm"
                    />
                  </div>
                  {withdrawErr ? (
                    <p className="text-pretty text-sm text-destructive">{withdrawErr}</p>
                  ) : null}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 min-h-11 w-full rounded-2xl sm:h-10 sm:min-h-10 sm:w-auto"
                      onClick={() => setWithdrawOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="h-11 min-h-11 w-full rounded-2xl sm:h-10 sm:min-h-10 sm:w-auto"
                      disabled={withdrawSubmitting}
                    >
                      {withdrawSubmitting ? (
                        <>
                          <Spinner className="mr-2 size-4" />
                          Submitting…
                        </>
                      ) : (
                        "Submit request"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          <Card className="min-w-0 border-border/80">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg">My stores</CardTitle>
              <CardDescription className="text-pretty text-xs leading-relaxed sm:text-sm">
                Pending = referred but not yet qualified. Verified = meets banner,
                logo, 10+ products, and at least one approved order.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {referrals.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No referrals yet. Share your link to get started.
                </p>
              ) : (
                <>
                  <ul className="space-y-3 md:hidden">
                    {referrals.map((r) => (
                      <li
                        key={r.id}
                        className="rounded-xl border border-border/60 bg-muted/15 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 font-medium leading-snug break-words">
                            {r.store?.store_name ?? "—"}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                              statusClass(r.status)
                            )}
                          >
                            {r.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs capitalize text-muted-foreground">
                          Plan: {r.store?.plan_slug ?? "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Store</th>
                          <th className="pb-2 pr-4 font-medium">Plan</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referrals.map((r) => (
                          <tr key={r.id} className="border-b border-border/60">
                            <td className="py-3 pr-4 font-medium">
                              {r.store?.store_name ?? "—"}
                            </td>
                            <td className="py-3 pr-4 capitalize">
                              {r.store?.plan_slug ?? "—"}
                            </td>
                            <td className="py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                                  statusClass(r.status)
                                )}
                              >
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 border-border/80">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg">Earnings</CardTitle>
              <CardDescription className="text-pretty text-xs leading-relaxed sm:text-sm">
                Commissions unlock when the store qualifies and a paid plan is
                approved by LAAS24.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              {commissions.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">No earnings yet.</p>
              ) : (
                <>
                  <ul className="space-y-3 md:hidden">
                    {commissions.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-xl border border-border/60 bg-muted/15 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-medium leading-snug break-words">
                            {c.source === "manual_bonus"
                              ? "Manual bonus"
                              : (c.store_name ?? "—")}
                          </p>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                              statusClass(c.status)
                            )}
                          >
                            {c.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <span className="capitalize">
                            {c.plan_name ?? c.plan_slug ?? "—"}
                          </span>
                          <span className="font-semibold tabular-nums text-foreground">
                            ${Number(c.amount).toFixed(2)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="pb-2 pr-4 font-medium">Store</th>
                          <th className="pb-2 pr-4 font-medium">Plan</th>
                          <th className="pb-2 pr-4 font-medium">Amount</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commissions.map((c) => (
                          <tr key={c.id} className="border-b border-border/60">
                            <td className="py-3 pr-4">
                              {c.source === "manual_bonus"
                                ? "Manual bonus"
                                : (c.store_name ?? "—")}
                            </td>
                            <td className="py-3 pr-4 capitalize">
                              {c.plan_name ?? c.plan_slug ?? "—"}
                            </td>
                            <td className="py-3 pr-4 font-semibold tabular-nums">
                              ${Number(c.amount).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                                  statusClass(c.status)
                                )}
                              >
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AffiliateDashboardShell>
  );
}
