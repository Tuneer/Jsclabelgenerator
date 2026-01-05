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
