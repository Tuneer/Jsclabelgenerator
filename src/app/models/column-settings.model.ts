export interface ColumnDefinition {
  key: string;
  label: string;
  showInTable: boolean;
  showInPrint: boolean;
  order: number;
}

export interface ColumnSettings {
  columns: ColumnDefinition[];
  lastUpdated: Date;
}
