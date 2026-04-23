import type { Product } from "@/lib/catalog";
import { slugifyCategory } from "@/lib/slugify";

const PLACEHOLDER = "/placeholder-product.svg";

export type StoreReviewPublic = {
  rating: number;
  feedback: string | null;
  created_at: string;
  author_label: string;
};

export type ApiStorePublic = {
  id: string;
  slug: string;
  store_name: string;
  logo: string | null;
  banner_url: string | null;
  description: string | null;
  whatsapp_phone: string | null;
  location: { country?: string; region?: string; city?: string } | null;
  status?: string;
  plan?: string;
  verified?: boolean;
  rating_average?: number | null;
  rating_count?: number;
  is_following?: boolean;
};

export type ApiProductPublic = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  category: string;
  category_slug?: string | null;
  images: string[];
  image: string | null;
  video_url: string | null;
  features?: string[];
  in_stock: boolean;
  created_at?: string;
  store_slug: string;
  whatsapp: string;
};

export function apiProductToCard(
  p: ApiProductPublic,
  store: ApiStorePublic
): Product {
  const img = p.image || p.images?.[0] || PLACEHOLDER;
  const gallery =
    Array.isArray(p.images) && p.images.length > 0 ? p.images : [img];
  return {
    id: p.id,
    storeId: store.id,
    storeSlug: store.slug,
    name: p.name,
    price: p.price,
    oldPrice: p.old_price ?? undefined,
    category: p.category,
    categorySlug: p.category_slug ?? slugifyCategory(p.category),
    location: store.location?.city ?? "",
    image: img,
    images: gallery,
    videoUrl: p.video_url ?? undefined,
    description: p.description ?? undefined,
    features: Array.isArray(p.features)
      ? p.features.map(String).filter(Boolean)
      : undefined,
    popularityScore: 0,
    createdAt: p.created_at ?? new Date().toISOString(),
    inStock: p.in_stock !== false,
    vendor: store.store_name,
    whatsapp: p.whatsapp || store.whatsapp_phone || "",
    vendorVerified: !!store.verified,
  };
}
