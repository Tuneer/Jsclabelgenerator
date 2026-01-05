import { Injectable } from '@angular/core';
import type { Database, SqlJsStatic } from 'sql.js';

export interface SheetMetadata {
  tableName: string;
  sheetName: string;
  columns: string[];
  rowCount: number;
  excelFileName?: string;
}

@Injectable({ providedIn: 'root' })
export class SqlDBService {
  private SQL: SqlJsStatic | null = null;
  private db: Database | null = null;
  private dbName = 'LabelGeneratorSQLite';
  private initialized = false;

  constructor() {
    console.log('🔷 SqlDBService instantiated');
  }

  /**
   * Initialize SQL.js library and load database from localStorage
   */
  async init(): Promise<void> {
    if (this.initialized) {
      console.log('✅ SQL.js already initialized');
      return;
    }

    try {
      console.log('🔷 Initializing SQL.js...');
      
      // Dynamically import sql.js to avoid webpack bundling issues
      const initSqlJs = (await import('sql.js')).default;
      
      // Load SQL.js library from CDN (avoids webpack bundling issues)
      this.SQL = await initSqlJs({
        locateFile: (file) => `https://sql.js.org/dist/${file}`
      });

      // Try to load existing database from localStorage
      const savedDb = localStorage.getItem(this.dbName);
      
      if (savedDb) {
        // Load existing database
        const uint8Array = new Uint8Array(JSON.parse(savedDb));
        this.db = new this.SQL.Database(uint8Array);
        console.log('✅ Loaded existing SQL database from localStorage');
      } else {
        // Create new database
        this.db = new this.SQL.Database();
        console.log('✅ Created new SQL database');
      }

      // Create metadata table if not exists
      this.db.run(`
        CREATE TABLE IF NOT EXISTS _sheets_metadata (
          tableName TEXT PRIMARY KEY,
          sheetName TEXT NOT NULL,
          columns TEXT NOT NULL,
          rowCount INTEGER NOT NULL,
          excelFileName TEXT,
          uploadedAt TEXT NOT NULL
        )
      `);

      this.initialized = true;
      console.log('✅ SQL.js initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SQL.js:', error);
      throw error;
    }
  }

  /**
   * Save database to localStorage
   */
  private saveToLocalStorage(): void {
    if (!this.db) return;
    
    try {
      const data = this.db.export();
      const buffer = Array.from(data);
      localStorage.setItem(this.dbName, JSON.stringify(buffer));
      console.log('💾 Database saved to localStorage');
    } catch (error) {
      console.error('❌ Failed to save database:', error);
    }
  }

  /**
   * Save sheet metadata and create table for sheet data
   */
  async saveSheet(metadata: SheetMetadata): Promise<void> {
    if (!this.db) await this.init();

    try {
      // Save metadata
      const columnsJson = JSON.stringify(metadata.columns);
      const uploadedAt = new Date().toISOString();

      this.db!.run(
        `INSERT OR REPLACE INTO _sheets_metadata 
         (tableName, sheetName, columns, rowCount, excelFileName, uploadedAt) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [metadata.tableName, metadata.sheetName, columnsJson, metadata.rowCount, metadata.excelFileName || '', uploadedAt]
      );

      // Create table for sheet data
      const sanitizedColumns = metadata.columns.map(col => 
        `"${col.replace(/"/g, '""')}" TEXT`
      ).join(', ');

      this.db!.run(`DROP TABLE IF EXISTS "${metadata.tableName}"`);
      this.db!.run(`CREATE TABLE "${metadata.tableName}" (
        _rowId INTEGER PRIMARY KEY AUTOINCREMENT,
        ${sanitizedColumns}
      )`);

      this.saveToLocalStorage();
      console.log(`✅ Created table: ${metadata.tableName}`);
    } catch (error) {
      console.error(`❌ Failed to save sheet metadata:`, error);
      throw error;
    }
  }

  /**
   * Save sheet data rows to the table
   */
  async saveSheetData(tableName: string, data: any[]): Promise<void> {
    if (!this.db) await this.init();
    if (data.length === 0) return;

    try {
      // Get columns from first row
      const columns = Object.keys(data[0]);
      const placeholders = columns.map(() => '?').join(', ');
      const columnNames = columns.map(col => `"${col.replace(/"/g, '""')}"`).join(', ');

      // Begin transaction for better performance
      this.db!.run('BEGIN TRANSACTION');

      // Insert all rows
      const stmt = this.db!.prepare(
        `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`
      );

      for (const row of data) {
        const values = columns.map(col => row[col] ?? null);
        stmt.run(values);
      }

      stmt.free();
      this.db!.run('COMMIT');

      this.saveToLocalStorage();
      console.log(`✅ Saved ${data.length} rows to table: ${tableName}`);
    } catch (error) {
      this.db!.run('ROLLBACK');
      console.error(`❌ Failed to save sheet data:`, error);
      throw error;
    }
  }

  /**
   * Get all rows from a sheet table
   */
  async getSheetData(tableName: string): Promise<any[]> {
    if (!this.db) await this.init();

    try {
      const result = this.db!.exec(`SELECT * FROM "${tableName}"`);
      
      if (result.length === 0) {
        console.log(`📋 No data found in table: ${tableName}`);
        return [];
      }

      // Convert to array of objects
      const columns = result[0].columns;
      const rows = result[0].values.map(row => {
        const obj: any = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });

      console.log(`✅ Retrieved ${rows.length} rows from table: ${tableName}`);
      return rows;
    } catch (error) {
      console.error(`❌ Failed to get sheet data:`, error);
      return [];
    }
  }

  /**
   * Get all sheets metadata
   */
  async getAllSheets(): Promise<SheetMetadata[]> {
    if (!this.db) await this.init();

    try {
      const result = this.db!.exec('SELECT * FROM _sheets_metadata ORDER BY uploadedAt DESC');
      
      if (result.length === 0) {
        console.log('📋 No sheets found');
        return [];
      }

      const sheets: SheetMetadata[] = result[0].values.map(row => ({
        tableName: row[0] as string,
        sheetName: row[1] as string,
        columns: JSON.parse(row[2] as string),
        rowCount: row[3] as number,
        excelFileName: row[4] as string
      }));

      console.log(`✅ Retrieved ${sheets.length} sheets metadata`);
      return sheets;
    } catch (error) {
      console.error('❌ Failed to get all sheets:', error);
      return [];
    }
  }

  /**
   * Delete a sheet and its data
   */
  async deleteSheet(tableName: string): Promise<void> {
    if (!this.db) await this.init();

    try {
      // Delete metadata
      this.db!.run('DELETE FROM _sheets_metadata WHERE tableName = ?', [tableName]);
      
      // Drop table
      this.db!.run(`DROP TABLE IF EXISTS "${tableName}"`);

      this.saveToLocalStorage();
      console.log(`✅ Deleted sheet: ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to delete sheet:`, error);
      throw error;
    }
  }

  /**
   * Execute custom SQL query
   * This is the power of SQL.js - you can write any SQL query!
   */
  async executeQuery(query: string, params: any[] = []): Promise<any[]> {
    if (!this.db) await this.init();

    try {
      console.log(`🔍 Executing SQL: ${query}`);
      const result = this.db!.exec(query, params);
      
      if (result.length === 0) {
        return [];
      }

      // Convert to array of objects
      const columns = result[0].columns;
      const rows = result[0].values.map(row => {
        const obj: any = {};
        columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });

      console.log(`✅ Query returned ${rows.length} rows`);
      return rows;
    } catch (error) {
      console.error(`❌ Query failed:`, error);
      throw error;
    }
  }

  /**
   * Get table column names
   */
  async getTableColumns(tableName: string): Promise<string[]> {
    if (!this.db) await this.init();

    try {
      const result = this.db!.exec(`PRAGMA table_info("${tableName}")`);
      
      if (result.length === 0) {
        return [];
      }

      // Column info: [cid, name, type, notnull, dflt_value, pk]
      const columns = result[0].values
        .filter(row => row[1] !== '_rowId') // Exclude internal rowId
        .map(row => row[1] as string);

      return columns;
    } catch (error) {
      console.error(`❌ Failed to get table columns:`, error);
      return [];
    }
  }

  /**
   * Export database as binary array (for download or backup)
   */
  exportDatabase(): Uint8Array | null {
    if (!this.db) return null;
    return this.db.export();
  }

  /**
   * Clear all data and reset database
   */
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();

    try {
      // Get all sheet tables
      const sheets = await this.getAllSheets();
      
      // Drop all sheet tables
      for (const sheet of sheets) {
        this.db!.run(`DROP TABLE IF EXISTS "${sheet.tableName}"`);
      }

      // Clear metadata
      this.db!.run('DELETE FROM _sheets_metadata');

      this.saveToLocalStorage();
      console.log('✅ Cleared all data from SQL database');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<{ totalSheets: number; totalRows: number; dbSize: number }> {
    if (!this.db) await this.init();

    try {
      const sheets = await this.getAllSheets();
      const totalSheets = sheets.length;
      let totalRows = 0;

      for (const sheet of sheets) {
        totalRows += sheet.rowCount;
      }

      const dbData = this.db!.export();
      const dbSize = dbData.length;

      return { totalSheets, totalRows, dbSize };
    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { totalSheets: 0, totalRows: 0, dbSize: 0 };
    }
  }
}
