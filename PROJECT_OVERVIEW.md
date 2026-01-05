# JSC Label Generator - Project Overview

**Last Updated:** December 22, 2024  
**Version:** 1.0.0  
**Framework:** Angular 21.0.3 (Standalone Components)  
**Target Platform:** Windows Desktop Application (Electron-ready)

---

## Table of Contents

1. [Project Summary](#project-summary)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Key Features](#key-features)
5. [File Structure](#file-structure)
6. [Database Schema](#database-schema)
7. [Printer Support](#printer-support)
8. [Development Setup](#development-setup)
9. [Build & Deployment](#build--deployment)
10. [Common Tasks](#common-tasks)
11. [Troubleshooting](#troubleshooting)
12. [Next Steps](#next-steps)

---

## Project Summary

**JSC Label Generator** is a desktop-based Angular application designed for retail label printing with multi-vendor support. The application allows users to:

- Import product data from Excel files
- Manage item catalogs with cascading filters
- Generate labels for multiple printer types (A4, Brother QL, Zebra)
- Support various label sizes and orientations
- Print with configurable copies and layouts

**Primary Use Case:** Retail stores (like Lottery Mart) need to print product labels efficiently with support for thermal label printers and standard office printers.

**Target Users:** Store clerks, inventory managers, retail staff

---

## Technology Stack

### Core Framework
- **Angular:** 21.0.3 (latest standalone components architecture)
- **TypeScript:** 5.7.2
- **Node.js:** v25.2.1 (development only)
- **npm:** 10.9.2

### UI Framework
- **Angular Material:** 19.0.5 (Material Design components)
- **Material Icons:** Icon library for UI

### Data Management
- **ExcelJS:** 4.4.0 (Excel file parsing and generation)
- **Dexie.js:** 4.0.10 (IndexedDB wrapper for browser storage)

### Database
- **IndexedDB:** Browser-based NoSQL database
- **SQL.js:** 1.12.0 (SQLite compiled to WebAssembly)
- **better-sqlite3:** 11.8.1 (Native SQLite for desktop)

### Build Tools
- **Angular CLI:** 21.0.3
- **Webpack:** Custom configuration for Electron
- **@angular-builders/custom-webpack:** 21.0.0

### Development Tools
- **Zone.js:** 0.15.0 (change detection)
- **RxJS:** 7.8.1 (reactive programming)
- **TSLib:** 2.8.1 (TypeScript runtime library)

---

## Project Architecture

### Application Structure

```
Jsclabelgenerator/
├── src/
│   ├── app/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page-level components (routes)
│   │   ├── services/            # Business logic and data services
│   │   ├── models/              # TypeScript interfaces and types
│   │   ├── app.component.ts     # Root component
│   │   └── app.routes.ts        # Route configuration
│   ├── assets/                  # Static files (images, JSON)
│   ├── index.html               # HTML entry point
│   ├── main.ts                  # Application bootstrap
│   └── styles.css               # Global styles
├── docs/                        # Documentation
├── backups/                     # Feature backups
├── angular.json                 # Angular CLI configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── custom-webpack.config.js     # Custom Webpack config
```

### Component Hierarchy

```
AppComponent (Root)
├── DashboardComponent          # Home page with navigation
├── ExcelImportPageComponent    # Excel upload and column mapping
│   ├── ExcelImportComponent    # File upload logic
│   └── ColumnMapperComponent   # Map Excel columns to system fields
├── ExcelManagementPageComponent # Manage imported sheets
├── LabelGeneratorPageComponent  # Main label generation interface
│   ├── ItemListComponent       # Display and filter items
│   └── PrintPreviewComponent   # Print preview and generation
```

### Service Layer

```
Services Architecture:
├── IndexedDbService            # Core IndexedDB operations
├── LocalPosDbService           # POS item storage (IndexedDB)
├── SqlDbService                # SQLite integration (future)
├── PosSyncService              # Sync between databases
├── ColumnMappingService        # Excel column mapping logic
├── ColumnSettingsService       # User column preferences
├── ItemFilterService           # Item filtering and search
├── LabelTemplateService        # Label layout configurations
└── SystemInfoService           # System information utilities
```

---

## Key Features

### 1. Excel Import System
- **File Upload:** Drag-and-drop or file picker
- **Column Mapping:** Map Excel columns to system fields (PLU, Name, Price, etc.)
- **Column Settings:** Save/load column mapping preferences
- **Multi-Sheet Support:** Import multiple sheets from one file
- **Data Validation:** Validate required fields before import

**Files:**
- `src/app/pages/excel-import-page/`
- `src/app/components/excel-import/`
- `src/app/components/column-mapper/`
- `src/app/services/column-mapping.service.ts`

### 2. Item Management
- **Local Storage:** IndexedDB for offline-first operation
- **CRUD Operations:** Create, Read, Update, Delete items
- **Cascading Filters:** Department → Category → Subcategory → Vendor
- **Search:** Real-time search across item fields
- **Bulk Operations:** Select multiple items for actions

**Files:**
- `src/app/services/indexed-db.service.ts`
- `src/app/services/local-pos-db.service.ts`
- `src/app/components/item-list/`
- `src/app/models/pos-item.model.ts`

### 3. Cascading Filter System
- **4-Level Hierarchy:** Department → Category → Subcategory → Vendor
- **Dynamic Updates:** Child filters update based on parent selection
- **Filter Memory:** Remembers last selected filters
- **"All" Options:** Include/exclude "All" in dropdowns
- **Reset Functionality:** Clear all filters at once

**Files:**
- `src/app/services/item-filter.service.ts`
- `src/app/models/filter.model.ts`
- `src/app/models/filter-entities.model.ts`

### 4. Multi-Printer Support
- **A4 Printers:** 3 layouts (2-column, 3-column, 4-column)
- **Brother QL Series:** 4 label sizes (17×54mm, 29×90mm, 38×90mm, 62×100mm)
- **Zebra Printers:** 4 label sizes (50×25mm, 100×50mm, 100×75mm, 100×150mm)
- **Orientation Support:** Portrait/Landscape with auto-detection
- **Dimension Swapping:** Automatic width↔height swap based on orientation

**Files:**
- `src/app/services/label-template.service.ts`
- `src/app/models/label-template.model.ts`
- `src/app/components/print-preview/`

### 5. Print Generation
- **HTML Generation:** Dynamic HTML with embedded CSS
- **@page CSS:** Precise page sizing for printers
- **Copies Support:** 1-999 copies per item
- **Grouped Printing:** Items grouped by product (Item1×n, Item2×n)
- **Debug Overlay:** On-screen validation (hidden in print)
- **Print Setup Guide:** Printer-specific instructions

**Files:**
- `src/app/components/print-preview/print-preview.component.ts`
- `src/app/components/print-preview/print-preview.component.html`
- `src/app/components/print-preview/print-preview.component.css`

### 6. Label Layouts
- **Adaptive Layouts:** Changes based on orientation
  - **Portrait:** Vertical flexbox stack
  - **Landscape:** 2-column CSS Grid
- **Responsive Design:** Content scales to fit label size
- **Text Overflow:** Ellipsis for long text
- **Font Sizing:** 0.7em - 1.1em based on label size

### 7. Database Integration
- **IndexedDB (Primary):** Browser-based storage
  - Stores: excelSheets, posItems, columnMappings, filterPreferences
  - Dexie.js wrapper for easier queries
- **SQLite (Future):** Desktop database support
  - better-sqlite3 for Windows
  - SQL.js for browser fallback

**Files:**
- `src/app/services/indexed-db.service.ts`
- `src/app/services/sqlite.service.ts`
- `src/app/services/sql-db.service.ts`

---

## File Structure

### Core Application Files

#### **app.component.ts** (Root Component)
```typescript
// Main application shell
// Contains navigation, header, and router outlet
// Material theme configuration
```

#### **app.routes.ts** (Routing)
```typescript
export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'excel-import', component: ExcelImportPageComponent },
  { path: 'excel-management', component: ExcelManagementPageComponent },
  { path: 'label-generator', component: LabelGeneratorPageComponent },
  { path: '**', redirectTo: '' }
];
```

### Key Models

#### **pos-item.model.ts**
```typescript
export interface PosItem {
  id?: number;              // Auto-increment ID
  plu: string;              // Product Lookup Code
  name: string;             // Product name
  price: number;            // Unit price
  department?: string;      // Department (Level 1)
  category?: string;        // Category (Level 2)
  subcategory?: string;     // Subcategory (Level 3)
  vendor?: string;          // Vendor (Level 4)
  barcode?: string;         // UPC/EAN barcode
  description?: string;     // Product description
  imageUrl?: string;        // Product image URL
  createdAt?: Date;         // Import timestamp
  updatedAt?: Date;         // Last modified
}
```

#### **label-template.model.ts**
```typescript
export type PageType = 
  | 'a4-2col' | 'a4-3col' | 'a4-4col'              // A4 layouts
  | 'brother-17x54' | 'brother-29x90'              // Brother QL
  | 'brother-38x90' | 'brother-62x100'             // Brother QL
  | 'zebra-50x25' | 'zebra-100x50'                 // Zebra
  | 'zebra-100x75' | 'zebra-100x150';              // Zebra

export interface LayoutConfig {
  pageType: PageType;
  displayName: string;
  labelWidthMm: number;
  labelHeightMm: number;
  defaultOrientation: 'portrait' | 'landscape';
  columns?: number;                 // For A4 layouts
  singleLabelPrinter: boolean;      // True for thermal printers
}
```

#### **filter.model.ts**
```typescript
export interface FilterState {
  department: string;
  category: string;
  subcategory: string;
  vendor: string;
  searchText: string;
}

export interface FilterOptions {
  departments: string[];
  categories: string[];
  subcategories: string[];
  vendors: string[];
}
```

### Key Services

#### **indexed-db.service.ts**
```typescript
// Core database operations
class IndexedDbService {
  private db: Dexie;
  
  // Stores:
  // - excelSheets: Imported Excel files
  // - posItems: Product catalog
  // - columnMappings: User mapping preferences
  // - filterPreferences: Last used filters
  
  async addItem(item: PosItem): Promise<number>
  async getItems(): Promise<PosItem[]>
  async updateItem(id: number, item: Partial<PosItem>): Promise<void>
  async deleteItem(id: number): Promise<void>
  async searchItems(query: string): Promise<PosItem[]>
}
```

#### **label-template.service.ts**
```typescript
// Label layout configurations
class LabelTemplateService {
  // Returns layout config for printer type
  getLayoutConfig(pageType: PageType): LayoutConfig
  
  // All supported layouts (11 total)
  getAllLayouts(): LayoutConfig[]
  
  // Filter by printer vendor
  getLayoutsByVendor(vendor: 'brother' | 'zebra' | 'a4'): LayoutConfig[]
}
```

#### **item-filter.service.ts**
```typescript
// Cascading filter logic
class ItemFilterService {
  // Get filter options based on current selections
  getFilterOptions(
    items: PosItem[], 
    currentFilters: FilterState
  ): FilterOptions
  
  // Apply filters to item list
  filterItems(
    items: PosItem[], 
    filters: FilterState
  ): PosItem[]
  
  // Extract unique values for filter dropdowns
  getDepartments(items: PosItem[]): string[]
  getCategories(items: PosItem[], department?: string): string[]
  getSubcategories(items: PosItem[], category?: string): string[]
  getVendors(items: PosItem[], subcategory?: string): string[]
}
```

---

## Database Schema

### IndexedDB Stores

#### **excelSheets**
```typescript
{
  id: number;                 // Auto-increment
  fileName: string;           // Original file name
  sheetName: string;          // Sheet name within Excel file
  uploadDate: Date;           // Import timestamp
  rowCount: number;           // Number of rows imported
  data: any[];                // Raw Excel data
  columnMapping: {            // Mapping configuration
    [systemField: string]: string | number;  // Excel column
  };
}
```

#### **posItems**
```typescript
{
  id: number;                 // Auto-increment primary key
  plu: string;                // Required, indexed
  name: string;               // Required, indexed
  price: number;              // Required
  department: string;         // Indexed for filters
  category: string;           // Indexed for filters
  subcategory: string;        // Indexed for filters
  vendor: string;             // Indexed for filters
  barcode: string;            // Optional, indexed
  description: string;        // Optional
  imageUrl: string;           // Optional
  createdAt: Date;            // Auto-generated
  updatedAt: Date;            // Auto-updated
}
```

#### **columnMappings**
```typescript
{
  id: number;                 // Auto-increment
  name: string;               // Mapping preset name
  mapping: {                  // Field mappings
    plu: string | number;
    name: string | number;
    price: string | number;
    department: string | number;
    category: string | number;
    subcategory: string | number;
    vendor: string | number;
    barcode: string | number;
    description: string | number;
  };
  createdAt: Date;
  isDefault: boolean;         // Default mapping
}
```

#### **filterPreferences**
```typescript
{
  id: number;                 // Always 1 (single record)
  lastFilters: {
    department: string;
    category: string;
    subcategory: string;
    vendor: string;
    searchText: string;
  };
  updatedAt: Date;
}
```

---

## Printer Support

### A4 Paper Printers

| Layout | Columns | Label Size | Use Case |
|--------|---------|------------|----------|
| a4-2col | 2 | ~100mm × 148mm | Large labels with images |
| a4-3col | 3 | ~66mm × 99mm | Standard product labels |
| a4-4col | 4 | ~50mm × 74mm | Small price tags |

**Page Size:** 210mm × 297mm (A4 standard)  
**Orientation:** Portrait (default)  
**Margins:** 5mm all sides  
**Layout:** CSS Grid with equal columns

### Brother QL Series (Thermal Label Printers)

| Model | Label Size | Orientation | Use Case |
|-------|------------|-------------|----------|
| brother-17x54 | 17mm × 54mm | Portrait | Small price tags |
| brother-29x90 | 29mm × 90mm | Portrait | Standard product labels |
| brother-38x90 | 38mm × 90mm | Portrait | Medium labels with barcodes |
| brother-62x100 | 62mm × 100mm | Portrait | Large labels with images |

**Target Hardware:** Brother QL-800 High-Speed Professional Label Printer  
**Features:**
- 300 DPI resolution
- Auto-cutter (cuts after each label)
- USB connectivity
- Die-cut label support
- Max speed: 93 labels/minute

**Print Logic:**
- Each item = separate page
- page-break-after: always (triggers auto-cutter)
- Portrait layout (vertical stack)

### Zebra Label Printers

| Model | Label Size | Orientation | Use Case |
|-------|------------|-------------|----------|
| zebra-50x25 | 50mm × 25mm | Landscape | Compact price tags |
| zebra-100x50 | 100mm × 50mm | Landscape | Standard shipping labels |
| zebra-100x75 | 100mm × 75mm | Landscape | Medium product labels |
| zebra-100x150 | 100mm × 150mm | Landscape | Large shipping/product labels |

**Target Models:** Zebra ZD, GK, GX series  
**Features:**
- Thermal transfer or direct thermal
- 203-300 DPI resolution
- Continuous or die-cut labels
- USB, Ethernet, WiFi connectivity

**Print Logic:**
- Each item = separate page
- Landscape layout (2-column grid)
- Optimized for horizontal labels

### Orientation System (3-Tier Logic)

```typescript
// Tier 1: Industry Defaults
const defaultOrientation = {
  'brother': 'portrait',      // Die-cut labels load vertically
  'zebra': 'landscape',        // Roll labels load horizontally
  'a4': 'portrait'             // Standard paper orientation
};

// Tier 2: User Override
// User selects: 'Default', 'Portrait', or 'Landscape'
// If 'Default' → use Tier 1
// If specific → override Tier 1

// Tier 3: Dimension Swapping
// If orientation changes from default:
//   - Portrait → Landscape: swap width ↔ height
//   - Landscape → Portrait: swap width ↔ height
```

**Example:**
```typescript
// Brother 29×90 (default portrait)
orientation: 'default' → 29mm width × 90mm height (portrait)
orientation: 'landscape' → 90mm width × 29mm height (landscape)

// Zebra 50×25 (default landscape)
orientation: 'default' → 50mm width × 25mm height (landscape)
orientation: 'portrait' → 25mm width × 50mm height (portrait)
```

---

## Development Setup

### Prerequisites

```bash
# Node.js (download from nodejs.org)
node --version  # Should show v20.x or v25.x

# npm (comes with Node.js)
npm --version   # Should show 10.x
```

### Installation

```bash
# Navigate to project directory
cd Jsclabelgenerator

# Install dependencies
npm install

# Start development server
npm start

# Open browser to http://localhost:4200
```

### Development Commands

```bash
# Start dev server with hot reload
npm start

# Build for production
npm run build

# Run tests (if configured)
npm test

# Lint code
npm run lint

# Clean node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Environment Configuration

**angular.json** - Angular CLI configuration
- Output path: `dist/jsclabelgenerator`
- Index: `src/index.html`
- Main: `src/main.ts`
- Styles: `src/styles.css`
- Assets: `src/assets`

**tsconfig.json** - TypeScript configuration
- Target: ES2022
- Module: ES2022
- Strict mode: enabled
- Source maps: enabled (dev)

**custom-webpack.config.js** - Webpack customization
- Node polyfills for browser compatibility
- Custom module resolution
- Electron integration (future)

---

## Build & Deployment

### Production Build

```bash
# Build optimized production bundle
npm run build

# Output location:
# dist/jsclabelgenerator/browser/

# Files generated:
# - index.html
# - main-[hash].js
# - styles-[hash].css
# - runtime-[hash].js
```

### Build Optimization

```json
// angular.json production configuration
{
  "optimization": true,
  "outputHashing": "all",
  "sourceMap": false,
  "namedChunks": false,
  "aot": true,
  "extractLicenses": true,
  "budgets": [
    {
      "type": "initial",
      "maximumWarning": "2mb",
      "maximumError": "5mb"
    }
  ]
}
```

### Deployment Options

#### Option 1: Web Application (Current)
```bash
# Build for web
npm run build

# Deploy to web server
# Copy dist/jsclabelgenerator/browser/ to server
# Configure web server (nginx, Apache, IIS)
```

#### Option 2: Electron Desktop App (Future)
```bash
# Install Electron
npm install --save-dev electron electron-builder

# Configure electron-builder in package.json
# Build desktop app
npm run electron:build

# Output: installers for Windows, Mac, Linux
```

#### Option 3: Windows Executable (Planned)
```bash
# Use Electron Builder with Windows target
# Generates .exe installer
# Can run offline without browser
```

### Windows HP System Setup

```bash
# On Windows HP system:

# 1. Install Node.js
# Download from: https://nodejs.org/en/download/
# Choose Windows Installer (.msi)
# Verify: node --version

# 2. Clone/Copy project
# Copy entire Jsclabelgenerator folder
# Or use Git: git clone <repository-url>

# 3. Install dependencies
cd Jsclabelgenerator
npm install

# 4. Run application
npm start

# 5. Access in browser
# Open Chrome/Edge to http://localhost:4200
```

---

## Common Tasks

### Task 1: Add New Printer Support

**Example: Add Dymo LabelWriter**

1. **Update label-template.model.ts**
```typescript
export type PageType = 
  | 'a4-2col' | 'a4-3col' | 'a4-4col'
  | 'brother-17x54' | 'brother-29x90' | 'brother-38x90' | 'brother-62x100'
  | 'zebra-50x25' | 'zebra-100x50' | 'zebra-100x75' | 'zebra-100x150'
  | 'dymo-54x25' | 'dymo-89x36';  // NEW
```

2. **Add layout config in label-template.service.ts**
```typescript
{
  pageType: 'dymo-54x25',
  displayName: 'Dymo 54mm × 25mm',
  labelWidthMm: 54,
  labelHeightMm: 25,
  defaultOrientation: 'landscape',
  singleLabelPrinter: true
}
```

3. **Update print-preview component**
- Add Dymo to printer type detection
- Configure print CSS for Dymo dimensions
- Test with standalone HTML file

### Task 2: Modify Label Layout

**Example: Add product image to labels**

1. **Update PosItem model** (add imageUrl if not exists)
2. **Modify print-preview.component.ts**
```typescript
// In generatePrintHTML method
const labelHTML = `
  <div class="label-content">
    ${item.imageUrl ? `<img src="${item.imageUrl}" class="label-image">` : ''}
    <div class="label-name">${item.name}</div>
    <!-- ... rest of fields ... -->
  </div>
`;
```

3. **Add CSS for images**
```css
.label-image {
  max-width: 100%;
  max-height: 30%;
  object-fit: contain;
}
```

### Task 3: Add New Filter Level

**Example: Add "Brand" filter after Vendor**

1. **Update PosItem model**
```typescript
export interface PosItem {
  // ... existing fields ...
  brand?: string;  // NEW
}
```

2. **Update FilterState in filter.model.ts**
```typescript
export interface FilterState {
  department: string;
  category: string;
  subcategory: string;
  vendor: string;
  brand: string;  // NEW
  searchText: string;
}
```

3. **Add getBrands() in item-filter.service.ts**
```typescript
getBrands(items: PosItem[], vendor?: string): string[] {
  let filtered = items;
  if (vendor && vendor !== 'All') {
    filtered = items.filter(item => item.vendor === vendor);
  }
  return [...new Set(filtered.map(item => item.brand || 'Uncategorized'))];
}
```

4. **Update UI in item-list.component.html**
```html
<mat-form-field>
  <mat-label>Brand</mat-label>
  <mat-select [(ngModel)]="filters.brand" (selectionChange)="onFilterChange()">
    <mat-option value="All">All Brands</mat-option>
    <mat-option *ngFor="let brand of filterOptions.brands" [value]="brand">
      {{ brand }}
    </mat-option>
  </mat-select>
</mat-form-field>
```

### Task 4: Export Items to Excel

**Add export functionality**

1. **Add method in excel-management component**
```typescript
async exportToExcel(): Promise<void> {
  const items = await this.dbService.getItems();
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Items');
  
  // Add headers
  worksheet.columns = [
    { header: 'PLU', key: 'plu', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Price', key: 'price', width: 10 },
    { header: 'Department', key: 'department', width: 20 },
    // ... more columns
  ];
  
  // Add rows
  items.forEach(item => worksheet.addRow(item));
  
  // Generate file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  // Download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `items-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
}
```

2. **Add button in template**
```html
<button mat-raised-button color="primary" (click)="exportToExcel()">
  <mat-icon>download</mat-icon>
  Export to Excel
</button>
```

### Task 5: Add Barcode Support

**Generate barcodes on labels**

1. **Install barcode library**
```bash
npm install jsbarcode
npm install --save-dev @types/jsbarcode
```

2. **Generate barcode in print-preview.component.ts**
```typescript
generateBarcode(code: string): string {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, code, {
    format: 'CODE128',
    width: 2,
    height: 40,
    displayValue: false
  });
  return canvas.toDataURL('image/png');
}

// In generatePrintHTML:
const barcodeImage = item.barcode ? this.generateBarcode(item.barcode) : '';
```

3. **Add to label HTML**
```typescript
${item.barcode ? `
  <img src="${barcodeImage}" class="label-barcode" alt="${item.barcode}">
  <div class="label-barcode-text">${item.barcode}</div>
` : ''}
```

---

## Troubleshooting

### Issue 1: Application Won't Start

**Error:** `Port 4200 is already in use`

**Solution:**
```bash
# Kill process on port 4200
# Mac/Linux:
lsof -ti:4200 | xargs kill -9

# Windows:
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Or use different port:
ng serve --port 4300
```

### Issue 2: Database Not Persisting

**Error:** Items disappear after browser refresh

**Solution:**
1. Check IndexedDB in browser DevTools (Application tab)
2. Ensure database name is correct: `JSCLabelGeneratorDB`
3. Verify browser allows IndexedDB (not in incognito/private mode)
4. Check for database errors in console

```typescript
// Test database connection
async testDB(): Promise<void> {
  try {
    await this.dbService.addItem({
      plu: 'TEST001',
      name: 'Test Item',
      price: 9.99
    });
    console.log('✅ Database working');
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}
```

### Issue 3: Excel Import Fails

**Error:** "Failed to import Excel file"

**Solutions:**
1. Check file format (must be .xlsx, not .xls)
2. Ensure column mapping is correct
3. Verify required fields (PLU, Name, Price) are mapped
4. Check for empty rows in Excel
5. Validate data types (Price must be number)

```typescript
// Add validation in excel-import.component.ts
validateData(data: any[]): boolean {
  return data.every(row => 
    row.plu && 
    row.name && 
    typeof row.price === 'number' && 
    row.price > 0
  );
}
```

### Issue 4: Print Output Doesn't Match Screen

**Error:** Labels too small/large or cut off

**Solutions:**
1. Check @page CSS size matches label dimensions
2. Verify printer settings:
   - Paper size: Custom (exact label size)
   - Scale: 100% (Actual Size)
   - Margins: None (0mm)
3. Test with "Print to PDF" first
4. Use Print Setup Guide button for instructions

```typescript
// Verify dimensions in console
console.log('Label dimensions:', {
  width: labelSize.width,
  height: labelSize.height,
  orientation: labelSize.orientation
});
```

### Issue 5: Filters Not Cascading

**Error:** Child filters not updating when parent changes

**Solution:**
1. Check onFilterChange() is called on parent selection
2. Verify getFilterOptions() is updating child arrays
3. Ensure "All" option resets child filters
4. Check for console errors

```typescript
// Debug filter updates
onFilterChange(): void {
  console.log('Current filters:', this.filters);
  this.filterOptions = this.filterService.getFilterOptions(
    this.allItems,
    this.filters
  );
  console.log('Updated options:', this.filterOptions);
  this.applyFilters();
}
```

### Issue 6: Build Errors

**Error:** `Cannot find module 'exceljs'`

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# If still fails, install explicitly:
npm install exceljs dexie @angular/material
```

**Error:** `Property 'x' does not exist on type 'y'`

**Solution:**
1. Check TypeScript interfaces match actual data
2. Update model definitions
3. Use optional chaining: `item?.field`
4. Add proper type annotations

---

## Next Steps

### Immediate Tasks (Before Switching Systems)

1. **Test all features thoroughly**
   - Import Excel files
   - Apply filters
   - Generate labels for all printer types
   - Export to PDF and verify dimensions

2. **Document any custom configurations**
   - List any environment-specific settings
   - Note any workarounds or temporary fixes
   - Save example Excel files for testing

3. **Backup critical files**
   - Export sample database (items)
   - Save column mapping presets
   - Keep test Excel files

4. **Create test checklist**
   - List of features to test after migration
   - Expected outcomes for each feature
   - Sample data for testing

### Migration to Windows HP System

1. **Transfer project files**
   - Copy entire Jsclabelgenerator folder
   - Include node_modules or re-run npm install
   - Transfer any test data/files

2. **Install prerequisites**
   - Node.js (v20.x or v25.x)
   - Git (optional, for version control)
   - VS Code (recommended IDE)

3. **Setup development environment**
   - Install VS Code extensions:
     - Angular Language Service
     - TypeScript + JavaScript
     - ESLint
     - Material Icon Theme
   - Install free AI assistants:
     - GitHub Copilot (free for students/open source)
     - Codeium (completely free)
     - Tabnine (free tier available)

4. **Test application**
   - Run `npm start`
   - Verify all features work
   - Test with actual Brother QL-800 printer

### Future Enhancements

1. **Electron Desktop App**
   - Package as Windows .exe
   - Offline operation
   - Direct printer integration
   - Auto-updates

2. **Advanced Features**
   - Barcode scanning
   - Product images
   - Multi-language support
   - Theme customization
   - Bulk edit operations

3. **Database Upgrades**
   - Migrate to SQLite for better performance
   - Add data sync between devices
   - Implement backup/restore
   - Add audit logging

4. **Print Enhancements**
   - Print queue management
   - Batch printing
   - Print templates
   - Label preview thumbnails
   - Custom label designer

5. **Integration**
   - Connect to POS systems
   - Import from cloud services
   - Export to accounting software
   - API for external systems

### Working with ChatGPT/Free AI Assistants

**Effective Prompting Tips:**

1. **Provide Context**
```
"I'm working on an Angular 21 label printing application. 
I need to add a new filter level called 'Brand' after the Vendor filter.
The project uses IndexedDB with Dexie.js for storage.
Here's the current FilterState interface: [paste code]"
```

2. **Ask for Specific Files**
```
"Show me the changes needed in:
1. src/app/models/filter.model.ts
2. src/app/services/item-filter.service.ts
3. src/app/components/item-list/item-list.component.ts"
```

3. **Request Step-by-Step Instructions**
```
"Give me step-by-step instructions to add barcode generation:
1. What npm packages to install
2. Where to add the code
3. How to integrate with existing print logic
4. How to test it"
```

4. **Share Error Messages**
```
"I'm getting this error: [paste full error]
Here's my code: [paste relevant code]
Project uses: Angular 21, TypeScript 5.7, Angular Material 19"
```

5. **Ask for Explanations**
```
"Explain how the cascading filter system works in this code: [paste code]
What's the logic flow when a user selects a department?"
```

### Resources

**Official Documentation:**
- Angular: https://angular.dev
- Angular Material: https://material.angular.io
- TypeScript: https://www.typescriptlang.org
- Dexie.js: https://dexie.org
- ExcelJS: https://github.com/exceljs/exceljs

**Learning Resources:**
- Angular Tutorial: https://angular.dev/tutorials
- RxJS Guide: https://rxjs.dev/guide/overview
- Material Design: https://m3.material.io

**Community:**
- Stack Overflow: [angular] tag
- Angular Discord: https://discord.gg/angular
- Reddit: r/Angular2

**Tools:**
- VS Code: https://code.visualstudio.com
- Node.js: https://nodejs.org
- Git: https://git-scm.com

---

## Quick Reference

### Command Cheat Sheet

```bash
# Development
npm start                # Start dev server
npm run build           # Production build
npm test                # Run tests
npm run lint            # Lint code

# Database (Chrome DevTools)
# Application tab → IndexedDB → JSCLabelGeneratorDB

# Port management
# Windows: netstat -ano | findstr :4200
# Mac/Linux: lsof -ti:4200

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### File Locations Quick Reference

```
Configuration:
  angular.json              → Angular CLI config
  package.json              → Dependencies
  tsconfig.json             → TypeScript config

Models:
  src/app/models/pos-item.model.ts          → Item interface
  src/app/models/label-template.model.ts    → Printer types
  src/app/models/filter.model.ts            → Filter interfaces

Services:
  src/app/services/indexed-db.service.ts    → Database operations
  src/app/services/label-template.service.ts → Label layouts
  src/app/services/item-filter.service.ts   → Filter logic

Components:
  src/app/components/print-preview/         → Print generation
  src/app/components/item-list/             → Item display & filters
  src/app/components/excel-import/          → Excel upload

Pages:
  src/app/pages/label-generator-page/       → Main label page
  src/app/pages/excel-import-page/          → Import page
  src/app/pages/excel-management-page/      → Manage sheets

Documentation:
  PROJECT_JOURNEY.md        → Implementation history
  PROJECT_OVERVIEW.md       → This file
  docs/                     → Feature documentation
```

### Key Concepts

**Standalone Components:** Angular 21's new architecture, no NgModules needed

**IndexedDB:** Browser database, stores data locally, survives page refresh

**Cascading Filters:** Parent selection updates child options dynamically

**@page CSS:** Tells printer exact page dimensions and orientation

**Single-label printers:** One item per page (Brother QL, Zebra)

**Multi-label printers:** Multiple items per page (A4 layouts)

**Orientation swapping:** Width ↔ Height swap when orientation changes

**Adaptive layouts:** Portrait = vertical, Landscape = grid

---

## Contact & Support

**Project Owner:** JSC Development Team  
**Target Client:** Lottery Mart (retail chain)  
**Development Start:** December 2024  
**Current Status:** Production-ready, awaiting hardware testing

**For Questions:**
1. Check this PROJECT_OVERVIEW.md first
2. Review PROJECT_JOURNEY.md for implementation details
3. Check docs/ folder for feature-specific guides
4. Search Stack Overflow with [angular] tag
5. Use ChatGPT/Claude/Codeium with code snippets

**For Bugs:**
1. Check browser console for errors
2. Verify IndexedDB in DevTools
3. Test with Print to PDF
4. Check angular.json configuration
5. Try clean reinstall: `rm -rf node_modules && npm install`

---

**END OF PROJECT OVERVIEW**

*This document should provide everything needed to work on the project from a new system with any AI assistant. Good luck!* 🚀
