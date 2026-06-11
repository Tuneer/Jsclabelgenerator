import { Injectable } from '@angular/core';
import { PosItem } from '../models/pos-item.model';
import { IndexedDBService } from './indexed-db.service';

/**
 * Coupon Excel Import Service
 * Transforms raw Excel coupon data (Affiliated Added Value Programs format)
 * into PosItem objects with coupon-specific fields.
 *
 * Expected Excel columns:
 *  1. PLU #'s          → pluCode
 *  2. Report Totals $  → (informational, stored in description)
 *  3. Scan Program Item → brand (first line) + name (full multi-line text)
 *  4. Size              → size + auto-derived quantityWord
 *  5. Full Description  → description
 *  6. Scan Value        → savingsAmount
 *  7. Start Date        → validFrom
 *  8. End Date          → validThru
 *  9. Redemption        → category
 */
@Injectable({ providedIn: 'root' })
export class CouponImportService {

  // Number-to-word mapping for quantity
  private static readonly NUMBER_WORDS: Record<number, string> = {
    1: 'ONE', 2: 'TWO', 3: 'THREE', 4: 'FOUR', 5: 'FIVE',
    6: 'SIX', 7: 'SEVEN', 8: 'EIGHT', 9: 'NINE', 10: 'TEN',
    11: 'ELEVEN', 12: 'TWELVE'
  };

  constructor(private indexedDBService: IndexedDBService) {}

  /**
   * Load coupon items from the active Excel sheet stored in IndexedDB.
   * Reads the active COUPON sheet name, fetches its data, and transforms rows to PosItem[].
   */
  async loadCouponsFromActiveSheet(): Promise<PosItem[]> {
    const activeSheetName = await this.indexedDBService.getActiveExcel('coupon');
    if (!activeSheetName) {
      console.warn('⚠️ No active coupon Excel sheet selected');
      return [];
    }

    const rawRows = await this.indexedDBService.getSheetData(activeSheetName);
    console.log(`📊 Loaded ${rawRows.length} raw rows from active sheet: ${activeSheetName}`);

    return this.transformCouponRows(rawRows);
  }

  /**
   * Load coupon items from a specific sheet by tableName.
   */
  async loadCouponsFromSheet(tableName: string): Promise<PosItem[]> {
    const rawRows = await this.indexedDBService.getSheetData(tableName);
    console.log(`📊 Loaded ${rawRows.length} raw rows from sheet: ${tableName}`);
    return this.transformCouponRows(rawRows);
  }

  /**
   * Transform an array of raw Excel rows into coupon PosItem objects.
   * Auto-detects column mapping by header names in the first row or by known keys.
   */
  transformCouponRows(rows: any[]): PosItem[] {
    if (!rows || rows.length === 0) return [];

    // Diagnostic: log all column names from first row
    if (rows.length > 0) {
      const firstRowKeys = Object.keys(rows[0]);
      console.log('🔍 COUPON EXCEL COLUMNS DETECTED:');
      console.table(firstRowKeys.map((k, i) => ({ index: i, columnName: k, sampleValue: String(rows[0][k]).substring(0, 50) })));
      console.log('📋 Full first row data:', JSON.stringify(rows[0], null, 2));
      if (rows.length > 1) {
        console.log('📋 Second row data (first data row):', JSON.stringify(rows[1], null, 2));
      }
    }

    const coupons: PosItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const coupon = this.transformRow(row, i);
        if (coupon) {
          coupons.push(coupon);
        }
      } catch (err) {
        console.warn(`⚠️ Skipped row ${i}: could not parse coupon data`, err);
      }
    }

    console.log(`✅ Transformed ${coupons.length} coupon items from ${rows.length} rows`);
    if (coupons.length > 0) {
      console.log('🎫 Sample coupon (first):', JSON.stringify(coupons[0], null, 2));
    }
    return coupons;
  }

  /**
   * Transform a single raw Excel row into a PosItem with coupon fields.
   * Handles flexible column naming.
   */
  private transformRow(row: any, index: number): PosItem | null {
    // Try to extract values using flexible column name matching
    // Excel column names may include special chars: "PLU #'s", "Report Totals $", etc.
    const plu = this.getField(row, ["PLU #'s", "PLU #'S", 'PLU #s', 'PLU #S', 'PLU #', 'PLU', 'plu', 'PLU#', 'PLUs', 'Plu']);
    const reportTotals = this.getField(row, ['Report Totals $', 'Report Totals', 'Totals $', 'Totals', 'Report Total $', 'Report Total']);
    const scanProgramItem = this.getField(row, ['Scan Program Item', 'Program Item', 'Scan Item', 'Scan Program', 'Program']);
    const size = this.getField(row, ['Size', 'size', 'Pack Size', 'Pack size']);
    const fullDescription = this.getField(row, ['Full Description', 'Description', 'Desc', 'Full Desc']);
    const scanValue = this.getField(row, ['Scan Value', 'Value', 'Scan $', 'ScanValue']);
    const startDate = this.getField(row, ['Start Date', 'Start', 'Begin Date', 'StartDate', 'Valid From', 'ValidFrom']);
    const endDate = this.getField(row, ['End Date', 'End', 'Expire Date', 'Expiry', 'EndDate', 'Valid Thru', 'ValidThru', 'Expiration']);
    const redemption = this.getField(row, ['Redemption', 'Redeem', 'Program', 'Category']);

    // Keyword fallback: if still not found, search by keyword in column name
    const pluFinal = plu || this.getFieldByKeyword(row, ['plu']);
    const endDateFinal = endDate || this.getFieldByKeyword(row, ['end', 'thru', 'expir']);
    const startDateFinal = startDate || this.getFieldByKeyword(row, ['start', 'begin', 'from']);
    const scanValueFinal = scanValue || this.getFieldByKeyword(row, ['value', 'save', 'saving']);
    const sizeFinal = size || this.getFieldByKeyword(row, ['size', 'pack']);
    const scanProgramItemFinal = scanProgramItem || this.getFieldByKeyword(row, ['scan', 'program', 'item']);

    // Skip rows with no meaningful data (no PLU and no Scan Program Item)
    if (!pluFinal && !scanProgramItemFinal) {
      return null;
    }

    // Parse Scan Program Item (multi-line) → brand + name
    const { brand, name } = this.parseScanProgramItem(scanProgramItemFinal);

    // Parse Size → size text + quantityWord
    const { sizeText, quantityWord } = this.parseSize(sizeFinal);

    // Parse Scan Value → savingsAmount
    const savingsAmount = this.parseAmount(scanValueFinal);

    // Skip rows missing essential coupon fields: product name, start date, or end date
    if (!startDateFinal || !endDateFinal || (!name && !brand)) {
      return null;
    }

    // Format dates
    const validFrom = this.formatDate(startDateFinal);
    const validThru = this.formatDate(endDateFinal);

    // Generate unique ID
    const id = `coupon-${pluFinal || index}-${Date.now()}`;

    return {
      id,
      brand: brand,
      category: redemption || '',
      subCategory: '',
      name: name || fullDescription || '',
      size: sizeText,
      price: savingsAmount || 0,
      description: fullDescription || '',
      sku: pluFinal || '',
      barcode: pluFinal || '',
      // Coupon-specific fields
      pluCode: pluFinal || '',
      savingsAmount: savingsAmount || 0,
      quantityWord: quantityWord,
      validFrom: validFrom,
      validThru: validThru,
      imageUrl: '',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Parse the multi-line "Scan Program Item" field.
   * First line = brand name, full text = product name/conditions.
   */
  private parseScanProgramItem(raw: string): { brand: string; name: string } {
    if (!raw) return { brand: '', name: '' };

    const text = String(raw).trim();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) return { brand: '', name: '' };

    // First line is the brand name
    const brand = lines[0];

    // Full text is the product description (join all lines)
    const name = lines.length > 1 ? lines.slice(1).join(' ') : lines[0];

    return { brand, name };
  }

  /**
   * Parse the Size field to extract size text and quantityWord.
   * Patterns:
   *   "(2)\n24oz Cans"   → size="24oz Cans", quantityWord="TWO"
   *   "(3)\n12pk"        → size="12pk", quantityWord="THREE"
   *   "6pk"              → size="6pk", quantityWord="ONE"
   *   "750ml"            → size="750ml", quantityWord="ONE"
   */
  private parseSize(raw: string): { sizeText: string; quantityWord: string } {
    if (!raw) return { sizeText: '', quantityWord: 'ONE' };

    const text = String(raw).trim();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

    // Check first line for quantity pattern like "(2)" or "(3)"
    const qtyMatch = lines[0]?.match(/^\((\d+)\)\s*$/);

    if (qtyMatch) {
      // Multiple purchase: "(2)\n24oz Cans"
      const qty = parseInt(qtyMatch[1], 10);
      const sizeText = lines.slice(1).join(' ') || lines[0];
      const quantityWord = CouponImportService.NUMBER_WORDS[qty] || `×${qty}`;
      return { sizeText: sizeText.trim(), quantityWord };
    }

    // Also check inline pattern like "(2) 24oz" on a single line
    const inlineMatch = text.match(/^\((\d+)\)\s*(.+)$/);
    if (inlineMatch) {
      const qty = parseInt(inlineMatch[1], 10);
      const sizeText = inlineMatch[2];
      const quantityWord = CouponImportService.NUMBER_WORDS[qty] || `×${qty}`;
      return { sizeText: sizeText.trim(), quantityWord };
    }

    // Single purchase: just the size text
    return { sizeText: text.replace(/\r?\n/g, ' ').trim(), quantityWord: 'ONE' };
  }

  /**
   * Parse a dollar amount string to a number.
   * Handles: "$1.50", "1.50", "$10.00", "0.25"
   */
  private parseAmount(raw: any): number {
    if (raw === null || raw === undefined || raw === '') return 0;
    if (typeof raw === 'number') return raw;
    const cleaned = String(raw).replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Format a date value to a readable string matching coupon reference:
   * "June 1, 2025" or "July 1, 2025" format.
   * Handles Excel serial numbers (as number or string), ISO strings, and "MM/DD/YYYY" format.
   *
   * Excel serial date system:
   *   Serial 1 = Jan 1, 1900
   *   Serial 60 = Feb 29, 1900 (PHANTOM date - 1900 is NOT a leap year)
   *   Serial 61 = Mar 1, 1900
   * For serial >= 60, offset = (serial - 1) days from Jan 1, 1900.
   * For serial < 60, offset = (serial - 2) days from Jan 1, 1900.
   */
  private formatDate(raw: any): string {
    if (raw === null || raw === undefined || raw === '') return '';

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    let date: Date | null = null;

    // Check if it's an Excel serial date number (or a string that looks like one)
    const asNumber = typeof raw === 'number' ? raw : parseFloat(String(raw).trim());
    if (!isNaN(asNumber) && asNumber > 0 && asNumber < 200000 && Number.isInteger(asNumber)) {
      const excelEpoch = new Date(1900, 0, 1);
      // Excel has a phantom Feb 29, 1900 (serial 60). For serial >= 60, offset by 1 less.
      const offset = asNumber >= 60 ? (asNumber - 1) : (asNumber - 2);
      date = new Date(excelEpoch.getTime() + offset * 86400000);
    } else if (typeof raw === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const offset = raw >= 60 ? (raw - 1) : (raw - 2);
      date = new Date(excelEpoch.getTime() + offset * 86400000);
    } else {
      // Try parsing as date string
      const str = String(raw).trim();
      if (!str) return '';

      // Check if already formatted as "MM/DD/YYYY" or "M/D/YY"
      const dateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dateMatch) {
        let [, month, day, year] = dateMatch;
        if (year.length === 2) year = '20' + year;
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Try ISO date parsing
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          date = parsed;
        }
      }
    }

    if (date && !isNaN(date.getTime())) {
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    }

    return String(raw); // Return as-is if can't parse
  }

  /**
   * Flexible field extractor - tries multiple possible column names.
   * Falls back to partial/contains matching if exact match not found.
   * Handles column names with newlines (e.g., "Affiliated\r\nPLU #'s").
   */
  private getField(row: any, possibleNames: string[]): string {
    if (!row) return '';
    // Pass 1: Exact match
    for (const name of possibleNames) {
      if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
        return String(row[name]);
      }
    }
    // Pass 2: Case-insensitive exact match
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      const key = keys.find(k => k.toLowerCase() === name.toLowerCase());
      if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]);
      }
    }
    // Pass 3: Partial/contains match (strips special chars including newlines)
    for (const name of possibleNames) {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName.length < 3) continue;
      const key = keys.find(k => {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanKey.includes(cleanName) || cleanName.includes(cleanKey);
      });
      if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]);
      }
    }
    return '';
  }

  /**
   * Keyword-based fallback: find a column whose name contains ANY of the given keywords.
   * Strips newlines/whitespace from column names before matching.
   * Returns the first matching value found.
   */
  private getFieldByKeyword(row: any, keywords: string[]): string {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const keyword of keywords) {
      const kw = keyword.toLowerCase();
      const key = keys.find(k => {
        // Strip newlines and extra whitespace from column name before matching
        const cleanKey = k.replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
        return cleanKey.includes(kw);
      });
      if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]);
      }
    }
    return '';
  }

  /**
   * Detect if a given sheet looks like a coupon Excel by checking column names.
   */
  isCouponSheet(columns: string[]): boolean {
    const lowerCols = columns.map(c => c.toLowerCase());
    const hasPlu = lowerCols.some(c => c.includes('plu'));
    const hasScanItem = lowerCols.some(c => c.includes('scan') && c.includes('item')) ||
                        lowerCols.some(c => c.includes('program item'));
    const hasScanValue = lowerCols.some(c => c.includes('scan') && c.includes('value'));
    return hasPlu || (hasScanItem && hasScanValue);
  }
}
