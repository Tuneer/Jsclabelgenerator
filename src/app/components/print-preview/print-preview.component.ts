import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PosItem } from '../../models/pos-item.model';
import { ProductItem } from '../../models/filter.model';
import { ColumnDefinition } from '../../models/column-settings.model';
import { LabelLayoutConfig, LabelPageType, LabelTemplate } from '../../models/label-template.model';
import { LabelTemplateService } from '../../services/label-template.service';
import { ColumnSettingsService } from '../../services/column-settings.service';
import jsPDF from 'jspdf';

@Component({
  standalone: true,
  selector: 'app-print-preview',
  templateUrl: './print-preview.component.html',
  styleUrls: ['./print-preview.component.css'],
  imports: [CommonModule, MatIconModule, MatButtonModule]
})
export class PrintPreviewComponent implements OnInit, OnChanges {
  @Input() items: PosItem[] = [];
  @Input() productItems: ProductItem[] = [];
  @Input() template!: LabelTemplate;
  @Input() pageType!: LabelPageType;
  @Input() copies: number = 1;
  @Input() orientation: 'default' | 'portrait' | 'landscape' = 'default';
  @Output() closed = new EventEmitter<void>();
  @Output() printed = new EventEmitter<void>();

  layoutConfig: LabelLayoutConfig | undefined;
  printColumns: ColumnDefinition[] = [];
  
  // Grid configuration
  totalSlots: number = 0;
  labelSlots: any[] = []; // Array including both filled and empty slots
  isSingleLabel: boolean = false;
  
  // Multi-page support
  pages: any[][] = []; // Array of pages, each page is an array of slots
  totalPages: number = 1;
  
  // Expose Math to template
  Math = Math;

  constructor(
    private templateService: LabelTemplateService,
    private columnSettingsService: ColumnSettingsService
  ) {}
  
  ngOnInit(): void {
    this.printColumns = this.columnSettingsService.getPrintColumns();
    this.setupLabelGrid();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.layoutConfig = this.templateService.getLayoutConfig(this.pageType);
    this.printColumns = this.columnSettingsService.getPrintColumns();
    this.setupLabelGrid();
  }
  
  /**
   * Setup the label grid based on page type
   * Creates fixed number of slots and fills them with items or empty placeholders
   * Supports multi-page printing and single-item replication
   */
  private setupLabelGrid(): void {
    const items = this.getDisplayItems();
    
    // Determine total slots based on page type
    // Brother QL and Zebra printers: Single label mode
    if (this.pageType.startsWith('brother-') || this.pageType.startsWith('zebra-')) {
      this.isSingleLabel = true;
      this.totalSlots = items.length;
      this.labelSlots = items.map(item => ({ item, isEmpty: false }));
      this.pages = [this.labelSlots];
      this.totalPages = 1;
      return;
    }
    
    // For grid layouts, create array with items + empty slots
    this.labelSlots = [];
    this.pages = [];
    
    // Determine total slots based on page type
    switch (this.pageType) {
      case 'a4-9':
        this.isSingleLabel = false;
        this.totalSlots = 9;
        break;
      case 'a4-10':
        this.isSingleLabel = false;
        this.totalSlots = 10;
        break;
      case 'a4-16':
        this.isSingleLabel = false;
        this.totalSlots = 16;
        break;
      case 'a4-36':
        this.isSingleLabel = false;
        this.totalSlots = 36;
        break;
      default:
        this.isSingleLabel = false;
        this.totalSlots = 10;
    }
    
    // Normal mode: Multiple pages if needed (NO single item replication)
    const basePagesCount = Math.ceil(items.length / this.totalSlots);
    this.totalPages = basePagesCount * this.copies;
    
    // Generate base pages
    for (let pageIndex = 0; pageIndex < basePagesCount; pageIndex++) {
      const pageSlots = [];
      const startIdx = pageIndex * this.totalSlots;
      const endIdx = Math.min(startIdx + this.totalSlots, items.length);
      
      // Fill slots for this page
      for (let slotIdx = 0; slotIdx < this.totalSlots; slotIdx++) {
        const itemIdx = startIdx + slotIdx;
        if (itemIdx < items.length) {
          pageSlots.push({ item: items[itemIdx], isEmpty: false });
        } else {
          pageSlots.push({ item: null, isEmpty: true });
        }
      }
      
      this.pages.push(pageSlots);
    }
    
    // Duplicate all pages for each copy
    if (this.copies > 1) {
      const basePages = [...this.pages];
      for (let copy = 1; copy < this.copies; copy++) {
        basePages.forEach(page => this.pages.push([...page]));
      }
    }
    
    // First page slots for backward compatibility
    this.labelSlots = this.pages[0] || [];
    
    console.log(`🏷️ Print Preview Setup:`);
    console.log(`   Page Type: ${this.pageType}`);
    console.log(`   Total Slots per Page: ${this.totalSlots}`);
    console.log(`   Items: ${items.length}`);
    console.log(`   Copies: ${this.copies}`);
    console.log(`   Total Pages: ${this.totalPages}`);
    console.log(`   Template: ${this.template?.name || 'default'}`);
  }
  
  getDisplayItems(): any[] {
    return this.productItems.length > 0 ? this.productItems : this.items;
  }
  
  shouldShowField(fieldKey: string): boolean {
    // If template has fields array, check if field is included
    if (this.template.fields && Array.isArray(this.template.fields)) {
      return this.template.fields.includes(fieldKey);
    }
    // Fallback: show field if it exists in printColumns
    return this.printColumns.some(col => col.key === fieldKey && col.showInPrint);
  }
  
  getFieldValue(item: any, fieldKey: string): any {
    return item[fieldKey];
  }

  getPageTypeLabel(): string {
    const labels: Record<string, string> = {
      'a4-9': '9 Coupons/Page (3×3 grid)',
      'a4-10': '10 Labels/Page',
      'a4-16': '16 Labels/Page',
      'a4-36': '36 Labels/Page',
      'brother-17x54': 'Brother QL 17mm × 54mm',
      'brother-29x90': 'Brother QL 29mm × 90mm',
      'brother-38x90': 'Brother QL 38mm × 90mm',
      'brother-62x100': 'Brother QL 62mm × 100mm',
      'zebra-2x1': 'Zebra 2" × 1"',
      'zebra-3x2': 'Zebra 3" × 2"',
      'zebra-4x3': 'Zebra 4" × 3"',
      'zebra-4x6': 'Zebra 4" × 6"'
    };
    return labels[this.pageType] || this.pageType;
  }

  getPrintInfo(): string {
    const items = this.getDisplayItems();
    const copies = this.copies || 1;
    
    if (this.isSingleLabel) {
      const totalLabels = items.length * copies;
      return `${totalLabels} individual label(s) (${items.length} items × ${copies} copies)`;
    } else {
      if (items.length === 1 && this.pageType.startsWith('a4-')) {
        return `Single item: ${this.totalSlots} copies per page × ${copies} pages = ${this.totalSlots * copies} labels`;
      } else {
        const basePages = Math.ceil(items.length / this.totalSlots);
        const totalPages = basePages * copies;
        return `${totalPages} page(s) - ${items.length} items × ${copies} copies, ${this.totalSlots} slots/page`;
      }
    }
  }

  close(): void {
    this.closed.emit();
  }

  showPrintInstructions(): void {
    const labelSize = this.getLabelDimensions();
    const printerType = this.pageType.startsWith('brother-') ? 'Brother QL' : 
                       this.pageType.startsWith('zebra-') ? 'Zebra' : 'A4';
    
    const instructions = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🖨️  PRINT SETUP GUIDE - ${printerType}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📄 LABEL SPECIFICATIONS:
   • Size: ${labelSize.width} × ${labelSize.height}
   • Orientation: ${labelSize.orientation}
   • Total Pages: ${this.getDisplayItems().length * (this.copies || 1)}

⚙️  RECOMMENDED PRINT SETTINGS:

${printerType === 'Brother QL' ? `
✅ Brother QL Printer:
   1. Load ${labelSize.width} × ${labelSize.height} die-cut labels
   2. In Print Dialog:
      → Paper Size: Custom (${labelSize.width} × ${labelSize.height})
      → Scale: 100% (Actual Size)
      → Orientation: ${labelSize.orientation}
      → Margins: 0mm (None)
   3. Use Brother P-touch Editor for best results
   4. Enable "Continuous Length Tape" mode if available
` : printerType === 'Zebra' ? `
✅ Zebra Label Printer:
   1. Load ${labelSize.width} × ${labelSize.height} labels
   2. In Print Dialog:
      → Paper Size: ${labelSize.width} × ${labelSize.height}
      → Scale: Actual Size (100%)
      → Orientation: ${labelSize.orientation}
      → Margins: 0
   3. Best browser: Chrome or Edge
   4. Consider using Zebra Designer for testing
` : `
✅ A4 Laser Printer:
   1. Load A4 (210mm × 297mm) label sheets
   2. In Print Dialog:
      → Paper Size: A4
      → Scale: 100% (Do not fit to page)
      → Orientation: Portrait
      → Margins: Default
   3. ${this.totalSlots} labels per page
`}

🎯 TESTING WORKFLOW:
   Step 1: Click "Final Print" → "Save as PDF"
   Step 2: Check PDF properties (should match label size)
   Step 3: Send PDF to customer for test print
   Step 4: Customer prints 1 label first to verify
   Step 5: If correct, proceed with full batch

⚠️  COMMON ISSUES:
   • Labels cut off → Check Scale is 100%
   • Wrong size → Verify paper size matches ${labelSize.width} × ${labelSize.height}
   • Content sideways → Check orientation is ${labelSize.orientation}
   • Multiple labels on one page → Driver issue, use "Print to PDF" first

💡 PRO TIP:
   Always save as PDF first to verify layout before
   sending to physical printer. This prevents wasted labels!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
    
    alert(instructions);
  }

  print(): void {
    // Generate the HTML content for printing
    const printContent = this.generatePrintHTML();
    const items = this.getDisplayItems();

    // For coupon mode, use browser's native print dialog for better fidelity
    if (this.isCouponMode()) {
      const printWindow = window.open('', 'Print Coupons', 'width=1200,height=900');
      
      if (!printWindow) {
        alert('Please allow popups for this site to print coupons.');
        return;
      }

      // Write content to new window
      printWindow.document.open();
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content and images to load, then print
      printWindow.onload = () => {
        // Give images extra time to render
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          // Close window after print dialog is dismissed
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        }, 500);
      };
      
      this.printed.emit();
      return;
    }

    // For single label mode (Brother QL, Zebra), use jsPDF approach
    const labelSize = this.isSingleLabel
      ? this.getLabelDimensions()
      : { width: '210mm', height: '297mm', orientation: 'portrait' };

    const widthMm = parseFloat(labelSize.width);
    const heightMm = parseFloat(labelSize.height);

    const pxPerMm = 96 / 25.4;
    const iframeWidthPx = Math.ceil(widthMm * pxPerMm);
    const iframeHeightPx = Math.ceil(heightMm * pxPerMm);

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = `${iframeWidthPx}px`;
    iframe.style.height = `${iframeHeightPx}px`;
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(printContent);
    iframeDoc.close();

    iframe.onload = async () => {
      const pdf = new jsPDF({
        orientation: labelSize.orientation as "portrait" | "landscape",
        unit: 'px',
        format: [iframeWidthPx, iframeHeightPx]
      });

      // Render HTML content to PDF
      await pdf.html(iframeDoc.body, {
        autoPaging: false,
        html2canvas: {
          scale: 2,
          useCORS: true
        }
      });

      document.body.removeChild(iframe);

      // Show PDF instead of direct print
      window.open(pdf.output('bloburl'), '_blank');
      
      this.printed.emit();
    };
  }


  drawLabel(pdf:jsPDF, item: any) {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(item.brand || '', 2, 6);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(item.name || '', 2, 12, { maxWidth: 45 });

  pdf.setFontSize(8);
  pdf.text(`Size: ${item.size}`, 2, 17);

  pdf.setFontSize(12);
  pdf.setTextColor(211, 47, 47);
  pdf.text(`$${item.price}`, 45, 18);

  pdf.setTextColor(0);
  pdf.setFontSize(8);
  pdf.text(item.barcode || '', 2, 24);
}


  /**
   * Check if current template is coupon mode
   */
  private isCouponMode(): boolean {
    return this.template?.id === 'coupon' || this.pageType === 'a4-9';
  }

  /**
   * Generate complete HTML document for printing
   */
  private generatePrintHTML(): string {
    const items = this.getDisplayItems();
    
    // Coupon mode uses its own dedicated layout
    if (this.isCouponMode()) {
      return this.generateCouponHTML(items);
    }
    
    if (this.isSingleLabel) {
      return this.generateSingleLabelHTML(items);
    } else {
      return this.generateGridHTML(items);
    }
  }

  /**
   * Generate HTML for single label mode (Brother QL, Zebra printers)
   */
  private generateSingleLabelHTML(items: any[]): string {
    const labelSize = this.getLabelDimensions();
    const copies = this.copies || 1;
    const isLandscape = labelSize.orientation === 'landscape';
    
    // Generate labels with copies - Option A: Group by item (Item1×n, Item2×n, ...)
    const allLabels: any[] = [];
    items.forEach(item => {
      for (let copy = 0; copy < copies; copy++) {
        allLabels.push(item);
      }
    });
    
    console.log(`📄 Single Label Print: ${items.length} items × ${copies} copies = ${allLabels.length} total labels`);
    console.log(`   Label Size: ${labelSize.width} × ${labelSize.height} (${labelSize.orientation})`);
    
    // Adaptive layout styles based on orientation
    const contentLayoutCSS = isLandscape ? `
      .label-content {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 2mm;
        align-items: center;
        padding: 1mm;
        max-width: 100%;
        max-height: 100%;
      }
      .label-left {
        display: flex;
        flex-direction: column;
        gap: 1mm;
        overflow: hidden;
      }
      .label-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 1mm;
        overflow: hidden;
      }
      .label-name { 
        font-size: 0.85em; 
        font-weight: 600; 
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .label-size { 
        font-size: 0.7em; 
        color: #666; 
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label-price { 
        font-size: 1em; 
        font-weight: 700; 
        color: #d32f2f; 
      }
      .label-barcode { 
        font-size: 0.65em; 
        font-family: 'Courier New', monospace; 
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label-field { 
        font-size: 0.65em; 
        color: #555; 
        overflow: hidden;
        text-overflow: ellipsis;
      }
    ` : `
      .label-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 1mm;
        max-width: 100%;
        max-height: 100%;
        overflow: hidden;
      }
      .label-name { 
        font-size: 1em; 
        font-weight: 600; 
        word-wrap: break-word; 
        max-width: 100%;
        overflow: hidden;
      }
      .label-size { 
        font-size: 0.8em; 
        color: #666; 
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label-price { 
        font-size: 1.1em; 
        font-weight: 700; 
        color: #d32f2f; 
      }
      .label-barcode { 
        font-size: 0.75em; 
        font-family: 'Courier New', monospace; 
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .label-field { 
        font-size: 0.7em; 
        color: #555; 
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }
    `;
    
     const labelHTML = allLabels.map(item => {
      if (isLandscape) {
        // Landscape: Side-by-side layout
        return `
          <div class="single-label-page">
            <div class="label-content">
              <div class="label-left">
                ${this.shouldShowField('brand') ? `<div class="label-field"><strong>${this.getFieldValue(item, 'brand') || ''}</strong></div>` : ''}
                ${this.shouldShowField('name') ? `<div class="label-name" style="font-size:10px;color:blue;">${this.getFieldValue(item, 'name') || ''}</div>` : ''}
                ${this.shouldShowField('size') ? `<div class="label-size">Size: ${this.getFieldValue(item, 'size') || ''}</div>` : ''}
                ${this.shouldShowField('barcode') && this.template.showBarcode ? `<div class="label-barcode">${this.getFieldValue(item, 'barcode') || ''}</div>` : ''}
              </div>
              <div class="label-right">
                ${this.shouldShowField('price') ? `<div class="label-price ${this.template.emphasizePrice ? 'emphasize' : ''}" style="color:red;">$${this.getFieldValue(item, 'price') || '0.00'}</div>` : ''}
              </div>
            </div>
          </div>
        `;

        // ${this.shouldShowField('supplier') ? `<div class="label-field">Supplier: ${this.getFieldValue(item, 'supplier') || ''}</div>` : ''}
        //        ${this.shouldShowField('distributor') ? `<div class="label-field">Dist: ${this.getFieldValue(item, 'distributor') || ''}</div>` : ''}

      } else {
        // Portrait: Vertical stack layout
        return `
          <div class="single-label-page">
            <div class="label-content">
              ${this.shouldShowField('brand') ? `<div class="label-field"><strong>${this.getFieldValue(item, 'brand') || ''}</strong></div>` : ''}
              ${this.shouldShowField('name') ? `<div class="label-name" style="font-size:10px">${this.getFieldValue(item, 'name') || ''}</div>` : ''}
              ${this.shouldShowField('size') ? `<div class="label-size">Size: ${this.getFieldValue(item, 'size') || ''}</div>` : ''}
              ${this.shouldShowField('price') ? `<div class="label-price ${this.template.emphasizePrice ? 'emphasize' : ''}">$${this.getFieldValue(item, 'price') || '0.00'}</div>` : ''}
              ${this.shouldShowField('barcode') && this.template.showBarcode ? `<div class="label-barcode">${this.getFieldValue(item, 'barcode') || ''}</div>` : ''}
              ${this.shouldShowField('supplier') ? `<div class="label-field">Supplier: ${this.getFieldValue(item, 'supplier') || ''}</div>` : ''}
              ${this.shouldShowField('distributor') ? `<div class="label-field">Dist: ${this.getFieldValue(item, 'distributor') || ''}</div>` : ''}
            </div>
          </div>
        `;
      }
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Labels - ${allLabels.length} pages - ${labelSize.width} × ${labelSize.height} ${labelSize.orientation}</title>
          <style>
            /* ============================================
               CRITICAL: @page size must match physical label
               ============================================ */
            @page { 
              size: ${labelSize.width} ${labelSize.height} ${labelSize.orientation}; 
              margin: 0; 
            }
            
            * { 
              box-sizing: border-box; 
              margin: 0; 
              padding: 0; 
            }
            
            html { 
              width: ${labelSize.width};
              height: ${labelSize.height};
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              font-size: 10pt;
              background: white;
            }
            
            /* ============================================
               Each label = 1 page (page-break-after: always)
               ============================================ */
            .single-label-page {
              width: ${labelSize.width};
              height: ${labelSize.height};
              padding: 2mm;
              page-break-after: always;
              page-break-inside: avoid;
              display: flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
              background: white;
              position: relative;
            }
            
            .single-label-page:last-child {
              page-break-after: auto;
            }
            
            /* ============================================
               Adaptive content layout based on orientation
               ============================================ */
            ${contentLayoutCSS}
            
            .label-price.emphasize { 
              background: #ffebee; 
              padding: 2px 4px; 
              font-size: 1.2em;
            }
            
            /* ============================================
               Print-specific overrides
               ============================================ */
            @media print {
              html, body {
                width: ${labelSize.width};
                height: ${labelSize.height};
                margin: 0;
                padding: 0;
                background: white;
              }
              
              .single-label-page {
                margin: 0;
                padding: 2mm;
                background: white;
              }
            }
            
            /* ============================================
               Screen preview debug info (hidden in print)
               ============================================ */
            .debug-info {
              position: fixed;
              top: 0;
              right: 0;
              background: #333;
              color: #fff;
              padding: 8px;
              font-size: 11px;
              z-index: 9999;
              font-family: monospace;
            }
            
            @media print {
              .debug-info { display: none; }
            }
          </style>
        </head>
        <body>
            ${labelHTML}
        </body>
      </html>
    `;

    // // <!-- Debug info for screen preview only -->
    //       <div class="debug-info">
    //         📄 ${allLabels.length} pages<br>
    //         📐 ${labelSize.width} × ${labelSize.height}<br>
    //         🔄 ${labelSize.orientation}
    //       </div>
  }

  /**
   * Generate HTML for grid layout mode with multi-page support and copies
   */
  private generateGridHTML(items: any[]): string {
    const gridConfig = this.getGridConfig();
    const copies = this.copies || 1;
    
    // Calculate number of pages needed
    let totalPages = 1;
    let allPages: any[][] = [];
    
    // Single item on A4 - replicate across all slots
    if (items.length === 1 && this.pageType.startsWith('a4-')) {
      const singlePage = [];
      for (let i = 0; i < this.totalSlots; i++) {
        singlePage.push({ item: items[0], isEmpty: false });
      }
      // Duplicate this page for each copy
      for (let copy = 0; copy < copies; copy++) {
        allPages.push([...singlePage]);
      }
      console.log(`📄 Single item replication: ${copies} page(s) with ${this.totalSlots} copies each`);
    } else {
      // Normal mode: Multiple pages if needed
      totalPages = Math.ceil(items.length / this.totalSlots);
      
      // Generate base pages
      const basePages: any[][] = [];
      for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
        const pageSlots = [];
        const startIdx = pageIndex * this.totalSlots;
        const endIdx = Math.min(startIdx + this.totalSlots, items.length);
        
        // Fill slots for this page
        for (let slotIdx = 0; slotIdx < this.totalSlots; slotIdx++) {
          const itemIdx = startIdx + slotIdx;
          if (itemIdx < items.length) {
            pageSlots.push({ item: items[itemIdx], isEmpty: false });
          } else {
            pageSlots.push({ item: null, isEmpty: true });
          }
        }
        
        basePages.push(pageSlots);
      }
      
      // Duplicate all pages for each copy
      for (let copy = 0; copy < copies; copy++) {
        basePages.forEach(page => allPages.push([...page]));
      }
      
      console.log(`📄 Multi-page print: ${totalPages} base page(s) × ${copies} copies = ${allPages.length} total pages, ${items.length} items, ${this.totalSlots} slots/page`);
    }
    
    // Generate HTML for all pages
    const pagesHTML = allPages.map((pageSlots, pageIdx) => {
      const labelSlotsHTML = pageSlots.map(slot => {
        if (slot.isEmpty) {
          return '<div class="label-slot empty"></div>';
        }
        
        return `
          <div class="label-slot filled">
            <div class="label-content">
              ${this.shouldShowField('name') ? `<div class="label-name">${this.getFieldValue(slot.item, 'name') || ''}</div>` : ''}
              ${this.shouldShowField('size') ? `<div class="label-size">${this.getFieldValue(slot.item, 'size') || ''}</div>` : ''}
              ${this.shouldShowField('price') ? `<div class="label-price ${this.template.emphasizePrice ? 'emphasize' : ''}">
                $${this.getFieldValue(slot.item, 'price') || '0.00'}</div>` : ''}
              ${this.shouldShowField('barcode') && this.template.showBarcode ? `<div class="label-barcode">${this.getFieldValue(slot.item, 'barcode') || ''}</div>` : ''}
              ${this.shouldShowField('distributor') ? `<div class="label-field">${this.getFieldValue(slot.item, 'distributor') || ''}</div>` : ''}
              ${this.shouldShowField('supplierItemCode') ? `<div class="label-field">${this.getFieldValue(slot.item, 'supplierItemCode') || ''}</div>` : ''}
              ${this.shouldShowField('subType') ? `<div class="label-field">${this.getFieldValue(slot.item, 'subType') || ''}</div>` : ''}
              ${this.shouldShowField('department') ? `<div class="label-field">${this.getFieldValue(slot.item, 'department') || ''}</div>` : ''}
              ${this.shouldShowField('brand') ? `<div class="label-field">${this.getFieldValue(slot.item, 'brand') || ''}</div>` : ''}
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="a4-page">
          <div class="label-grid">
            ${labelSlotsHTML}
          </div>
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>A4 Labels - ${allPages.length} pages - ${this.totalSlots} labels/page</title>
          <style>
            /* ============================================
               CRITICAL: A4 page size for grid labels
               ============================================ */
            @page { 
              size: A4 portrait; 
              margin: 0; 
            }
            
            * { 
              box-sizing: border-box; 
              margin: 0; 
              padding: 0; 
              print-color-adjust: exact; 
              -webkit-print-color-adjust: exact; 
            }
            
            html {
              width: 100%;
              height: 100%;
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              font-size: 10pt;
              background: white;
            }
            
            /* ============================================
               Each A4 page with grid layout
               ============================================ */
            .a4-page {
              width: 210mm;
              height: 297mm;
              padding: 10mm;
              page-break-after: always;
              page-break-inside: avoid;
              box-sizing: border-box;
              background: white;
            }
            
            .a4-page:last-child {
              page-break-after: auto;
            }
            
            .label-grid {
              display: grid;
              width: 100%;
              height: 100%;
              ${gridConfig.gridTemplate}
              gap: ${gridConfig.gap};
            }
            
            .label-slot {
              border: 1px solid #333;
              padding: ${gridConfig.padding};
              display: flex;
              flex-direction: column;
              overflow: hidden;
              box-sizing: border-box;
              background: white;
            }
            
            .label-slot.empty { visibility: hidden; }
            .label-slot.filled { background: white; }
            
            .label-content {
              font-size: ${this.template.fontScale || 1}rem;
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            
            .label-name { font-weight: 600; font-size: ${gridConfig.nameSize}; line-height: 1.2; color: #222; }
            .label-size { font-size: ${gridConfig.textSize}; color: #666; }
            .label-price { font-weight: 700; font-size: ${gridConfig.priceSize}; color: #d32f2f; margin: 2px 0; }
            .label-price.emphasize { font-size: 1.5em; background: #ffebee; padding: 2px 4px; }
            .label-barcode { font-family: 'Courier New', monospace; font-size: ${gridConfig.barcodeSize}; padding: 2px; background: #f5f5f5; border: 1px solid #ddd; }
            .label-field { font-size: ${gridConfig.fieldSize}; color: #555; line-height: 1.2; }
          </style>
        </head>
        <body>
          ${pagesHTML}
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML for coupon label layout (3×3 grid on A4)
   * Each coupon has: beige bg, red header, product image, dark blue footer with dates + PLU
   * Design matches reference: serif font for header, clean layout, full-width footer bar
   * 
   * Simple logic:
   * - Selected coupons are placed in order across pages (9 per page)
   * - Last page may have empty slots
   * - Global "copies" field duplicates entire sheets
   */
  private generateCouponHTML(items: any[]): string {
    const copies = this.copies || 1;
    const totalSlots = 9; // 3×3 grid
    
    // Build pages: Place coupons in order, no per-coupon duplication
    let allPages: any[][] = [];
    
    const totalPages = Math.ceil(items.length / totalSlots);
    const basePages: any[][] = [];
    
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const pageSlots = [];
      const startIdx = pageIndex * totalSlots;
      for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
        const itemIdx = startIdx + slotIdx;
        if (itemIdx < items.length) {
          pageSlots.push({ item: items[itemIdx], isEmpty: false });
        } else {
          pageSlots.push({ item: null, isEmpty: true });
        }
      }
      basePages.push(pageSlots);
    }
    
    // Duplicate all pages for sheet copies
    for (let copy = 0; copy < copies; copy++) {
      basePages.forEach(page => allPages.push([...page]));
    }
    
    // Generate coupon HTML for each page
    const pagesHTML = allPages.map((pageSlots, pageIdx) => {
      const couponSlotsHTML = pageSlots.map(slot => {
        if (slot.isEmpty) {
          return '<div class="coupon-slot empty"></div>';
        }
        
        const item = slot.item;
        const savingsAmt = item.savingsAmount || item.price || 0;
        const savingsFormatted = `$${Number(savingsAmt).toFixed(2)}`;
        const quantityWord = item.quantityWord || 'ONE';
        const productName = item.name || '';
        const brandName = item.brand || '';
        const packSize = item.size || '';
        const imageUrl = item.imageUrl || '';
        const validFrom = item.validFrom || '';
        const validThru = item.validThru || '';
        const pluCode = item.pluCode || item.sku || item.barcode || '';
        
        const imageHTML = imageUrl 
          ? `<img src="${imageUrl}" class="coupon-product-img" alt="Product" crossorigin="anonymous" />`
          : '';
        
        // Format footer: "Valid June 1 thru June 30, 2025. PLU# 76764" (single line)
        let footerText = '';
        if (validFrom && validThru) {
          const fromNoYear = validFrom.replace(/,\s*\d{4}$/, '');
          footerText = `Valid ${fromNoYear} thru ${validThru}. PLU# ${pluCode}`;
        } else if (validFrom) {
          footerText = `Valid ${validFrom}. PLU# ${pluCode}`;
        } else if (validThru) {
          footerText = `Valid thru ${validThru}. PLU# ${pluCode}`;
        } else {
          footerText = `PLU# ${pluCode}`;
        }
        
        // Only render image wrapper if image exists
        const imageSection = imageHTML 
          ? `<div class="coupon-image-wrap">${imageHTML}</div>`
          : '';
        
        return `
          <div class="coupon-slot filled">
            <div class="coupon-header">
              <span class="save-text">SAVE</span> ${savingsFormatted} <span class="save-text">INSTANTLY</span>
            </div>
            <div class="coupon-body">
              <div class="coupon-text">
                on a purchase of <strong>${quantityWord}</strong> ${packSize} of
              </div>
              <div class="coupon-brand-product">
                <strong>${brandName}</strong> ${productName}
              </div>
              ${imageSection}
            </div>
            <div class="coupon-footer">
              <span class="coupon-footer-text">${footerText}</span>
            </div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="coupon-page">
          <div class="coupon-grid">
            ${couponSlotsHTML}
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Coupon Sheet - ${allPages.length} page(s) - 9 coupons/page</title>
          <style>
            @page { 
              size: A4 portrait; 
              margin: 0; 
            }
            
            * { 
              box-sizing: border-box; 
              margin: 0; 
              padding: 0; 
              print-color-adjust: exact; 
              -webkit-print-color-adjust: exact; 
            }
            
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, Helvetica, sans-serif;
              background: white;
            }
            
            .coupon-page {
              width: 210mm;
              height: 297mm;
              padding: 6mm 5mm;
              page-break-after: always;
              page-break-inside: avoid;
              box-sizing: border-box;
              background: white;
            }
            
            .coupon-page:last-child {
              page-break-after: auto;
            }
            
            .coupon-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              grid-template-rows: repeat(3, 1fr);
              gap: 3mm;
              width: 100%;
              height: 100%;
            }
            
            .coupon-slot {
              background: #F5F0D8;
              border: 0.5pt solid #bbb;
              border-radius: 2px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              position: relative;
            }
            
            .coupon-slot.empty {
              visibility: hidden;
              background: transparent;
              border: 0.5pt dashed #ccc;
            }
            
            /* HEADER: Bold red "SAVE $X.XX INSTANTLY" - serif font, large */
            .coupon-header {
              background: #F5F0D8;
              text-align: center;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 13pt;
              font-weight: 900;
              color: #CC0000;
              padding: 6px 4px 4px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              line-height: 1.15;
            }
            
            .coupon-header .save-text {
              text-shadow: 1px 1px 0 rgba(0,0,0,0.1);
            }
            
            /* BODY: Eligibility text + product image */
            .coupon-body {
              flex: 1;
              padding: 3px 8px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 2px;
              justify-content: center;
            }
            
            .coupon-text {
              font-size: 8pt;
              color: #222;
              line-height: 1.25;
            }
            
            .coupon-text strong {
              text-decoration: underline;
              font-weight: 800;
            }
            
            .coupon-brand-product {
              font-size: 8pt;
              color: #222;
              font-weight: 500;
              line-height: 1.25;
            }
            
            .coupon-brand-product strong {
              font-weight: 800;
            }
            
            .coupon-image-wrap {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-top: 8px;
              flex: 1;
              min-height: 80px;
              max-height: 70%;
              overflow: hidden;
            }
            
            .coupon-product-img {
              max-width: 95%;
              max-height: 120px;
              object-fit: contain;
              display: block;
            }
            
            /* FOOTER: Full-width dark blue bar with dates + PLU on one line */
            .coupon-footer {
              background: #1A2B5C;
              color: white;
              padding: 4px 8px;
              font-size: 7pt;
              font-weight: 600;
              letter-spacing: 0.2px;
              min-height: 18px;
              line-height: 1.3;
            }
            
            .coupon-footer-text {
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            @media print {
              .coupon-page {
                margin: 0;
                padding: 6mm 5mm;
                background: white;
              }
              
              .coupon-slot {
                border: 0.5pt solid #bbb;
              }
              
              .coupon-slot.empty {
                border: none;
                visibility: hidden;
              }
            }
          </style>
        </head>
        <body>
          ${pagesHTML}
        </body>
      </html>
    `;
  }

  /**
   * Get grid configuration based on page type
   */
  private getGridConfig() {
    switch (this.pageType) {
      case 'a4-9':
        return {
          gridTemplate: 'grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr);',
          gap: '4mm',
          padding: '6px',
          nameSize: '1.0em',
          textSize: '0.9em',
          priceSize: '1.1em',
          barcodeSize: '0.85em',
          fieldSize: '0.8em'
        };
      case 'a4-10':
        return {
          gridTemplate: 'grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(5, 1fr);',
          gap: '5mm',
          padding: '6px',
          nameSize: '1.0em',
          textSize: '0.9em',
          priceSize: '1.1em',
          barcodeSize: '0.85em',
          fieldSize: '0.8em'
        };
      case 'a4-16':
        return {
          gridTemplate: 'grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr);',
          gap: '3mm',
          padding: '4px',
          nameSize: '0.9em',
          textSize: '0.8em',
          priceSize: '1.0em',
          barcodeSize: '0.75em',
          fieldSize: '0.7em'
        };
      case 'a4-36':
        return {
          gridTemplate: 'grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(6, 1fr);',
          gap: '2mm',
          padding: '3px',
          nameSize: '0.75em',
          textSize: '0.65em',
          priceSize: '0.85em',
          barcodeSize: '0.6em',
          fieldSize: '0.6em'
        };
      default:
        return {
          gridTemplate: 'grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(5, 1fr);',
          gap: '5mm',
          padding: '6px',
          nameSize: '1.0em',
          textSize: '0.9em',
          priceSize: '1.1em',
          barcodeSize: '0.85em',
          fieldSize: '0.8em'
        };
    }
  }

  /**
   * Get label dimensions based on printer type and orientation
   */
  private getLabelDimensions(): { width: string; height: string; orientation: 'portrait' | 'landscape' } {
    const layoutConfig = this.templateService.getLayoutConfig(this.pageType);
    
    if (!layoutConfig) {
      return { width: '62mm', height: '100mm', orientation: 'portrait' };
    }
    
    // Determine final orientation
    let finalOrientation: 'portrait' | 'landscape';
    
    if (this.orientation === 'default') {
      // Use industry standard default from config
      finalOrientation = layoutConfig.defaultOrientation;
    } else {
      // User override
      finalOrientation = this.orientation as 'portrait' | 'landscape';
    }
    
    const width = layoutConfig.labelWidthMm;
    const height = layoutConfig.labelHeightMm;
    
    // If landscape is selected, swap width and height
    if (finalOrientation === 'landscape' && width < height) {
      return {
        width: `${height}mm`,
        height: `${width}mm`,
        orientation: 'landscape'
      };
    } else if (finalOrientation === 'portrait' && width > height) {
      return {
        width: `${height}mm`,
        height: `${width}mm`,
        orientation: 'portrait'
      };
    } else {
      return {
        width: `${width}mm`,
        height: `${height}mm`,
        orientation: finalOrientation
      };
    }
  }

  /**
   * Strip year from date string for coupon footer formatting.
   * "June 1, 2025" → "June 1"
   * "6/1/2025" → "6/1"
   */
  formatDateNoYear(dateStr: string): string {
    if (!dateStr) return '';
    // Remove trailing ", YYYY" pattern
    return dateStr.replace(/,\s*\d{4}$/, '');
  }
}
