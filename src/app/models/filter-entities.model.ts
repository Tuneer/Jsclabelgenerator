// Filter entity models for cascading filter system

export interface Department {
  DepartmentId: number;
  DeptName: string;
  DeptDesc?: string;
  StoreId?: number;
}

export interface ItemType {
  GID: number;
  ItemName: string;
  Title?: string;
  Description?: string;
  ParentGID: number;  // Links to DepartmentId
  ItemType: string;   // Should be 'ItemCategory'
  DisplayOrder?: number;
}

export interface ItemSubType {
  GID: number;
  ItemName: string;
  Title?: string;
  Description?: string;
  ParentGID: number;  // Links to ItemType.GID
  ItemType: string;   // Should be 'ItemSubCategory'
  DisplayOrder?: number;
}

export interface ItemBrand {
  GID: number;
  ItemName: string;
  Title?: string;
  Description?: string;
  ParentGID?: number;
  ItemType: string;   // Should be 'ItemBrand'
}

export interface FilterCriteria {
  departmentId?: number | null;
  typeGid?: number | null;
  subTypeGid?: number | null;
  brandGid?: number | null;
}

export interface EntityLookup {
  [key: number]: {
    GID: number;
    ItemName: string;
    Title?: string;
    ItemType: string;
    ParentGID?: number;
  };
}
