# Reusable Implementation Blueprint
## Step-by-Step Guide for Building Similar Label Generator Applications

**Purpose**: This blueprint provides a vendor-agnostic, step-by-step guide for building label generator applications similar to the JSC Label Generator. Use this to implement similar systems for Lottery Mart, grocery stores, pharmacies, or any retail business requiring product labeling.

**Based On**: JSC Label Generator v1.0 (Lila Liquor implementation)  
**Developer**: Tuneer Mahatpure (mahatpuretuneer@gmail.com)  
**Last Updated**: December 19, 2024

---

## Table of Contents
1. [Pre-Implementation Checklist](#pre-implementation-checklist)
2. [Phase 1: Project Setup (Day 1)](#phase-1-project-setup-day-1)
3. [Phase 2: Data Analysis (Day 1-2)](#phase-2-data-analysis-day-1-2)
4. [Phase 3: Excel Import System (Day 2-3)](#phase-3-excel-import-system-day-2-3)
5. [Phase 4: Data Storage (Day 3-4)](#phase-4-data-storage-day-3-4)
6. [Phase 5: Dashboard & Navigation (Day 4-5)](#phase-5-dashboard--navigation-day-4-5)
7. [Phase 6: Filter System (Day 5-7)](#phase-6-filter-system-day-5-7)
8. [Phase 7: Item Display (Day 7-8)](#phase-7-item-display-day-7-8)
9. [Phase 8: Print System (Day 8-10)](#phase-8-print-system-day-8-10)
10. [Phase 9: Testing & Refinement (Day 10-12)](#phase-9-testing--refinement-day-10-12)
11. [Vendor-Specific Customization Guide](#vendor-specific-customization-guide)
12. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Pre-Implementation Checklist

### Business Requirements
- [ ] Identify vendor/client name (e.g., "Lottery Mart")
- [ ] Understand business type (liquor store, grocery, pharmacy, etc.)
- [ ] Define label types needed (price labels, shelf labels, promotional)
- [ ] Identify printer types (A4 laser, label printer, thermal)
- [ ] Determine data source (Excel, POS system, database)

### Data Requirements
- [ ] Obtain sample Excel files with real data
- [ ] Document all Excel sheets and their relationships
- [ ] Identify primary keys and foreign keys
- [ ] Map required label fields to Excel columns
- [ ] Understand hierarchical data structure (if any)

### Technical Requirements
- [ ] Node.js installed (v18+)
- [ ] Angular CLI installed (v21+)
- [ ] Code editor (VS Code recommended)
- [ ] Git for version control
- [ ] Browser for testing (Chrome recommended)

### Design Requirements
- [ ] Collect brand colors and logo
- [ ] Define UI preferences (dark mode, themes)
- [ ] Identify required languages (English, Spanish, etc.)
- [ ] Gather label design samples

---

## Phase 1: Project Setup (Day 1)

### 1.1 Create Angular Project
```bash
# Navigate to workspace
cd ~/Projects

# Create new Angular project
ng new [VendorName]LabelGenerator --standalone --routing --style=css

# Navigate into project
cd [VendorName]LabelGenerator

# Install Angular Material
ng add @angular/material

# Install ExcelJS
npm install exceljs --save

# Install additional dependencies (if needed)
npm install @types/node --save-dev
```

**Checklist:**
- [ ] Project created successfully
- [ ] `npm start` runs without errors
- [ ] Angular Material installed
- [ ] ExcelJS installed
- [ ] Git repository initialized

### 1.2 Configure Angular Material
**File**: `src/app/app.config.ts`

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync()
  ]
};
```

### 1.3 Create Basic Folder Structure
```bash
# Create folders
mkdir -p src/app/components
mkdir -p src/app/pages
mkdir -p src/app/services
mkdir -p src/app/models
mkdir -p docs
```

**Checklist:**
- [ ] Folder structure created
- [ ] Basic configuration complete
- [ ] Development server runs successfully

---

## Phase 2: Data Analysis (Day 1-2)

### 2.1 Analyze Excel Structure

**Action Items:**
1. Open client's Excel file in Excel/LibreOffice
2. Document each sheet:
   - Sheet name
   - Number of columns
   - Column names and data types
   - Sample data (first 3 rows)
   - Estimated row count

**Template for Documentation:**
```markdown
## Excel Structure Analysis - [Vendor Name]

### Sheet 1: [Sheet Name]
**Purpose**: [Description]
**Row Count**: ~[number]

| Column Name | Data Type | Sample Value | Notes |
|-------------|-----------|--------------|-------|
| ID          | Number    | 1001         | Primary Key |
| Name        | Text      | "Product A"  | Required field |
| Price       | Decimal   | 19.99        | Currency |
```

### 2.2 Identify Data Relationships

**Questions to Answer:**
- Which sheet contains product/item data?
- Which sheet contains categories/departments?
- How are items linked to categories? (Foreign keys)
- Is there a hierarchical structure? (Department → Type → SubType)
- Are there brand/manufacturer tables?
- Is there barcode data?

**Create Relationship Diagram:**
```
[Departments Table]
    ↓ (DepartmentId)
[Items Table] ← (CategoryId) → [Categories Table]
    ↓ (BrandId)
[Brands Table]
```

### 2.3 Map Label Fields

**Template:**
```markdown
## Label Field Mapping

| Label Field      | Excel Sheet   | Excel Column     | Required? |
|------------------|---------------|------------------|-----------|
| Item Name        | tblItems      | ItemName         | Yes       |
| Price            | tblItems      | Price            | Yes       |
| Barcode          | tblItems      | Barcode          | No        |
| Department       | tblDepartment | DepartmentName   | No        |
| Size             | tblItems      | Size             | No        |
```

**Checklist:**
- [ ] All Excel sheets documented
- [ ] Relationships identified
- [ ] Label fields mapped
- [ ] Primary/Foreign keys noted
- [ ] Sample data collected

---

## Phase 3: Excel Import System (Day 2-3)

### 3.1 Create Excel Sheet Model

**File**: `src/app/models/excel-sheet.model.ts`

```typescript
export interface ExcelSheetMetadata {
  tableName: string;        // Unique identifier (filename_sheetname)
  sheetName: string;        // Original sheet name
  fileName: string;         // Original file name
  rowCount: number;         // Number of data rows
  columnCount: number;      // Number of columns
  uploadedAt: Date;         // Upload timestamp
  columns?: string[];       // Column names
}

export interface UploadHistory {
  id?: number;              // Auto-increment ID
  fileName: string;         // File name
  uploadedAt: Date;         // Upload timestamp
  sheetCount: number;       // Number of sheets
  totalRows: number;        // Total rows across all sheets
}
```

### 3.2 Create Excel Import Component

**Generate Component:**
```bash
ng generate component pages/excel-import-page --standalone
```

**File**: `src/app/pages/excel-import-page/excel-import-page.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import * as ExcelJS from 'exceljs';
import { IndexedDBService } from '../../services/indexed-db.service';

@Component({
  selector: 'app-excel-import-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule
  ],
  templateUrl: './excel-import-page.component.html',
  styleUrls: ['./excel-import-page.component.css']
})
export class ExcelImportPageComponent {
  uploading = false;
  progress = 0;
  
  constructor(private indexedDBService: IndexedDBService) {}
  
  async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    this.uploading = true;
    this.progress = 0;
    
    try {
      // Read file
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const fileName = file.name.replace('.xlsx', '').replace('.xls', '');
      const sheets: any[] = [];
      
      // Process each sheet
      workbook.eachSheet((worksheet, sheetId) => {
        const sheetName = worksheet.name;
        const tableName = this.generateTableName(fileName, sheetName);
        const jsonData: any[] = [];
        
        // Get headers from first row
        const headers: string[] = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell, colNumber) => {
          headers.push(String(cell.value || `Column${colNumber}`));
        });
        
        // Convert rows to JSON
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header
          
          const rowData: any = {};
          row.eachCell((cell, colNumber) => {
            const header = headers[colNumber - 1];
            rowData[header] = cell.value;
          });
          
          jsonData.push(rowData);
        });
        
        sheets.push({
          tableName,
          sheetName,
          data: jsonData,
          metadata: {
            tableName,
            sheetName,
            fileName: file.name,
            rowCount: jsonData.length,
            columnCount: headers.length,
            uploadedAt: new Date(),
            columns: headers
          }
        });
        
        this.progress += (100 / workbook.worksheets.length);
      });
      
      // Save to IndexedDB
      for (const sheet of sheets) {
        await this.indexedDBService.saveSheetData(
          sheet.tableName,
          sheet.data,
          sheet.metadata
        );
      }
      
      // Save upload history
      await this.indexedDBService.addUploadHistory({
        fileName: file.name,
        uploadedAt: new Date(),
        sheetCount: sheets.length,
        totalRows: sheets.reduce((sum, s) => sum + s.data.length, 0)
      });
      
      alert(`✅ Upload successful! ${sheets.length} sheet(s) processed.`);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed. Please check the console.');
    } finally {
      this.uploading = false;
      this.progress = 0;
    }
  }
  
  private generateTableName(fileName: string, sheetName: string): string {
    const sanitize = (str: string) => 
      str.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${sanitize(fileName)}_${sanitize(sheetName)}`;
  }
}
```

**File**: `src/app/pages/excel-import-page/excel-import-page.component.html`

```html
<div class="import-container">
  <mat-card>
    <mat-card-header>
      <mat-card-title>
        <mat-icon>upload_file</mat-icon>
        Upload Excel File
      </mat-card-title>
    </mat-card-header>
    
    <mat-card-content>
      <p>Select an Excel file (.xlsx or .xls) containing your product data.</p>
      
      <input
        type="file"
        accept=".xlsx,.xls"
        (change)="handleFileUpload($event)"
        [disabled]="uploading"
        #fileInput
        style="display: none"
      />
      
      <button
        mat-raised-button
        color="primary"
        (click)="fileInput.click()"
        [disabled]="uploading">
        <mat-icon>folder_open</mat-icon>
        Choose File
      </button>
      
      <mat-progress-bar
        *ngIf="uploading"
        mode="determinate"
        [value]="progress"
        class="progress-bar">
      </mat-progress-bar>
    </mat-card-content>
  </mat-card>
</div>
```

**Checklist:**
- [ ] Excel import component created
- [ ] File upload working
- [ ] Excel parsing functional
- [ ] Multi-sheet support verified
- [ ] Error handling implemented

---

## Phase 4: Data Storage (Day 3-4)

### 4.1 Create IndexedDB Service

**Generate Service:**
```bash
ng generate service services/indexed-db --skip-tests
```

**File**: `src/app/services/indexed-db.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { ExcelSheetMetadata, UploadHistory } from '../models/excel-sheet.model';

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private dbName = 'LabelGeneratorDB';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        // Create uploads store (for sheet data)
        if (!db.objectStoreNames.contains('uploads')) {
          const uploadsStore = db.createObjectStore('uploads', {
            keyPath: 'tableName'
          });
          uploadsStore.createIndex('sheetName', 'sheetName', { unique: false });
          uploadsStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
          uploadsStore.createIndex('rowCount', 'rowCount', { unique: false });
        }

        // Create uploadHistory store
        if (!db.objectStoreNames.contains('uploadHistory')) {
          const historyStore = db.createObjectStore('uploadHistory', {
            keyPath: 'id',
            autoIncrement: true
          });
          historyStore.createIndex('fileName', 'fileName', { unique: false });
          historyStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        }
      };
    });
  }

  async saveSheetData(
    tableName: string,
    data: any[],
    metadata: ExcelSheetMetadata
  ): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readwrite');
      const store = transaction.objectStore('uploads');

      const record = {
        ...metadata,
        data
      };

      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSheetData(tableName: string): Promise<any[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const request = store.get(tableName);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.data || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSheets(): Promise<ExcelSheetMetadata[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploads'], 'readonly');
      const store = transaction.objectStore('uploads');
      const request = store.getAll();

      request.onsuccess = () => {
        const results = request.result || [];
        resolve(results.map((r: any) => ({
          tableName: r.tableName,
          sheetName: r.sheetName,
          fileName: r.fileName,
          rowCount: r.rowCount,
          columnCount: r.columnCount,
          uploadedAt: r.uploadedAt,
          columns: r.columns
        })));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addUploadHistory(upload: UploadHistory): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploadHistory'], 'readwrite');
      const store = transaction.objectStore('uploadHistory');
      const request = store.add(upload);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUploadHistory(): Promise<UploadHistory[]> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['uploadHistory'], 'readonly');
      const store = transaction.objectStore('uploadHistory');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUpload(fileName: string): Promise<void> {
    const db = await this.initDB();
    const sheets = await this.getAllSheets();
    const sheetsToDelete = sheets.filter(s => s.fileName === fileName);

    const transaction = db.transaction(['uploads'], 'readwrite');
    const store = transaction.objectStore('uploads');

    for (const sheet of sheetsToDelete) {
      store.delete(sheet.tableName);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
```

**Checklist:**
- [ ] IndexedDB service created
- [ ] Database initialization working
- [ ] Save operation tested
- [ ] Retrieve operation tested
- [ ] Delete operation tested

---

## Phase 5: Dashboard & Navigation (Day 4-5)

### 5.1 Create Dashboard Component

**Generate Component:**
```bash
ng generate component pages/dashboard --standalone
```

**File**: `src/app/pages/dashboard/dashboard.component.ts`

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SystemInfoService } from '../../services/system-info.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  currentTime = '';
  ipAddress = '';

  features = [
    {
      title: 'Excel Import',
      description: 'Upload and parse Excel files',
      icon: 'upload_file',
      route: '/excel-import',
      color: '#4CAF50'
    },
    {
      title: 'Upload History',
      description: 'View and manage uploaded files',
      icon: 'history',
      route: '/excel-history',
      color: '#2196F3'
    },
    {
      title: 'Label Generator',
      description: 'Generate and print labels',
      icon: 'print',
      route: '/label-generator',
      color: '#FF9800'
    }
  ];

  constructor(
    private router: Router,
    private systemInfoService: SystemInfoService
  ) {}

  ngOnInit(): void {
    this.updateTime();
    setInterval(() => this.updateTime(), 1000);
    this.loadSystemInfo();
  }

  private updateTime(): void {
    this.currentTime = new Date().toLocaleString();
  }

  private async loadSystemInfo(): void {
    this.ipAddress = await this.systemInfoService.getIpAddress();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
```

### 5.2 Configure Routes

**File**: `src/app/app.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ExcelImportPageComponent } from './pages/excel-import-page/excel-import-page.component';
import { LabelGeneratorPageComponent } from './pages/label-generator-page/label-generator-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'excel-import', component: ExcelImportPageComponent },
  { path: 'label-generator', component: LabelGeneratorPageComponent }
];
```

**Checklist:**
- [ ] Dashboard component created
- [ ] Routes configured
- [ ] Navigation working
- [ ] System info displayed

---

## Phase 6: Filter System (Day 5-7)

### 6.1 Analyze Filter Requirements

**Questions:**
- What hierarchical structure exists in the data?
- What filters are needed? (Department, Category, Brand, etc.)
- How do filters relate to each other?
- Should filters cascade (one depends on another)?

### 6.2 Create Filter Entity Models

**File**: `src/app/models/filter-entities.model.ts`

```typescript
// Customize based on your data structure
export interface Department {
  DepartmentId: number;
  DeptName: string;
}

export interface Category {
  GID: number;
  Name: string;
  ParentGID?: number;
}

export interface FilterCriteria {
  departmentId?: number | null;
  categoryGid?: number | null;
  brandGid?: number | null;
  searchText?: string;
}
```

### 6.3 Create Filter Service

**Generate Service:**
```bash
ng generate service services/item-filter --skip-tests
```

**File**: `src/app/services/item-filter.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { IndexedDBService } from './indexed-db.service';
import { Department, Category, FilterCriteria } from '../models/filter-entities.model';

@Injectable({
  providedIn: 'root'
})
export class ItemFilterService {
  // Cache for performance
  private departmentCache: Department[] = [];
  private categoryCache: Category[] = [];
  private itemCache: any[] = [];

  // Customize these sheet names based on your Excel structure
  private readonly SHEET_NAMES = {
    departments: 'tblDepartments',  // Change to match your sheet name
    categories: 'tblCategories',     // Change to match your sheet name
    items: 'tblItems'                // Change to match your sheet name
  };

  constructor(private indexedDBService: IndexedDBService) {}

  async init(): Promise<void> {
    try {
      // Get all available sheets
      const availableSheets = await this.indexedDBService.getAllSheets();
      
      // Find sheets by their original sheetName
      const deptSheet = availableSheets.find(s => 
        s.sheetName === this.SHEET_NAMES.departments
      );
      const categorySheet = availableSheets.find(s => 
        s.sheetName === this.SHEET_NAMES.categories
      );
      const itemsSheet = availableSheets.find(s => 
        s.sheetName === this.SHEET_NAMES.items
      );

      // Load data using tableName
      const [departments, categories, items] = await Promise.all([
        deptSheet ? this.indexedDBService.getSheetData(deptSheet.tableName) : Promise.resolve([]),
        categorySheet ? this.indexedDBService.getSheetData(categorySheet.tableName) : Promise.resolve([]),
        itemsSheet ? this.indexedDBService.getSheetData(itemsSheet.tableName) : Promise.resolve([])
      ]);

      this.departmentCache = departments;
      this.categoryCache = categories;
      this.itemCache = items;

      console.log('✅ Filter service initialized');
      console.log(`   Departments: ${departments.length}`);
      console.log(`   Categories: ${categories.length}`);
      console.log(`   Items: ${items.length}`);

    } catch (error) {
      console.error('❌ Filter service initialization failed:', error);
      throw error;
    }
  }

  async getDepartments(): Promise<Department[]> {
    if (this.departmentCache.length === 0) {
      await this.init();
    }
    
    // Defensive string handling
    return this.departmentCache.sort((a, b) => {
      const nameA = String(a.DeptName || '');
      const nameB = String(b.DeptName || '');
      return nameA.localeCompare(nameB);
    });
  }

  async getCategoriesByDepartment(deptId: number): Promise<Category[]> {
    if (this.categoryCache.length === 0) {
      await this.init();
    }
    
    // Customize this logic based on your data relationships
    return this.categoryCache.filter(cat => 
      cat.DepartmentId === deptId
    ).sort((a, b) => {
      const nameA = String(a.Name || '');
      const nameB = String(b.Name || '');
      return nameA.localeCompare(nameB);
    });
  }

  async getFilteredItems(filters: FilterCriteria): Promise<any[]> {
    if (this.itemCache.length === 0) {
      await this.init();
    }

    let filtered = [...this.itemCache];

    // Apply department filter
    if (filters.departmentId) {
      filtered = filtered.filter(item => 
        item.DepartmentId === filters.departmentId
      );
    }

    // Apply category filter
    if (filters.categoryGid) {
      filtered = filtered.filter(item => 
        item.CategoryGID === filters.categoryGid
      );
    }

    // Apply text search
    if (filters.searchText) {
      const search = filters.searchText.toLowerCase();
      filtered = filtered.filter(item => {
        const name = String(item.ItemName || '').toLowerCase();
        return name.includes(search);
      });
    }

    return filtered;
  }
}
```

**Checklist:**
- [ ] Filter models defined
- [ ] Filter service created
- [ ] Sheet name mapping configured
- [ ] Cache mechanism implemented
- [ ] Defensive string handling added

---

## Phase 7: Item Display (Day 7-8)

### 7.1 Create Item Model

**File**: `src/app/models/pos-item.model.ts`

```typescript
// Customize based on your Excel columns
export interface PosItem {
  ItemID: number;
  ItemName: string;
  ItemBarCode?: string;
  Price: number;
  Size?: string;
  DepartmentId?: number;
  CategoryGID?: number;
  BrandGID?: number;
  InStockQty?: number;
  // Add more fields as needed
}
```

### 7.2 Create Item List Component

**Generate Component:**
```bash
ng generate component components/item-list --standalone
```

**File**: `src/app/components/item-list/item-list.component.ts`

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PosItem } from '../../models/pos-item.model';

@Component({
  selector: 'app-item-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './item-list.component.html',
  styleUrls: ['./item-list.component.css']
})
export class ItemListComponent {
  @Input() items: PosItem[] = [];
  @Output() selectedItemsChange = new EventEmitter<PosItem[]>();

  selection = new Set<number>();
  displayedColumns = ['select', 'ItemName', 'Price', 'Size', 'ItemBarCode'];

  isSelected(item: PosItem): boolean {
    return this.selection.has(item.ItemID);
  }

  toggleSelection(item: PosItem): void {
    if (this.selection.has(item.ItemID)) {
      this.selection.delete(item.ItemID);
    } else {
      this.selection.add(item.ItemID);
    }
    this.emitSelection();
  }

  toggleAll(): void {
    if (this.selection.size === this.items.length) {
      this.selection.clear();
    } else {
      this.items.forEach(item => this.selection.add(item.ItemID));
    }
    this.emitSelection();
  }

  private emitSelection(): void {
    const selected = this.items.filter(item => this.selection.has(item.ItemID));
    this.selectedItemsChange.emit(selected);
  }
}
```

**Checklist:**
- [ ] Item model created
- [ ] Item list component created
- [ ] Table display working
- [ ] Selection mechanism functional

---

## Phase 8: Print System (Day 8-10)

### 8.1 Create Label Template Models

**File**: `src/app/models/label-template.model.ts`

```typescript
export type LabelPageType = 'single' | 'a4-10' | 'a4-16' | 'a4-36';

export interface LabelTemplate {
  name: string;
  description: string;
  showBarcode: boolean;
  emphasizePrice: boolean;
  fontScale: number;
}

export interface LabelLayoutConfig {
  labelsPerPage: number;
  columns: number;
  rows: number;
  labelWidth: string;
  labelHeight: string;
}
```

### 8.2 Create Print Preview Component

**Generate Component:**
```bash
ng generate component components/print-preview --standalone
```

**File**: `src/app/components/print-preview/print-preview.component.ts`

```typescript
import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PosItem } from '../../models/pos-item.model';
import { LabelPageType, LabelTemplate } from '../../models/label-template.model';

@Component({
  selector: 'app-print-preview',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './print-preview.component.html',
  styleUrls: ['./print-preview.component.css']
})
export class PrintPreviewComponent implements OnInit, OnChanges {
  @Input() items: PosItem[] = [];
  @Input() template!: LabelTemplate;
  @Input() pageType!: LabelPageType;
  @Output() closed = new EventEmitter<void>();
  @Output() printed = new EventEmitter<void>();

  totalSlots: number = 0;
  labelSlots: any[] = [];
  isSingleLabel: boolean = false;
  Math = Math;

  ngOnInit(): void {
    this.setupLabelGrid();
  }

  ngOnChanges(): void {
    this.setupLabelGrid();
  }

  private setupLabelGrid(): void {
    switch (this.pageType) {
      case 'single':
        this.isSingleLabel = true;
        this.totalSlots = this.items.length;
        this.labelSlots = this.items.map(item => ({ item, isEmpty: false }));
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
    }

    if (!this.isSingleLabel) {
      this.labelSlots = [];
      for (let i = 0; i < this.totalSlots; i++) {
        if (i < this.items.length) {
          this.labelSlots.push({ item: this.items[i], isEmpty: false });
        } else {
          this.labelSlots.push({ item: null, isEmpty: true });
        }
      }
    }
  }

  close(): void {
    this.closed.emit();
  }

  print(): void {
    const printWindow = window.open('', 'Print Labels', 'width=900,height=650');
    
    if (!printWindow) {
      alert('Please allow popups to print labels.');
      return;
    }

    const printContent = this.generatePrintHTML();
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 250);
    };
    
    this.printed.emit();
  }

  private generatePrintHTML(): string {
    // Implement HTML generation logic
    // See JSC Label Generator implementation for reference
    return `<!DOCTYPE html><html>...</html>`;
  }
}
```

**Checklist:**
- [ ] Print preview component created
- [ ] Isolated print window working
- [ ] Multi-page support implemented
- [ ] Grid layouts configured
- [ ] Print CSS optimized

---

## Phase 9: Testing & Refinement (Day 10-12)

### 9.1 Testing Checklist

**Excel Import:**
- [ ] Small file (<100 rows) uploads successfully
- [ ] Large file (>1000 rows) uploads successfully
- [ ] Multi-sheet files process correctly
- [ ] Error handling for corrupted files
- [ ] Progress indication works

**Data Storage:**
- [ ] Data persists after browser refresh
- [ ] Multiple uploads don't overwrite each other
- [ ] Delete operation works correctly
- [ ] IndexedDB size doesn't cause issues

**Filter System:**
- [ ] All filters populate correctly
- [ ] Cascading filters work properly
- [ ] Filter reset functionality works
- [ ] Empty filter states handled gracefully
- [ ] No console errors with defensive string handling

**Item Display:**
- [ ] Table displays all columns
- [ ] Selection mechanism works
- [ ] Large datasets render without lag
- [ ] Sorting functionality works

**Print System:**
- [ ] Single label prints correctly
- [ ] 10/16/36 per page layouts are accurate
- [ ] Multi-page printing works
- [ ] Empty slots are invisible in print
- [ ] Print window closes after printing

### 9.2 Performance Optimization

**Checklist:**
- [ ] Implement virtual scrolling for large datasets
- [ ] Add loading indicators for slow operations
- [ ] Optimize IndexedDB queries
- [ ] Lazy load components where possible
- [ ] Minimize bundle size

### 9.3 User Acceptance Testing

**Create Test Scenarios:**
1. Upload real client Excel file
2. Filter by each available option
3. Select various item counts (1, 10, 50, 100+)
4. Print each page type
5. Verify label accuracy

**Checklist:**
- [ ] Client data imports successfully
- [ ] All filters work with real data
- [ ] Print output matches expectations
- [ ] No data loss during operations
- [ ] UI is intuitive and responsive

---

## Vendor-Specific Customization Guide

### Step 1: Identify Differences

**Document for each vendor:**
```markdown
## Vendor: [Name]

### Excel Structure Differences
- Different sheet names: [list]
- Different column names: [list]
- Additional fields: [list]
- Missing fields: [list]

### Unique Requirements
- Special label formats: [describe]
- Custom filters: [list]
- Brand guidelines: [colors, fonts]
- Specific workflow: [describe]
```

### Step 2: Create Vendor Configuration

**File**: `src/app/config/vendors/[vendor-name].config.ts`

```typescript
export const VENDOR_CONFIG = {
  name: 'Lottery Mart',
  
  // Excel sheet mapping
  sheets: {
    departments: 'Departments',
    categories: 'ProductCategories',
    items: 'Products',
    brands: 'Brands'
  },
  
  // Column mapping
  columns: {
    itemId: 'ProductID',
    itemName: 'ProductName',
    price: 'RetailPrice',
    barcode: 'UPC',
    size: 'PackSize'
  },
  
  // UI Configuration
  branding: {
    primaryColor: '#4CAF50',
    secondaryColor: '#2196F3',
    logoUrl: '/assets/lottery-mart-logo.png'
  },
  
  // Label templates
  templates: [
    {
      name: 'Lottery Mart Standard',
      showBarcode: true,
      emphasizePrice: true,
      fontScale: 1.0
    }
  ]
};
```

### Step 3: Implement Vendor Switching

**File**: `src/app/services/vendor.service.ts`

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class VendorService {
  private currentVendor = 'lila-liquor'; // default
  
  setVendor(vendorId: string): void {
    this.currentVendor = vendorId;
    // Reload configuration
  }
  
  getVendorConfig(): any {
    // Return vendor-specific config
  }
}
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Sheet Name vs Table Name Confusion

**Problem:** 
```typescript
// ❌ WRONG: Using sheet name directly
await this.indexedDBService.getSheetData('tblItems');
```

**Solution:**
```typescript
// ✅ CORRECT: Find by sheetName, load by tableName
const sheets = await this.indexedDBService.getAllSheets();
const itemSheet = sheets.find(s => s.sheetName === 'tblItems');
await this.indexedDBService.getSheetData(itemSheet.tableName);
```

### Pitfall 2: localeCompare Type Error

**Problem:**
```typescript
// ❌ WRONG: Unsafe string comparison
.sort((a, b) => (a.Name || '').localeCompare(b.Name || ''))
```

**Solution:**
```typescript
// ✅ CORRECT: Defensive string handling
.sort((a, b) => {
  const nameA = String(a.Name || '');
  const nameB = String(b.Name || '');
  return nameA.localeCompare(nameB);
});
```

### Pitfall 3: Print CSS Not Isolating Content

**Problem:** Print preview shows entire page instead of labels only

**Solution:** Use isolated print window approach (see Phase 8)

### Pitfall 4: IndexedDB Version Conflicts

**Problem:** Database upgrade fails when schema changes

**Solution:**
```typescript
request.onupgradeneeded = (event: any) => {
  const db = event.target.result;
  
  // Always check if store exists before creating
  if (!db.objectStoreNames.contains('uploads')) {
    const store = db.createObjectStore('uploads', { keyPath: 'tableName' });
    // Add indexes...
  }
};
```

### Pitfall 5: Large Dataset Performance

**Problem:** UI freezes with thousands of items

**Solution:**
- Implement virtual scrolling (Angular CDK)
- Use pagination
- Lazy load data
- Add debouncing to search/filter

---

## Success Criteria

### Technical Success
- [ ] All Excel files import successfully
- [ ] No console errors in production
- [ ] Filters work with real data
- [ ] Print output is accurate
- [ ] Application loads in <3 seconds
- [ ] No data loss during operations

### Business Success
- [ ] Client can complete end-to-end workflow
- [ ] Labels match manual label format
- [ ] Reduces labeling time by 50%+
- [ ] No training required for basic use
- [ ] Works offline without internet

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No `any` types (or minimal)
- [ ] Defensive programming throughout
- [ ] Error handling comprehensive
- [ ] Code documented with comments

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Client approval obtained
- [ ] Production environment configured
- [ ] Database backup strategy in place
- [ ] User documentation created

### Build for Production
```bash
# Create production build
npm run build

# Output will be in dist/ folder
# Deploy dist/ contents to web server
```

### Post-Deployment
- [ ] Verify application loads
- [ ] Test with real data
- [ ] Monitor for errors
- [ ] Collect user feedback
- [ ] Plan iterations

---

## Maintenance & Support

### Regular Maintenance
- Update Angular and dependencies quarterly
- Monitor IndexedDB size and cleanup old data
- Review and optimize performance
- Backup user configurations

### Support Process
1. **Issue Reporting**: User submits issue with screenshots
2. **Triage**: Classify as bug, feature request, or training
3. **Resolution**: Fix bug or add to backlog
4. **Testing**: Verify fix with user
5. **Deployment**: Update production if needed

### Documentation Updates
- Update PROJECT_JOURNEY.md with new features
- Document vendor-specific customizations
- Keep troubleshooting guide current
- Maintain change log

---

## Appendix A: Quick Command Reference

```bash
# Create new project
ng new [ProjectName] --standalone --routing --style=css

# Install dependencies
npm install exceljs --save
ng add @angular/material

# Generate components
ng generate component pages/[name] --standalone
ng generate component components/[name] --standalone

# Generate services
ng generate service services/[name] --skip-tests

# Development
npm start                 # Start dev server (localhost:4200)
npm run build            # Production build

# Testing
npm test                 # Run unit tests
npm run e2e             # Run end-to-end tests

# Code quality
npm run lint            # Check code style
```

---

## Appendix B: Vendor Template

**Use this template when adding new vendor:**

```markdown
# [Vendor Name] Implementation

## Client Information
- **Business Name**: [Name]
- **Business Type**: [Liquor/Grocery/Pharmacy/etc.]
- **Location**: [Address]
- **Contact**: [Name, Phone, Email]

## Excel Structure
### Sheet 1: [Name]
| Column | Type | Sample | Notes |
|--------|------|--------|-------|
|        |      |        |       |

## Customizations Needed
- [ ] Custom sheet names
- [ ] Custom column mapping
- [ ] Special filters
- [ ] Custom label templates
- [ ] Brand colors/logo
- [ ] Unique business logic

## Implementation Notes
[Document any special considerations]

## Testing Checklist
- [ ] Excel import tested with client data
- [ ] All filters working
- [ ] Print output verified
- [ ] Client acceptance obtained
```

---

**End of Blueprint**

**Next Steps:**
1. Use this blueprint as a checklist
2. Customize for specific vendor
3. Follow phase-by-phase implementation
4. Test thoroughly
5. Document vendor-specific changes

**For Support:**
Contact: Tuneer Mahatpure  
Email: mahatpuretuneer@gmail.com

This blueprint ensures consistent, high-quality implementations across all vendors while maintaining flexibility for customization.
