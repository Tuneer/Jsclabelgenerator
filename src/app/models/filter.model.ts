export interface ProductItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  subCategory?: string;
  price?: number;
  size?: string;
  barcode?: string;
  sku?: string;
  description?: string;
  [key: string]: any; // Allow dynamic properties from Excel
}

export interface FilterOptions {
  brands: string[];
  categories: string[];
  subCategories: string[];
}
