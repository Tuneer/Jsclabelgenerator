import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { PosSyncService } from '../../services/pos-sync.service';
import { IndexedDBService } from '../../services/indexed-db.service';
import { PosItem } from '../../models/pos-item.model';
import { ExcelSheet } from '../../models/excel-sheet.model';
import * as XLSX from 'xlsx';

// Upload state enum for cleaner state management
type UploadState = 'idle' | 'parsing' | 'selecting' | 'uploading' | 'complete' | 'error';

interface UploadSummary {
  fileName: string;
  totalSheets: number;
  totalRows: number;
  totalColumns: number;
  uploadTime: string;
}

@Component({
  standalone: true,
  selector: 'app-excel-import',
  templateUrl: './excel-import.component.html',
  styleUrls: ['./excel-import.component.css'],
  // Removed OnPush - Signals handle change detection automatically!
  imports: [
    CommonModule,
    RouterModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatIconModule, 
    MatTableModule, 
    MatButtonModule, 
    MatPaginatorModule,
    MatCheckboxModule,
    MatCardModule,
    MatChipsModule
  ]
})
export class ExcelImportComponent {
  // ✨ SIGNALS - Automatic change detection!
  uploadState = signal<UploadState>('idle');
  error = signal<string | null>(null);
  currentFileName = signal<string>('');
  
  // Excel sheets management
  excelSheets = signal<ExcelSheet[]>([]);
  selectedSheets = signal<ExcelSheet[]>([]);
  
  // Upload progress
  currentSheetIndex = signal<number>(0);
  processedSheetCount = signal<number>(0);
  totalSheetsToProcess = signal<number>(0);
  
  // Upload summary
  uploadSummary = signal<UploadSummary>({
    fileName: '',
    totalSheets: 0,
    totalRows: 0,
    totalColumns: 0,
    uploadTime: ''
  });
  
  // Legacy support for preview (can be removed later)
  parsedItems = signal<PosItem[]>([]);
  previewItems = signal<PosItem[]>([]);
  displayedColumns = signal<string[]>([]);
  importedCount = signal<number | null>(null);
  
  // Pagination
  pageSize = signal<number>(50);
  pageIndex = signal<number>(0);

  // 🎯 COMPUTED SIGNALS - Auto-calculated values
  selectedSheetsCount = computed(() => 
    this.excelSheets().filter(s => s.selected).length
  );
  
  hasSelectedSheets = computed(() => 
    this.excelSheets().some(s => s.selected)
  );
  
  isUploading = computed(() => 
    this.uploadState() === 'uploading'
  );
  
  isComplete = computed(() => 
    this.uploadState() === 'complete'
  );
  
  canUpload = computed(() => 
    this.uploadState() === 'selecting' && this.hasSelectedSheets()
  );
  
  uploadProgress = computed(() => {
    const total = this.totalSheetsToProcess();
    const processed = this.processedSheetCount();
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  });

  constructor(
    private posSyncService: PosSyncService,
    private indexedDBService: IndexedDBService
    // ✨ No more ChangeDetectorRef or NgZone needed!
  ) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    console.log('📁 File selected:', file.name, 'Size:', file.size, 'bytes');
    this.currentFileName.set(file.name);
    
    // Reset state
    this.uploadState.set('parsing');
    this.error.set(null);
    this.importedCount.set(null);
    this.excelSheets.set([]);
    this.processedSheetCount.set(0);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        console.log('📖 Reading Excel file...');
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        console.log('📊 Workbook contains', workbook.SheetNames.length, 'sheets:', workbook.SheetNames);
        
        // Parse all sheets
        const sheets = workbook.SheetNames.map((sheetName, index) => {
          const sheet = workbook.Sheets[sheetName];
          const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
          
          console.log(`📝 Sheet "${sheetName}": ${rows.length} rows, ${columns.length} columns`);
          
          return {
            name: sheetName,
            data: rows,
            columns: columns,
            rowCount: rows.length,
            selected: true, // AUTO-SELECT ALL SHEETS by default
            tableName: this.sanitizeTableName(`${this.getFileNameWithoutExt(file.name)}_${sheetName}`),
            mapped: false
          };
        });

        if (sheets.length === 0) {
          throw new Error('Excel file contains no sheets');
        }

        // Update state - Signals automatically trigger UI updates!
        this.excelSheets.set(sheets);
        this.uploadState.set('selecting');
        
        console.log('✅ Parsed', sheets.length, 'sheets successfully');
        console.log('🎯 All sheets auto-selected for upload');
        
      } catch (err) {
        console.error('❌ Excel import failed:', err);
        this.error.set('Failed to parse Excel file. Please check the format.');
        this.uploadState.set('error');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  toggleSheetSelection(sheet: ExcelSheet): void {
    // Update sheet selection
    const sheets = this.excelSheets();
    const index = sheets.indexOf(sheet);
    if (index !== -1) {
      sheets[index].selected = !sheets[index].selected;
      this.excelSheets.set([...sheets]); // Trigger signal update
    }
  }

  async proceedWithSelectedSheets(): Promise<void> {
    const selected = this.excelSheets().filter(s => s.selected);
    
    if (selected.length === 0) {
      this.error.set('Please select at least one sheet to import');
      return;
    }

    console.log('\n🚀 Starting upload of', selected.length, 'sheet(s) from Excel:', this.currentFileName());
    
    // No more NgZone.run() needed - Signals handle everything!
    this.uploadState.set('uploading');
    this.selectedSheets.set(selected);
    this.totalSheetsToProcess.set(selected.length);
    this.currentSheetIndex.set(0);
    this.processedSheetCount.set(0);
    
    const startTime = Date.now();
    
    try {
      // Process all sheets without column mapping
      await this.saveAllSheetsDirectly();
      
      const endTime = Date.now();
      const uploadTimeMs = endTime - startTime;
      
      // Prepare upload summary
      this.uploadSummary.set({
        fileName: this.currentFileName(),
        totalSheets: this.processedSheetCount(),
        totalRows: selected.reduce((sum, s) => sum + s.rowCount, 0),
        totalColumns: Math.max(...selected.map(s => s.columns.length)),
        uploadTime: uploadTimeMs < 1000 ? `${uploadTimeMs}ms` : `${(uploadTimeMs / 1000).toFixed(2)}s`
      });
      
      this.uploadState.set('complete');
      
      console.log('✅ Upload complete! UI updated automatically by Signals.');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      this.error.set(`Upload failed: ${error}`);
      this.uploadState.set('error');
    }
  }

  private async saveAllSheetsDirectly(): Promise<void> {
    console.log('💾 Saving all sheets directly to IndexedDB (no mapping)...');
    
    const selected = this.selectedSheets();
    
    // Sequential saving with automatic UI updates via Signals!
    for (let i = 0; i < selected.length; i++) {
      const sheet = selected[i];
      this.currentSheetIndex.set(i);
      
      console.log(`📋 Saving sheet ${i + 1}/${this.totalSheetsToProcess()}: "${sheet.name}"`);
      
      // Save sheet metadata and data
      await Promise.all([
        this.indexedDBService.saveSheet({
          tableName: sheet.tableName!,
          sheetName: sheet.name,
          columns: sheet.columns,
          rowCount: sheet.rowCount
        }),
        this.indexedDBService.saveSheetData(sheet.tableName!, sheet.data)
      ]);
      
      // Signals automatically update UI - no markForCheck() needed!
      this.processedSheetCount.set(this.processedSheetCount() + 1);
      
      console.log(`✅ Saved sheet "${sheet.name}" (${this.processedSheetCount()}/${this.totalSheetsToProcess()})`);
    }
    
    console.log('\n🎉 ALL SHEETS SAVED SUCCESSFULLY!');
    console.log(`✅ Total sheets saved: ${this.processedSheetCount()}`);
    
    // Show preview of last sheet
    const lastSheet = selected[selected.length - 1];
    this.parsedItems.set(lastSheet.data);
    this.previewItems.set(lastSheet.data.slice(0, 100));
    this.displayedColumns.set(lastSheet.columns);
    this.importedCount.set(this.processedSheetCount());
  }

  private sanitizeTableName(sheetName: string): string {
    // Remove special characters and spaces, convert to snake_case
    return sheetName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 63); // SQLite table name limit
  }

  private getFileNameWithoutExt(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '').replace(/[^a-z0-9_]/gi, '_');
  }
}
