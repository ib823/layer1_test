'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Timeline } from '@/components/ui/Timeline';
import { Tabs } from '@/components/ui/Tabs';
import { PageHead } from '@/components/seo/PageHead';
import { useState } from 'react';
import Link from 'next/link';

interface InvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  documentType: string;
  sapBillingDocument: string;
  companyCode: string;
  currency: string;
  totalAmount: number;
  taxAmount: number;

  supplier: {
    name: string;
    tin: string;
    address: string;
  };

  buyer: {
    name: string;
    tin: string;
    address: string;
  };

  lineItems: Array<{
    lineNumber: number;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    total: number;
  }>;

  lhdnReferenceNumber?: string;
  submissionUid?: string;
  qrCodeData?: string;
  submittedAt?: string;
  acceptedAt?: string;

  validationResult?: {
    isValid: boolean;
    errors: Array<{ field: string; message: string }>;
    warnings: Array<{ field: string; message: string }>;
  };

  events: Array<{
    id: string;
    eventType: string;
    occurredAt: string;
    actor: string;
    eventData: any;
  }>;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [selectedTab, setSelectedTab] = useState('details');

  const { data: invoice, isLoading } = useQuery<InvoiceDetail>({
    queryKey: ['lhdn-invoice', id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/modules/lhdn/invoices/${id}`);
      if (!res.ok) throw new Error('Failed to fetch invoice');
      return res.json();
    },
  });

  if (isLoading || !invoice) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <p className="text-center text-text-secondary">Loading invoice...</p>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title={`Invoice ${invoice?.invoiceNumber || id}`}
        description={`Detailed view of LHDN e-Invoice with validation status, line items, and submission history`}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Breadcrumbs
          items={[
            { label: 'LHDN e-Invoice', href: '/lhdn' },
            { label: 'Invoices', href: '/lhdn/invoices' },
            { label: invoice.invoiceNumber },
          ]}
        />

      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            {invoice.invoiceNumber}
          </h1>
          <p className="text-text-secondary">
            SAP Document: {invoice.sapBillingDocument} • Type: {invoice.documentType}
          </p>
        </div>
        <Badge
          variant={
            invoice.status === 'ACCEPTED'
              ? 'low'
              : invoice.status === 'REJECTED'
              ? 'high'
              : 'medium'
          }
        >
          {invoice.status}
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Total Amount</span>
            <p className="text-2xl font-semibold text-text-primary">
              {invoice.currency} {invoice.totalAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Tax Amount</span>
            <p className="text-2xl font-semibold text-text-primary">
              {invoice.currency} {invoice.taxAmount.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
            </p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">Invoice Date</span>
            <p className="text-lg font-semibold text-text-primary">
              {new Date(invoice.invoiceDate).toLocaleDateString()}
            </p>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body>
            <span className="text-sm text-text-secondary">LHDN Reference</span>
            <p className="text-sm font-medium text-text-primary">
              {invoice.lhdnReferenceNumber || 'Not submitted'}
            </p>
          </Card.Body>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <Tabs.List>
          <Tabs.Trigger value="details">Details</Tabs.Trigger>
          <Tabs.Trigger value="lineitems">Line Items</Tabs.Trigger>
          <Tabs.Trigger value="validation">Validation</Tabs.Trigger>
          <Tabs.Trigger value="history">History</Tabs.Trigger>
          {invoice.qrCodeData && <Tabs.Trigger value="qrcode">QR Code</Tabs.Trigger>}
        </Tabs.List>

        {/* Details Tab */}
        <Tabs.Content value="details">
          <Card>
            <Card.Body>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Supplier</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-text-secondary">Name</dt>
                      <dd className="text-text-primary font-medium">{invoice.supplier.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-secondary">TIN</dt>
                      <dd className="text-text-primary">{invoice.supplier.tin}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-secondary">Address</dt>
                      <dd className="text-text-primary">{invoice.supplier.address}</dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Buyer</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-text-secondary">Name</dt>
                      <dd className="text-text-primary font-medium">{invoice.buyer.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-secondary">TIN</dt>
                      <dd className="text-text-primary">{invoice.buyer.tin}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-text-secondary">Address</dt>
                      <dd className="text-text-primary">{invoice.buyer.address}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* Line Items Tab */}
        <Tabs.Content value="lineitems">
          <Card>
            <Card.Body>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="text-left py-2 px-4 text-sm font-medium text-text-secondary">#</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-text-secondary">Description</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">Qty</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">Unit Price</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">Tax Rate</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-text-secondary">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.lineNumber} className="border-b border-border-default">
                      <td className="py-3 px-4 text-sm">{item.lineNumber}</td>
                      <td className="py-3 px-4 text-sm">{item.description}</td>
                      <td className="py-3 px-4 text-sm text-right">{item.quantity}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        {item.unitPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">{item.taxRate}%</td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        {invoice.currency} {item.total.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* Validation Tab */}
        <Tabs.Content value="validation">
          <Card>
            <Card.Body>
              {invoice.validationResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={invoice.validationResult.isValid ? 'low' : 'high'}>
                      {invoice.validationResult.isValid ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>

                  {invoice.validationResult.errors.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-status-high mb-2">Errors</h3>
                      <ul className="space-y-2">
                        {invoice.validationResult.errors.map((err, i) => (
                          <li key={i} className="text-sm p-2 bg-red-50 rounded">
                            <span className="font-medium">{err.field}:</span> {err.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {invoice.validationResult.warnings.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-status-medium mb-2">Warnings</h3>
                      <ul className="space-y-2">
                        {invoice.validationResult.warnings.map((warn, i) => (
                          <li key={i} className="text-sm p-2 bg-yellow-50 rounded">
                            <span className="font-medium">{warn.field}:</span> {warn.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-text-secondary">No validation results available</p>
              )}
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* History Tab */}
        <Tabs.Content value="history">
          <Card>
            <Card.Body>
              <Timeline
                events={invoice.events.map((event) => ({
                  timestamp: new Date(event.occurredAt),
                  title: event.eventType.replace(/_/g, ' '),
                  description: `By ${event.actor}`,
                  status: event.eventType.includes('FAILED') || event.eventType.includes('REJECTED') ? 'error' : 'success',
                }))}
              />
            </Card.Body>
          </Card>
        </Tabs.Content>

        {/* QR Code Tab */}
        {invoice.qrCodeData && (
          <Tabs.Content value="qrcode">
            <Card>
              <Card.Body>
                <div className="flex flex-col items-center gap-4">
                  <img
                    src={`data:image/png;base64,${invoice.qrCodeData}`}
                    alt="QR Code"
                    className="w-64 h-64"
                  />
                  <p className="text-sm text-text-secondary">
                    Scan this QR code to verify the invoice on LHDN MyInvois
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Tabs.Content>
        )}
      </Tabs>
      </div>
    </>
  );
}
