import { Injectable } from '@angular/core';
import { LabelLayoutConfig, LabelPageType, LabelTemplate } from '../models/label-template.model';

@Injectable({ providedIn: 'root' })
export class LabelTemplateService {
  readonly templates: LabelTemplate[] = [
    {
      id: 'detailed',
      name: 'Detailed Label (Standard)',
      description: 'Complete product information with brand, supplier, and distributor',
      fontScale: 1,
      emphasizePrice: true,
      showBarcode: true,
      layoutType: 'single',
      fields: ['brand', 'name', 'size', 'price', 'barcode', 'supplier', 'distributor']
    },
    {
      id: 'brand',
      name: 'Brand Label',
      description: 'Standard retail label with brand, name, size, price, and barcode',
      fontScale: 1,
      emphasizePrice: true,
      showBarcode: true,
      layoutType: 'single',
      fields: ['brand', 'name', 'size', 'price', 'barcode']
    },
    {
      id: 'minimal',
      name: 'Minimal Label',
      description: 'Simple pricing label with name, size, price, and barcode',
      fontScale: 1,
      emphasizePrice: true,
      showBarcode: true,
      layoutType: 'single',
      fields: ['name', 'size', 'price', 'barcode']
    },
    {
      id: 'coupon',
      name: 'Coupon Label (SAVE $X.XX)',
      description: 'Promotional coupon with savings amount, product image, validity dates, and PLU code',
      fontScale: 1,
      emphasizePrice: true,
      showBarcode: false,
      layoutType: 'multi',
      fields: ['brand', 'name', 'size', 'price', 'quantityWord', 'imageUrl', 'validFrom', 'validThru', 'pluCode']
    }
  ];

  readonly layoutConfigs: LabelLayoutConfig[] = [
    // A4 Laser Printer configurations
    {
      pageType: 'a4-9',
      labelsPerRow: 3,
      rowsPerPage: 3,
      labelWidthMm: 60,
      labelHeightMm: 88,
      defaultOrientation: 'portrait'
    },
    {
      pageType: 'a4-10',
      labelsPerRow: 2,
      rowsPerPage: 5,
      labelWidthMm: 99.1,
      labelHeightMm: 57,
      defaultOrientation: 'portrait'
    },
    {
      pageType: 'a4-16',
      labelsPerRow: 4,
      rowsPerPage: 4,
      labelWidthMm: 99.1,
      labelHeightMm: 33.9,
      defaultOrientation: 'portrait'
    },
    {
      pageType: 'a4-36',
      labelsPerRow: 6,
      rowsPerPage: 6,
      labelWidthMm: 48.5,
      labelHeightMm: 25.4,
      defaultOrientation: 'portrait'
    },
    // Brother QL configurations - Industry standard: Portrait
    {
      pageType: 'brother-17x54',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 17,
      labelHeightMm: 54,
      defaultOrientation: 'portrait'
    },
    {
      pageType: 'brother-29x90',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 29,
      labelHeightMm: 90,
      defaultOrientation: 'portrait'
    },
    {
      pageType: 'brother-38x90',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 38,
      labelHeightMm: 90,
      defaultOrientation: 'portrait'
    },
    {
      pageType: 'brother-62x100',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 62,
      labelHeightMm: 100,
      defaultOrientation: 'portrait'
    },
    // Brother QL-810 with DK 2551 Continuous Roll
    {
      pageType: 'brother-62x29',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 62,
      labelHeightMm: 29,
      defaultOrientation: 'landscape'
    },
    // Zebra Label Printer configurations - Industry standard: Mixed
    {
      pageType: 'zebra-2x1',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 50,
      labelHeightMm: 25,
      defaultOrientation: 'landscape'
    },
    {
      pageType: 'zebra-3x2',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 76,
      labelHeightMm: 51,
      defaultOrientation: 'landscape'
    },
    {
      pageType: 'zebra-4x3',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 102,
      labelHeightMm: 76,
      defaultOrientation: 'landscape'
    },
    {
      pageType: 'zebra-4x6',
      labelsPerRow: 1,
      rowsPerPage: 1,
      labelWidthMm: 102,
      labelHeightMm: 152,
      defaultOrientation: 'portrait'
    }
  ];

  getTemplates(): LabelTemplate[] {
    return this.templates;
  }

  getLayoutConfig(pageType: LabelPageType): LabelLayoutConfig | undefined {
    return this.layoutConfigs.find((c) => c.pageType === pageType);
  }
}
