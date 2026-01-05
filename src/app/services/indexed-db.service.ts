import { Injectable } from '@angular/core';
import { PosItem } from '../models/pos-item.model';

@Injectable({ providedIn: 'root' })
export class IndexedDBService {
  private dbName = 'LabelGeneratorDB';
  private version = 2; // Incremented for schema changes
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Legacy stores
        if (!db.objectStoreNames.contains('posItems')) {
          db.createObjectStore('posItems', { keyPath: 'id' });
          console.log('📦 Created posItems object store');
        }
        
        if (!db.objectStoreNames.contains('printedItems')) {
          db.createObjectStore('printedItems', { keyPath: 'id' });
          console.log('📦 Created printedItems object store');
        }

        // Multi-sheet support: sheets metadata
        if (!db.objectStoreNames.contains('sheets')) {
          db.createObjectStore('sheets', { keyPath: 'tableName' });
          console.log('📦 Created sheets object store');
        }

        // Multi-sheet support: sheet data (dynamic stores created at runtime)
        if (!db.objectStoreNames.contains('sheetData')) {
          db.createObjectStore('sheetData', { keyPath: ['tableName', 'rowId'], autoIncrement: false });
          console.log('📦 Created sheetData object store');
        }
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
}
