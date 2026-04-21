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

  async function savePlanFull(id: string, patch: Record<string, unknown>) {
    if (!user) return;
    setSavingRowId(id);
    setErr(null);
    try {
      await adminFetch(`/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not update plan");
    } finally {
      setSavingRowId(null);
    }
  }

  async function removePlan(id: string, planName: string, isSystem: boolean) {
    if (!user) return;
    const warn = isSystem
      ? `Delete built-in plan "${planName}"? Re-create a plan with slug free or premium if the app expects it, and reassign any stores first.`
      : `Delete plan "${planName}"? Stores and requests must not reference it.`;
    if (!window.confirm(warn)) return;
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
                onSaveFull={(id, patch) => void savePlanFull(id, patch)}
                onRemove={(id, name, isSystem) => void removePlan(id, name, isSystem)}
                formatPlanPrice={formatPlanPrice}
              />
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Plan name</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Videos</th>
                  <th className="px-4 py-3 font-medium">AI total</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">AI/day</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <PlanPriceRow
                    key={p.id}
                    plan={p}
                    savingRowId={savingRowId}
                    onSaveFull={(id, patch) => void savePlanFull(id, patch)}
                    onRemove={(id, name, isSystem) => void removePlan(id, name, isSystem)}
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

function buildPlanSavePatch(d: {
  name: string;
  slug: string;
  products: string;
  videos: string;
  aiTotal: string;
  price: string;
  aiDaily: string;
  active: boolean;
  fallbackSlug: string;
}): Record<string, unknown> | null {
  const nameT = d.name.trim();
  if (!nameT) return null;
  const slugBase = d.slug.trim().toLowerCase().replace(/\s+/g, "-");
  const slug = slugBase || d.fallbackSlug;
  const aiRaw = d.aiTotal.trim();
  const ai_limit =
    aiRaw === "" || aiRaw === "-1" ? -1 : Math.max(0, Math.floor(Number(aiRaw)));
  const dailyRaw = d.aiDaily.trim();
  const ai_daily_limit = dailyRaw === "" ? -1 : Math.max(0, Math.floor(Number(dailyRaw) || 0));
  return {
    name: nameT,
    slug,
    product_limit: Math.max(0, Math.floor(Number(d.products) || 0)),
    video_limit: Math.max(0, Math.floor(Number(d.videos) || 0)),
    ai_limit,
    price: Math.max(0, Number(d.price) || 0),
    ai_daily_limit,
    active: d.active,
  };
}

function usePlanEditDrafts(p: PlanRow) {
  const [name, setName] = React.useState(p.name);
  const [slug, setSlug] = React.useState(p.slug);
  const [products, setProducts] = React.useState(String(p.product_limit));
  const [videos, setVideos] = React.useState(String(p.video_limit));
  const [aiTotal, setAiTotal] = React.useState(p.ai_limit == null ? "-1" : String(p.ai_limit));
  const [price, setPrice] = React.useState(String(p.price ?? 0));
  const [aiDaily, setAiDaily] = React.useState(
    p.ai_daily_limit != null ? String(p.ai_daily_limit) : ""
  );
  const [active, setActive] = React.useState(p.active);

  React.useEffect(() => {
    setName(p.name);
    setSlug(p.slug);
    setProducts(String(p.product_limit));
    setVideos(String(p.video_limit));
    setAiTotal(p.ai_limit == null ? "-1" : String(p.ai_limit));
    setPrice(String(p.price ?? 0));
    setAiDaily(p.ai_daily_limit != null ? String(p.ai_daily_limit) : "");
    setActive(p.active);
  }, [
    p.id,
    p.name,
    p.slug,
    p.product_limit,
    p.video_limit,
    p.ai_limit,
    p.price,
    p.ai_daily_limit,
    p.active,
  ]);

  return {
    name,
    setName,
    slug,
    setSlug,
    products,
    setProducts,
    videos,
    setVideos,
    aiTotal,
    setAiTotal,
    price,
    setPrice,
    aiDaily,
    setAiDaily,
    active,
    setActive,
  };
}

function PlanPriceCard({
  plan: p,
  savingRowId,
  onSaveFull,
  onRemove,
  formatPlanPrice,
}: {
  plan: PlanRow;
  savingRowId: string | null;
  onSaveFull: (id: string, patch: Record<string, unknown>) => void;
  onRemove: (id: string, name: string, isSystem: boolean) => void;
  formatPlanPrice: (n: number) => string;
}) {
  const st = usePlanEditDrafts(p);
  const busy = savingRowId === p.id;

  function handleSave() {
    const patch = buildPlanSavePatch({
      name: st.name,
      slug: st.slug,
      products: st.products,
      videos: st.videos,
      aiTotal: st.aiTotal,
      price: st.price,
      aiDaily: st.aiDaily,
      active: st.active,
      fallbackSlug: p.slug,
    });
    if (!patch) {
      window.alert("Plan name is required.");
      return;
    }
    onSaveFull(p.id, patch);
  }

  return (
    <li className="rounded-2xl border border-border/80 bg-card p-4 text-sm shadow-sm">
      <div className="mb-3 flex flex-wrap justify-end gap-1">
        {p.is_system ? (
          <Badge variant="secondary" className="text-[10px]">
            System
          </Badge>
        ) : null}
      </div>
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Plan name</span>
          <Input
            value={st.name}
            onChange={(e) => st.setName(e.target.value)}
            className="rounded-xl"
            disabled={busy}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Slug</span>
          <Input
            value={st.slug}
            onChange={(e) => st.setSlug(e.target.value)}
            className="rounded-xl font-mono text-sm"
            disabled={busy}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Products</span>
            <Input
              type="number"
              min={0}
              value={st.products}
              onChange={(e) => st.setProducts(e.target.value)}
              className="rounded-xl"
              disabled={busy}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Videos</span>
            <Input
              type="number"
              min={0}
              value={st.videos}
              onChange={(e) => st.setVideos(e.target.value)}
              className="rounded-xl"
              disabled={busy}
            />
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">
            AI total (−1 = unlimited)
          </span>
          <Input
            type="number"
            value={st.aiTotal}
            onChange={(e) => st.setAiTotal(e.target.value)}
            className="rounded-xl"
            disabled={busy}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Price (USD)</span>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={st.price}
            onChange={(e) => st.setPrice(e.target.value)}
            className="rounded-xl"
            disabled={busy}
          />
          <span className="text-xs text-muted-foreground">
            Preview: {formatPlanPrice(Number(st.price) || 0)}
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">AI / day (UTC)</span>
          <Input
            type="number"
            min={0}
            value={st.aiDaily}
            onChange={(e) => st.setAiDaily(e.target.value)}
            placeholder="empty = none"
            className="rounded-xl"
            disabled={busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border-input"
            checked={st.active}
            onChange={(e) => st.setActive(e.target.checked)}
            disabled={busy}
          />
          Active (shown in upgrade catalog when applicable)
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3">
        <Button
          type="button"
          className="w-full rounded-xl"
          disabled={busy}
          onClick={() => void handleSave()}
        >
          {busy ? <Spinner className="size-4" /> : null}
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy}
          onClick={() => onRemove(p.id, p.name, p.is_system)}
        >
          <Trash2 className="mr-2 size-4" />
          Delete plan
        </Button>
      </div>
    </li>
  );
}

function PlanPriceRow({
  plan: p,
  savingRowId,
  onSaveFull,
  onRemove,
  formatPlanPrice,
}: {
  plan: PlanRow;
  savingRowId: string | null;
  onSaveFull: (id: string, patch: Record<string, unknown>) => void;
  onRemove: (id: string, name: string, isSystem: boolean) => void;
  formatPlanPrice: (n: number) => string;
}) {
  const st = usePlanEditDrafts(p);
  const busy = savingRowId === p.id;

  function handleSave() {
    const patch = buildPlanSavePatch({
      name: st.name,
      slug: st.slug,
      products: st.products,
      videos: st.videos,
      aiTotal: st.aiTotal,
      price: st.price,
      aiDaily: st.aiDaily,
      active: st.active,
      fallbackSlug: p.slug,
    });
    if (!patch) {
      window.alert("Plan name is required.");
      return;
    }
    onSaveFull(p.id, patch);
  }

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="max-w-[10rem] px-4 py-3">
        <Input
          value={st.name}
          onChange={(e) => st.setName(e.target.value)}
          className="h-9 w-full min-w-0 rounded-lg text-sm"
          disabled={busy}
          aria-label={`Plan name ${p.name}`}
        />
      </td>
      <td className="max-w-[8rem] px-4 py-3">
        <Input
          value={st.slug}
          onChange={(e) => st.setSlug(e.target.value)}
          className="h-9 w-full min-w-0 rounded-lg font-mono text-xs"
          disabled={busy}
          aria-label={`Slug ${p.slug}`}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={0}
          className="h-9 w-16 rounded-lg text-sm tabular-nums"
          value={st.products}
          onChange={(e) => st.setProducts(e.target.value)}
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={0}
          className="h-9 w-16 rounded-lg text-sm tabular-nums"
          value={st.videos}
          onChange={(e) => st.setVideos(e.target.value)}
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          className="h-9 w-[4.5rem] rounded-lg text-sm tabular-nums"
          value={st.aiTotal}
          onChange={(e) => st.setAiTotal(e.target.value)}
          title="-1 = unlimited"
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <Input
            type="number"
            min={0}
            step="0.01"
            className="h-9 w-[6.5rem] rounded-lg text-sm"
            value={st.price}
            onChange={(e) => st.setPrice(e.target.value)}
            disabled={busy}
          />
          <span className="text-[10px] text-muted-foreground">
            {formatPlanPrice(Number(st.price) || 0)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={0}
          className="h-9 w-[4.5rem] rounded-lg text-sm"
          value={st.aiDaily}
          onChange={(e) => st.setAiDaily(e.target.value)}
          placeholder="—"
          title="Empty = no daily cap"
          disabled={busy}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={st.active}
          onChange={(e) => st.setActive(e.target.checked)}
          disabled={busy}
          aria-label={`Active ${p.name}`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {p.is_system ? (
            <Badge variant="secondary" className="text-[10px]">
              System
            </Badge>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-9 rounded-lg px-3 text-xs"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {busy ? <Spinner className="size-3.5" /> : "Save"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 rounded-lg text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => onRemove(p.id, p.name, p.is_system)}
            aria-label={`Delete ${p.name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
