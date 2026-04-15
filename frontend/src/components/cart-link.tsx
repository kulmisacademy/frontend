"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CartLink({ className }: { className?: string }) {
  const { itemCount } = useCart();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("relative rounded-xl", className)}
      aria-label={`Shopping cart, ${itemCount} items`}
      asChild
    >
      <Link href="/cart">
        <ShoppingBag className="size-5" />
        {itemCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
