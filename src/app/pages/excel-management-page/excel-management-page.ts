import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IndexedDBService } from '../../services/indexed-db.service';

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
    MatTooltipModule
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

  constructor(
    private indexedDBService: IndexedDBService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    console.log('📊 Excel Management Page: Loading sheets...');
    await this.loadExcelFiles();
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
}
