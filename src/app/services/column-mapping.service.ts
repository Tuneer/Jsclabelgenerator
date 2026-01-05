import { Injectable } from '@angular/core';
import { ColumnMapping, MappingTemplate } from '../models/pos-item.model';

@Injectable({ providedIn: 'root' })
export class ColumnMappingService {
  private readonly MAPPING_TEMPLATES_KEY = 'columnMappingTemplates';
  private readonly STANDARD_FIELDS = [
    'id',
    'name',
    'brand',
    'category',
    'subCategory',
    'size',
    'price',
    'description',
    'sku',
    'barcode'
  ];

  getStandardFields(): string[] {
    return [...this.STANDARD_FIELDS];
  }

  getSavedTemplates(): MappingTemplate[] {
    const raw = localStorage.getItem(this.MAPPING_TEMPLATES_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse mapping templates', e);
      return [];
    }
  }

  saveTemplate(template: MappingTemplate): void {
    const templates = this.getSavedTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    localStorage.setItem(this.MAPPING_TEMPLATES_KEY, JSON.stringify(templates));
  }

  deleteTemplate(id: string): void {
    const templates = this.getSavedTemplates().filter(t => t.id !== id);
    localStorage.setItem(this.MAPPING_TEMPLATES_KEY, JSON.stringify(templates));
  }

  autoDetectMapping(excelColumns: string[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    
    const columnPatterns: Record<string, RegExp[]> = {
      id: [/^(item)?id$/i, /^itemmaster(id)?$/i, /^code$/i],
      name: [/^(item)?name/i, /^description$/i, /^product/i, /^title$/i],
      brand: [/brand/i, /manufacturer/i, /make$/i],
      category: [/^category$/i, /^type/i, /^department/i, /^class/i],
      subCategory: [/^sub.*category$/i, /^subtype/i, /^subclass/i],
      size: [/^size/i, /^volume/i, /^capacity/i, /^unit/i],
      price: [/^price$/i, /^cost$/i, /^amount$/i, /^msrp$/i],
      description: [/^(long)?description$/i, /^details$/i, /^notes$/i],
      sku: [/^sku$/i, /^itemcode$/i, /^supplier.*code$/i],
      barcode: [/barcode/i, /^upc$/i, /^ean$/i, /^gtin$/i]
    };

    excelColumns.forEach(excelCol => {
      let matched = false;
      
      for (const [field, patterns] of Object.entries(columnPatterns)) {
        if (patterns.some(pattern => pattern.test(excelCol))) {
          mappings.push({
            excelColumn: excelCol,
            appField: field,
            isCustomField: false
          });
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Create as custom field
        const fieldName = this.sanitizeFieldName(excelCol);
        mappings.push({
          excelColumn: excelCol,
          appField: fieldName,
          isCustomField: true
        });
      }
    });

    return mappings;
  }

  private sanitizeFieldName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  applyMapping(row: any, mappings: ColumnMapping[]): any {
    const mapped: any = {
      lastUpdated: new Date().toISOString()
    };

    mappings.forEach(mapping => {
      const value = row[mapping.excelColumn];
      mapped[mapping.appField] = value !== undefined ? value : '';
    });

    // Ensure ID exists
    if (!mapped.id) {
      mapped.id = String(Date.now() + Math.random());
    }

    return mapped;
  }
}
