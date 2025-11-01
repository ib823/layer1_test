/**
 * ERP Data Normalizer - Converts ERP-specific data to universal format
 *
 * This normalizer handles data transformation from SAP, Oracle, Dynamics, and NetSuite
 * into standardized ERPUser, ERPRole, ERPGLEntry, etc. formats.
 *
 * @module normalizers
 */

import {
  ERPSystem,
  ERPUser,
  ERPRole,
  ERPPermission,
  ERPGLEntry,
  ERPInvoice,
  ERPInvoiceLineItem,
  ERPPurchaseOrder,
  ERPPOLineItem,
  ERPVendor
} from '../connectors/base/BaseERPConnector';

/**
 * Main Data Normalizer Class
 */
export class ERPDataNormalizer {
  // ============================================
  // USER NORMALIZATION
  // ============================================

  /**
   * Normalize user data from any ERP system
   */
  normalizeUser(rawData: any, erpSystem: ERPSystem): ERPUser {
    switch (erpSystem) {
      case 'SAP':
        return this.normalizeSAPUser(rawData);
      case 'Oracle':
        return this.normalizeOracleUser(rawData);
      case 'Dynamics':
        return this.normalizeDynamicsUser(rawData);
      case 'NetSuite':
        return this.normalizeNetSuiteUser(rawData);
      default:
        throw new Error(`Unsupported ERP system: ${erpSystem}`);
    }
  }

  /**
   * SAP User Normalization
   * Source: SAP OData API_USER_SRV
   */
  private normalizeSAPUser(sapUser: any): ERPUser {
    return {
      id: sapUser.UserID,
      username: sapUser.UserName,
      email: sapUser.Email || sapUser.EmailAddress,
      firstName: sapUser.FirstName,
      lastName: sapUser.LastName,
      fullName: `${sapUser.FirstName || ''} ${sapUser.LastName || ''}`.trim() || sapUser.UserName,
      isActive: !sapUser.IsLocked && sapUser.ValidTo > new Date(),
      isLocked: sapUser.IsLocked || false,
      createdDate: sapUser.CreatedOn ? new Date(sapUser.CreatedOn) : undefined,
      lastModified: sapUser.LastChangedOn ? new Date(sapUser.LastChangedOn) : undefined,
      roles: [], // Populated separately via getUserRoles()
      erpSystem: 'SAP',
      erpSpecificData: {
        client: sapUser.Client,
        validFrom: sapUser.ValidFrom,
        validTo: sapUser.ValidTo,
        userType: sapUser.UserType,
        personNumber: sapUser.PersonnelNumber,
        department: sapUser.Department,
        company: sapUser.Company,
        logonLanguage: sapUser.LogonLanguage,
        timeZone: sapUser.TimeZone,
        userGroup: sapUser.UserGroup
      }
    };
  }

  /**
   * Oracle User Normalization
   * Source: Oracle Fusion REST API /hcmRestApi/resources/11.13.18.05/users
   */
  private normalizeOracleUser(oracleUser: any): ERPUser {
    return {
      id: oracleUser.UserId?.toString() || oracleUser.PersonId?.toString(),
      username: oracleUser.Username,
      email: oracleUser.EmailAddress || oracleUser.WorkEmail,
      firstName: oracleUser.FirstName,
      lastName: oracleUser.LastName,
      fullName: oracleUser.DisplayName || `${oracleUser.FirstName} ${oracleUser.LastName}`,
      isActive: oracleUser.ActiveFlag === 'Y' || oracleUser.Active === 'Y',
      isLocked: oracleUser.SuspendedFlag === 'Y',
      createdDate: oracleUser.CreationDate ? new Date(oracleUser.CreationDate) : undefined,
      lastModified: oracleUser.LastUpdateDate ? new Date(oracleUser.LastUpdateDate) : undefined,
      roles: [],
      erpSystem: 'Oracle',
      erpSpecificData: {
        personId: oracleUser.PersonId,
        businessUnitId: oracleUser.BusinessUnitId,
        businessUnitName: oracleUser.BusinessUnitName,
        legalEntityId: oracleUser.LegalEntityId,
        responsibilityKeys: oracleUser.ResponsibilityKeys || [],
        employeeNumber: oracleUser.EmployeeNumber,
        department: oracleUser.DepartmentName,
        jobTitle: oracleUser.JobTitle,
        managerPersonId: oracleUser.ManagerPersonId
      }
    };
  }

  /**
   * Dynamics 365 User Normalization
   * Source: Dynamics Web API /api/data/v9.2/systemusers
   */
  private normalizeDynamicsUser(dynamicsUser: any): ERPUser {
    return {
      id: dynamicsUser.systemuserid,
      username: dynamicsUser.domainname,
      email: dynamicsUser.internalemailaddress,
      firstName: dynamicsUser.firstname,
      lastName: dynamicsUser.lastname,
      fullName: dynamicsUser.fullname,
      isActive: !dynamicsUser.isdisabled,
      isLocked: dynamicsUser.isdisabled,
      createdDate: dynamicsUser.createdon ? new Date(dynamicsUser.createdon) : undefined,
      lastModified: dynamicsUser.modifiedon ? new Date(dynamicsUser.modifiedon) : undefined,
      roles: [],
      erpSystem: 'Dynamics',
      erpSpecificData: {
        businessUnitId: dynamicsUser._businessunitid_value,
        businessUnitName: dynamicsUser['_businessunitid_value@OData.Community.Display.V1.FormattedValue'],
        accessMode: dynamicsUser.accessmode,
        calType: dynamicsUser.caltype,
        territoryId: dynamicsUser._territoryid_value,
        positionId: dynamicsUser._positionid_value,
        azureActiveDirectoryObjectId: dynamicsUser.azureactivedirectoryobjectid,
        windowsLiveID: dynamicsUser.windowsliveid
      }
    };
  }

  /**
   * NetSuite User Normalization
   * Source: NetSuite SuiteScript 2.0 N/record employee/user
   */
  private normalizeNetSuiteUser(netsuiteUser: any): ERPUser {
    return {
      id: netsuiteUser.id?.toString(),
      username: netsuiteUser.email,
      email: netsuiteUser.email,
      firstName: netsuiteUser.firstName,
      lastName: netsuiteUser.lastName,
      fullName: netsuiteUser.entityId || `${netsuiteUser.firstName} ${netsuiteUser.lastName}`,
      isActive: !netsuiteUser.isInactive,
      isLocked: netsuiteUser.isLocked || false,
      createdDate: netsuiteUser.dateCreated ? new Date(netsuiteUser.dateCreated) : undefined,
      lastModified: netsuiteUser.lastModifiedDate ? new Date(netsuiteUser.lastModifiedDate) : undefined,
      roles: [],
      erpSystem: 'NetSuite',
      erpSpecificData: {
        subsidiaryId: netsuiteUser.subsidiary?.id,
        subsidiaryName: netsuiteUser.subsidiary?.name,
        departmentId: netsuiteUser.department?.id,
        departmentName: netsuiteUser.department?.name,
        locationId: netsuiteUser.location?.id,
        classId: netsuiteUser.class?.id,
        supervisorId: netsuiteUser.supervisor?.id,
        employeeType: netsuiteUser.employeeType,
        hireDate: netsuiteUser.hireDate
      }
    };
  }

  // ============================================
  // ROLE NORMALIZATION
  // ============================================

  /**
   * Normalize role data
   */
  normalizeRole(rawData: any, erpSystem: ERPSystem): ERPRole {
    switch (erpSystem) {
      case 'SAP':
        return this.normalizeSAPRole(rawData);
      case 'Oracle':
        return this.normalizeOracleRole(rawData);
      case 'Dynamics':
        return this.normalizeDynamicsRole(rawData);
      case 'NetSuite':
        return this.normalizeNetSuiteRole(rawData);
      default:
        throw new Error(`Unsupported ERP system: ${erpSystem}`);
    }
  }

  private normalizeSAPRole(sapRole: any): ERPRole {
    return {
      id: sapRole.RoleID,
      code: sapRole.RoleCode || sapRole.RoleID,
      name: sapRole.RoleName || sapRole.RoleDescription,
      description: sapRole.RoleDescription,
      type: sapRole.RoleCategory === 'SAP' ? 'SYSTEM' : 'CUSTOM',
      isActive: true,
      permissions: [],
      riskLevel: this.calculateRiskLevel(sapRole.RiskLevel || 'MEDIUM'),
      erpSystem: 'SAP',
      erpSpecificData: {
        roleType: sapRole.RoleType,
        roleCategory: sapRole.RoleCategory,
        parentRole: sapRole.ParentRole,
        tCodes: sapRole.Transactions || []
      }
    };
  }

  private normalizeOracleRole(oracleRole: any): ERPRole {
    return {
      id: oracleRole.RoleId?.toString(),
      code: oracleRole.RoleCode,
      name: oracleRole.RoleName,
      description: oracleRole.Description,
      type: oracleRole.RoleCommon === 'Y' ? 'SYSTEM' : 'CUSTOM',
      isActive: oracleRole.ActiveFlag === 'Y',
      permissions: [],
      riskLevel: 'MEDIUM', // Oracle doesn't provide risk levels by default
      erpSystem: 'Oracle',
      erpSpecificData: {
        responsibilityId: oracleRole.ResponsibilityId,
        applicationId: oracleRole.ApplicationId,
        menuId: oracleRole.MenuId,
        startDate: oracleRole.StartDate,
        endDate: oracleRole.EndDate
      }
    };
  }

  private normalizeDynamicsRole(dynamicsRole: any): ERPRole {
    return {
      id: dynamicsRole.roleid,
      code: dynamicsRole.name,
      name: dynamicsRole.name,
      description: dynamicsRole.roletemplateid_name,
      type: dynamicsRole.ismanaged ? 'SYSTEM' : 'CUSTOM',
      isActive: true,
      permissions: [],
      riskLevel: 'MEDIUM',
      erpSystem: 'Dynamics',
      erpSpecificData: {
        businessUnitId: dynamicsRole._businessunitid_value,
        parentRoleId: dynamicsRole._parentroleid_value,
        roleTemplateId: dynamicsRole._roletemplateid_value,
        isManaged: dynamicsRole.ismanaged,
        isCustomizable: dynamicsRole.iscustomizable?.Value
      }
    };
  }

  private normalizeNetSuiteRole(netsuiteRole: any): ERPRole {
    return {
      id: netsuiteRole.id?.toString(),
      code: netsuiteRole.scriptId || netsuiteRole.id?.toString(),
      name: netsuiteRole.name,
      description: netsuiteRole.description,
      type: netsuiteRole.isInactive ? 'CUSTOM' : 'SYSTEM',
      isActive: !netsuiteRole.isInactive,
      permissions: [],
      riskLevel: 'MEDIUM',
      erpSystem: 'NetSuite',
      erpSpecificData: {
        centerType: netsuiteRole.centerType,
        subsidiaryRestriction: netsuiteRole.subsidiaryRestriction,
        restrictToSubsidiaries: netsuiteRole.restrictToSubsidiaries,
        permissions: netsuiteRole.permissions || []
      }
    };
  }

  // ============================================
  // GL ENTRY NORMALIZATION
  // ============================================

  normalizeGLEntry(rawData: any, erpSystem: ERPSystem): ERPGLEntry {
    switch (erpSystem) {
      case 'SAP':
        return this.normalizeSAPGLEntry(rawData);
      case 'Oracle':
        return this.normalizeOracleGLEntry(rawData);
      case 'Dynamics':
        return this.normalizeDynamicsGLEntry(rawData);
      case 'NetSuite':
        return this.normalizeNetSuiteGLEntry(rawData);
      default:
        throw new Error(`Unsupported ERP system: ${erpSystem}`);
    }
  }

  private normalizeSAPGLEntry(sapEntry: any): ERPGLEntry {
    return {
      entryId: `${sapEntry.CompanyCode}-${sapEntry.FiscalYear}-${sapEntry.AccountingDocument}-${sapEntry.LineItem}`,
      documentNumber: sapEntry.AccountingDocument,
      documentType: sapEntry.AccountingDocumentType,
      postingDate: new Date(sapEntry.PostingDate),
      documentDate: sapEntry.DocumentDate ? new Date(sapEntry.DocumentDate) : undefined,
      amount: parseFloat(sapEntry.AmountInTransactionCurrency),
      currency: sapEntry.TransactionCurrency,
      accountCode: sapEntry.GLAccount,
      accountName: sapEntry.GLAccountName,
      costCenter: sapEntry.CostCenter,
      companyCode: sapEntry.CompanyCode,
      description: sapEntry.DocumentItemText,
      reference: sapEntry.Reference,
      userId: sapEntry.AccountingDocumentCreatedByUser,
      userName: sapEntry.CreatedByUserName,
      timestamp: new Date(sapEntry.AccountingDocumentCreationDate),
      status: sapEntry.IsReversed ? 'REVERSED' : 'POSTED',
      erpSystem: 'SAP',
      erpSpecificData: {
        fiscalYear: sapEntry.FiscalYear,
        fiscalPeriod: sapEntry.AccountingDocumentFiscalPeriod,
        debitCreditCode: sapEntry.DebitCreditCode,
        taxCode: sapEntry.TaxCode,
        profitCenter: sapEntry.ProfitCenter,
        segment: sapEntry.Segment,
        functionalArea: sapEntry.FunctionalArea
      }
    };
  }

  private normalizeOracleGLEntry(oracleEntry: any): ERPGLEntry {
    return {
      entryId: `${oracleEntry.JeHeaderId}-${oracleEntry.JeLineNum}`,
      documentNumber: oracleEntry.JeBatchName,
      documentType: oracleEntry.JeSource,
      postingDate: new Date(oracleEntry.EffectiveDate),
      documentDate: new Date(oracleEntry.CreationDate),
      amount: parseFloat(oracleEntry.EnteredDr || 0) - parseFloat(oracleEntry.EnteredCr || 0),
      currency: oracleEntry.CurrencyCode,
      accountCode: oracleEntry.AccountCombination,
      accountName: oracleEntry.AccountDescription,
      costCenter: oracleEntry.CostCenter,
      companyCode: oracleEntry.LedgerName,
      description: oracleEntry.Description,
      reference: oracleEntry.Reference,
      userId: oracleEntry.CreatedBy,
      userName: oracleEntry.CreatedByName,
      timestamp: new Date(oracleEntry.CreationDate),
      status: oracleEntry.Status,
      erpSystem: 'Oracle',
      erpSpecificData: {
        jeHeaderId: oracleEntry.JeHeaderId,
        jeLineNum: oracleEntry.JeLineNum,
        jeCategoryName: oracleEntry.JeCategoryName,
        jeSourceName: oracleEntry.JeSourceName,
        periodName: oracleEntry.PeriodName,
        chartOfAccountsId: oracleEntry.ChartOfAccountsId,
        accountedDr: oracleEntry.AccountedDr,
        accountedCr: oracleEntry.AccountedCr
      }
    };
  }

  private normalizeDynamicsGLEntry(dynamicsEntry: any): ERPGLEntry {
    return {
      entryId: dynamicsEntry.generaljournalentry,
      documentNumber: dynamicsEntry.journalentryid,
      documentType: dynamicsEntry.accountingdistributiontype,
      postingDate: new Date(dynamicsEntry.postingdate),
      documentDate: new Date(dynamicsEntry.documentdate),
      amount: parseFloat(dynamicsEntry.transactioncurrencyamount),
      currency: dynamicsEntry.transactioncurrencyid_value,
      accountCode: dynamicsEntry._mainaccountid_value,
      accountName: dynamicsEntry['_mainaccountid_value@OData.Community.Display.V1.FormattedValue'],
      costCenter: dynamicsEntry._costcenterid_value,
      companyCode: dynamicsEntry._legalentityid_value,
      description: dynamicsEntry.description,
      reference: dynamicsEntry.documentnumber,
      userId: dynamicsEntry._createdby_value,
      userName: dynamicsEntry['_createdby_value@OData.Community.Display.V1.FormattedValue'],
      timestamp: new Date(dynamicsEntry.createdon),
      status: dynamicsEntry.postingstatus,
      erpSystem: 'Dynamics',
      erpSpecificData: {
        voucherNumber: dynamicsEntry.voucher,
        fiscalPeriod: dynamicsEntry.fiscalperiod,
        fiscalYear: dynamicsEntry.fiscalyear,
        dimensionDisplayValue: dynamicsEntry.dimensiondisplayvalue,
        ledgerDimension: dynamicsEntry.ledgerdimension
      }
    };
  }

  private normalizeNetSuiteGLEntry(netsuiteEntry: any): ERPGLEntry {
    return {
      entryId: netsuiteEntry.id?.toString(),
      documentNumber: netsuiteEntry.transactionNumber,
      documentType: netsuiteEntry.type,
      postingDate: new Date(netsuiteEntry.tranDate),
      documentDate: new Date(netsuiteEntry.tranDate),
      amount: parseFloat(netsuiteEntry.amount),
      currency: netsuiteEntry.currency?.name || 'USD',
      accountCode: netsuiteEntry.account?.id?.toString(),
      accountName: netsuiteEntry.account?.name,
      costCenter: netsuiteEntry.department?.id?.toString(),
      companyCode: netsuiteEntry.subsidiary?.id?.toString(),
      description: netsuiteEntry.memo,
      reference: netsuiteEntry.transactionNumber,
      userId: netsuiteEntry.createdBy?.id?.toString(),
      userName: netsuiteEntry.createdBy?.name,
      timestamp: new Date(netsuiteEntry.createdDate),
      status: netsuiteEntry.status,
      erpSystem: 'NetSuite',
      erpSpecificData: {
        lineId: netsuiteEntry.lineId,
        locationId: netsuiteEntry.location?.id,
        classId: netsuiteEntry.class?.id,
        departmentId: netsuiteEntry.department?.id,
        subsidiaryId: netsuiteEntry.subsidiary?.id
      }
    };
  }

  // ============================================
  // INVOICE NORMALIZATION
  // ============================================

  normalizeInvoice(rawData: any, erpSystem: ERPSystem): ERPInvoice {
    switch (erpSystem) {
      case 'SAP':
        return this.normalizeSAPInvoice(rawData);
      case 'Oracle':
        return this.normalizeOracleInvoice(rawData);
      case 'Dynamics':
        return this.normalizeDynamicsInvoice(rawData);
      case 'NetSuite':
        return this.normalizeNetSuiteInvoice(rawData);
      default:
        throw new Error(`Unsupported ERP system: ${erpSystem}`);
    }
  }

  private normalizeSAPInvoice(sapInvoice: any): ERPInvoice {
    return {
      invoiceId: sapInvoice.SupplierInvoice,
      invoiceNumber: sapInvoice.SupplierInvoice,
      invoiceDate: new Date(sapInvoice.InvoicingDate || sapInvoice.DocumentDate),
      vendorId: sapInvoice.Supplier,
      vendorName: sapInvoice.SupplierName,
      amount: parseFloat(sapInvoice.InvoiceGrossAmount || '0'),
      taxAmount: parseFloat(sapInvoice.TaxAmount || '0'),
      totalAmount: parseFloat(sapInvoice.InvoiceGrossAmount || '0'),
      currency: sapInvoice.DocumentCurrency,
      paymentTerms: sapInvoice.PaymentTerms,
      dueDate: sapInvoice.DueCalculationBaseDate ? new Date(sapInvoice.DueCalculationBaseDate) : undefined,
      status: sapInvoice.SupplierInvoiceStatus,
      purchaseOrderNumber: sapInvoice.PurchaseOrder,
      lineItems: [], // Line items would need separate query in SAP
      erpSystem: 'SAP',
      erpSpecificData: {
        fiscalYear: sapInvoice.FiscalYear,
        companyCode: sapInvoice.CompanyCode,
        documentDate: sapInvoice.DocumentDate,
        postingDate: sapInvoice.PostingDate,
      },
    };
  }

  private normalizeOracleInvoice(oracleInvoice: any): ERPInvoice {
    return {
      invoiceId: oracleInvoice.InvoiceId?.toString(),
      invoiceNumber: oracleInvoice.InvoiceNum,
      invoiceDate: new Date(oracleInvoice.InvoiceDate),
      vendorId: oracleInvoice.VendorId?.toString(),
      vendorName: oracleInvoice.VendorName,
      amount: parseFloat(oracleInvoice.InvoiceAmount || '0'),
      taxAmount: parseFloat(oracleInvoice.TaxAmount || '0'),
      totalAmount: parseFloat(oracleInvoice.TotalAmount || '0'),
      currency: oracleInvoice.InvoiceCurrencyCode,
      paymentTerms: oracleInvoice.PaymentTermsName,
      dueDate: oracleInvoice.PaymentDueDate ? new Date(oracleInvoice.PaymentDueDate) : undefined,
      status: oracleInvoice.InvoiceStatus,
      purchaseOrderNumber: oracleInvoice.PONumber,
      lineItems: [],
      erpSystem: 'Oracle',
      erpSpecificData: {
        invoiceSource: oracleInvoice.InvoiceSource,
        ledgerId: oracleInvoice.LedgerId,
      },
    };
  }

  private normalizeDynamicsInvoice(dynamicsInvoice: any): ERPInvoice {
    return {
      invoiceId: dynamicsInvoice.vendorinvoiceid,
      invoiceNumber: dynamicsInvoice.invoicenumber,
      invoiceDate: new Date(dynamicsInvoice.invoicedate),
      vendorId: dynamicsInvoice._vendoraccount_value,
      vendorName: dynamicsInvoice['_vendoraccount_value@OData.Community.Display.V1.FormattedValue'],
      amount: parseFloat(dynamicsInvoice.totalamount || '0'),
      taxAmount: parseFloat(dynamicsInvoice.totaltax || '0'),
      totalAmount: parseFloat(dynamicsInvoice.totalamount || '0'),
      currency: dynamicsInvoice.transactioncurrencyid,
      status: dynamicsInvoice.invoicestatus,
      lineItems: [],
      erpSystem: 'Dynamics',
      erpSpecificData: {
        dataAreaId: dynamicsInvoice.dataareaid,
      },
    };
  }

  private normalizeNetSuiteInvoice(netsuiteInvoice: any): ERPInvoice {
    return {
      invoiceId: netsuiteInvoice.id,
      invoiceNumber: netsuiteInvoice.tranId,
      invoiceDate: new Date(netsuiteInvoice.tranDate),
      vendorId: netsuiteInvoice.entity?.id,
      vendorName: netsuiteInvoice.entity?.name,
      amount: parseFloat(netsuiteInvoice.total || '0'),
      taxAmount: parseFloat(netsuiteInvoice.taxtotal || '0'),
      totalAmount: parseFloat(netsuiteInvoice.total || '0'),
      currency: netsuiteInvoice.currency?.code,
      status: netsuiteInvoice.status,
      lineItems: [],
      erpSystem: 'NetSuite',
      erpSpecificData: {
        subsidiaryId: netsuiteInvoice.subsidiary?.id,
      },
    };
  }

  // ============================================
  // PURCHASE ORDER NORMALIZATION
  // ============================================

  normalizePurchaseOrder(rawData: any, erpSystem: ERPSystem): ERPPurchaseOrder {
    switch (erpSystem) {
      case 'SAP':
        return this.normalizeSAPPurchaseOrder(rawData);
      case 'Oracle':
        return this.normalizeOraclePurchaseOrder(rawData);
      case 'Dynamics':
        return this.normalizeDynamicsPurchaseOrder(rawData);
      case 'NetSuite':
        return this.normalizeNetSuitePurchaseOrder(rawData);
      default:
        throw new Error(`Unsupported ERP system: ${erpSystem}`);
    }
  }

  private normalizeSAPPurchaseOrder(sapPO: any): ERPPurchaseOrder {
    return {
      poId: sapPO.PurchaseOrder,
      poNumber: sapPO.PurchaseOrder,
      poDate: new Date(sapPO.PurchaseOrderDate || sapPO.CreationDate),
      vendorId: sapPO.Supplier,
      vendorName: sapPO.SupplierName,
      totalAmount: parseFloat(sapPO.TotalNetAmount || '0'),
      currency: sapPO.DocumentCurrency,
      deliveryDate: sapPO.ScheduleLineDeliveryDate ? new Date(sapPO.ScheduleLineDeliveryDate) : undefined,
      status: sapPO.PurchasingDocumentStatus,
      requester: sapPO.CreatedByUser,
      approver: sapPO.ReleaseCode,
      lineItems: [],
      erpSystem: 'SAP',
      erpSpecificData: {
        companyCode: sapPO.CompanyCode,
        purchasingOrganization: sapPO.PurchasingOrganization,
        purchasingGroup: sapPO.PurchasingGroup,
      },
    };
  }

  private normalizeOraclePurchaseOrder(oraclePO: any): ERPPurchaseOrder {
    return {
      poId: oraclePO.POHeaderId?.toString(),
      poNumber: oraclePO.PONumber,
      poDate: new Date(oraclePO.CreationDate),
      vendorId: oraclePO.VendorId?.toString(),
      vendorName: oraclePO.VendorName,
      totalAmount: parseFloat(oraclePO.TotalAmount || '0'),
      currency: oraclePO.CurrencyCode,
      status: oraclePO.POStatus,
      lineItems: [],
      erpSystem: 'Oracle',
      erpSpecificData: {
        buyerName: oraclePO.BuyerName,
        ledgerId: oraclePO.LedgerId,
      },
    };
  }

  private normalizeDynamicsPurchaseOrder(dynamicsPO: any): ERPPurchaseOrder {
    return {
      poId: dynamicsPO.purchaseorderid,
      poNumber: dynamicsPO.purchaseordernumber,
      poDate: new Date(dynamicsPO.orderdate),
      vendorId: dynamicsPO._vendoraccount_value,
      vendorName: dynamicsPO['_vendoraccount_value@OData.Community.Display.V1.FormattedValue'],
      totalAmount: parseFloat(dynamicsPO.totalamount || '0'),
      currency: dynamicsPO.transactioncurrencyid,
      status: dynamicsPO.purchaseorderstatus,
      lineItems: [],
      erpSystem: 'Dynamics',
      erpSpecificData: {
        dataAreaId: dynamicsPO.dataareaid,
      },
    };
  }

  private normalizeNetSuitePurchaseOrder(netsuitePO: any): ERPPurchaseOrder {
    return {
      poId: netsuitePO.id,
      poNumber: netsuitePO.tranId,
      poDate: new Date(netsuitePO.tranDate),
      vendorId: netsuitePO.entity?.id,
      vendorName: netsuitePO.entity?.name,
      totalAmount: parseFloat(netsuitePO.total || '0'),
      currency: netsuitePO.currency?.code,
      status: netsuitePO.status,
      lineItems: [],
      erpSystem: 'NetSuite',
      erpSpecificData: {
        subsidiaryId: netsuitePO.subsidiary?.id,
      },
    };
  }

  // ============================================
  // VENDOR NORMALIZATION
  // ============================================

  normalizeVendor(rawData: any, erpSystem: ERPSystem): ERPVendor {
    switch (erpSystem) {
      case 'SAP':
        return this.normalizeSAPVendor(rawData);
      case 'Oracle':
        return this.normalizeOracleVendor(rawData);
      case 'Dynamics':
        return this.normalizeDynamicsVendor(rawData);
      case 'NetSuite':
        return this.normalizeNetSuiteVendor(rawData);
      default:
        throw new Error(`Unsupported ERP system: ${erpSystem}`);
    }
  }

  private normalizeSAPVendor(sapVendor: any): ERPVendor {
    return {
      vendorId: sapVendor.BusinessPartner,
      vendorCode: sapVendor.BusinessPartner,
      vendorName: sapVendor.BusinessPartnerFullName || sapVendor.OrganizationBPName1,
      address: {
        street: sapVendor.StreetName,
        city: sapVendor.CityName,
        state: sapVendor.Region,
        postalCode: sapVendor.PostalCode,
        country: sapVendor.Country,
      },
      contactPerson: sapVendor.ContactPerson,
      email: sapVendor.EmailAddress,
      phone: sapVendor.PhoneNumber,
      taxId: sapVendor.TaxNumber3,
      bankAccount: {
        bankName: sapVendor.BankName,
        accountNumber: sapVendor.BankAccount,
      },
      isActive: !sapVendor.BusinessPartnerIsBlocked,
      isBlocked: sapVendor.BusinessPartnerIsBlocked,
      paymentTerms: sapVendor.PaymentTerms,
      currency: sapVendor.Currency,
      erpSystem: 'SAP',
      erpSpecificData: {
        supplierAccountGroup: sapVendor.SupplierAccountGroup,
        companyCode: sapVendor.CompanyCode,
      },
    };
  }

  private normalizeOracleVendor(oracleVendor: any): ERPVendor {
    return {
      vendorId: oracleVendor.VendorId?.toString(),
      vendorCode: oracleVendor.VendorNumber,
      vendorName: oracleVendor.VendorName,
      address: {
        street: oracleVendor.AddressLine1,
        city: oracleVendor.City,
        state: oracleVendor.State,
        postalCode: oracleVendor.PostalCode,
        country: oracleVendor.Country,
      },
      email: oracleVendor.EmailAddress,
      phone: oracleVendor.PhoneNumber,
      taxId: oracleVendor.TaxRegistrationNumber,
      isActive: oracleVendor.EnabledFlag === 'Y',
      isBlocked: oracleVendor.HoldFlag === 'Y',
      erpSystem: 'Oracle',
      erpSpecificData: {
        vendorTypeCode: oracleVendor.VendorTypeCode,
      },
    };
  }

  private normalizeDynamicsVendor(dynamicsVendor: any): ERPVendor {
    return {
      vendorId: dynamicsVendor.vendorid,
      vendorCode: dynamicsVendor.vendoraccountnumber,
      vendorName: dynamicsVendor.vendorname,
      address: {
        street: dynamicsVendor.address1_line1,
        city: dynamicsVendor.address1_city,
        state: dynamicsVendor.address1_stateorprovince,
        postalCode: dynamicsVendor.address1_postalcode,
        country: dynamicsVendor.address1_country,
      },
      email: dynamicsVendor.emailaddress1,
      phone: dynamicsVendor.telephone1,
      isActive: dynamicsVendor.statecode === 0,
      erpSystem: 'Dynamics',
      erpSpecificData: {
        dataAreaId: dynamicsVendor.dataareaid,
      },
    };
  }

  private normalizeNetSuiteVendor(netsuiteVendor: any): ERPVendor {
    return {
      vendorId: netsuiteVendor.id,
      vendorCode: netsuiteVendor.entityId,
      vendorName: netsuiteVendor.companyName || netsuiteVendor.entityId,
      email: netsuiteVendor.email,
      phone: netsuiteVendor.phone,
      isActive: !netsuiteVendor.isInactive,
      erpSystem: 'NetSuite',
      erpSpecificData: {
        subsidiaryId: netsuiteVendor.subsidiary?.id,
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateRiskLevel(level: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const normalized = level.toUpperCase();
    if (normalized.includes('CRITICAL') || normalized === '4') return 'CRITICAL';
    if (normalized.includes('HIGH') || normalized === '3') return 'HIGH';
    if (normalized.includes('MEDIUM') || normalized === '2') return 'MEDIUM';
    return 'LOW';
  }
}

// Export singleton instance
export const erpDataNormalizer = new ERPDataNormalizer();
