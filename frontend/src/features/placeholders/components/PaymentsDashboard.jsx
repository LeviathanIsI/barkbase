import { useState } from 'react';
import { Search, Filter, Download, Mail, CheckCircle, Clock, XCircle, RefreshCw, Eye, DollarSign, AlertTriangle } from 'lucide-react';
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

  const { data: paymentsData, isLoading } = usePaymentsQuery(queryParams);

  // Use real API data with fallback
  const payments = paymentsData?.data || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'successful': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'refunded': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'successful': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'refunded': return <RefreshCw className="w-4 h-4" />;
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search: Customer, amount, transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Status: All</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Method: All</option>
              <option value="card">Credit Card</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div className="text-sm text-gray-600">
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
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-1" />
              Process Refund ({selectedPayments.length})
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export ({selectedPayments.length})
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-1" />
              Email ({selectedPayments.length})
            </Button>
          </div>
        )}
      </div>

      {/* Transaction Cards */}
      <div className="space-y-4">
        {payments.map((payment) => (
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
                    <h4 className="font-semibold text-gray-900">{payment.id}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span>${payment.amount.toFixed(2)} • {payment.method}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{payment.date}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">👤 {payment.customer}</span>
                      <span className="text-gray-600">• {payment.pet}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">📋 {payment.service}</span>
                      <span className="text-gray-600">• {payment.bookingId}</span>
                    </div>
                  </div>

                  {payment.fee > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between">
                        <span>Processing fee: -${payment.fee.toFixed(2)}</span>
                        <span className="font-medium">Net: ${payment.net.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {payment.status === 'failed' && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-800">
                        Reason: Insufficient funds • Next retry: Oct 16 @ 9:00 AM
                      </p>
                    </div>
                  )}

                  {payment.status === 'refunded' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
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
                {payment.status === 'successful' && (
                  <Button variant="outline" size="sm" onClick={() => onProcessRefund(payment)}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refund
                  </Button>
                )}
                {payment.status === 'pending' && (
                  <Button size="sm">
                    Charge Now
                  </Button>
                )}
                {payment.status === 'failed' && (
                  <Button size="sm">
                    Retry
                  </Button>
                )}
                <Button variant="outline" size="sm">
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
          <Button variant="outline" disabled>
            Load More (showing {payments.length} payments)
          </Button>
          <Button variant="outline" className="ml-2" disabled>
            <Download className="w-4 h-4 mr-1" />
            Export All
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaymentsDashboard;
