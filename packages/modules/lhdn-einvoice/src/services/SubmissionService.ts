/**
 * SubmissionService
 *
 * Handles submission of e-invoices to LHDN MyInvois API
 * Implements OAuth 2.0 authentication and API integration
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { LHDNInvoice, SubmissionResult, LHDNTenantConfig } from '../types';
import { logger } from '../utils/logger';

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface LHDNSubmissionResponse {
  submissionUid: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  longId?: string; // LHDN reference number
  timestamp: string;
  validationMessages?: string[];
  errors?: string[];
}

export interface CancellationRequest {
  reason: string;
  cancelledBy: string;
}

export interface StatusQueryResponse {
  submissionUid: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  longId?: string;
  timestamp: string;
  messages?: string[];
}

export class SubmissionService {
  private axiosInstance: AxiosInstance;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor(private config: LHDNTenantConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Authenticate with LHDN MyInvois OAuth 2.0
   */
  private async authenticate(): Promise<string> {
    try {
      // Check if token is still valid
      if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
        return this.accessToken;
      }

      logger.info('Authenticating with LHDN MyInvois', {
        environment: this.config.environment,
      });

      // OAuth 2.0 Client Credentials flow
      const response = await axios.post<OAuthTokenResponse>(
        `${this.config.apiBaseUrl}/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'einvoice.submit einvoice.query',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 300) * 1000);

      logger.info('Authentication successful', {
        expiresIn: response.data.expires_in,
      });

      return this.accessToken;
    } catch (error: any) {
      logger.error('Authentication failed', {
        error: error.message,
        status: error.response?.status,
      });
      throw new Error(`LHDN authentication failed: ${error.message}`);
    }
  }

  /**
   * Submit invoice to LHDN MyInvois
   */
  async submitInvoice(invoice: LHDNInvoice): Promise<SubmissionResult> {
    try {
      // Authenticate
      const token = await this.authenticate();

      // Prepare submission payload
      const payload = this.buildSubmissionPayload(invoice);

      logger.info('Submitting invoice to LHDN', {
        invoiceNumber: invoice.invoiceNumber,
        tenantId: invoice.tenantId,
      });

      // Submit to LHDN
      const response = await this.axiosInstance.post<LHDNSubmissionResponse>(
        '/api/v1.0/documents/submit',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      logger.info('Invoice submitted successfully', {
        submissionUid: response.data.submissionUid,
        status: response.data.status,
      });

      return {
        success: true,
        submissionUid: response.data.submissionUid,
        lhdnReferenceNumber: response.data.longId,
        timestamp: new Date(response.data.timestamp),
        errors: response.data.errors,
      };
    } catch (error: any) {
      return this.handleSubmissionError(error, invoice);
    }
  }

  /**
   * Query invoice status from LHDN
   */
  async queryInvoiceStatus(submissionUid: string): Promise<StatusQueryResponse> {
    try {
      const token = await this.authenticate();

      logger.info('Querying invoice status', { submissionUid });

      const response = await this.axiosInstance.get<StatusQueryResponse>(
        `/api/v1.0/documents/${submissionUid}/status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      logger.info('Status query successful', {
        submissionUid,
        status: response.data.status,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Status query failed', {
        error: error.message,
        submissionUid,
      });
      throw new Error(`Failed to query status: ${error.message}`);
    }
  }

  /**
   * Cancel submitted invoice
   */
  async cancelInvoice(
    submissionUid: string,
    request: CancellationRequest
  ): Promise<SubmissionResult> {
    try {
      const token = await this.authenticate();

      logger.info('Cancelling invoice', { submissionUid, reason: request.reason });

      const response = await this.axiosInstance.post(
        `/api/v1.0/documents/${submissionUid}/cancel`,
        request,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      logger.info('Invoice cancelled successfully', { submissionUid });

      return {
        success: true,
        submissionUid,
        timestamp: new Date(),
      };
    } catch (error: any) {
      logger.error('Cancellation failed', {
        error: error.message,
        submissionUid,
      });

      return {
        success: false,
        submissionUid,
        timestamp: new Date(),
        errors: [error.message],
      };
    }
  }

  /**
   * Build submission payload for LHDN API
   */
  private buildSubmissionPayload(invoice: LHDNInvoice): any {
    return {
      // Invoice header
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: this.formatDate(invoice.invoiceDate),
      invoiceType: invoice.documentType,
      currency: invoice.currency,

      // Supplier
      supplier: {
        tin: invoice.supplier.tin,
        name: invoice.supplier.name,
        address: {
          addressLine1: invoice.supplier.address.line1,
          addressLine2: invoice.supplier.address.line2,
          city: invoice.supplier.address.city,
          state: invoice.supplier.address.state,
          postalCode: invoice.supplier.address.postalCode,
          country: invoice.supplier.address.country,
        },
        contact: invoice.supplier.contact ? {
          email: invoice.supplier.contact.email,
          phone: invoice.supplier.contact.phone,
        } : undefined,
        registrationNumber: invoice.supplier.registrationNumber,
        sstRegistrationNumber: invoice.supplier.sstRegistrationNumber,
      },

      // Buyer
      buyer: {
        tin: invoice.buyer.tin,
        name: invoice.buyer.name,
        address: {
          addressLine1: invoice.buyer.address.line1,
          addressLine2: invoice.buyer.address.line2,
          city: invoice.buyer.address.city,
          state: invoice.buyer.address.state,
          postalCode: invoice.buyer.address.postalCode,
          country: invoice.buyer.address.country,
        },
        contact: invoice.buyer.contact ? {
          email: invoice.buyer.contact.email,
          phone: invoice.buyer.contact.phone,
        } : undefined,
        registrationNumber: invoice.buyer.registrationNumber,
      },

      // Line items
      lineItems: invoice.lineItems.map(item => ({
        lineNumber: item.lineNumber,
        description: item.description,
        classification: item.classification,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxType: item.taxType,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        discountAmount: item.discountAmount,
        subtotal: item.subtotal,
        totalAmount: item.total,
      })),

      // Totals
      subtotalAmount: invoice.subtotalAmount,
      totalTaxAmount: invoice.totalTaxAmount,
      totalDiscountAmount: invoice.totalDiscountAmount,
      totalAmount: invoice.totalAmount,

      // Payment
      paymentMode: invoice.paymentMode,
      paymentTerms: invoice.paymentTerms,

      // References
      purchaseOrderReference: invoice.purchaseOrderRef,
    };
  }

  /**
   * Handle submission errors
   */
  private handleSubmissionError(error: any, invoice: LHDNInvoice): SubmissionResult {
    const axiosError = error as AxiosError;

    let errorMessages: string[] = [];

    if (axiosError.response) {
      // API returned error response
      const status = axiosError.response.status;
      const data: any = axiosError.response.data;

      logger.error('LHDN API error', {
        status,
        data,
        invoiceNumber: invoice.invoiceNumber,
      });

      if (data.errors && Array.isArray(data.errors)) {
        errorMessages = data.errors;
      } else if (data.message) {
        errorMessages = [data.message];
      } else {
        errorMessages = [`HTTP ${status}: ${axiosError.message}`];
      }
    } else if (axiosError.request) {
      // Request made but no response
      logger.error('No response from LHDN API', {
        invoiceNumber: invoice.invoiceNumber,
      });
      errorMessages = ['No response from LHDN MyInvois server'];
    } else {
      // Error setting up request
      logger.error('Request setup error', {
        error: axiosError.message,
        invoiceNumber: invoice.invoiceNumber,
      });
      errorMessages = [axiosError.message];
    }

    return {
      success: false,
      timestamp: new Date(),
      errors: errorMessages,
    };
  }

  /**
   * Format date for LHDN API (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Test connection to LHDN API
   */
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.authenticate();
      logger.info('LHDN API connection test successful');
      return true;
    } catch (error: any) {
      logger.error('LHDN API connection test failed', { error: error.message });
      return false;
    }
  }
}
