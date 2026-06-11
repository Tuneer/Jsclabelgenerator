import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { IndexedDBService } from '../../services/indexed-db.service';
import { CouponImportService } from '../../services/coupon-import.service';
import { AuthService } from '../../services/auth.service';

interface SheetMetadata {
  tableName: string;
  sheetName: string;
  columns: string[];
  rowCount: number;
}

interface ExcelFile {
  name: string;
  fullName: string;  // Full original Excel filename
  uploadedAt: Date;
  storageLocation: string;  // Where it's stored
  sheets: SheetMetadata[];
  expanded: boolean;
  totalRows: number;
  totalColumns: number;
}

@Component({
  selector: 'app-excel-management-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule
  ],
  templateUrl: './excel-management-page.html',
  styleUrl: './excel-management-page.css',
})
export class ExcelManagementPage implements OnInit {
  excelFiles: ExcelFile[] = [];
  selectedSheet: SheetMetadata | null = null;
  sheetData: any[] = [];
  displayedColumns: string[] = [];
  loading = true;
  loadingData = false;
  isAdmin = false;

  // Active Excel selections (separate for Label and Coupon generators)
  activeCouponTable: string | null = null;   // Used by Coupon Generator
  activeLabelTable: string | null = null;    // Used by Label Generator
  settingActive = false;

  constructor(
    private indexedDBService: IndexedDBService,
    private couponImportService: CouponImportService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private router: Router
  ) {
    // Check if user is admin
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/']);
    }
    this.isAdmin = this.authService.isAdmin();
  }

  async ngOnInit() {
    console.log('📊 Excel Management Page: Loading sheets...');
    await this.loadExcelFiles();
    await this.loadActiveExcel();
  }

  async loadExcelFiles() {
    try {
      this.loading = true;
      const allSheets = await this.indexedDBService.getAllSheets();
      console.log('✅ Loaded sheets from IndexedDB:', allSheets);

      // Group sheets by Excel file (extract filename from tableName)
      const fileGroups = new Map<string, SheetMetadata[]>();
      
      allSheets.forEach((sheet: SheetMetadata) => {
        // Extract Excel filename from tableName (format: excelname_sheetname)
        const parts = sheet.tableName.split('_');
        let excelFileName = sheet.sheetName;
        
        // Try to extract Excel filename from tableName
        if (parts.length > 1) {
          // Remove the last part (sheet name) to get Excel filename
          const possibleExcelName = parts.slice(0, -1).join('_');
          if (possibleExcelName) {
            excelFileName = possibleExcelName;
          }
        }
        
        if (!fileGroups.has(excelFileName)) {
          fileGroups.set(excelFileName, []);
        }
        fileGroups.get(excelFileName)!.push(sheet);
      });

      // Convert to ExcelFile array
      this.excelFiles = Array.from(fileGroups.entries()).map(([name, sheets]) => {
        const totalRows = sheets.reduce((sum, s) => sum + s.rowCount, 0);
        const totalColumns = Math.max(...sheets.map(s => s.columns.length));
        
        return {
          name: name,
          fullName: name + '.xlsx',  // Full filename with extension
          uploadedAt: new Date(), // TODO: Store timestamp in IndexedDB
          storageLocation: 'IndexedDB (Browser Storage)',
          sheets: sheets,
          expanded: false,
          totalRows: totalRows,
          totalColumns: totalColumns
        };
      });

      console.log('📁 Excel files grouped:', this.excelFiles);
      this.loading = false;
      this.cdr.detectChanges(); // Force UI update
    } catch (error) {
      console.error('❌ Error loading Excel files:', error);
      this.loading = false;
    }
  }

  async onSheetClick(sheet: SheetMetadata) {
    console.log('📋 Sheet clicked:', sheet.sheetName);
    this.selectedSheet = sheet;
    this.loadingData = true;
    this.cdr.detectChanges();

    try {
      const data = await this.indexedDBService.getSheetData(sheet.tableName);
      console.log('✅ Loaded sheet data:', data.length, 'rows');
      
      this.sheetData = data;
      this.displayedColumns = sheet.columns;
      this.loadingData = false;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error loading sheet data:', error);
      this.loadingData = false;
      this.cdr.detectChanges();
    }
  }

  toggleExcelExpansion(excelFile: ExcelFile) {
    excelFile.expanded = !excelFile.expanded;
    this.cdr.detectChanges();
  }

  async deleteExcelFile(excelFile: ExcelFile, event: Event) {
    event.stopPropagation();
    
    const confirmMsg = `Delete entire Excel file "${excelFile.fullName}" with all ${excelFile.sheets.length} sheet(s)?\n\nThis will permanently delete ${excelFile.totalRows} rows of data.`;
    
    if (confirm(confirmMsg)) {
      try {
        console.log(`🗑️ Deleting Excel file: ${excelFile.fullName}`);
        
        // Delete all sheets in this Excel file
        for (const sheet of excelFile.sheets) {
          await this.indexedDBService.deleteSheet(sheet.tableName);
          console.log(`✅ Deleted sheet: ${sheet.sheetName}`);
        }
        
        console.log(`✅ Deleted entire Excel file: ${excelFile.fullName}`);
        
        // Clear selection if any deleted sheet was selected
        if (this.selectedSheet && excelFile.sheets.some(s => s.tableName === this.selectedSheet?.tableName)) {
          this.selectedSheet = null;
          this.sheetData = [];
          this.displayedColumns = [];
        }
        
        // Reload files
        await this.loadExcelFiles();
        
        alert(`Successfully deleted "${excelFile.fullName}" with all its sheets.`);
      } catch (error) {
        console.error('❌ Error deleting Excel file:', error);
        alert(`Failed to delete Excel file: ${error}`);
      }
    }
  }

  get totalSheets(): number {
    return this.excelFiles.reduce((sum, file) => sum + file.sheets.length, 0);
  }

  get totalRows(): number {
    return this.excelFiles.reduce((sum, file) => 
      sum + file.sheets.reduce((s, sheet) => s + sheet.rowCount, 0), 0
    );
  }

  // ===== Active Excel Selection =====
  // Two independent active settings: Labels (merchant item master) and Coupons

  async loadActiveExcel(): Promise<void> {
    try {
      this.activeCouponTable = await this.indexedDBService.getActiveExcel('coupon');
      this.activeLabelTable = await this.indexedDBService.getActiveExcel('label');
      console.log('📌 Active Coupon Excel:', this.activeCouponTable || 'None');
      console.log('📌 Active Label Excel:', this.activeLabelTable || 'None');
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to load active Excel:', err);
    }
  }

  // ===== Sheet-level active setters =====

  async setActiveCouponSheet(sheet: SheetMetadata, event: Event): Promise<void> {
    event.stopPropagation();
    this.settingActive = true;
    this.cdr.detectChanges();
    try {
      await this.indexedDBService.setActiveExcel(sheet.tableName, 'coupon');
      this.activeCouponTable = sheet.tableName;
      console.log(`✅ Set active COUPON sheet: ${sheet.tableName}`);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to set active coupon Excel:', err);
    } finally {
      this.settingActive = false;
      this.cdr.detectChanges();
    }
  }

  async setActiveLabelSheet(sheet: SheetMetadata, event: Event): Promise<void> {
    event.stopPropagation();
    this.settingActive = true;
    this.cdr.detectChanges();
    try {
      await this.indexedDBService.setActiveExcel(sheet.tableName, 'label');
      this.activeLabelTable = sheet.tableName;
      console.log(`✅ Set active LABEL sheet: ${sheet.tableName}`);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to set active label Excel:', err);
    } finally {
      this.settingActive = false;
      this.cdr.detectChanges();
    }
  }

  // ===== File-level active setters =====

  async setActiveCouponFile(excelFile: ExcelFile, event: Event): Promise<void> {
    event.stopPropagation();
    if (!excelFile.sheets || excelFile.sheets.length === 0) return;
    this.settingActive = true;
    this.cdr.detectChanges();
    try {
      const firstSheet = excelFile.sheets[0];
      await this.indexedDBService.setActiveExcel(firstSheet.tableName, 'coupon');
      this.activeCouponTable = firstSheet.tableName;
      excelFile.expanded = true;
      console.log(`✅ Set active COUPON file: ${excelFile.fullName}`);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to set active coupon Excel file:', err);
    } finally {
      this.settingActive = false;
      this.cdr.detectChanges();
    }
  }

  async setActiveLabelFile(excelFile: ExcelFile, event: Event): Promise<void> {
    event.stopPropagation();
    if (!excelFile.sheets || excelFile.sheets.length === 0) return;
    this.settingActive = true;
    this.cdr.detectChanges();
    try {
      const firstSheet = excelFile.sheets[0];
      await this.indexedDBService.setActiveExcel(firstSheet.tableName, 'label');
      this.activeLabelTable = firstSheet.tableName;
      excelFile.expanded = true;
      console.log(`✅ Set active LABEL file: ${excelFile.fullName}`);
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to set active label Excel file:', err);
    } finally {
      this.settingActive = false;
      this.cdr.detectChanges();
    }
  }

  // ===== Clear methods =====

  async clearActiveCoupon(event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.indexedDBService.clearActiveExcel('coupon');
      this.activeCouponTable = null;
      console.log('✅ Cleared active coupon Excel');
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to clear active coupon Excel:', err);
    }
  }

  async clearActiveLabel(event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await this.indexedDBService.clearActiveExcel('label');
      this.activeLabelTable = null;
      console.log('✅ Cleared active label Excel');
      this.cdr.detectChanges();
    } catch (err) {
      console.error('❌ Failed to clear active label Excel:', err);
    }
  }

  // ===== Helper methods =====

  isCouponSheet(sheet: SheetMetadata): boolean {
    return this.activeCouponTable === sheet.tableName;
  }

  isLabelSheet(sheet: SheetMetadata): boolean {
    return this.activeLabelTable === sheet.tableName;
  }

  isCouponFile(excelFile: ExcelFile): boolean {
    return excelFile.sheets.some(s => s.tableName === this.activeCouponTable);
  }

  isLabelFile(excelFile: ExcelFile): boolean {
    return excelFile.sheets.some(s => s.tableName === this.activeLabelTable);
  }

  /** Get active file name + sheet for display */
  getActiveLabel(tableName: string | null): string {
    if (!tableName) return 'None';
    for (const file of this.excelFiles) {
      const sheet = file.sheets.find(s => s.tableName === tableName);
      if (sheet) return `${file.fullName} → ${sheet.sheetName}`;
    }
    return tableName;
  }

  getCouponActiveLabel(): string {
    return this.getActiveLabel(this.activeCouponTable);
  }

  getLabelActiveLabel(): string {
    return this.getActiveLabel(this.activeLabelTable);
  }

  deleteSheet(sheet: SheetMetadata, event: Event): void {
    event.stopPropagation();
    const confirmMsg = `Delete sheet "${sheet.sheetName}"?\nThis will permanently delete ${sheet.rowCount} rows of data.`;
    if (confirm(confirmMsg)) {
      this.indexedDBService.deleteSheet(sheet.tableName).then(async () => {
        // Clear active settings if the deleted sheet was active
        if (this.activeCouponTable === sheet.tableName) {
          await this.indexedDBService.clearActiveExcel('coupon');
          this.activeCouponTable = null;
        }
        if (this.activeLabelTable === sheet.tableName) {
          await this.indexedDBService.clearActiveExcel('label');
          this.activeLabelTable = null;
        }
        if (this.selectedSheet?.tableName === sheet.tableName) {
          this.selectedSheet = null;
          this.sheetData = [];
          this.displayedColumns = [];
        }
        await this.loadExcelFiles();
      });
    }
  }
}
