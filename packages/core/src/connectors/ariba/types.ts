/**
 * SAP Ariba Types
 */

export interface AribaPurchaseOrder {
  OrderID: string;
  OrderDate: string;
  Supplier: string;
  TotalAmount: number;
  Currency: string;
  Status: string;
}

export interface AribaSupplier {
  SupplierID: string;
  Name: string;
  Status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  RiskScore?: number;
}

export interface AribaContract {
  ContractID: string;
  Title: string;
  StartDate: string;
  EndDate: string;
  Value: number;
  Currency: string;
}

export interface AribaInvoice {
  InvoiceID: string;
  POReference: string;
  Amount: number;
  Currency: string;
  Status: string;
}

export interface AribaUser {
  UserID: string;
  UserName: string;
  Email: string;
  Department?: string;
  Status: 'ACTIVE' | 'INACTIVE';
  Roles?: string[];
}

export interface AribaODataResponse<T> {
  d?: {
    results: T[];
    __next?: string;
  };
  Records?: T[];
}