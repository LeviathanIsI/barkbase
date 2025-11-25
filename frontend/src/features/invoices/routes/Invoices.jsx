/**
 * Invoices - Phase 8 Enterprise Table System
 * Token-based styling for consistent theming.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Mail, Download, DollarSign, Clock, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/Table';
import { useInvoicesQuery, useSendInvoiceEmailMutation } from '../api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

const Invoices = () => {
  const navigate = useNavigate();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  const { data: invoices, isLoading, error } = useInvoicesQuery();
  const sendEmailMutation = useSendInvoiceEmailMutation();

  const handleSendEmail = async (invoice) => {
    try {
      await sendEmailMutation.mutateAsync(invoice.recordId);
      toast.success(`Invoice emailed to ${invoice.owner.email}`);
    } catch (error) {
      toast.error('Failed to send invoice email');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'neutral',
      finalized: 'warning',
      paid: 'success',
      void: 'danger'
    };
    return <Badge variant={variants[status] || 'neutral'}>{status.toUpperCase()}</Badge>;
  };

  const filteredInvoices = invoices?.filter(inv => {
    if (filterStatus === 'all') return true;
    return inv.status === filterStatus;
  }) || [];

  if (isLoading) {
    return (
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <PageHeader 
          breadcrumbs={[
            { label: 'Finance', href: '/invoices' },
            { label: 'Invoices' }
          ]}
          title="Invoices" 
        />
        <Card>
          <Skeleton className="h-96" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-[var(--bb-space-6,1.5rem)]">
        <PageHeader 
          breadcrumbs={[
            { label: 'Finance', href: '/invoices' },
            { label: 'Invoices' }
          ]}
          title="Invoices" 
        />
        <Card>
          <div className="text-center py-[var(--bb-space-12,3rem)]">
            <FileText
              className="h-12 w-12 mx-auto mb-[var(--bb-space-4,1rem)]"
              style={{ color: 'var(--bb-color-status-negative)' }}
            />
            <h3
              className="text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-2,0.5rem)]"
              style={{ color: 'var(--bb-color-text-primary)' }}
            >
              Error Loading Invoices
            </h3>
            <p style={{ color: 'var(--bb-color-text-muted)' }}>
              Unable to load invoices. Please try again.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-[var(--bb-space-6,1.5rem)]">
      <PageHeader
        breadcrumbs={[
          { label: 'Finance', href: '/invoices' },
          { label: 'Invoices' }
        ]}
        title="Invoices"
        actions={
          <Button onClick={() => navigate('/bookings')}>
            View Bookings
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex gap-[var(--bb-space-2,0.5rem)]">
        {['all', 'draft', 'finalized', 'paid', 'void'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className="px-[var(--bb-space-4,1rem)] py-[var(--bb-space-2,0.5rem)] rounded-lg text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)] transition-colors"
            style={{
              backgroundColor: filterStatus === status
                ? 'var(--bb-color-accent)'
                : 'var(--bb-color-bg-elevated)',
              color: filterStatus === status
                ? 'var(--bb-color-text-on-accent)'
                : 'var(--bb-color-text-muted)',
            }}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableEmpty
                icon={FileText}
                message={`No ${filterStatus !== 'all' ? filterStatus : ''} invoices found`}
                colSpan={7}
              />
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow
                  key={invoice.recordId}
                  clickable
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <TableCell>
                    <span
                      className="font-mono text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]"
                      style={{ color: 'var(--bb-color-text-primary)' }}
                    >
                      {invoice.invoiceNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p
                        className="font-[var(--bb-font-weight-medium,500)]"
                        style={{ color: 'var(--bb-color-text-primary)' }}
                      >
                        {invoice.owner.firstName} {invoice.owner.lastName}
                      </p>
                      <p
                        className="text-[var(--bb-font-size-xs,0.75rem)]"
                        style={{ color: 'var(--bb-color-text-muted)' }}
                      >
                        {invoice.owner.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-[var(--bb-font-weight-semibold,600)]">
                      {formatCurrency(invoice.totalCents)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {invoice.paidCents > 0 ? (
                      <span style={{ color: 'var(--bb-color-status-positive)' }}>
                        {formatCurrency(invoice.paidCents)}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--bb-color-text-muted)' }}>$0.00</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(invoice.status)}
                  </TableCell>
                  <TableCell>
                    {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-[var(--bb-space-2,0.5rem)]" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSendEmail(invoice)}
                        disabled={sendEmailMutation.isLoading}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoiceNumber}`}
          className="max-w-2xl"
        >
          <div className="space-y-[var(--bb-space-6,1.5rem)]">
            {/* Invoice Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3
                  className="text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)]"
                  style={{ color: 'var(--bb-color-text-primary)' }}
                >
                  {selectedInvoice.owner.firstName} {selectedInvoice.owner.lastName}
                </h3>
                <p
                  className="text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  {selectedInvoice.owner.email}
                </p>
              </div>
              <div className="text-right">
                {getStatusBadge(selectedInvoice.status)}
                <p
                  className="text-[var(--bb-font-size-xs,0.75rem)] mt-[var(--bb-space-1,0.25rem)]"
                  style={{ color: 'var(--bb-color-text-muted)' }}
                >
                  Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4
                className="text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-semibold,600)] mb-[var(--bb-space-3,0.75rem)] uppercase"
                style={{ color: 'var(--bb-color-text-muted)' }}
              >
                Line Items
              </h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {JSON.parse(selectedInvoice.lineItems).map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity || 1}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPriceCents || item.priceCents)}</TableCell>
                        <TableCell className="text-right font-[var(--bb-font-weight-medium,500)]">
                          {formatCurrency(item.totalCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Totals */}
            <div
              className="border-t pt-[var(--bb-space-4,1rem)] space-y-[var(--bb-space-2,0.5rem)]"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <div className="flex justify-between text-[var(--bb-font-size-sm,0.875rem)]">
                <span style={{ color: 'var(--bb-color-text-muted)' }}>Subtotal</span>
                <span className="font-[var(--bb-font-weight-medium,500)]">
                  {formatCurrency(selectedInvoice.subtotalCents)}
                </span>
              </div>
              <div className="flex justify-between text-[var(--bb-font-size-sm,0.875rem)]">
                <span style={{ color: 'var(--bb-color-text-muted)' }}>Tax (7%)</span>
                <span className="font-[var(--bb-font-weight-medium,500)]">
                  {formatCurrency(selectedInvoice.taxCents)}
                </span>
              </div>
              <div
                className="flex justify-between text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-semibold,600)] border-t pt-[var(--bb-space-2,0.5rem)]"
                style={{ borderColor: 'var(--bb-color-border-subtle)' }}
              >
                <span>Total</span>
                <span>{formatCurrency(selectedInvoice.totalCents)}</span>
              </div>
              {selectedInvoice.paidCents > 0 && (
                <div
                  className="flex justify-between text-[var(--bb-font-size-sm,0.875rem)]"
                  style={{ color: 'var(--bb-color-status-positive)' }}
                >
                  <span>Paid</span>
                  <span>-{formatCurrency(selectedInvoice.paidCents)}</span>
                </div>
              )}
              {selectedInvoice.totalCents - selectedInvoice.paidCents > 0 && (
                <div
                  className="flex justify-between text-[var(--bb-font-size-lg,1.125rem)] font-[var(--bb-font-weight-bold,700)]"
                  style={{ color: 'var(--bb-color-status-negative)' }}
                >
                  <span>Amount Due</span>
                  <span>{formatCurrency(selectedInvoice.totalCents - selectedInvoice.paidCents)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              className="flex gap-[var(--bb-space-3,0.75rem)] pt-[var(--bb-space-4,1rem)] border-t"
              style={{ borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <Button
                variant="primary"
                onClick={() => handleSendEmail(selectedInvoice)}
                disabled={sendEmailMutation.isLoading}
              >
                <Mail className="h-4 w-4 mr-[var(--bb-space-2,0.5rem)]" />
                Email Invoice
              </Button>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Invoices;
