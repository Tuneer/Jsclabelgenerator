import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PosSyncService } from '../../services/pos-sync.service';
import { IndexedDBService } from '../../services/indexed-db.service';
import { ItemFilterService } from '../../services/item-filter.service';
import { PosItem } from '../../models/pos-item.model';
import { LabelTemplate, LabelPageType } from '../../models/label-template.model';
import { Department, ItemType, ItemSubType, ItemBrand } from '../../models/filter-entities.model';
import { ItemListComponent } from '../../components/item-list/item-list.component';
import { PrintPreviewComponent } from '../../components/print-preview/print-preview.component';

@Component({
  standalone: true,
  selector: 'app-label-generator-page',
  templateUrl: './label-generator-page.component.html',
  styleUrls: ['./label-generator-page.component.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    ItemListComponent,
    PrintPreviewComponent
  ]
})
export class LabelGeneratorPageComponent implements OnInit {
  // Sheet selection (kept for backward compatibility)
  availableSheets: any[] = [];
  selectedSheet: any | null = null;
  loadingSheets = false;
  
  // Items display
  private itemsSubject = new BehaviorSubject<PosItem[]>([]);
  items$ = this.itemsSubject.asObservable();
  
  printedHistory$!: Observable<PosItem[]>;
  lastSync$!: Observable<Date | null>;
  syncing$!: Observable<boolean>;

  showPrintedHistory = false;
  selectedItems: PosItem[] = [];
  selectedTemplate: LabelTemplate | null = null;
  selectedPageType: LabelPageType | null = null;
  selectedCopies: number = 1;
  selectedOrientation: 'default' | 'portrait' | 'landscape' = 'default';
  showPreview = false;

  // 🆕 Cascading Filter State (using Signals)
  loadingFilters = signal<boolean>(false);
  filterError = signal<string | null>(null);
  
  // Filter data
  departments = signal<Department[]>([]);
  allBrands = signal<ItemBrand[]>([]);
  
  // Selected filter values
  selectedDepartment = signal<number | null>(null);
  selectedType = signal<number | null>(null);
  selectedSubType = signal<number | null>(null);
  selectedBrand = signal<number | null>(null);
  
  // Computed cascading filters
  availableTypes = signal<ItemType[]>([]);
  availableSubTypes = signal<ItemSubType[]>([]);
  
  // Filter UI state
  showingFilteredItems = signal<boolean>(false);

  constructor(
    private posSyncService: PosSyncService,
    private indexedDBService: IndexedDBService,
    private itemFilterService: ItemFilterService
  ) {
    this.printedHistory$ = this.posSyncService.printedHistory$;
    this.lastSync$ = this.posSyncService.lastSync$;
    this.syncing$ = this.posSyncService.syncing$;
  }

  async ngOnInit(): Promise<void> {
    await this.loadAvailableSheets();
    await this.loadFilterData();
  }

  async loadAvailableSheets(): Promise<void> {
    this.loadingSheets = true;
    try {
      this.availableSheets = await this.indexedDBService.getAllSheets();
      console.log('📊 Loaded', this.availableSheets.length, 'available sheets');
    } catch (err) {
      console.error('❌ Failed to load sheets:', err);
    } finally {
      this.loadingSheets = false;
    }
  }

  async onSheetSelected(sheet: any): Promise<void> {
    this.selectedSheet = sheet;
    console.log('📝 Selected sheet:', sheet.sheetName, '(', sheet.tableName, ')');
    
    try {
      // Load data from selected sheet
      const sheetData = await this.indexedDBService.getSheetData(sheet.tableName);
      console.log('✅ Loaded', sheetData.length, 'rows from sheet');
      
      // Convert raw data to PosItem format (if needed)
      // For now, display as-is
      this.itemsSubject.next(sheetData as PosItem[]);
    } catch (err) {
      console.error('❌ Failed to load sheet data:', err);
    }
  }

  get itemsSource$(): Observable<PosItem[]> {
    return this.showPrintedHistory ? this.printedHistory$ : this.items$;
  }

  onPosSync(): void {
    this.posSyncService.manualSync();
  }

  onSelectionChange(items: PosItem[]): void {
    this.selectedItems = items;
  }

  onPrintRequested(event: { template: LabelTemplate; pageType: LabelPageType; copies: number; orientation: 'default' | 'portrait' | 'landscape' }): void {
    this.selectedTemplate = event.template;
    this.selectedPageType = event.pageType;
    this.selectedCopies = event.copies;
    this.selectedOrientation = event.orientation;
    this.showPreview = true;
  }

  onPreviewClosed(): void {
    this.showPreview = false;
  }

  onPrinted(): void {
    this.posSyncService.markItemsPrinted(this.selectedItems);
  }

  togglePrintedHistory(): void {
    this.showPrintedHistory = !this.showPrintedHistory;
  }

  // 🆕 Cascading Filter Methods
  
  /**
   * Load filter data from Excel sheets
   */
  async loadFilterData(): Promise<void> {
    this.loadingFilters.set(true);
    this.filterError.set(null);
    
    try {
      console.log('📊 Loading filter data...');
      
      // Initialize filter service
      await this.itemFilterService.init();
      
      // Load departments and brands
      const [depts, brands] = await Promise.all([
        this.itemFilterService.getDepartments(),
        this.itemFilterService.getAllBrands(true) // Only brands with items
      ]);
      
      this.departments.set(depts);
      this.allBrands.set(brands);
      
      console.log(`✅ Loaded ${depts.length} departments, ${brands.length} brands`);
    } catch (error: any) {
      console.error('❌ Failed to load filter data:', error);
      this.filterError.set('Failed to load filter options. Please upload Excel files first.');
    } finally {
      this.loadingFilters.set(false);
    }
  }

  /**
   * Handle department selection change
   */
  async onDepartmentChange(deptId: number | null): Promise<void> {
    this.selectedDepartment.set(deptId);
    
    // Reset downstream filters
    this.selectedType.set(null);
    this.selectedSubType.set(null);
    this.availableTypes.set([]);
    this.availableSubTypes.set([]);
    
    // Load types for selected department
    if (deptId !== null) {
      try {
        const types = await this.itemFilterService.getTypesByDepartment(deptId);
        this.availableTypes.set(types);
        console.log(`📋 Loaded ${types.length} types for department ${deptId}`);
      } catch (error) {
        console.error('❌ Failed to load types:', error);
      }
    }
  }

  /**
   * Handle type selection change
   */
  async onTypeChange(typeGid: number | null): Promise<void> {
    this.selectedType.set(typeGid);
    
    // Reset downstream filters
    this.selectedSubType.set(null);
    this.availableSubTypes.set([]);
    
    // Load sub-types for selected type
    if (typeGid !== null) {
      try {
        const subTypes = await this.itemFilterService.getSubTypesByType(typeGid);
        this.availableSubTypes.set(subTypes);
        console.log(`📋 Loaded ${subTypes.length} sub-types for type ${typeGid}`);
      } catch (error) {
        console.error('❌ Failed to load sub-types:', error);
      }
    }
  }

  /**
   * Handle sub-type selection change
   */
  onSubTypeChange(subTypeGid: number | null): void {
    this.selectedSubType.set(subTypeGid);
  }

  /**
   * Handle brand selection change
   */
  onBrandChange(brandGid: number | null): void {
    this.selectedBrand.set(brandGid);
  }

  /**
   * Show filtered items based on selected criteria
   */
  async onShowItems(): Promise<void> {
    try {
      console.log('🔍 Fetching filtered items...');
      
      const filtered = await this.itemFilterService.getFilteredItems({
        departmentId: this.selectedDepartment(),
        typeGid: this.selectedType(),
        subTypeGid: this.selectedSubType(),
        brandGid: this.selectedBrand()
      });
      
      this.itemsSubject.next(filtered as PosItem[]);
      this.showingFilteredItems.set(true);
      
      console.log(`✅ Displaying ${filtered.length} filtered items`);
    } catch (error) {
      console.error('❌ Failed to fetch filtered items:', error);
      alert('Failed to load items. Please check console for details.');
    }
  }

  /**
   * Reset all filters
   */
  resetFilters(): void {
    this.selectedDepartment.set(null);
    this.selectedType.set(null);
    this.selectedSubType.set(null);
    this.selectedBrand.set(null);
    this.availableTypes.set([]);
    this.availableSubTypes.set([]);
    this.itemsSubject.next([]);
    this.showingFilteredItems.set(false);
    console.log('🔄 Filters reset');
  }
}
