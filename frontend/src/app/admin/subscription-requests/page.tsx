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
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Upgrade requests
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
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
      )}
    </div>
  );
}
