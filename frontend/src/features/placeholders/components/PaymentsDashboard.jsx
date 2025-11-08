import { useState } from 'react';
import { Search, Filter, Download, Mail, CheckCircle, Clock, XCircle, RefreshCw, Eye, DollarSign, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { usePaymentsQuery } from '../../payments/api';

const PaymentsDashboard = ({ onViewPayment, onProcessRefund }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [selectedPayments, setSelectedPayments] = useState([]);

  // Build query parameters
  const queryParams = {};
  if (searchTerm) queryParams.search = searchTerm;
  if (statusFilter !== 'all') queryParams.status = statusFilter;
  if (methodFilter !== 'all') queryParams.method = methodFilter;

  const { data: paymentsData, isLoading, error } = usePaymentsQuery(queryParams);

  // Use real API data with fallback
  const payments = Array.isArray(paymentsData) ? paymentsData : (paymentsData?.data || []);

  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CAPTURED':
      case 'SUCCESSFUL': return 'text-green-600 bg-green-100 dark:bg-surface-secondary';
      case 'PENDING':
      case 'AUTHORIZED': return 'text-yellow-600 bg-yellow-100 dark:bg-surface-secondary';
      case 'FAILED': return 'text-red-600 bg-red-100 dark:bg-surface-secondary';
      case 'REFUNDED': return 'text-gray-600 dark:text-text-secondary bg-gray-100 dark:bg-surface-secondary';
      default: return 'text-gray-600 dark:text-text-secondary bg-gray-100 dark:bg-surface-secondary';
    }
  };

  const getStatusIcon = (status) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'CAPTURED':
      case 'SUCCESSFUL': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING':
      case 'AUTHORIZED': return <Clock className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      case 'REFUNDED': return <RefreshCw className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleSelectPayment = (paymentId) => {
    setSelectedPayments(prev =>
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const handleSelectAll = () => {
    setSelectedPayments(
      selectedPayments.length === payments.length
        ? []
        : payments.map(p => p.id)
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
              <input
                type="text"
                placeholder="Search: Customer, amount, transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-10 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-surface-primary bg-no-repeat bg-right"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}
            >
              <option value="all">Status: All</option>
              <option value="PENDING">Pending</option>
              <option value="AUTHORIZED">Authorized</option>
              <option value="CAPTURED">Captured</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="pl-3 pr-10 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-surface-primary bg-no-repeat bg-right"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundSize: "1.5em 1.5em" }}
            >
              <option value="all">Method: All</option>
              <option value="card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-text-secondary">
            Showing {payments.length} payments
          </div>
        </div>
      </Card>

      {/* Bulk Actions */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedPayments.length === payments.length}
            onChange={handleSelectAll}
            className="rounded"
          />
          <span className="text-sm font-medium">Select All</span>
        </label>

        {selectedPayments.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.info('Bulk refund: Select individual payments to refund')}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Process Refund ({selectedPayments.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const csv = payments.filter(p => selectedPayments.includes(p.id)).map(p => `${p.id},${p.customer},${p.amount},${p.status}`).join('\n');
              const blob = new Blob([`ID,Customer,Amount,Status\n${csv}`], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              toast.success('Payments exported');
            }}>
              <Download className="w-4 h-4 mr-1" />
              Export ({selectedPayments.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Email feature coming soon')}>
              <Mail className="w-4 h-4 mr-1" />
              Email ({selectedPayments.length})
            </Button>
          </div>
        )}
      </div>

      {/* Transaction Cards */}
      <div className="space-y-4">
        {error && (
          <Card className="p-12 text-center bg-red-50 dark:bg-surface-primary">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">Error Loading Payments</h3>
            <p className="text-gray-600 dark:text-text-secondary">{error.message}</p>
            <pre className="mt-4 text-xs text-left overflow-auto">{JSON.stringify({ paymentsData, error }, null, 2)}</pre>
          </Card>
        )}
        {!error && isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-text-secondary">Loading payments...</p>
          </div>
        ) : !error && payments.length === 0 ? (
          <Card className="p-12 text-center">
            <DollarSign className="h-16 w-16 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary mb-2">No payments found</h3>
            <p className="text-gray-600 dark:text-text-secondary">Payments will appear here once transactions are processed</p>
          </Card>
        ) : payments.map((payment) => (
          <Card key={payment.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <input
                  type="checkbox"
                  checked={selectedPayments.includes(payment.id)}
                  onChange={() => handleSelectPayment(payment.id)}
                  className="mt-1"
                />

                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(payment.status)}`}>
                  {getStatusIcon(payment.status)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-text-primary">{payment.recordId || payment.id}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status || 'unknown')}`}>
                      {(payment.status || 'UNKNOWN').toUpperCase()}
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-600 dark:text-text-secondary mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>${((payment.amountCents || payment.amount || 0) / 100).toFixed(2)} {payment.currency || 'USD'} • {payment.method || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{payment.capturedAt || payment.createdAt ? new Date(payment.capturedAt || payment.createdAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-text-primary">
                        👤 {payment.ownerFirstName && payment.ownerLastName 
                          ? `${payment.ownerFirstName} ${payment.ownerLastName}` 
                          : payment.ownerEmail || 'Unknown Customer'}
                      </span>
                      {payment.ownerPhone && (
                        <span className="text-gray-600 dark:text-text-secondary">• {payment.ownerPhone}</span>
                      )}
                    </div>
                    {payment.petName && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-text-secondary">{payment.petName}</span>
                        {payment.petBreed && <span className="text-gray-600 dark:text-text-secondary">({payment.petBreed})</span>}
                      </div>
                    )}
                    {payment.bookingCheckIn && payment.bookingCheckOut && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 dark:text-text-secondary">
                          📅 {new Date(payment.bookingCheckIn).toLocaleDateString()} - {new Date(payment.bookingCheckOut).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {payment.status === 'FAILED' && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-surface-primary border border-red-200 dark:border-red-900/30 rounded">
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Payment failed - review details and retry or contact customer
                      </p>
                    </div>
                  )}

                  {payment.status === 'REFUNDED' && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Refund issued • Expected in customer account: 5-10 business days
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={() => onViewPayment(payment)}>
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                {(payment.status === 'CAPTURED' || payment.status === 'successful') && (
                  <Button variant="outline" size="sm" onClick={() => onProcessRefund(payment)}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refund
                  </Button>
                )}
                {(payment.status === 'AUTHORIZED' || payment.status === 'PENDING') && payment.status !== 'CAPTURED' && (
                  <Button size="sm" onClick={async () => {
                    try {
                      const response = await fetch(`/api/v1/payments/${payment.id}/charge`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      if (response.ok) {
                        toast.success('Payment charged successfully');
                      } else {
                        toast.error('Failed to charge payment');
                      }
                    } catch (error) {
                      toast.error('Error processing charge');
                    }
                  }}>
                    Charge Now
                  </Button>
                )}
                {payment.status === 'FAILED' && (
                  <Button size="sm" onClick={async () => {
                    try {
                      const response = await fetch(`/api/v1/payments/${payment.id}/retry`, {
                        method: 'POST',
                        credentials: 'include'
                      });
                      if (response.ok) {
                        toast.success('Payment retry initiated');
                      } else {
                        toast.error('Failed to retry payment');
                      }
                    } catch (error) {
                      toast.error('Error retrying payment');
                    }
                  }}>
                    Retry
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => toast.info('Email receipt feature coming soon')}>
                  <Mail className="w-3 h-3 mr-1" />
                  Email
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Load More */}
      {payments.length > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={() => toast.info('Load more pagination coming soon')}>
            Load More (showing {payments.length} payments)
          </Button>
          <Button variant="outline" className="ml-2" onClick={async () => {
            try {
              const response = await fetch('/api/v1/payments/export/csv', {
                method: 'GET',
                credentials: 'include'
              });
              if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `all-payments-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                toast.success('All payments exported');
              } else {
                toast.error('Failed to export');
              }
            } catch (error) {
              toast.error('Export failed');
            }
          }}>
            <Download className="w-4 h-4 mr-1" />
            Export All
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentsDashboard;

