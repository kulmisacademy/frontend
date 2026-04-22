import { Link } from "@/i18n/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { MARKETING_PAGE_PY, PageContainer } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export default function ProductNotFound() {
  return (
    <MarketingShell>
      <PageContainer className={cn(MARKETING_PAGE_PY, "text-center")}>
        <h1 className="font-heading text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">
          This product may have been removed.
        </p>
        <Button className="mt-8 rounded-2xl" asChild>
          <Link href="/marketplace">Back to marketplace</Link>
        </Button>
      </PageContainer>
    </MarketingShell>
  );
}
