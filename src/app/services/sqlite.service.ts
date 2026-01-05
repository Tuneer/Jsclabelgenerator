import { Injectable } from '@angular/core';
import initSqlJs from 'sql.js';

type Database = any; // SQL.js Database type

export interface TableSchema {
  tableName: string;
  columns: { name: string; type: string }[];
}

export interface QueryResult {
  columns: string[];
  values: any[][];
}

@Injectable({ providedIn: 'root' })
export class SQLiteService {
  private SQL: any = null;
  private db: Database | null = null;
  private dbName = 'LabelGeneratorDB';
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔧 Initializing SQL.js...');
      
      // Initialize SQL.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `https://sql.js.org/dist/${file}`
      });

      // Try to load existing database from IndexedDB
      const savedDb = await this.loadFromIndexedDB();
      
      if (savedDb) {
        this.db = new this.SQL.Database(savedDb);
        console.log('✅ Loaded existing database from IndexedDB');
      } else {
        this.db = new this.SQL.Database();
        console.log('✅ Created new SQLite database');
      }

      this.initialized = true;
      console.log('✅ SQLite service initialized');
    } catch (err) {
      console.error('❌ Failed to initialize SQLite:', err);
      throw err;
    }
  }

  async createTable(schema: TableSchema): Promise<void> {
    if (!this.db) await this.init();

    const columnDefs = schema.columns
      .map(col => `"${col.name}" ${col.type}`)
      .join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS "${schema.tableName}" (${columnDefs})`;
    
    try {
      this.db!.run(sql);
      console.log(`✅ Created table: ${schema.tableName}`);
      await this.saveToIndexedDB();
    } catch (err) {
      console.error(`❌ Failed to create table ${schema.tableName}:`, err);
      throw err;
    }
  }

  async dropTable(tableName: string): Promise<void> {
    if (!this.db) await this.init();

    try {
      this.db!.run(`DROP TABLE IF EXISTS "${tableName}"`);
      console.log(`✅ Dropped table: ${tableName}`);
      await this.saveToIndexedDB();
    } catch (err) {
      console.error(`❌ Failed to drop table ${tableName}:`, err);
      throw err;
    }
  }

  async insertRows(tableName: string, rows: any[]): Promise<void> {
    if (!this.db) await this.init();
    if (rows.length === 0) return;

    try {
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnNames = columns.map(c => `"${c}"`).join(', ');
      
      const sql = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`;
      const stmt = this.db!.prepare(sql);

      // Insert in batches of 1000
      const BATCH_SIZE = 1000;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        
        for (const row of batch) {
          const values = columns.map(col => row[col]);
          stmt.run(values);
        }

        if (i % 5000 === 0 && i > 0) {
          console.log(`📊 Inserted ${i} of ${rows.length} rows into ${tableName}...`);
        }
      }

      stmt.free();
      await this.saveToIndexedDB();
      console.log(`✅ Inserted ${rows.length} rows into ${tableName}`);
    } catch (err) {
      console.error(`❌ Failed to insert rows into ${tableName}:`, err);
      throw err;
    }
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) await this.init();

    try {
      const results = this.db!.exec(sql, params);
      
      if (results.length === 0) {
        return { columns: [], values: [] };
      }

      return {
        columns: results[0].columns,
        values: results[0].values
      };
    } catch (err) {
      console.error(`❌ Query failed: ${sql}`, err);
      throw err;
    }
  }

  async getTableNames(): Promise<string[]> {
    if (!this.db) await this.init();

    const result = await this.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    );

    return result.values.map(row => row[0] as string);
  }

  async getTableSchema(tableName: string): Promise<{ name: string; type: string }[]> {
    if (!this.db) await this.init();

    const result = await this.query(`PRAGMA table_info("${tableName}")`);
    
    return result.values.map(row => ({
      name: row[1] as string,
      type: row[2] as string
    }));
  }

  async getRowCount(tableName: string): Promise<number> {
    if (!this.db) await this.init();

    const result = await this.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
    return result.values[0]?.[0] as number || 0;
  }

  async clearTable(tableName: string): Promise<void> {
    if (!this.db) await this.init();

    try {
      this.db!.run(`DELETE FROM "${tableName}"`);
      await this.saveToIndexedDB();
      console.log(`✅ Cleared table: ${tableName}`);
    } catch (err) {
      console.error(`❌ Failed to clear table ${tableName}:`, err);
      throw err;
    }
  }

  async exportDatabase(): Promise<Uint8Array> {
    if (!this.db) await this.init();
    return this.db!.export();
  }

  async importDatabase(data: Uint8Array): Promise<void> {
    if (!this.SQL) await this.init();

    try {
      this.db = new this.SQL.Database(data);
      await this.saveToIndexedDB();
      console.log('✅ Database imported successfully');
    } catch (err) {
      console.error('❌ Failed to import database:', err);
      throw err;
    }
  }

  private async saveToIndexedDB(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['database'], 'readwrite');
        const store = transaction.objectStore('database');
        
        const data = this.db!.export();
        store.put({ id: 'main', data });

        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database', { keyPath: 'id' });
        }
      };
    });
  }

  private async loadFromIndexedDB(): Promise<Uint8Array | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        
        if (!db.objectStoreNames.contains('database')) {
          db.close();
          resolve(null);
          return;
        }

        const transaction = db.transaction(['database'], 'readonly');
        const store = transaction.objectStore('database');
        const getRequest = store.get('main');

        getRequest.onsuccess = () => {
          db.close();
          resolve(getRequest.result?.data || null);
        };
        getRequest.onerror = () => {
          db.close();
          reject(getRequest.error);
        };
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('database')) {
          db.createObjectStore('database', { keyPath: 'id' });
        }
      };
    });
  }
}
