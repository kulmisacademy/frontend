"use client";

import * as React from "react";
import Link from "next/link";
import { Crown, ExternalLink, Trash2, CalendarClock, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";
import { cn } from "@/lib/utils";

type StoreRow = {
  id: string;
  store_name: string;
  slug: string;
  status?: string | null;
  plan?: string;
  plan_id?: string | null;
  plan_expires_at?: string | null;
  verified?: boolean;
  verified_expires_at?: string | null;
  whatsapp_phone?: string | null;
  created_at?: string;
  owner?: { name: string; email: string; phone: string | null } | null;
  product_count?: number;
  video_count?: number;
};

type PlanOption = {
  id: string;
  name: string;
  slug: string;
  is_system?: boolean;
};

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold">{title}</h2>
          <Button type="button" variant="ghost" size="sm" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminStoresPage() {
  const { user, loading } = useAdminSession();
  const [rows, setRows] = React.useState<StoreRow[]>([]);
  const [plans, setPlans] = React.useState<PlanOption[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [patching, setPatching] = React.useState<string | null>(null);
  const [assignPlanStore, setAssignPlanStore] = React.useState<StoreRow | null>(null);
  const [assignVerifiedStore, setAssignVerifiedStore] = React.useState<StoreRow | null>(null);
  const [planPick, setPlanPick] = React.useState("");
  const [planMonths, setPlanMonths] = React.useState("12");
  const [verifiedMonths, setVerifiedMonths] = React.useState<"1" | "3" | "6" | "12">("12");

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const [storeData, planData] = await Promise.all([
        adminFetch<{ stores: StoreRow[] }>("/stores"),
        adminFetch<{ plans: PlanOption[] }>("/plans"),
      ]);
      setRows(storeData.stores);
      setPlans(
        (planData.plans || []).filter((p) => p.slug !== "free")
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!assignPlanStore || plans.length === 0) return;
    setPlanPick((prev) => {
      if (prev && plans.some((p) => p.id === prev)) return prev;
      return plans.find((p) => p.slug === "premium")?.id ?? plans[0]?.id ?? "";
    });
  }, [assignPlanStore?.id, plans]);

  async function patchJson(id: string, body: unknown) {
    if (!user) return;
    setPatching(id);
    setErr(null);
    try {
      await adminFetch<{ store: StoreRow }>(`/stores/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPatching(null);
    }
  }

  async function submitAssignPlan() {
    if (!assignPlanStore || !planPick) return;
    const months = Math.max(1, Math.min(120, Number(planMonths) || 1));
    if (!window.confirm(`Assign selected plan for ${months} month(s)?`)) return;
    await patchJson(assignPlanStore.id, {
      assign_plan: { plan_id: planPick, duration_months: months },
    });
    setAssignPlanStore(null);
  }

  async function submitAssignVerified() {
    if (!assignVerifiedStore) return;
    const m = Number(verifiedMonths) as 1 | 3 | 6 | 12;
    if (!window.confirm(`Grant verified badge for ${m} month(s)?`)) return;
    await patchJson(assignVerifiedStore.id, {
      assign_verified: { duration_months: m },
    });
    setAssignVerifiedStore(null);
  }

  async function quickPremium(s: StoreRow) {
    const prem = plans.find((p) => p.slug === "premium");
    if (!prem) {
      setErr("Premium plan not found — run database migration / seed plans.");
      return;
    }
    if (
      !window.confirm(
        "Apply Premium for 12 months + verified badge for 12 months? (legacy shortcut)"
      )
    ) {
      return;
    }
    setErr(null);
    await patchJson(s.id, {
      assign_plan: { plan_id: prem.id, duration_months: 12 },
    });
    await patchJson(s.id, {
      assign_verified: { duration_months: 12 },
    });
  }

  async function setFree(s: StoreRow) {
    if (!window.confirm(`Reset “${s.store_name}” to Free and remove verified?`)) return;
    await patchJson(s.id, { set_free: true });
  }

  async function removeStore(id: string, name: string) {
    if (!user) return;
    if (!window.confirm(`Delete store “${name}” and all its products? This cannot be undone.`)) {
      return;
    }
    setDeleting(id);
    setErr(null);
    try {
      await adminFetch(`/stores/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function fmtDate(iso: string | null | undefined) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
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
    <div className="min-w-0 space-y-6">
      {assignPlanStore ? (
        <Modal title="Assign plan" onClose={() => setAssignPlanStore(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Store:{" "}
              <span className="font-medium text-foreground">{assignPlanStore.store_name}</span>
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Plan</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={planPick}
                onChange={(e) => setPlanPick(e.target.value)}
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Duration (months)</span>
              <Input
                type="number"
                min={1}
                max={120}
                value={planMonths}
                onChange={(e) => setPlanMonths(e.target.value)}
                className="rounded-xl"
              />
            </label>
            <Button
              type="button"
              className="w-full rounded-xl"
              disabled={patching === assignPlanStore.id || !planPick}
              onClick={() => void submitAssignPlan()}
            >
              Save
            </Button>
          </div>
        </Modal>
      ) : null}

      {assignVerifiedStore ? (
        <Modal title="Verified badge" onClose={() => setAssignVerifiedStore(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Visual badge only — does not change plan limits. Store:{" "}
              <span className="font-medium text-foreground">{assignVerifiedStore.store_name}</span>
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-medium">Duration</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={verifiedMonths}
                onChange={(e) => setVerifiedMonths(e.target.value as "1" | "3" | "6" | "12")}
              >
                <option value="1">1 month</option>
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
              </select>
            </label>
            <Button
              type="button"
              className="w-full rounded-xl"
              disabled={patching === assignVerifiedStore.id}
              onClick={() => void submitAssignVerified()}
            >
              Grant badge
            </Button>
          </div>
        </Modal>
      ) : null}

      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
          Stores
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty break-words">
          Assign subscription plans (limits) and verified badges (separate, time-based).
        </p>
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      {busy && rows.length === 0 ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-10" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No stores yet.
        </div>
      ) : (
        <>
          <div className="space-y-4 lg:hidden">
            {rows.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm"
              >
                <div className="min-w-0 space-y-3">
                  <div>
                    <h2 className="font-heading text-lg font-semibold break-words">{s.store_name}</h2>
                    <p className="break-all font-mono text-xs text-muted-foreground">{s.slug}</p>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-xs font-medium text-muted-foreground">Owner</dt>
                      <dd className="mt-0.5 break-words text-foreground">
                        {s.owner ? (
                          <>
                            <span className="font-medium">{s.owner.name}</span>
                            <span className="mt-0.5 block break-all text-xs text-muted-foreground">
                              {s.owner.email}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Products</dt>
                      <dd className="mt-0.5 tabular-nums">{s.product_count ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Videos</dt>
                      <dd className="mt-0.5 tabular-nums">{s.video_count ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">Plan</dt>
                      <dd className="mt-0.5">
                        <Badge variant="secondary" className="capitalize">
                          {s.plan || "free"}
                        </Badge>
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-muted-foreground">Plan expires</dt>
                      <dd className="mt-0.5 text-xs text-muted-foreground">{fmtDate(s.plan_expires_at)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium text-muted-foreground">Verified</dt>
                      <dd className="mt-0.5">
                        {s.verified ? (
                          <Badge variant="outline" className="w-fit text-[10px]">
                            On
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {fmtDate(s.verified_expires_at)}
                        </span>
                      </dd>
                    </div>
                  </dl>
                  <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-auto min-h-10 w-full whitespace-normal rounded-xl py-2 text-left leading-tight"
                        disabled={patching === s.id}
                        onClick={() => {
                          setPlanMonths("12");
                          setAssignPlanStore(s);
                        }}
                      >
                        <CalendarClock className="mr-1 size-3.5 shrink-0" />
                        Assign plan
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-auto min-h-10 w-full whitespace-normal rounded-xl py-2 text-left leading-tight"
                        disabled={patching === s.id}
                        onClick={() => setAssignVerifiedStore(s)}
                      >
                        <BadgeCheck className="mr-1 size-3.5 shrink-0" />
                        Verified badge
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-auto min-h-10 w-full whitespace-normal rounded-xl py-2 text-left leading-tight sm:col-span-2"
                        disabled={patching === s.id}
                        onClick={() => void quickPremium(s)}
                      >
                        <Crown className="mr-1 size-3.5 shrink-0" />
                        Premium + verified (12&nbsp;mo)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-auto min-h-10 w-full rounded-xl sm:col-span-2"
                        disabled={patching === s.id}
                        onClick={() => void setFree(s)}
                      >
                        Set Free
                      </Button>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" size="sm" className="w-full rounded-xl sm:flex-1" asChild>
                        <Link href={`/store/${s.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 size-3.5" />
                          View storefront
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full rounded-xl sm:flex-1"
                        disabled={deleting === s.id}
                        onClick={() => void removeStore(s.id, s.store_name)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        Delete store
                      </Button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Videos</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Expires</th>
                  <th className="px-4 py-3 font-medium">Verified</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium">{s.store_name}</span>
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {s.slug}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.owner ? (
                        <>
                          <span className="text-foreground">{s.owner.name}</span>
                          <span className="mt-0.5 block text-xs">{s.owner.email}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.product_count ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{s.video_count ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize">
                        {s.plan || "free"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {fmtDate(s.plan_expires_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        {s.verified ? (
                          <Badge variant="outline" className="w-fit text-[10px]">
                            On
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {fmtDate(s.verified_expires_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={patching === s.id}
                          onClick={() => {
                            setPlanMonths("12");
                            setAssignPlanStore(s);
                          }}
                        >
                          <CalendarClock className="mr-1 size-3.5" />
                          Assign plan
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          disabled={patching === s.id}
                          onClick={() => setAssignVerifiedStore(s)}
                        >
                          <BadgeCheck className="mr-1 size-3.5" />
                          Verified badge
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl"
                          disabled={patching === s.id}
                          onClick={() => void quickPremium(s)}
                        >
                          <Crown className="mr-1 size-3.5" />
                          Premium + verified (12m)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          disabled={patching === s.id}
                          onClick={() => void setFree(s)}
                        >
                          Set Free
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" className="rounded-xl" asChild>
                          <Link href={`/store/${s.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-1 size-3.5" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="rounded-xl"
                          disabled={deleting === s.id}
                          onClick={() => void removeStore(s.id, s.store_name)}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
