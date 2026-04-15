"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-context";

export default function DashboardMessagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard/messages");
  }, [loading, user, router]);

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
          Messages
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          In-app messaging will appear here.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/20 px-6 py-20 text-center">
        <MessageSquare className="size-12 text-muted-foreground" />
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          Buyer–vendor chat is on the roadmap. For now, use WhatsApp from your
          store and product pages for instant conversations.
        </p>
      </div>
    </div>
  );
}
