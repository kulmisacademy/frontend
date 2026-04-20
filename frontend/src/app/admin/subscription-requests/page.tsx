"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";

type RequestRow = {
  id: string;
  store_id: string;
  plan_requested?: string | null;
  request_type?: string;
  target_plan_id?: string | null;
  target_plan_name?: string | null;
  duration_months?: number;
  contact_phone: string;
  notes: string | null;
  status: string;
  created_at: string;
  store: { id: string; store_name: string; slug: string } | null;
};

export default function AdminSubscriptionRequestsPage() {
  const { user, loading } = useAdminSession();
  const [rows, setRows] = React.useState<RequestRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch<{ requests: RequestRow[] }>(
        "/subscription-requests"
      );
      setRows(data.requests);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function approve(id: string) {
    if (!user) return;
    setActing(id);
    setErr(null);
    try {
      await adminFetch(`/subscription-requests/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActing(null);
    }
  }

  async function reject(id: string) {
    if (!user) return;
    setActing(id);
    setErr(null);
    try {
      await adminFetch(`/subscription-requests/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActing(null);
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
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight break-words sm:text-3xl">
          Upgrade requests
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty break-words">
          Approve plan or verified-only requests. Duration on the request is applied
          from approval time. You can also assign plans from{" "}
          <span className="font-medium text-foreground">Admin → Stores</span>.
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
          No requests yet.
        </div>
      ) : (
        <>
          <ul className="space-y-4 lg:hidden">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-border/80 bg-card p-4 text-sm shadow-sm"
              >
                <p className="font-heading font-semibold break-words">
                  {r.store?.store_name ?? "—"}
                </p>
                {r.store?.slug ? (
                  <p className="break-all font-mono text-xs text-muted-foreground">{r.store.slug}</p>
                ) : null}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Type</dt>
                    <dd className="capitalize">{r.request_type || "plan"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Months</dt>
                    <dd className="tabular-nums">{r.duration_months ?? "—"}</dd>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <dt className="text-xs text-muted-foreground">Target</dt>
                    <dd className="break-words text-muted-foreground">
                      {r.request_type === "verified"
                        ? "—"
                        : r.target_plan_name || r.plan_requested || "—"}
                    </dd>
                  </div>
                  <div className="col-span-2 min-w-0 break-all">
                    <dt className="text-xs text-muted-foreground">Phone</dt>
                    <dd>{r.contact_phone}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {r.status}
                  </Badge>
                </div>
                {r.status === "pending" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      className="w-full rounded-xl sm:flex-1"
                      disabled={acting === r.id}
                      onClick={() => void approve(r.id)}
                    >
                      <Check className="mr-1 size-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl sm:flex-1"
                      disabled={acting === r.id}
                      onClick={() => void reject(r.id)}
                    >
                      <X className="mr-1 size-3.5" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Store</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Months</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.store?.store_name ?? "—"}
                      {r.store?.slug ? (
                        <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                          {r.store.slug}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {r.request_type || "plan"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.request_type === "verified"
                        ? "—"
                        : r.target_plan_name || r.plan_requested || "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.duration_months ?? "—"}
                    </td>
                    <td className="px-4 py-3">{r.contact_phone}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="rounded-xl"
                            disabled={acting === r.id}
                            onClick={() => void approve(r.id)}
                          >
                            <Check className="mr-1 size-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            disabled={acting === r.id}
                            onClick={() => void reject(r.id)}
                          >
                            <X className="mr-1 size-3.5" />
                            Reject
                          </Button>
                        </div>
                      ) : null}
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
