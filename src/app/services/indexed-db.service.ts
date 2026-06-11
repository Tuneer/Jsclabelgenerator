import { Injectable } from '@angular/core';
import { PosItem } from '../models/pos-item.model';

@Injectable({ providedIn: 'root' })
export class IndexedDBService {
  private dbName = 'LabelGeneratorDB';
  private version = 3; // Incremented for activeExcel store
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    console.log('🔧 [IndexedDB] init() called, db =', this.db ? 'EXISTS' : 'NULL');
    if (this.db) {
      console.log('🔧 [IndexedDB] Already initialized, skipping');
      return;
    }
    return new Promise((resolve, reject) => {
      console.log('🔧 [IndexedDB] Opening database:', this.dbName, 'version:', this.version);
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('❌ [IndexedDB] Failed to open:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ [IndexedDB] init() SUCCESS - database opened');
        resolve();
      };
      request.onblocked = () => {
        console.warn('⚠️ [IndexedDB] Database open BLOCKED by another connection');
      };

      request.onupgradeneeded = (event: any) => {
        console.log('🔧 [IndexedDB] onupgradeneeded fired');
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('posItems')) {
          db.createObjectStore('posItems', { keyPath: 'id' });
          console.log('📦 Created posItems object store');
        }
        
        if (!db.objectStoreNames.contains('printedItems')) {
          db.createObjectStore('printedItems', { keyPath: 'id' });
          console.log('📦 Created printedItems object store');
        }

        if (!db.objectStoreNames.contains('sheets')) {
          db.createObjectStore('sheets', { keyPath: 'tableName' });
          console.log('📦 Created sheets object store');
        }

        if (!db.objectStoreNames.contains('sheetData')) {
          db.createObjectStore('sheetData', { keyPath: ['tableName', 'rowId'], autoIncrement: false });
          console.log('📦 Created sheetData object store');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
          console.log('📦 Created settings object store');
        }
        console.log('🔧 [IndexedDB] onupgradeneeded complete');
      };
    });
  }

  async saveAll(storeName: string, items: PosItem[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Clear existing data
      store.clear();
      
      // Add all items
      items.forEach(item => store.add(item));
      
      transaction.oncomplete = () => {
        console.log(`✅ Saved ${items.length} items to IndexedDB (${storeName})`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAll(storeName: string): Promise<PosItem[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log(`✅ Retrieved ${request.result.length} items from IndexedDB (${storeName})`);
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async append(storeName: string, items: PosItem[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      items.forEach(item => {
        store.put(item); // Use put to upsert
      });
      
      transaction.oncomplete = () => {
        console.log(`✅ Appended ${items.length} items to IndexedDB (${storeName})`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log(`✅ Cleared IndexedDB (${storeName})`);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sheet Management Methods
  async saveSheet(sheetMetadata: { tableName: string; sheetName: string; columns: string[]; rowCount: number }): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readwrite');
      const store = transaction.objectStore('sheets');
      store.put(sheetMetadata);
      
      transaction.oncomplete = () => {
        console.log(`✅ Saved sheet metadata: ${sheetMetadata.tableName}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveSheetData(tableName: string, data: any[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetData'], 'readwrite');
      const store = transaction.objectStore('sheetData');
      
      // Clear existing data for this table
      const clearRange = IDBKeyRange.bound([tableName, 0], [tableName, Number.MAX_SAFE_INTEGER]);
      store.delete(clearRange);
      
      // Save new data
      data.forEach((row, index) => {
        store.put({
          tableName,
          rowId: index,
          data: row
        });
      });
      
      transaction.oncomplete = () => {
        console.log(`✅ Saved ${data.length} rows for sheet: ${tableName}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getSheetData(tableName: string): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheetData'], 'readonly');
      const store = transaction.objectStore('sheetData');
      const range = IDBKeyRange.bound([tableName, 0], [tableName, Number.MAX_SAFE_INTEGER]);
      const request = store.getAll(range);
      
      request.onsuccess = () => {
        const results = request.result.map((item: any) => item.data);
        console.log(`✅ Retrieved ${results.length} rows from sheet: ${tableName}`);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSheets(): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets'], 'readonly');
      const store = transaction.objectStore('sheets');
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log(`✅ Retrieved ${request.result.length} sheets`);
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSheet(tableName: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['sheets', 'sheetData'], 'readwrite');
      
      // Delete metadata
      transaction.objectStore('sheets').delete(tableName);
      
      // Delete data
      const dataStore = transaction.objectStore('sheetData');
      const range = IDBKeyRange.bound([tableName, 0], [tableName, Number.MAX_SAFE_INTEGER]);
      dataStore.delete(range);
      
      transaction.oncomplete = () => {
        console.log(`✅ Deleted sheet: ${tableName}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // ===== Active Excel Selection =====
  // Two independent settings:
  //  - activeLabelExcel:  Used by Label Generator (merchant item master)
  //  - activeCouponExcel: Used by Coupon Generator (coupon programs)

  /**
   * Set the active Excel sheet for a specific purpose.
   * @param tableName The sheet tableName
   * @param purpose 'label' or 'coupon'
   */
  async setActiveExcel(tableName: string, purpose: 'label' | 'coupon' = 'coupon'): Promise<void> {
    if (!this.db) await this.init();

    const key = purpose === 'label' ? 'activeLabelExcel' : 'activeCouponExcel';

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key, value: tableName });

      transaction.oncomplete = () => {
        console.log(`✅ Active Excel (${purpose}) set to: ${tableName}`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get the active Excel sheet tableName for a specific purpose.
   * @param purpose 'label' or 'coupon'
   * Returns null if no active Excel is set.
   */
  async getActiveExcel(purpose: 'label' | 'coupon' = 'coupon'): Promise<string | null> {
    console.log('🔍 [IndexedDB] getActiveExcel("' + purpose + '") called, db =', this.db ? 'EXISTS' : 'NULL');
    if (!this.db) {
      console.log('🔍 [IndexedDB] getActiveExcel: calling init()...');
      await this.init();
      console.log('🔍 [IndexedDB] getActiveExcel: init() done, db =', this.db ? 'EXISTS' : 'NULL');
    }

    const key = purpose === 'label' ? 'activeLabelExcel' : 'activeCouponExcel';
    console.log('🔍 [IndexedDB] getActiveExcel: reading key "' + key + '" from settings store');

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          console.log('✅ [IndexedDB] getActiveExcel: got result:', result ? result.value : 'NULL');
          resolve(result ? result.value : null);
        };
        request.onerror = () => {
          console.error('❌ [IndexedDB] getActiveExcel: request error:', request.error);
          reject(request.error);
        };
        
        transaction.onerror = () => {
          console.error('❌ [IndexedDB] getActiveExcel: transaction error:', transaction.error);
        };
      } catch (err) {
        console.error('❌ [IndexedDB] getActiveExcel: exception:', err);
        reject(err);
      }
    });
  }

  /**
   * Clear the active Excel selection for a specific purpose.
   * @param purpose 'label' or 'coupon'
   */
  async clearActiveExcel(purpose: 'label' | 'coupon' = 'coupon'): Promise<void> {
    if (!this.db) await this.init();

    const key = purpose === 'label' ? 'activeLabelExcel' : 'activeCouponExcel';

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      store.delete(key);

      transaction.oncomplete = () => {
        console.log(`✅ Active Excel (${purpose}) selection cleared`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
