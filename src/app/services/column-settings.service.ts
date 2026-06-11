import { Injectable } from '@angular/core';
import { ColumnDefinition } from '../models/column-settings.model';

@Injectable({
  providedIn: 'root'
})
export class ColumnSettingsService {
  private defaultColumns: ColumnDefinition[] = [
    { key: 'id', label: 'ID', showInTable: true, showInPrint: true, order: 1 },
    { key: 'name', label: 'Name', showInTable: true, showInPrint: true, order: 2 },
    { key: 'brand', label: 'Brand', showInTable: true, showInPrint: true, order: 3 },
    { key: 'category', label: 'Category', showInTable: true, showInPrint: true, order: 4 },
    { key: 'price', label: 'Price', showInTable: true, showInPrint: true, order: 5 },
    { key: 'size', label: 'Size', showInTable: true, showInPrint: true, order: 6 },
    { key: 'barcode', label: 'Barcode', showInTable: true, showInPrint: true, order: 7 },
    { key: 'sku', label: 'SKU', showInTable: true, showInPrint: false, order: 8 },
    // Coupon-specific fields
    { key: 'quantityWord', label: 'Quantity Word', showInTable: false, showInPrint: true, order: 9 },
    { key: 'imageUrl', label: 'Product Image', showInTable: false, showInPrint: true, order: 10 },
    { key: 'validFrom', label: 'Valid From', showInTable: false, showInPrint: true, order: 11 },
    { key: 'validThru', label: 'Valid Thru', showInTable: false, showInPrint: true, order: 12 },
    { key: 'pluCode', label: 'PLU Code', showInTable: false, showInPrint: true, order: 13 },
    { key: 'savingsAmount', label: 'Savings Amount', showInTable: false, showInPrint: true, order: 14 },
  ];

  constructor() {}

  getPrintColumns(): ColumnDefinition[] {
    // Get from localStorage or return defaults
    const saved = localStorage.getItem('columnSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.columns.filter((c: ColumnDefinition) => c.showInPrint);
      } catch (error) {
        console.error('Error loading column settings:', error);
      }
    }
    return this.defaultColumns.filter(c => c.showInPrint);
  }

  getTableColumns(): ColumnDefinition[] {
    const saved = localStorage.getItem('columnSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.columns.filter((c: ColumnDefinition) => c.showInTable);
      } catch (error) {
        console.error('Error loading column settings:', error);
      }
    }
    return this.defaultColumns.filter(c => c.showInTable);
  }

  getAllColumns(): ColumnDefinition[] {
    const saved = localStorage.getItem('columnSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        return settings.columns;
      } catch (error) {
        console.error('Error loading column settings:', error);
      }
    }
    return this.defaultColumns;
  }

  saveColumns(columns: ColumnDefinition[]): void {
    const settings = {
      columns: columns,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('columnSettings', JSON.stringify(settings));
    console.log('✅ Column settings saved');
  }
}
