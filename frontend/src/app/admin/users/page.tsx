"use client";

import * as React from "react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useAdminSession } from "@/components/dashboard/admin-session-context";
import { adminFetch } from "@/lib/admin-api-client";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  created_at: string;
};

export default function AdminUsersPage() {
  const { user, loading } = useAdminSession();
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setErr(null);
    try {
      const data = await adminFetch<{ users: UserRow[] }>("/users");
      setRows(data.users);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

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
          Users
        </h1>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty break-words">
          Registered accounts (newest first).
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
          No users found.
        </div>
      ) : (
        <>
          <ul className="space-y-3 lg:hidden">
            {rows.map((u) => (
              <li
                key={u.id}
                className="rounded-2xl border border-border/80 bg-card p-4 text-sm shadow-sm"
              >
                <p className="font-heading font-semibold break-words">{u.name}</p>
                <p className="mt-1 break-all text-muted-foreground">{u.email}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {u.role}
                  </Badge>
                  <span className="text-muted-foreground">{u.phone || "—"}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Joined {new Date(u.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm lg:block">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border/80 bg-muted/30">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
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
