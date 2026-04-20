"use client";

import * as React from "react";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  price?: number | null;
  product_limit: number;
  video_limit: number;
  ai_limit: number | null;
  ai_daily_limit?: number | null;
  is_system: boolean;
  active: boolean;
  sort_order: number;
};

function formatPlanPrice(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
}

export default function AdminPlansPage() {
  const { user, loading } = useAdminSession();
  const [rows, setRows] = React.useState<PlanRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [productLimit, setProductLimit] = React.useState("50");
  const [videoLimit, setVideoLimit] = React.useState("20");
  const [aiLimit, setAiLimit] = React.useState("-1");
  const [aiDaily, setAiDaily] = React.useState("");
  const [price, setPrice] = React.useState("0");
  const [creating, setCreating] = React.useState(false);
  const [savingRowId, setSavingRowId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch<{ plans: PlanRow[] }>("/plans");
      setRows(data.plans);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreating(true);
    setErr(null);
    try {
      const ai = Number(aiLimit);
      await adminFetch("/plans", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          price: Math.max(0, Number(price) || 0),
          product_limit: Number(productLimit),
          video_limit: Number(videoLimit),
          ai_limit: Number.isFinite(ai) ? ai : -1,
          ai_daily_limit:
            aiDaily.trim() === "" ? -1 : Math.max(0, Math.floor(Number(aiDaily) || 0)),
          sort_order: 10,
          active: true,
        }),
      });
      setName("");
      setSlug("");
      setPrice("0");
      setAiDaily("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function savePlanPrice(id: string, value: string) {
    if (!user) return;
    setSavingRowId(id);
    setErr(null);
    try {
      await adminFetch(`/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ price: Math.max(0, Number(value) || 0) }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update price");
    } finally {
      setSavingRowId(null);
    }
  }

  async function savePlanAiDaily(id: string, raw: string) {
    if (!user) return;
    setSavingRowId(id);
    setErr(null);
    try {
      const ai_daily_limit =
        raw.trim() === "" ? -1 : Math.max(0, Math.floor(Number(raw) || 0));
      await adminFetch(`/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ai_daily_limit }),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update daily AI");
    } finally {
      setSavingRowId(null);
    }
  }

  async function removePlan(id: string, isSystem: boolean) {
    if (!user || isSystem) return;
    if (!window.confirm("Delete this plan? Stores must not depend on it.")) return;
    setErr(null);
    try {
      await adminFetch(`/plans/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
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
    <div className="min-w-0 space-y-8">
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
          Subscription plans
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty break-words">
          Define product, video, and AI limits. Assign plans to stores from{" "}
          <span className="font-medium text-foreground">Stores</span> (separate
          from the verified badge).
        </p>
      </div>

      {err ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </p>
      ) : null}

      <form
        onSubmit={(e) => void createPlan(e)}
        className="min-w-0 rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-6"
      >
        <h2 className="font-heading text-lg font-semibold">Create plan</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          AI total <span className="font-mono">-1</span> = unlimited lifetime uses.
          Daily AI (UTC) empty = no daily cap (then total applies). Slug optional.
          Price is list price (USD in the storefront).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-8">
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-medium">Name</span>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Slug (optional)</span>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="rounded-xl font-mono text-sm"
              placeholder="auto"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Price (USD)</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-xl"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Products</span>
            <Input
              type="number"
              min={0}
              value={productLimit}
              onChange={(e) => setProductLimit(e.target.value)}
              className="rounded-xl"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">Videos</span>
            <Input
              type="number"
              min={0}
              value={videoLimit}
              onChange={(e) => setVideoLimit(e.target.value)}
              className="rounded-xl"
              required
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">AI total (-1=∞)</span>
            <Input
              type="number"
              value={aiLimit}
              onChange={(e) => setAiLimit(e.target.value)}
              className="rounded-xl"
              title="-1 unlimited"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium">AI / day (UTC)</span>
            <Input
              type="number"
              min={0}
              value={aiDaily}
              onChange={(e) => setAiDaily(e.target.value)}
              className="rounded-xl"
              placeholder="none"
              title="Leave empty for no daily cap"
            />
          </label>
        </div>
        <Button type="submit" className="mt-4 rounded-xl" disabled={creating}>
          {creating ? <Spinner className="size-4" /> : <Plus className="mr-1 size-4" />}
          Add plan
        </Button>
      </form>

      {busy && rows.length === 0 ? (
        <div className="flex justify-center py-16">
          <Spinner className="size-10" />
        </div>
      ) : (
        <>
          <ul className="space-y-4 lg:hidden">
            {rows.map((p) => (
              <PlanPriceCard
                key={p.id}
                plan={p}
                savingRowId={savingRowId}
                onSavePrice={(id, v) => void savePlanPrice(id, v)}
                onSaveAiDaily={(id, v) => void savePlanAiDaily(id, v)}
                onRemove={(id, isSystem) => void removePlan(id, isSystem)}
                formatPlanPrice={formatPlanPrice}
              />
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
            <table className="w-full min-w-[1020px] text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Videos</th>
                  <th className="px-4 py-3 font-medium">AI total</th>
                  <th className="px-4 py-3 font-medium">AI/day</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <PlanPriceRow
                    key={p.id}
                    plan={p}
                    savingRowId={savingRowId}
                    onSavePrice={(id, v) => void savePlanPrice(id, v)}
                    onSaveAiDaily={(id, v) => void savePlanAiDaily(id, v)}
                    onRemove={(id, isSystem) => void removePlan(id, isSystem)}
                    formatPlanPrice={formatPlanPrice}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function usePlanRowDrafts(p: PlanRow) {
  const [draft, setDraft] = React.useState(String(p.price ?? 0));
  const [aiDailyDraft, setAiDailyDraft] = React.useState(
    p.ai_daily_limit != null ? String(p.ai_daily_limit) : ""
  );
  React.useEffect(() => {
    setDraft(String(p.price ?? 0));
  }, [p.id, p.price]);
  React.useEffect(() => {
    setAiDailyDraft(p.ai_daily_limit != null ? String(p.ai_daily_limit) : "");
  }, [p.id, p.ai_daily_limit]);
  return { draft, setDraft, aiDailyDraft, setAiDailyDraft };
}

function PlanPriceCard({
  plan: p,
  savingRowId,
  onSavePrice,
  onSaveAiDaily,
  onRemove,
  formatPlanPrice,
}: {
  plan: PlanRow;
  savingRowId: string | null;
  onSavePrice: (id: string, value: string) => void;
  onSaveAiDaily: (id: string, value: string) => void;
  onRemove: (id: string, isSystem: boolean) => void;
  formatPlanPrice: (n: number) => string;
}) {
  const { draft, setDraft, aiDailyDraft, setAiDailyDraft } = usePlanRowDrafts(p);
  return (
    <li className="rounded-2xl border border-border/80 bg-card p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-heading font-semibold break-words">{p.name}</p>
          <p className="break-all font-mono text-xs text-muted-foreground">{p.slug}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {p.is_system ? (
            <Badge variant="secondary" className="text-[10px]">
              System
            </Badge>
          ) : null}
          {!p.active ? (
            <Badge variant="outline" className="text-[10px]">
              Inactive
            </Badge>
          ) : null}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Products</dt>
          <dd className="tabular-nums">{p.product_limit}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Videos</dt>
          <dd className="tabular-nums">{p.video_limit}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">AI total</dt>
          <dd className="tabular-nums">{p.ai_limit == null ? "∞" : p.ai_limit}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-3 border-t border-border/60 pt-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Price (USD)</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              step="0.01"
              className="h-10 min-w-0 flex-1 rounded-xl text-sm"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Price for ${p.name}`}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 rounded-xl"
              disabled={savingRowId === p.id}
              onClick={() => onSavePrice(p.id, draft)}
            >
              {savingRowId === p.id ? <Spinner className="size-3.5" /> : "Save"}
            </Button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatPlanPrice(Number(draft) || 0)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">AI / day (UTC)</p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={0}
              className="h-10 min-w-0 flex-1 rounded-xl text-sm"
              value={aiDailyDraft}
              onChange={(e) => setAiDailyDraft(e.target.value)}
              placeholder="—"
              title="Empty = no daily cap (UTC day)"
              aria-label={`Daily AI cap for ${p.name}`}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 rounded-xl"
              disabled={savingRowId === p.id}
              onClick={() => onSaveAiDaily(p.id, aiDailyDraft)}
            >
              Save
            </Button>
          </div>
        </div>
        {!p.is_system ? (
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onRemove(p.id, p.is_system)}
          >
            <Trash2 className="mr-2 size-4" />
            Delete plan
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function PlanPriceRow({
  plan: p,
  savingRowId,
  onSavePrice,
  onSaveAiDaily,
  onRemove,
  formatPlanPrice,
}: {
  plan: PlanRow;
  savingRowId: string | null;
  onSavePrice: (id: string, value: string) => void;
  onSaveAiDaily: (id: string, value: string) => void;
  onRemove: (id: string, isSystem: boolean) => void;
  formatPlanPrice: (n: number) => string;
}) {
  const { draft, setDraft, aiDailyDraft, setAiDailyDraft } = usePlanRowDrafts(p);

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-3 font-medium">{p.name}</td>
      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.slug}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            className="h-9 w-[6.5rem] rounded-lg text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`Price for ${p.name}`}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 rounded-lg px-2 text-xs"
            disabled={savingRowId === p.id}
            onClick={() => onSavePrice(p.id, draft)}
          >
            {savingRowId === p.id ? <Spinner className="size-3.5" /> : "Save"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {formatPlanPrice(Number(draft) || 0)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 tabular-nums">{p.product_limit}</td>
      <td className="px-4 py-3 tabular-nums">{p.video_limit}</td>
      <td className="px-4 py-3 tabular-nums">{p.ai_limit == null ? "∞" : p.ai_limit}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            min={0}
            className="h-9 w-[4.5rem] rounded-lg text-sm"
            value={aiDailyDraft}
            onChange={(e) => setAiDailyDraft(e.target.value)}
            placeholder="—"
            title="Empty = no daily cap (UTC day)"
            aria-label={`Daily AI cap for ${p.name}`}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 rounded-lg px-2 text-xs"
            disabled={savingRowId === p.id}
            onClick={() => onSaveAiDaily(p.id, aiDailyDraft)}
          >
            Save
          </Button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {p.is_system ? (
            <Badge variant="secondary" className="text-[10px]">
              System
            </Badge>
          ) : null}
          {!p.active ? (
            <Badge variant="outline" className="text-[10px]">
              Inactive
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {!p.is_system ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl text-destructive hover:text-destructive"
            onClick={() => onRemove(p.id, p.is_system)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
