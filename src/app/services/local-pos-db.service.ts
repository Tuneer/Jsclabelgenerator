import { Injectable } from '@angular/core';
import { PosItem } from '../models/pos-item.model';
import { IndexedDBService } from './indexed-db.service';

@Injectable({ providedIn: 'root' })
export class LocalPosDbService {
  private readonly STORAGE_KEY = 'localPosItems';
  private readonly PRINTED_KEY = 'printedPosItems';
  private readonly USE_INDEXEDDB_KEY = 'useIndexedDB';
  private useIndexedDB = false;

  constructor(private indexedDB: IndexedDBService) {
    // Check if we should use IndexedDB
    const flag = localStorage.getItem(this.USE_INDEXEDDB_KEY);
    this.useIndexedDB = flag === 'true';
    if (this.useIndexedDB) {
      this.indexedDB.init().catch(err => console.error('IndexedDB init failed:', err));
    }
  }

  async getAll(): Promise<PosItem[]> {
    if (this.useIndexedDB) {
      try {
        return await this.indexedDB.getAll('posItems');
      } catch (err) {
        console.error('❌ IndexedDB getAll failed:', err);
        return [];
      }
    }

    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PosItem[]) : [];
    } catch (e) {
      console.error('Failed to parse local POS items from storage', e);
      return [];
    }
  }

  async saveAll(items: PosItem[]): Promise<void> {
    // Use IndexedDB for large datasets or if already using it
    if (this.useIndexedDB || items.length > 1000) {
      if (!this.useIndexedDB) {
        console.log('📊 Dataset large, switching to IndexedDB');
        localStorage.setItem(this.USE_INDEXEDDB_KEY, 'true');
        this.useIndexedDB = true;
        await this.indexedDB.init();
      }
      
      try {
        await this.indexedDB.saveAll('posItems', items);
        // Clear localStorage to free space
        try { localStorage.removeItem(this.STORAGE_KEY); } catch {}
        return;
      } catch (err) {
        console.error('❌ IndexedDB save failed:', err);
        throw new Error('Failed to save items to IndexedDB');
      }
    }

    // Try localStorage for small datasets
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      const jsonData = JSON.stringify(items);
      localStorage.setItem(this.STORAGE_KEY, jsonData);
      console.log('✅ Saved', items.length, 'items to localStorage');
    } catch (err: any) {
      if (err.name === 'QuotaExceededError') {
        console.warn('⚠️ localStorage quota exceeded, switching to IndexedDB');
        localStorage.setItem(this.USE_INDEXEDDB_KEY, 'true');
        this.useIndexedDB = true;
        await this.indexedDB.init();
        await this.indexedDB.saveAll('posItems', items);
      } else {
        console.error('❌ Failed to save items:', err);
        throw err;
      }
    }
  }

  async upsertItems(items: PosItem[]): Promise<void> {
    const existing = await this.getAll();
    const map = new Map<string, PosItem>();
    existing.forEach((item) => map.set(item.id, item));
    items.forEach((item) => map.set(item.id, item));
    await this.saveAll(Array.from(map.values()));
  }

  async getPrintedHistory(): Promise<PosItem[]> {
    if (this.useIndexedDB) {
      try {
        return await this.indexedDB.getAll('printedItems');
      } catch (err) {
        console.error('❌ IndexedDB getPrintedHistory failed:', err);
        return [];
      }
    }

    const raw = localStorage.getItem(this.PRINTED_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PosItem[]) : [];
    } catch (e) {
      console.error('Failed to parse printed POS items from storage', e);
      return [];
    }
  }

  async appendPrintedItems(items: PosItem[]): Promise<void> {
    const nowIso = new Date().toISOString();
    const enriched = items.map((item) => ({ ...item, lastUpdated: nowIso }));
    
    if (this.useIndexedDB) {
      try {
        await this.indexedDB.append('printedItems', enriched);
        return;
      } catch (err) {
        console.error('❌ IndexedDB appendPrintedItems failed:', err);
      }
    }

    const existing = await this.getPrintedHistory();
    localStorage.setItem(this.PRINTED_KEY, JSON.stringify([...existing, ...enriched]));
  }
}
