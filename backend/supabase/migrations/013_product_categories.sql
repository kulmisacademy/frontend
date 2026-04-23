-- Localized category labels + products.category_slug for marketplace/store filters.

CREATE OR REPLACE FUNCTION public.laas24_slugify(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT NULLIF(
    LEFT(
      TRIM(BOTH '-' FROM REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(TRIM(COALESCE(raw, ''))),
            chr(39),
            '',
            'g'
          ),
          chr(8217),
          '',
          'g'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      60
    ),
    ''
  );
$function$;

CREATE TABLE IF NOT EXISTS public.product_categories (
  slug text PRIMARY KEY,
  name_en text NOT NULL,
  name_so text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_slug text;

UPDATE public.products
SET category_slug = COALESCE(NULLIF(public.laas24_slugify(category), ''), 'general')
WHERE category_slug IS NULL OR btrim(category_slug) = '';

UPDATE public.products SET category_slug = 'general' WHERE category_slug IS NULL;

ALTER TABLE public.products
  ALTER COLUMN category_slug SET DEFAULT 'general';

ALTER TABLE public.products
  ALTER COLUMN category_slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_slug ON public.products (category_slug);

INSERT INTO public.product_categories (slug, name_en, name_so, sort_order) VALUES
  ('general', 'General', 'Guud', 0),
  ('electronics', 'Electronics', 'Qalab elektaroonig ah', 5),
  ('fashion', 'Fashion', 'Dharka', 8),
  ('food', 'Food', 'Cunto', 10),
  ('food-groceries', 'Food & groceries', 'Cunto & alaabada', 12),
  ('fashion-apparel', 'Fashion & apparel', 'Dharka & dharka', 15),
  ('home', 'Home', 'Guri', 18),
  ('home-furniture', 'Home & furniture', 'Guri & alaabta guriga', 20),
  ('wellness', 'Wellness', 'Caafimaad', 22),
  ('beauty-health', 'Beauty & health', 'Qurux & caafimaad', 25),
  ('sports-outdoors', 'Sports & outdoors', 'Isboorti & banaanka', 28),
  ('books-media', 'Books & media', 'Buugaag & warbaahinta', 30),
  ('automotive', 'Automotive', 'Gawaarida', 32),
  ('kids-baby', 'Kids & baby', 'Carruurta', 35),
  ('services', 'Services', 'Adeegyo', 38),
  ('other', 'Other', 'Kale', 40)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_categories (slug, name_en, name_so, sort_order)
SELECT DISTINCT p.category_slug,
  COALESCE(MAX(p.category) FILTER (WHERE p.category IS NOT NULL AND btrim(p.category) <> ''),
           INITCAP(REPLACE(p.category_slug, '-', ' '))),
  COALESCE(MAX(p.category) FILTER (WHERE p.category IS NOT NULL AND btrim(p.category) <> ''),
           INITCAP(REPLACE(p.category_slug, '-', ' '))),
  100
FROM public.products p
WHERE p.category_slug IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.product_categories c WHERE c.slug = p.category_slug)
GROUP BY p.category_slug;
