export interface PosItem {
  id: string;
  brand: string;
  category: string;
  subCategory: string;
  name: string;
  size: string;              // Size/Volume/Unit (e.g., "500ml", "1kg", "12oz")
  price: number;
  description: string;
  sku: string;
  barcode: string;
  supplier?: string;         // Supplier name
  distributor?: string;      // Distributor name
  lastUpdated: string;       // ISO timestamp
  // Coupon-specific fields
  quantityWord?: string;     // e.g., "ONE", "TWO", "THREE"
  imageUrl?: string;         // Product image URL for coupon
  validFrom?: string;        // Coupon validity start date (ISO or formatted)
  validThru?: string;        // Coupon validity end date (ISO or formatted)
  pluCode?: string;          // PLU code for coupon
  savingsAmount?: number;    // Savings amount (overrides price for coupons)
  [key: string]: any;        // Dynamic fields from Excel
}

export interface ColumnMapping {
  excelColumn: string;
  appField: string;
  isCustomField: boolean;
}

export interface MappingTemplate {
  id: string;
  name: string;
  mappings: ColumnMapping[];
  createdAt: string;
}
