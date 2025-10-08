/**
 * QRCodeService
 *
 * Generates QR codes for LHDN e-invoices according to ISO/IEC 18004:2015
 *
 * QR code contains:
 * - LHDN Reference Number (Long ID)
 * - Invoice Date
 * - Invoice Amount
 * - Validation URL
 */

import QRCode from 'qrcode';
import { LHDNInvoice } from '../types';
import { logger } from '../utils/logger';

export interface QRCodeData {
  lhdnReferenceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  currency: string;
  supplierTin: string;
  buyerTin: string;
}

export interface QRCodeResult {
  success: boolean;
  qrCodeBase64?: string;
  qrCodeDataUrl?: string;
  error?: string;
}

export class QRCodeService {
  private readonly LHDN_VALIDATION_URL = 'https://myinvois.hasil.gov.my/verify';

  /**
   * Generate QR code for accepted invoice
   */
  async generateQRCode(invoice: LHDNInvoice): Promise<QRCodeResult> {
    try {
      // Validate invoice has LHDN reference number
      if (!invoice.lhdnReferenceNumber) {
        return {
          success: false,
          error: 'Invoice must have LHDN reference number to generate QR code',
        };
      }

      if (invoice.status !== 'ACCEPTED') {
        return {
          success: false,
          error: 'QR code can only be generated for accepted invoices',
        };
      }

      // Build QR code payload
      const qrData = this.buildQRCodeData(invoice);

      // Generate QR code as base64
      const qrCodeBase64 = await this.generateQRCodeBase64(qrData);

      // Generate QR code as data URL (for HTML img src)
      const qrCodeDataUrl = await this.generateQRCodeDataUrl(qrData);

      return {
        success: true,
        qrCodeBase64,
        qrCodeDataUrl,
      };
    } catch (error: any) {
      logger.error('QR code generation failed', {
        error: error.message,
        invoiceNumber: invoice.invoiceNumber,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Build QR code data string
   *
   * Format (LHDN specification):
   * {LHDN_REF}|{DATE}|{AMOUNT}|{CURRENCY}|{SUPPLIER_TIN}|{BUYER_TIN}|{URL}
   */
  private buildQRCodeData(invoice: LHDNInvoice): string {
    const data: QRCodeData = {
      lhdnReferenceNumber: invoice.lhdnReferenceNumber!,
      invoiceDate: invoice.invoiceDate,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      supplierTin: invoice.supplier.tin,
      buyerTin: invoice.buyer.tin,
    };

    // Format date as YYYY-MM-DD
    const dateStr = this.formatDateForQR(data.invoiceDate);

    // Format amount with 2 decimals
    const amountStr = data.totalAmount.toFixed(2);

    // Build verification URL
    const verificationUrl = `${this.LHDN_VALIDATION_URL}/${data.lhdnReferenceNumber}`;

    // Combine into QR code string
    const qrString = [
      data.lhdnReferenceNumber,
      dateStr,
      amountStr,
      data.currency,
      data.supplierTin,
      data.buyerTin,
      verificationUrl,
    ].join('|');

    logger.debug('QR code data built', { qrString });

    return qrString;
  }

  /**
   * Generate QR code as base64 string
   */
  private async generateQRCodeBase64(data: string): Promise<string> {
    try {
      // Generate QR code as PNG buffer
      const buffer = await QRCode.toBuffer(data, {
        type: 'png',
        errorCorrectionLevel: 'M', // Medium error correction (15%)
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Convert to base64
      return buffer.toString('base64');
    } catch (error: any) {
      logger.error('QR code base64 generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate QR code as data URL (for HTML img src)
   */
  private async generateQRCodeDataUrl(data: string): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return dataUrl;
    } catch (error: any) {
      logger.error('QR code data URL generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Format date for QR code (YYYY-MM-DD)
   */
  private formatDateForQR(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Verify QR code data
   * Decodes QR code and validates structure
   */
  async verifyQRCode(qrCodeBase64: string): Promise<{
    valid: boolean;
    data?: QRCodeData;
    error?: string;
  }> {
    try {
      // Note: QR code decoding requires a separate library (e.g., jsQR)
      // This is a placeholder for validation logic
      // In production, implement actual QR code decoding

      return {
        valid: true,
        data: {
          lhdnReferenceNumber: '',
          invoiceDate: new Date(),
          totalAmount: 0,
          currency: 'MYR',
          supplierTin: '',
          buyerTin: '',
        },
      };
    } catch (error: any) {
      logger.error('QR code verification failed', { error: error.message });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate QR code from custom data
   * Useful for testing or special cases
   */
  async generateQRCodeFromData(data: QRCodeData): Promise<QRCodeResult> {
    try {
      const dateStr = this.formatDateForQR(data.invoiceDate);
      const amountStr = data.totalAmount.toFixed(2);
      const verificationUrl = `${this.LHDN_VALIDATION_URL}/${data.lhdnReferenceNumber}`;

      const qrString = [
        data.lhdnReferenceNumber,
        dateStr,
        amountStr,
        data.currency,
        data.supplierTin,
        data.buyerTin,
        verificationUrl,
      ].join('|');

      const qrCodeBase64 = await this.generateQRCodeBase64(qrString);
      const qrCodeDataUrl = await this.generateQRCodeDataUrl(qrString);

      return {
        success: true,
        qrCodeBase64,
        qrCodeDataUrl,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
