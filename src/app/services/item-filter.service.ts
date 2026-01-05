import { Injectable } from '@angular/core';
import { IndexedDBService } from './indexed-db.service';
import {
  Department,
  ItemType,
  ItemSubType,
  ItemBrand,
  FilterCriteria,
  EntityLookup
} from '../models/filter-entities.model';

@Injectable({
  providedIn: 'root'
})
export class ItemFilterService {
  private departmentsCache: Department[] = [];
  private entityCache: any[] = [];
  private itemsCache: any[] = [];
  private entityLookup: EntityLookup = {};
  private initialized = false;

  // Sheet names configuration (can be customized per vendor)
  private readonly SHEET_NAMES = {
    departments: 'tblDepartments',
    entities: 'tblEntity',
    items: 'tblItemMaster'
  };

  private readonly ENTITY_TYPES = {
    category: 'ItemCategory',
    subCategory: 'ItemSubCategory',
    brand: 'ItemBrand'
  };

  constructor(private indexedDBService: IndexedDBService) {}

  /**
   * Initialize the filter service by loading all required data
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log('📊 ItemFilterService already initialized');
      return;
    }

    try {
      console.log('📊 Initializing ItemFilterService...');
      console.log('   Looking for sheets:', this.SHEET_NAMES);

      // Check what sheets are available
      const availableSheets = await this.indexedDBService.getAllSheets();
      console.log('📊 Available sheets in IndexedDB:', availableSheets.map(s => `${s.sheetName} (table: ${s.tableName})`));

      // Find sheets by their original sheetName, not tableName
      const deptSheet = availableSheets.find(s => s.sheetName === this.SHEET_NAMES.departments);
      const entitySheet = availableSheets.find(s => s.sheetName === this.SHEET_NAMES.entities);
      const itemsSheet = availableSheets.find(s => s.sheetName === this.SHEET_NAMES.items);

      if (!deptSheet) {
        console.warn(`⚠️ Sheet "${this.SHEET_NAMES.departments}" not found in IndexedDB`);
      }
      if (!entitySheet) {
        console.warn(`⚠️ Sheet "${this.SHEET_NAMES.entities}" not found in IndexedDB`);
      }
      if (!itemsSheet) {
        console.warn(`⚠️ Sheet "${this.SHEET_NAMES.items}" not found in IndexedDB`);
      }

      // Load all required sheets using their tableName
      const [departments, entities, items] = await Promise.all([
        deptSheet ? this.indexedDBService.getSheetData(deptSheet.tableName).catch(err => {
          console.error(`❌ Failed to load ${deptSheet.tableName}:`, err);
          return [];
        }) : Promise.resolve([]),
        entitySheet ? this.indexedDBService.getSheetData(entitySheet.tableName).catch(err => {
          console.error(`❌ Failed to load ${entitySheet.tableName}:`, err);
          return [];
        }) : Promise.resolve([]),
        itemsSheet ? this.indexedDBService.getSheetData(itemsSheet.tableName).catch(err => {
          console.error(`❌ Failed to load ${itemsSheet.tableName}:`, err);
          return [];
        }) : Promise.resolve([])
      ]);

      this.departmentsCache = departments;
      this.entityCache = entities;
      this.itemsCache = items;

      // Build entity lookup map for fast access
      this.buildEntityLookup();

      this.initialized = true;
      console.log('✅ ItemFilterService initialized');
      console.log(`   - Departments: ${this.departmentsCache.length}`);
      console.log(`   - Entities: ${this.entityCache.length}`);
      console.log(`   - Items: ${this.itemsCache.length}`);
      
      if (this.departmentsCache.length === 0) {
        console.warn('⚠️ WARNING: No departments loaded! Check if tblDepartments sheet exists in IndexedDB');
      }
    } catch (error) {
      console.error('❌ Failed to initialize ItemFilterService:', error);
      throw error;
    }
  }

  /**
   * Build entity lookup map for O(1) access
   */
  private buildEntityLookup(): void {
    this.entityCache.forEach(entity => {
      if (entity.GID) {
        this.entityLookup[entity.GID] = {
          GID: entity.GID,
          ItemName: entity.ItemName || entity.Title || 'Unknown',
          Title: entity.Title,
          ItemType: entity.ItemType,
          ParentGID: entity.ParentGID
        };
      }
    });
    console.log(`📚 Built entity lookup with ${Object.keys(this.entityLookup).length} entries`);
  }

  /**
   * Get all departments
   */
  async getDepartments(): Promise<Department[]> {
    if (!this.initialized) await this.init();
    
    console.log('🔍 getDepartments() called');
    console.log('   Total departments in cache:', this.departmentsCache.length);
    console.log('   Raw department data:', this.departmentsCache);
    
    // Filter out unknown/invalid departments and sort by name
    const filtered = this.departmentsCache
      .filter(d => d.DepartmentId > 0 && d.DeptName && d.DeptName !== 'UNK')
      .sort((a, b) => {
        const nameA = String(a.DeptName || '');
        const nameB = String(b.DeptName || '');
        return nameA.localeCompare(nameB);
      });
    
    console.log('   Filtered departments:', filtered.length);
    console.log('   Department names:', filtered.map(d => d.DeptName));
    
    return filtered;
  }

  /**
   * Get item types (categories) for a specific department
   */
  async getTypesByDepartment(departmentId: number): Promise<ItemType[]> {
    if (!this.initialized) await this.init();

    const types = this.entityCache.filter(e =>
      e.ItemType === this.ENTITY_TYPES.category &&
      e.ParentGID === departmentId &&
      e.ItemName &&
      e.ItemName !== 'UNK'
    ) as ItemType[];

    console.log(`🔍 Found ${types.length} types for department ${departmentId}`);
    return types.sort((a, b) => {
      const nameA = String(a.ItemName || a.Title || '');
      const nameB = String(b.ItemName || b.Title || '');
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get item sub-types for a specific type
   */
  async getSubTypesByType(typeGid: number): Promise<ItemSubType[]> {
    if (!this.initialized) await this.init();

    const subTypes = this.entityCache.filter(e =>
      e.ItemType === this.ENTITY_TYPES.subCategory &&
      e.ParentGID === typeGid &&
      e.ItemName &&
      e.ItemName !== 'UNK'
    ) as ItemSubType[];

    console.log(`🔍 Found ${subTypes.length} sub-types for type ${typeGid}`);
    return subTypes.sort((a, b) => {
      const nameA = String(a.ItemName || a.Title || '');
      const nameB = String(b.ItemName || b.Title || '');
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get all brands (optionally filtered)
   */
  async getAllBrands(filterByAvailableItems: boolean = false): Promise<ItemBrand[]> {
    if (!this.initialized) await this.init();

    let brands = this.entityCache.filter(e =>
      e.ItemType === this.ENTITY_TYPES.brand &&
      e.ItemName &&
      e.ItemName !== 'UNK'
    ) as ItemBrand[];

    // Optionally filter to only brands that have items
    if (filterByAvailableItems) {
      const brandIdsInUse = new Set(
        this.itemsCache
          .filter(item => item.BrandGID && item.BrandGID > 0)
          .map(item => item.BrandGID)
      );
      brands = brands.filter(b => brandIdsInUse.has(b.GID));
    }

    console.log(`🔍 Found ${brands.length} brands`);
    return brands.sort((a, b) => {
      const nameA = String(a.ItemName || a.Title || '');
      const nameB = String(b.ItemName || b.Title || '');
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Get filtered items based on cascading filter criteria
   */
  async getFilteredItems(criteria: FilterCriteria): Promise<any[]> {
    if (!this.initialized) await this.init();

    console.log('🔎 Filtering items with criteria:', criteria);

    let filtered = [...this.itemsCache];

    // Apply department filter
    if (criteria.departmentId !== null && criteria.departmentId !== undefined) {
      filtered = filtered.filter(item => item.DepartmentId === criteria.departmentId);
      console.log(`   After department filter: ${filtered.length} items`);
    }

    // Apply type filter
    if (criteria.typeGid !== null && criteria.typeGid !== undefined) {
      filtered = filtered.filter(item => item.TypeGID === criteria.typeGid);
      console.log(`   After type filter: ${filtered.length} items`);
    }

    // Apply sub-type filter
    if (criteria.subTypeGid !== null && criteria.subTypeGid !== undefined) {
      filtered = filtered.filter(item => item.SubTypeGID === criteria.subTypeGid);
      console.log(`   After sub-type filter: ${filtered.length} items`);
    }

    // Apply brand filter
    if (criteria.brandGid !== null && criteria.brandGid !== undefined) {
      filtered = filtered.filter(item => item.BrandGID === criteria.brandGid);
      console.log(`   After brand filter: ${filtered.length} items`);
    }

    // Transform to display format
    const displayItems = filtered.map(item => this.transformToDisplayFormat(item));

    console.log(`✅ Final filtered result: ${displayItems.length} items`);
    return displayItems;
  }

  /**
   * Transform raw item data to display format
   */
  private transformToDisplayFormat(itemRow: any): any {
    // Lookup related entities
    const department = this.departmentsCache.find(d => d.DepartmentId === itemRow.DepartmentId);
    const type = this.entityLookup[itemRow.TypeGID];
    const subType = this.entityLookup[itemRow.SubTypeGID];
    const brand = this.entityLookup[itemRow.BrandGID];
    const size = this.entityLookup[itemRow.SizeGID];

    return {
      // Standard PosItem fields
      id: itemRow.ItemId?.toString() || itemRow.ItemMasterId?.toString() || '',
      name: itemRow.ItemNameLine1 || 'Unknown Item',
      price: itemRow.Price || 0,
      barcode: itemRow.BarCodeID?.toString() || '',
      sku: itemRow.SupplierItemCode || itemRow.ItemMasterId?.toString() || '',
      category: type?.ItemName || 'Uncategorized',
      subCategory: subType?.ItemName || 'N/A',
      brand: brand?.ItemName || 'Unknown',
      description: itemRow.LongDescription || itemRow.ItemNameLine1 || '',
      size: size?.ItemName || '',
      
      // Additional fields
      department: department?.DeptName || 'Unknown',
      cost: itemRow.Cost || 0,
      inStock: itemRow.InStockQty || 0,
      
      // Keep raw data for reference
      _raw: itemRow,
      
      // IDs for filtering
      _departmentId: itemRow.DepartmentId,
      _typeGid: itemRow.TypeGID,
      _subTypeGid: itemRow.SubTypeGID,
      _brandGid: itemRow.BrandGID
    };
  }

  /**
   * Get statistics about current data
   */
  async getStatistics(): Promise<{
    departments: number;
    types: number;
    subTypes: number;
    brands: number;
    items: number;
  }> {
    if (!this.initialized) await this.init();

    return {
      departments: this.departmentsCache.filter(d => d.DepartmentId > 0).length,
      types: this.entityCache.filter(e => e.ItemType === this.ENTITY_TYPES.category).length,
      subTypes: this.entityCache.filter(e => e.ItemType === this.ENTITY_TYPES.subCategory).length,
      brands: this.entityCache.filter(e => e.ItemType === this.ENTITY_TYPES.brand).length,
      items: this.itemsCache.length
    };
  }

  /**
   * Check if the service is ready to use
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset/clear the cache (useful for testing or data refresh)
   */
  reset(): void {
    this.departmentsCache = [];
    this.entityCache = [];
    this.itemsCache = [];
    this.entityLookup = {};
    this.initialized = false;
    console.log('🔄 ItemFilterService reset');
  }
}
