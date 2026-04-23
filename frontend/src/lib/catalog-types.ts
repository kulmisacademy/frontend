export type CatalogCategory = {
  slug: string;
  name_en: string;
  name_so: string;
};

export const CATEGORY_FILTER_ALL = "All" as const;
export type CategorySlugFilter = typeof CATEGORY_FILTER_ALL | string;
