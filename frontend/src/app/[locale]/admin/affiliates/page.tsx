"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";
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
import { cn } from "@/lib/utils";

type Settings = {
  commission_type: "percent" | "fixed";
  commission_value: number;
  min_withdrawal: number;
  first_n_bonus_stores: number;
  first_n_bonus_extra_percent: number;
};

type AffiliateRow = {
  id: string;
  name: string;
  email: string;
  ref_code: string;
  referral_count: number;
  verified_referrals: number;
  total_commission_amount: number;
};

type WithdrawalRow = {
  id: string;
  affiliate_id: string;
  amount: number;
  status: string;
  method: string;
  phone: string;
  created_at: string;
  affiliate: { name: string; email: string; ref_code: string } | null;
};

type ReferralRow = {
  id: string;
  store_id: string;
  status: string;
  store: { store_name: string; slug: string | null } | null;
};

function methodLabel(m: string) {
  if (m === "evc_plus") return "EVC Plus";
  if (m === "sahal") return "Sahal";
  if (m === "whatsapp") return "WhatsApp";
  return m;
}

export default function AdminAffiliatesPage() {
  const { user, loading } = useAdminSession();
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [affiliates, setAffiliates] = React.useState<AffiliateRow[]>([]);
  const [withdrawals, setWithdrawals] = React.useState<WithdrawalRow[]>([]);
  const [wFilter, setWFilter] = React.useState<"all" | "pending" | "approved" | "paid">(
    "pending"
  );
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [referralModal, setReferralModal] = React.useState<AffiliateRow | null>(
    null
  );
  const [referrals, setReferrals] = React.useState<ReferralRow[]>([]);
  const [loadingRefs, setLoadingRefs] = React.useState(false);
  const [bonusAffiliate, setBonusAffiliate] = React.useState<AffiliateRow | null>(
    null
  );
  const [bonusAmount, setBonusAmount] = React.useState("");
  const [bonusNotes, setBonusNotes] = React.useState("");

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const [st, aff, wd] = await Promise.all([
        adminFetch<{ settings: Settings }>("/affiliate-settings"),
        adminFetch<{ affiliates: AffiliateRow[] }>("/affiliates"),
        adminFetch<{ withdrawals: WithdrawalRow[] }>(
          `/affiliate-withdrawals?status=${wFilter}`
        ),
      ]);
      setSettings(st.settings);
      setAffiliates(aff.affiliates);
      setWithdrawals(wd.withdrawals);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user, wFilter]);

  React.useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await adminFetch<{ settings: Settings }>("/affiliate-settings", {
        method: "PATCH",
        body: JSON.stringify(settings),
      });
      setSettings(res.settings);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function openReferrals(a: AffiliateRow) {
    setReferralModal(a);
    setLoadingRefs(true);
    setReferrals([]);
    try {
      const r = await adminFetch<{ referrals: ReferralRow[] }>(
        `/affiliate-referrals?affiliate_id=${encodeURIComponent(a.id)}`
      );
      setReferrals(r.referrals);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed referrals");
    } finally {
      setLoadingRefs(false);
    }
  }

  async function rejectReferral(id: string) {
    const reason = window.prompt("Rejection reason (required)");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      await adminFetch(`/affiliate-referrals/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejection_reason: reason.trim() }),
      });
      if (referralModal) await openReferrals(referralModal);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitBonus(e: React.FormEvent) {
    e.preventDefault();
    if (!bonusAffiliate) return;
    const amt = parseFloat(bonusAmount);
    if (!Number.isFinite(amt) || amt <= 0) return;
    setBusy(true);
    try {
      await adminFetch(`/affiliates/${bonusAffiliate.id}/manual-bonus`, {
        method: "POST",
        body: JSON.stringify({
          amount: amt,
          notes: bonusNotes.trim() || null,
        }),
      });
      setBonusAffiliate(null);
      setBonusAmount("");
      setBonusNotes("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bonus failed");
    } finally {
      setBusy(false);
    }
  }

  async function actWithdrawal(
    id: string,
    action: "approve" | "reject" | "paid"
  ) {
    setBusy(true);
    try {
      if (action === "reject") {
        const note = window.prompt("Optional note for affiliate") || "";
        await adminFetch(`/affiliate-withdrawals/${id}/reject`, {
          method: "POST",
          body: JSON.stringify({ admin_note: note || null }),
        });
      } else if (action === "approve") {
        await adminFetch(`/affiliate-withdrawals/${id}/approve`, {
          method: "POST",
        });
      } else {
        await adminFetch(`/affiliate-withdrawals/${id}/paid`, {
          method: "POST",
        });
      }
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Affiliates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Commission rules, referred stores, and payout requests.
          </p>
        </div>
        <Button variant="outline" className="rounded-2xl" asChild>
          <Link href="/admin">← Admin home</Link>
        </Button>
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Commission settings</CardTitle>
          <CardDescription>
            Percent is taken from the subscription plan price when a referred
            store&apos;s paid plan request is approved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {settings ? (
            <form className="grid max-w-xl gap-4 sm:grid-cols-2" onSubmit={saveSettings}>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={settings.commission_type}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commission_type: e.target.value as Settings["commission_type"],
                    })
                  }
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {settings.commission_type === "percent"
                    ? "Percent (e.g. 10 = 10%)"
                    : "Fixed ($ per approval)"}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.commission_value}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      commission_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Minimum withdrawal ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.min_withdrawal}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      min_withdrawal: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">First N stores (bonus tier)</label>
                <Input
                  type="number"
                  value={settings.first_n_bonus_stores}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      first_n_bonus_stores: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Extra % on first N</label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.first_n_bonus_extra_percent}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      first_n_bonus_extra_percent:
                        parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="rounded-2xl" disabled={busy}>
                  Save settings
                </Button>
              </div>
            </form>
          ) : (
            <Spinner className="size-6" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Withdrawals</CardTitle>
            <CardDescription>Approve, then mark as paid after transfer.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "paid", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setWFilter(f === "all" ? "all" : f)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold capitalize",
                  wFilter === f ? "bg-primary text-primary-foreground" : "bg-muted"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 pr-3">Affiliate</th>
                <th className="pb-2 pr-3">Amount</th>
                <th className="pb-2 pr-3">Method</th>
                <th className="pb-2 pr-3">Phone</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-muted-foreground">
                    No withdrawals in this filter.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{w.affiliate?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.affiliate?.email}
                      </div>
                    </td>
                    <td className="py-2 pr-3 font-semibold">${Number(w.amount).toFixed(2)}</td>
                    <td className="py-2 pr-3">{methodLabel(w.method)}</td>
                    <td className="py-2 pr-3">{w.phone}</td>
                    <td className="py-2 pr-3 capitalize">{w.status}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {w.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              className="h-8 rounded-lg text-xs"
                              type="button"
                              disabled={busy}
                              onClick={() => void actWithdrawal(w.id, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs"
                              type="button"
                              disabled={busy}
                              onClick={() => void actWithdrawal(w.id, "reject")}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {w.status === "approved" ? (
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs"
                            type="button"
                            disabled={busy}
                            onClick={() => void actWithdrawal(w.id, "paid")}
                          >
                            Mark paid
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affiliates</CardTitle>
          <CardDescription>Performance overview and manual rewards.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="pb-2 pr-3">Name</th>
                <th className="pb-2 pr-3">Code</th>
                <th className="pb-2 pr-3">Referrals</th>
                <th className="pb-2 pr-3">Earnings</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="py-2 pr-3">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">{a.email}</div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">{a.ref_code}</td>
                  <td className="py-2 pr-3">
                    {a.verified_referrals} verified / {a.referral_count} total
                  </td>
                  <td className="py-2 pr-3 font-semibold">
                    ${a.total_commission_amount.toFixed(2)}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-lg text-xs"
                        type="button"
                        onClick={() => void openReferrals(a)}
                      >
                        Referrals
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs"
                        type="button"
                        onClick={() => setBonusAffiliate(a)}
                      >
                        Bonus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {referralModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setReferralModal(null)}
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-heading text-lg font-bold">
                Referrals — {referralModal.name}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl"
                onClick={() => setReferralModal(null)}
              >
                Close
              </Button>
            </div>
            {loadingRefs ? (
              <Spinner className="size-6" />
            ) : (
              <ul className="space-y-2 text-sm">
                {referrals.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{r.store?.store_name ?? "—"}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {r.status}
                      </p>
                    </div>
                    {r.status === "pending" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-8 rounded-lg text-xs"
                        disabled={busy}
                        onClick={() => void rejectReferral(r.id)}
                      >
                        Reject
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {bonusAffiliate ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={() => setBonusAffiliate(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
            <h2 className="font-heading text-lg font-bold">
              Manual bonus — {bonusAffiliate.name}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={(e) => void submitBonus(e)}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount ($)</label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Input
                  value={bonusNotes}
                  onChange={(e) => setBonusNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setBonusAffiliate(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="rounded-2xl" disabled={busy}>
                  Add bonus
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
