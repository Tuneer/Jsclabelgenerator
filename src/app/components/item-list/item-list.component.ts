import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { PosItem } from '../../models/pos-item.model';
import { LabelTemplateService } from '../../services/label-template.service';
import { LabelPageType, LabelTemplate } from '../../models/label-template.model';

@Component({
  standalone: true,
  selector: 'app-item-list',
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatTableModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatPaginatorModule
  ]
})
export class ItemListComponent implements OnChanges {
  @Input() items: PosItem[] = [];
  @Input() syncing = false;
  @Output() selectionChange = new EventEmitter<PosItem[]>();
  @Output() printRequested = new EventEmitter<{ template: LabelTemplate; pageType: LabelPageType; copies: number; orientation: 'default' | 'portrait' | 'landscape' }>();
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  editableItems: PosItem[] = [];
  displayedColumns: string[] = [
    'select',
    'brand',
    'category',
    'subCategory',
    'name',
    'size',
    'price',
    'description',
    'sku',
    'barcode'
  ];

  selectedIds = new Set<string>();
  
  // Pagination
  pageSize = 50;
  pageIndex = 0;
  pageSizeOptions = [25, 50, 100, 200];

  readonly templates: LabelTemplate[];
  readonly pageTypes: { value: LabelPageType; label: string; group: string }[] = [
    // A4 Laser Printer
    { value: 'a4-10', label: '10 labels/page (2×5 grid)', group: 'A4 Laser Printer' },
    { value: 'a4-16', label: '16 labels/page (4×4 grid)', group: 'A4 Laser Printer' },
    { value: 'a4-36', label: '36 labels/page (6×6 grid)', group: 'A4 Laser Printer' },
    
    // Brother QL-700/800
    { value: 'brother-17x54', label: '17mm × 54mm (Address)', group: 'Brother QL-700/800' },
    { value: 'brother-29x90', label: '29mm × 90mm (Standard)', group: 'Brother QL-700/800' },
    { value: 'brother-38x90', label: '38mm × 90mm (File Folder)', group: 'Brother QL-700/800' },
    { value: 'brother-62x100', label: '62mm × 100mm (Shipping)', group: 'Brother QL-700/800' },
    
    // Brother QL-810 with DK 2551
    { value: 'brother-62x29', label: '62mm × 29mm (DK 2551 Continuous)', group: 'Brother QL-810' },
    
    // Zebra Label Printer
    { value: 'zebra-2x1', label: '2" × 1" (50mm × 25mm)', group: 'Zebra Label Printer' },
    { value: 'zebra-3x2', label: '3" × 2" (76mm × 51mm)', group: 'Zebra Label Printer' },
    { value: 'zebra-4x3', label: '4" × 3" (102mm × 76mm)', group: 'Zebra Label Printer' },
    { value: 'zebra-4x6', label: '4" × 6" (102mm × 152mm)', group: 'Zebra Label Printer' }
  ];

  selectedTemplateId: string | null = null;
  selectedPageType: LabelPageType | null = null;
  copies: number = 1; // Number of copies to print
  selectedOrientation: 'default' | 'portrait' | 'landscape' = 'default'; // Orientation override

  readonly orientationOptions = [
    { value: 'default', label: 'Auto (Industry Standard)' },
    { value: 'portrait', label: 'Portrait (↕️ Vertical)' },
    { value: 'landscape', label: 'Landscape (↔️ Horizontal)' }
  ];

  constructor(templateService: LabelTemplateService) {
    this.templates = templateService.getTemplates();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.editableItems = this.items.map((i) => ({ ...i }));
      this.selectedIds.clear();
      this.pageIndex = 0;
      if (this.paginator) {
        this.paginator.firstPage();
      }
      this.emitSelection();
    }
  }

  get filteredItems(): PosItem[] {
    // No filtering needed - items are already filtered by cascading filters
    return this.editableItems;
  }

  get paginatedItems(): PosItem[] {
    const filtered = this.filteredItems;
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return filtered.slice(startIndex, endIndex);
  }

  toggleSelection(item: PosItem, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(item.id);
    } else {
      this.selectedIds.delete(item.id);
    }
    this.emitSelection();
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      // Only select visible items on current page
      this.paginatedItems.forEach((i) => this.selectedIds.add(i.id));
    } else {
      // Deselect all items on current page
      this.paginatedItems.forEach((i) => this.selectedIds.delete(i.id));
    }
    this.emitSelection();
  }

  onPageChange(event: any): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  isSelected(item: PosItem): boolean {
    return this.selectedIds.has(item.id);
  }

  onEditableChange(): void {
    this.emitSelection();
  }

  private emitSelection(): void {
    const selection = this.editableItems.filter((i) => this.selectedIds.has(i.id));
    this.selectionChange.emit(selection);
  }

  requestPrint(): void {
    const template = this.templates.find((t) => t.id === this.selectedTemplateId) || this.templates[0];
    const pageType = this.selectedPageType || 'a4-10';
    const copies = this.copies || 1;
    const orientation = this.selectedOrientation;
    this.printRequested.emit({ template, pageType, copies, orientation });
  }

  getTotalLabels(): number {
    const selectedCount = this.selectedIds.size;
    const copies = this.copies || 1;
    const pageType = this.selectedPageType;
    
    // For Brother/Zebra: total = items × copies
    if (pageType?.startsWith('brother-') || pageType?.startsWith('zebra-')) {
      return selectedCount * copies;
    }
    
    // For A4: calculate based on grid layout
    if (pageType === 'a4-10') {
      return selectedCount === 1 ? 10 * copies : selectedCount * copies;
    } else if (pageType === 'a4-16') {
      return selectedCount === 1 ? 16 * copies : selectedCount * copies;
    } else if (pageType === 'a4-36') {
      return selectedCount === 1 ? 36 * copies : selectedCount * copies;
    }
    
    return selectedCount * copies;
  }
}
