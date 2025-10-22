/**
 * Dynamics 365 Finance & Operations specific types
 */

export interface DynamicsUser {
  systemuserid: string;
  fullname: string;
  domainname: string;
  internalemailaddress: string;
  firstname?: string;
  lastname?: string;
  isdisabled: boolean;
  businessunitid?: {
    businessunitid: string;
    name: string;
  };
  positionid?: {
    positionid: string;
    name: string;
  };
}

export interface DynamicsRole {
  roleid: string;
  name: string;
  businessunitid: string;
  description?: string;
  ismanaged: boolean;
  iscustomizable: boolean;
}

export interface DynamicsGLEntry {
  generalledgerentryid: string;
  journalnumber: string;
  accountingdate: string;
  postingdate: string;
  accountnumber: string;
  accountname?: string;
  debitamount?: number;
  creditamount?: number;
  transactioncurrencyid: string;
  description?: string;
  dataareaid: string; // Legal entity
  createdby?: string;
  createdon?: string;
}

export interface DynamicsInvoice {
  vendorinvoiceid: string;
  invoicenumber: string;
  invoicedate: string;
  _vendoraccount_value: string;
  'vendoraccount@OData.Community.Display.V1.FormattedValue'?: string;
  totalamount: number;
  totaltax?: number;
  transactioncurrencyid: string;
  invoicestatus: string;
  dataareaid: string;
}

export interface DynamicsPurchaseOrder {
  purchaseorderid: string;
  purchaseordernumber: string;
  orderdate: string;
  _vendoraccount_value: string;
  'vendoraccount@OData.Community.Display.V1.FormattedValue'?: string;
  totalamount: number;
  transactioncurrencyid: string;
  purchaseorderstatus: string;
  dataareaid: string;
  requestedby?: string;
}

export interface DynamicsVendor {
  vendorid: string;
  vendoraccountnumber: string;
  vendorname: string;
  address1_line1?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  emailaddress1?: string;
  telephone1?: string;
  statecode: number; // 0 = Active, 1 = Inactive
  dataareaid: string;
}

export interface DynamicsODataResponse<T> {
  '@odata.context': string;
  value: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
}
