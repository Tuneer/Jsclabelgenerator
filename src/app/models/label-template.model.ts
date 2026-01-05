export type LabelPageType = 
  // A4 Laser Printer
  | 'a4-10' | 'a4-16' | 'a4-36'
  // Brother QL-700/800 Label Sizes
  | 'brother-17x54'   // 17mm × 54mm (Address labels)
  | 'brother-29x90'   // 29mm × 90mm (Standard address)
  | 'brother-38x90'   // 38mm × 90mm (File folder labels)
  | 'brother-62x100'  // 62mm × 100mm (Large shipping labels)
  // Brother QL-810 with DK 2551 Continuous Roll
  | 'brother-62x29'   // 62mm × 29mm (DK 2551 - Continuous)
  // Zebra Label Printer Sizes
  | 'zebra-2x1'       // 2" × 1" (50mm × 25mm)
  | 'zebra-3x2'       // 3" × 2" (76mm × 51mm)
  | 'zebra-4x3'       // 4" × 3" (102mm × 76mm)
  | 'zebra-4x6';      // 4" × 6" (102mm × 152mm)

export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  fontScale: number;
  emphasizePrice: boolean;
  showBarcode: boolean;
  layoutType: 'single' | 'multi';
  fields?: string[];  // Optional array of field names to display
}

export interface LabelLayoutConfig {
  pageType: LabelPageType;
  labelsPerRow: number;
  rowsPerPage: number;
  labelWidthMm: number;
  labelHeightMm: number;
  defaultOrientation: 'portrait' | 'landscape';
}
