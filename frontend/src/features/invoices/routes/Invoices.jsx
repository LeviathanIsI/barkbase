import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Mail, Download, DollarSign, Clock, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
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
      <div>
        <PageHeader title="Invoices" breadcrumb="Home > Finance > Invoices" />
        <Card>
          <Skeleton className="h-96" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Invoices" breadcrumb="Home > Finance > Invoices" />
        <Card>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Invoices</h3>
            <p className="text-muted">Unable to load invoices. Please try again.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Invoices"
        breadcrumb="Home > Finance > Invoices"
        actions={
          <Button onClick={() => navigate('/bookings')}>
            View Bookings
          </Button>
        }
      />

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {['all', 'draft', 'finalized', 'paid', 'void'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-surface text-muted hover:bg-surface/80'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Paid</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr
                key={invoice.recordId}
                className="border-b border-border hover:bg-surface/50 cursor-pointer transition-colors"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-medium">{invoice.invoiceNumber}</span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium">{invoice.owner.firstName} {invoice.owner.lastName}</p>
                    <p className="text-xs text-muted">{invoice.owner.email}</p>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">
                  {formatCurrency(invoice.totalCents)}
                </td>
                <td className="px-4 py-3">
                  {invoice.paidCents > 0 ? (
                    <span className="text-success">{formatCurrency(invoice.paidCents)}</span>
                  ) : (
                    <span className="text-muted">$0.00</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {getStatusBadge(invoice.status)}
                </td>
                <td className="px-4 py-3">
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSendEmail(invoice)}
                      disabled={sendEmailMutation.isLoading}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredInvoices.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted mx-auto mb-4" />
            <p className="text-muted mb-2">No {filterStatus !== 'all' ? filterStatus : ''} invoices found</p>
            <p className="text-sm text-muted">
              Invoices are automatically generated from completed bookings
            </p>
          </div>
        )}
      </Card>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          open={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.invoiceNumber}`}
          className="max-w-2xl"
        >
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedInvoice.owner.firstName} {selectedInvoice.owner.lastName}
                </h3>
                <p className="text-sm text-muted">{selectedInvoice.owner.email}</p>
              </div>
              <div className="text-right">
                {getStatusBadge(selectedInvoice.status)}
                <p className="text-xs text-muted mt-1">
                  Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted uppercase">Line Items</h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 text-xs font-medium text-muted">Description</th>
                    <th className="pb-2 text-xs font-medium text-muted text-right">Qty</th>
                    <th className="pb-2 text-xs font-medium text-muted text-right">Price</th>
                    <th className="pb-2 text-xs font-medium text-muted text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {JSON.parse(selectedInvoice.lineItems).map((item, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2">{item.description}</td>
                      <td className="py-2 text-right">{item.quantity || 1}</td>
                      <td className="py-2 text-right">{formatCurrency(item.unitPriceCents || item.priceCents)}</td>
                      <td className="py-2 text-right font-medium">{formatCurrency(item.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">{formatCurrency(selectedInvoice.subtotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Tax (7%)</span>
                <span className="font-medium">{formatCurrency(selectedInvoice.taxCents)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
                <span>Total</span>
                <span>{formatCurrency(selectedInvoice.totalCents)}</span>
              </div>
              {selectedInvoice.paidCents > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Paid</span>
                  <span>-{formatCurrency(selectedInvoice.paidCents)}</span>
                </div>
              )}
              {selectedInvoice.totalCents - selectedInvoice.paidCents > 0 && (
                <div className="flex justify-between text-lg font-bold text-danger">
                  <span>Amount Due</span>
                  <span>{formatCurrency(selectedInvoice.totalCents - selectedInvoice.paidCents)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button
                variant="primary"
                onClick={() => handleSendEmail(selectedInvoice)}
                disabled={sendEmailMutation.isLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
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

