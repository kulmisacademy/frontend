import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export default function StoreNotFound() {
  return (
    <MarketingShell>
      <PageContainer className={cn(MARKETING_PAGE_PY, "text-center")}>
        <h1 className="font-heading text-2xl font-bold">Store not found</h1>
        <p className="mt-2 text-muted-foreground">
          Check the link or browse all stores.
        </p>
        <Button className="mt-8 rounded-2xl" asChild>
          <Link href="/stores">View stores</Link>
        </Button>
      </PageContainer>
    </MarketingShell>
  );
}
