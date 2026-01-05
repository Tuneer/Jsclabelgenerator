export interface ExcelSheet {
  name: string;
  data: any[];
  columns: string[];
  rowCount: number;
  selected: boolean;
  tableName?: string; // SQL table name (sanitized)
  mapped: boolean; // Whether column mapping is done
}

export interface SheetMapping {
  sheetName: string;
  tableName: string;
  columnMappings: { excelColumn: string; sqlColumn: string; sqlType: string }[];
}
