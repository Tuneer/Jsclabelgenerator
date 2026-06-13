import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';

import { PosItem } from '../../models/pos-item.model';
import { LabelTemplate, LabelPageType } from '../../models/label-template.model';
import { IndexedDBService } from '../../services/indexed-db.service';
import { CouponImportService } from '../../services/coupon-import.service';
import { LabelTemplateService } from '../../services/label-template.service';
import { PrintPreviewComponent } from '../../components/print-preview/print-preview.component';

@Component({
  standalone: true,
  selector: 'app-coupon-generator-page',
  templateUrl: './coupon-generator-page.component.html',
  styleUrls: ['./coupon-generator-page.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatCheckboxModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    PrintPreviewComponent
  ]
})
export class CouponGeneratorPageComponent implements OnInit {
  // Data
  coupons: PosItem[] = [];
  editableCoupons: PosItem[] = [];
  activeExcelName: string | null = null;
  activeExcelLabel: string = '';

  // Loading states
  loading = true;
  loadingData = false;
  error: string | null = null;

  // Selection
  selectedIds = new Set<string>();

  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100, 200];

  // Coupon table columns
  displayedColumns: string[] = [
    'select',
    'pluCode',
    'brand',
    'name',
    'size',
    'quantityWord',
    'savingsAmount',
    'validFrom',
    'validThru',
    'imageUrl',
    'category'
  ];

  // Print controls
  copies: number = 1;
  showPreview = false;
  selectedTemplate: LabelTemplate | null = null;
  pageType: LabelPageType = 'a4-9'; // Always coupon grid
  orientation: 'default' | 'portrait' | 'landscape' = 'default';

  // Coupon template (hardcoded for coupon mode)
  couponTemplate!: LabelTemplate;

  // Expose Math to template
  Math = Math;

  constructor(
    private indexedDBService: IndexedDBService,
    private couponImportService: CouponImportService,
    private labelTemplateService: LabelTemplateService,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    // Get the coupon template
    const templates = this.labelTemplateService.getTemplates();
    this.couponTemplate = templates.find(t => t.id === 'coupon') || templates[0];
    this.selectedTemplate = this.couponTemplate;

    await this.loadCoupons();
  }

  async loadCoupons(): Promise<void> {
    this.loading = true;
    this.error = null;

    console.log('🔄 [CouponGenerator] loadCoupons() STARTED');

    try {
      // Step 1: Get active COUPON Excel
      console.log('🔄 [CouponGenerator] Step 1: Calling getActiveExcel("coupon")...');
      this.activeExcelName = await this.indexedDBService.getActiveExcel('coupon');
      console.log('✅ [CouponGenerator] Step 1 DONE. Active coupon Excel:', this.activeExcelName || 'NULL');

      if (!this.activeExcelName) {
        this.coupons = [];
        this.editableCoupons = [];
        this.error = 'No active coupon Excel sheet selected. Go to Excel Management and set an Excel as active for Coupons.';
        this.loading = false;
        console.log('⚠️ [CouponGenerator] No active Excel set, showing error');
        return;
      }

      // Step 2: Load and transform coupon data
      console.log('🔄 [CouponGenerator] Step 2: Loading coupons from sheet:', this.activeExcelName);
      this.loadingData = true;
      this.coupons = await this.couponImportService.loadCouponsFromSheet(this.activeExcelName);
      console.log('✅ [CouponGenerator] Step 2 DONE. Loaded', this.coupons.length, 'coupons');
      
      this.editableCoupons = this.coupons.map(c => ({ ...c }));
      this.activeExcelLabel = this.activeExcelName;

      console.log(`🎫 [CouponGenerator] Total: ${this.coupons.length} coupons from: ${this.activeExcelName}`);
    } catch (err: any) {
      console.error('❌ [CouponGenerator] Failed to load coupons:', err);
      this.error = `Failed to load coupon data: ${err.message || err}`;
    } finally {
      // Ensure UI updates by running inside Angular's zone
      // (IndexedDB async callbacks may run outside NgZone)
      this.ngZone.run(() => {
        this.loading = false;
        this.loadingData = false;
        console.log('🏁 [CouponGenerator] loadCoupons() FINISHED. loading=false');
      });
    }
  }

  // ===== Selection =====

  toggleSelection(item: PosItem, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(item.id);
    } else {
      this.selectedIds.delete(item.id);
    }
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.paginatedItems.forEach(i => this.selectedIds.add(i.id));
    } else {
      this.paginatedItems.forEach(i => this.selectedIds.delete(i.id));
    }
  }

  isSelected(item: PosItem): boolean {
    return this.selectedIds.has(item.id);
  }

  isAllPageSelected(): boolean {
    return this.paginatedItems.length > 0 && this.paginatedItems.every(i => this.selectedIds.has(i.id));
  }

  selectAll(): void {
    this.editableCoupons.forEach(i => this.selectedIds.add(i.id));
  }

  deselectAll(): void {
    this.selectedIds.clear();
  }

  // ===== Pagination =====

  get paginatedItems(): PosItem[] {
    const start = this.pageIndex * this.pageSize;
    return this.editableCoupons.slice(start, start + this.pageSize);
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  // ===== Print =====

  get selectedItems(): PosItem[] {
    return this.editableCoupons.filter(i => this.selectedIds.has(i.id));
  }

  getTotalCoupons(): number {
    const count = this.selectedIds.size;
    if (count === 0) return 0;
    
    // Each selected coupon appears once per sheet
    // Total = selected coupons × sheet copies
    return count * this.copies;
  }

  onPrintRequested(): void {
    if (this.selectedIds.size === 0) return;
    this.showPreview = true;
  }

  onPreviewClosed(): void {
    this.showPreview = false;
  }

  onPrinted(): void {
    console.log('✅ Coupons printed');
  }

  // ===== Helpers =====

  formatCurrency(value: any): string {
    const num = parseFloat(value);
    return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
  }
}
