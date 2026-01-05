# Vendor Implementation Guide - Cascading Filter System

## Overview
This document provides a comprehensive guide for implementing the cascading filter system for different vendors (e.g., Lila Liquor, Lottery Mart, etc.). The system allows dynamic filtering of items based on hierarchical relationships in Excel data.

## Implementation Date
December 18, 2025

## Vendor: Lila Wine and Spirits (Reference Implementation)

---

## 1. Data Structure Requirements

### Required Excel Sheets

#### Sheet 1: Master Item Table (e.g., `tblItemMaster`)
**Purpose**: Contains all product/item data  
**Required Columns**:
- `ItemId` - Unique identifier for each item
- `ItemNameLine1` - Product/Item name
- `DepartmentId` - Links to Department master table
- `TypeGID` - Links to Entity table (ItemCategory)
- `SubTypeGID` - Links to Entity table (ItemSubCategory)
- `BrandGID` - Links to Entity table (ItemBrand)
- `Price` - Item price
- `Cost` - Item cost
- `BarCodeID` - Barcode identifier
- `SupplierItemCode` - SKU or supplier code
- `LongDescription` - Extended description

**Sample Data**:
```
ItemId: 0.081753810849
ItemNameLine1: "GLENMORANGIE 18 YEARS SCOTCH 750ML"
DepartmentId: 2
TypeGID: 3138
SubTypeGID: -1
BrandGID: -1
Price: 119.99
```

#### Sheet 2: Department Master Table (e.g., `tblDepartments`)
**Purpose**: Department categorization  
**Required Columns**:
- `DepartmentId` - Unique department identifier
- `DeptName` - Department display name
- `DeptDesc` - Department description

**Sample Data**:
```
DepartmentId: 1, DeptName: "Beer"
DepartmentId: 2, DeptName: "Liquor"
DepartmentId: 4, DeptName: "Wine"
```

#### Sheet 3: Entity Lookup Table (e.g., `tblEntity`)
**Purpose**: Centralized lookup table for Types, SubTypes, Brands, Sizes, etc.  
**Required Columns**:
- `GID` - Global unique identifier
- `ItemName` - Display name
- `ItemType` - Entity category (ItemCategory, ItemSubCategory, ItemBrand, etc.)
- `ParentGID` - Parent entity reference for hierarchical relationships

**ItemType Values**:
- `ItemCategory` - Product categories/types (e.g., Micro, Premium, Scotch, Vodka)
- `ItemSubCategory` - Product sub-categories (e.g., Bottle, Can, Longneck)
- `ItemBrand` - Product brands (e.g., Abita, Miller, Amstel)
- `ItemSize` - Size options (e.g., 12 OZ, 750ML)
- Other custom types as needed

**Sample Data**:
```
GID: 3138, ItemName: "Scotch", ItemType: "ItemCategory", ParentGID: 2
GID: 23, ItemName: "Premium", ItemType: "ItemCategory", ParentGID: 1
GID: 26, ItemName: "Can", ItemType: "ItemSubCategory", ParentGID: 23
GID: 27, ItemName: "Miller", ItemType: "ItemBrand", ParentGID: 0
```

---

## 2. Hierarchical Relationship Model

### Cascading Filter Logic

```
Department (Level 1)
    ↓ DepartmentId
Item Type (Level 2) - Filtered by ParentGID = DepartmentId
    ↓ TypeGID
Item Sub Type (Level 3) - Filtered by ParentGID = TypeGID
    ↓ SubTypeGID
Item Brand (Level 4) - Independent or filtered
    ↓ BrandGID
Items (Final Result) - Filtered by all selected criteria
```

### Example Filter Flow

**User Journey**:
1. User selects **Department**: Beer (DepartmentId = 1)
2. System filters **Item Types** where ItemType='ItemCategory' AND ParentGID=1
   - Result: Micro, Premium, Specialty, Imports, etc.
3. User selects **Type**: Premium (GID = 23)
4. System filters **Sub Types** where ItemType='ItemSubCategory' AND ParentGID=23
   - Result: Bottle, Can, Longneck Bottle, etc.
5. User selects **Sub Type**: Can (GID = 26)
6. User selects **Brand**: Miller (GID = 27) [Optional]
7. User clicks **"Show Items"**
8. System queries **tblItemMaster** WHERE:
   - DepartmentId = 1 AND
   - TypeGID = 23 AND
   - SubTypeGID = 26 AND
   - BrandGID = 27 (if selected)
9. Display filtered items in table

---

## 3. Technical Implementation

### Architecture Components

#### A. Filter Service (`item-filter.service.ts`)
**Responsibilities**:
- Load data from IndexedDB (tblDepartments, tblEntity, tblItemMaster)
- Build filter hierarchies with parent-child relationships
- Execute cascading queries
- Transform raw data to display format

**Key Methods**:
```typescript
async init(): Promise<void>
async getDepartments(): Promise<Department[]>
async getTypesByDepartment(deptId: number): Promise<ItemType[]>
async getSubTypesByType(typeGid: number): Promise<ItemSubType[]>
async getAllBrands(): Promise<ItemBrand[]>
async getFilteredItems(filters: FilterCriteria): Promise<any[]>
```

#### B. Filter Models (`filter-entities.model.ts`)
**Type Definitions**:
- `Department` - Department master data
- `ItemType` - Category entities from tblEntity
- `ItemSubType` - Sub-category entities
- `ItemBrand` - Brand entities
- `FilterCriteria` - Query parameters

#### C. Label Generator Page Component
**Enhancements**:
- Add filter UI section with 4 cascading dropdowns
- Use Angular Signals for reactive filter state
- Implement computed signals for cascading logic
- Handle "Show Items" button click
- Transform and display filtered results

### Technology Stack
- **Framework**: Angular 21+
- **Reactive State**: Angular Signals (preferred over RxJS for simpler state)
- **Template Directives**: ngSwitch, ngFor
- **Storage**: IndexedDB via IndexedDBService
- **UI Components**: Angular Material

---

## 4. Data Mapping Template

### Column Mapping Guide for New Vendors

When implementing for a new vendor, map their Excel columns to these standard fields:

| Standard Field | Lila Liquor Column | Your Vendor Column | Notes |
|---------------|-------------------|-------------------|-------|
| Item ID | ItemId | ___________ | Unique identifier |
| Item Name | ItemNameLine1 | ___________ | Display name |
| Department ID | DepartmentId | ___________ | Links to dept table |
| Type GID | TypeGID | ___________ | Links to category |
| SubType GID | SubTypeGID | ___________ | Links to sub-category |
| Brand GID | BrandGID | ___________ | Links to brand |
| Price | Price | ___________ | Retail price |
| Barcode | BarCodeID | ___________ | Barcode/UPC |
| SKU | SupplierItemCode | ___________ | SKU/Item code |
| Description | LongDescription | ___________ | Extended description |

### Entity Type Mapping

| Entity Purpose | ItemType Value | ParentGID Links To |
|---------------|----------------|-------------------|
| Department categories | ItemCategory | DepartmentId |
| Product sub-categories | ItemSubCategory | Category GID |
| Product brands | ItemBrand | None (independent) |
| Size options | ItemSize | None or Category |
| Custom entities | Custom value | Depends on hierarchy |

---

## 5. Implementation Checklist

### Phase 1: Data Preparation
- [ ] Obtain vendor Excel file
- [ ] Identify master item sheet
- [ ] Identify department/category sheets
- [ ] Identify entity/lookup sheets
- [ ] Map columns to standard fields
- [ ] Verify hierarchical relationships (ParentGID linkages)
- [ ] Test data upload via Excel Import page

### Phase 2: Service Layer
- [ ] Create/update filter models with vendor-specific types
- [ ] Implement filter service for new vendor
- [ ] Add vendor-specific sheet name constants
- [ ] Implement data transformation logic
- [ ] Add error handling for missing data

### Phase 3: UI Implementation
- [ ] Add cascading filter dropdowns to label generator page
- [ ] Implement filter state management with Signals
- [ ] Add computed signals for cascading behavior
- [ ] Add "Show Items" button
- [ ] Style filter section to match vendor branding

### Phase 4: Testing
- [ ] Test with vendor's actual data (13K+ rows)
- [ ] Verify cascading filters work correctly
- [ ] Test all filter combinations
- [ ] Test performance with large datasets
- [ ] Test edge cases (missing data, null values, -1 placeholders)

### Phase 5: Configuration
- [ ] Update vendor constants
- [ ] Configure sheet names
- [ ] Set default filter behavior
- [ ] Configure pagination limits
- [ ] Set up vendor-specific styling

---

## 6. Vendor-Specific Configuration

### Configuration File Example

```typescript
// config/vendor-config.ts

export const VENDOR_CONFIGS = {
  'lila-liquor': {
    name: 'Lila Wine and Spirits',
    sheets: {
      items: 'tblItemMaster',
      departments: 'tblDepartments',
      entities: 'tblEntity'
    },
    columns: {
      itemId: 'ItemId',
      itemName: 'ItemNameLine1',
      departmentId: 'DepartmentId',
      typeGid: 'TypeGID',
      subTypeGid: 'SubTypeGID',
      brandGid: 'BrandGID',
      price: 'Price',
      barcode: 'BarCodeID'
    },
    entityTypes: {
      category: 'ItemCategory',
      subCategory: 'ItemSubCategory',
      brand: 'ItemBrand'
    }
  },
  'lottery-mart': {
    name: 'Lottery Mart',
    sheets: {
      items: 'ProductMaster',      // Different sheet name
      departments: 'Departments',
      entities: 'Lookups'
    },
    columns: {
      itemId: 'ProductID',         // Different column names
      itemName: 'ProductName',
      departmentId: 'DeptID',
      typeGid: 'CategoryID',
      subTypeGid: 'SubCategoryID',
      brandGid: 'BrandID',
      price: 'RetailPrice',
      barcode: 'UPC'
    },
    entityTypes: {
      category: 'Category',
      subCategory: 'SubCategory',
      brand: 'Brand'
    }
  }
};
```

---

## 7. Performance Considerations

### Data Volume Handling
- **Lila Liquor Stats**: 13,325 items, 93 types, 424 subtypes, 1,003 brands
- **Recommended**: Pagination (50-100 items/page)
- **Optimization**: Index key columns in IndexedDB
- **Caching**: Cache filter options after first load

### Best Practices
1. Load filter metadata once on page init
2. Use Signals for reactive cascading (auto-updates)
3. Debounce filter changes if implementing auto-filter
4. Use virtual scrolling for 10K+ items
5. Show loading indicators for large queries

---

## 8. Common Issues & Solutions

### Issue 1: Missing Hierarchical Links
**Problem**: ParentGID is -1 or null  
**Solution**: Treat as "Uncategorized" or filter out

### Issue 2: Multiple Entity Types in Same Table
**Problem**: tblEntity contains many different ItemTypes  
**Solution**: Always filter by ItemType first, then by ParentGID

### Issue 3: Circular Dependencies
**Problem**: ParentGID references create loops  
**Solution**: Validate data during import, limit cascade depth

### Issue 4: Performance with Large Datasets
**Problem**: Filtering 13K+ items is slow  
**Solution**: 
- Use IndexedDB indexes on filter columns
- Implement pagination
- Consider Web Workers for heavy filtering

---

## 9. Future Enhancements

### Potential Features
- Multi-select filters (select multiple brands)
- Advanced filter combinations (OR logic)
- Save/load filter presets
- Export filtered results to Excel
- Filter history and favorites
- Real-time search with debouncing
- Vendor switcher in UI

---

## 10. API Reference

### ItemFilterService Methods

```typescript
class ItemFilterService {
  // Initialize service and load data
  async init(): Promise<void>
  
  // Get all departments
  async getDepartments(): Promise<Department[]>
  
  // Get types for specific department
  async getTypesByDepartment(deptId: number): Promise<ItemType[]>
  
  // Get subtypes for specific type
  async getSubTypesByType(typeGid: number): Promise<ItemSubType[]>
  
  // Get all brands (or filtered by criteria)
  async getAllBrands(criteria?: BrandFilterCriteria): Promise<ItemBrand[]>
  
  // Get filtered items based on all criteria
  async getFilteredItems(filters: {
    departmentId?: number;
    typeGid?: number;
    subTypeGid?: number;
    brandGid?: number;
  }): Promise<any[]>
  
  // Transform raw item data to display format
  private transformItem(raw: any): DisplayItem
}
```

---

## 11. Contact & Maintenance

**Developer**: Tuneer Mahatpure  
**Email**: mahatpuretuneer@gmail.com  
**Project**: JSC Label Generator  
**Last Updated**: December 18, 2025

---

## Appendix A: Lila Liquor Excel Structure

### Complete Sheet Summary
1. **tblItemMaster** (13,325 rows, 58 columns)
   - Primary item data with all product details
   
2. **tblDepartments** (13 rows, 11 columns)
   - Beer, Liquor, Wine, Food, POP, Tobacco, Misc, etc.
   
3. **tblEntity** (1,675 rows, 12 columns)
   - ItemCategory: 93 items
   - ItemSubCategory: 424 items
   - ItemBrand: 1,003 items
   - ItemSize, ItemUnitofMeasure, etc.
   
4. **tblStores** (1 row)
5. **tblLocations** (19 rows)
6. **tblVendors** (301 rows)
7. **tblItemSupplier** (7,012 rows)

### Key Relationships
```
tblDepartments.DepartmentId ← tblItemMaster.DepartmentId
tblEntity.GID ← tblItemMaster.TypeGID (where ItemType='ItemCategory')
tblEntity.GID ← tblItemMaster.SubTypeGID (where ItemType='ItemSubCategory')
tblEntity.GID ← tblItemMaster.BrandGID (where ItemType='ItemBrand')
```

---

## Appendix B: Sample Queries

### Get all Beer Types
```typescript
const entityData = await indexedDBService.getSheetData('tblEntity');
const beerTypes = entityData.filter(e => 
  e.ItemType === 'ItemCategory' && e.ParentGID === 1
);
// Returns: Micro, Premium, Specialty, Imports, etc.
```

### Get filtered items
```typescript
const items = await indexedDBService.getSheetData('tblItemMaster');
const filtered = items.filter(item =>
  item.DepartmentId === 1 &&    // Beer
  item.TypeGID === 23 &&         // Premium
  item.SubTypeGID === 26 &&      // Can
  item.BrandGID === 27           // Miller
);
```

---

## Document History
- **v1.0** - December 18, 2025 - Initial documentation for Lila Liquor implementation
- **Future**: Add Lottery Mart and other vendor implementations

---

**End of Vendor Implementation Guide**
