export interface S4HANAUser {
  UserID: string;
  UserName: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  IsLocked?: boolean;
  ValidFrom?: string;
  ValidTo?: string;
}

export interface S4HANARole {
  RoleID: string;
  RoleName: string;
  Description?: string;
  RoleType?: string;
}

export interface S4HANAUserRole {
  UserID: string;
  RoleID: string;
  ValidFrom: string;
  ValidTo: string;
  AssignmentDate?: string;
}

export interface S4HANAQueryOptions {
  filter?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  skip?: number;
  orderBy?: string;
}

export interface S4HANAODataResponse<T> {
  d: {
    results: T[];
    __count?: number;
  };
}

export interface S4HANABatchRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface S4HANABatchResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

// Purchase Order types
export interface S4HANAPurchaseOrder {
  PurchaseOrder: string;
  PurchaseOrderItem: string;
  Supplier: string;
  SupplierName?: string;
  Material?: string;
  MaterialName?: string;
  OrderQuantity: number;
  NetPriceAmount: number;
  Currency: string;
  NetPriceQuantity?: number;
  TaxAmount?: number;
  DeliveryDate?: string;
  PurchaseOrderDate: string;
  DocumentDate?: string;
  PurchasingDocumentStatus?: string;
  CreatedByUser?: string;
}

// Goods Receipt types
export interface S4HANAGoodsReceipt {
  MaterialDocument: string;
  MaterialDocumentYear: string;
  MaterialDocumentItem: string;
  PurchaseOrder?: string;
  PurchaseOrderItem?: string;
  Material?: string;
  QuantityInEntryUnit: number;
  TotalGoodsMvtAmtInCCCrcy?: number;
  Currency?: string;
  PostingDate: string;
  DocumentDate?: string;
  Plant?: string;
  StorageLocation?: string;
  CreatedByUser?: string;
  GoodsMovementType?: string;
}

// Supplier Invoice types
export interface S4HANASupplierInvoice {
  SupplierInvoice: string;
  FiscalYear: string;
  SupplierInvoiceItem?: string;
  Supplier: string;
  SupplierName?: string;
  PurchaseOrder?: string;
  PurchaseOrderItem?: string;
  ReferenceDocument?: string; // GR number
  ReferenceDocumentItem?: string;
  Material?: string;
  QuantityInPurchaseOrderUnit?: number;
  SupplierInvoiceItemAmount: number;
  TaxAmount?: number;
  DocumentCurrency: string;
  InvoicingDate: string;
  PostingDate: string;
  DocumentDate?: string;
  NetDueDate?: string;
  PaymentTerms?: string;
  AccountingDocumentType?: string;
  SupplierInvoiceStatus?: string;
  CreatedByUser?: string;
}