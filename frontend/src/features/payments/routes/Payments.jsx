import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  Settings,
  BarChart3,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  RefreshCw,
  Eye,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ExternalLink,
  Wallet,
  Receipt,
  AlertCircle,
  Zap,
  X,
  User,
  PawPrint,
  Calendar,
  FileText,
  Send,
  Loader2,
  Banknote,
  Percent,
  RotateCcw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import SlidePanel from '@/components/ui/SlidePanel';
import { usePaymentsQuery, usePaymentSummaryQuery } from '../api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Status configurations (normalized to uppercase keys)
const STATUS_CONFIG = {
  CAPTURED: { label: 'Captured', variant: 'success', icon: CheckCircle },
  SUCCESSFUL: { label: 'Successful', variant: 'success', icon: CheckCircle },
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle },
  SUCCEEDED: { label: 'Succeeded', variant: 'success', icon: CheckCircle },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  AUTHORIZED: { label: 'Authorized', variant: 'info', icon: CreditCard },
  REFUNDED: { label: 'Refunded', variant: 'neutral', icon: RotateCcw },
  FAILED: { label: 'Failed', variant: 'danger', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', icon: XCircle },
};

// Method configurations
const METHOD_CONFIG = {
  card: { label: 'Card', icon: CreditCard },
  cash: { label: 'Cash', icon: Banknote },
  check: { label: 'Check', icon: FileText },
  bank: { label: 'Bank', icon: Wallet },
};

// KPI Tile Component
const KPITile = ({ icon: Icon, label, value, subtext, trend, trendType, onClick, size = 'normal' }) => (
  <button
    onClick={onClick}
    className={cn(
      'text-left bg-white dark:bg-surface-primary border border-border rounded-lg transition-all hover:border-primary/30 hover:shadow-sm',
      size === 'large' ? 'p-4' : 'p-3'
    )}
  >
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn('text-muted', size === 'large' ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
          <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
        </div>
        <p className={cn('font-semibold text-text', size === 'large' ? 'text-2xl' : 'text-lg')}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-muted mt-0.5">{subtext}</p>
        )}
      </div>
      {trend && (
        <div className={cn(
          'flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded',
          trendType === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          trendType === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
        )}>
          {trendType === 'positive' ? <TrendingUp className="h-3 w-3" /> : 
           trendType === 'negative' ? <TrendingDown className="h-3 w-3" /> : null}
          {trend}
        </div>
      )}
    </div>
  </button>
);

// Transaction Row Component
const TransactionRow = ({ payment, isSelected, onSelect, onClick }) => {
  const status = STATUS_CONFIG[(payment.status || '').toUpperCase()] || STATUS_CONFIG.PENDING;
  const StatusIcon = status.icon;

  const customerName = payment.ownerFirstName && payment.ownerLastName
    ? `${payment.ownerFirstName} ${payment.ownerLastName}`
    : payment.ownerEmail || 'Unknown';

  const amount = ((payment.amountCents || payment.amount || 0) / 100).toFixed(2);
  const method = METHOD_CONFIG[payment.method?.toLowerCase()] || { label: payment.method || 'N/A', icon: CreditCard };
  const MethodIcon = method.icon;

  return (
    <tr
      className={cn(
        'group hover:bg-surface/50 transition-colors cursor-pointer border-b border-border',
        isSelected && 'bg-primary/5'
      )}
      onClick={onClick}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(payment.recordId || payment.id)}
          className="rounded border-border"
        />
      </td>
      <td className="px-3 py-3">
        <Badge variant={status.variant} size="sm" className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </td>
      <td className="px-3 py-3">
        <button className="text-sm font-medium text-primary hover:underline">
          {(payment.recordId || payment.id || '').slice(0, 12)}...
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">{customerName}</p>
            {payment.petName && (
              <p className="text-xs text-muted truncate flex items-center gap-1">
                <PawPrint className="h-3 w-3" />
                {payment.petName}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right">
        <span className="text-sm font-semibold text-text">${amount}</span>
        <span className="text-xs text-muted ml-1">{payment.currency || 'USD'}</span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5 text-sm text-muted">
          <MethodIcon className="h-3.5 w-3.5" />
          {method.label}
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted">
        {payment.capturedAt || payment.createdAt
          ? format(new Date(payment.capturedAt || payment.createdAt), 'MMM d, h:mm a')
          : 'N/A'}
      </td>
      <td className="px-3 py-3 text-sm text-muted">
        {payment.staffName || '—'}
      </td>
      <td className="px-3 py-3">
        <button
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          className="p-1.5 text-muted hover:text-text hover:bg-surface rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
};

// Outstanding Item Row
const OutstandingRow = ({ item, onRetry }) => (
  <div className="flex items-center justify-between py-2 px-3 hover:bg-surface/50 rounded-lg transition-colors">
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="h-4 w-4 text-red-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-text">{item.ownerName}</p>
        <p className="text-xs text-muted">{item.petName} • {item.reason}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-red-600">${item.amount}</span>
      <Button variant="outline" size="sm" onClick={() => onRetry(item)}>
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
        Retry
      </Button>
    </div>
  </div>
);

// Transaction Detail Drawer
const TransactionDrawer = ({ payment, isOpen, onClose }) => {
  if (!payment) return null;

  const status = STATUS_CONFIG[(payment.status || '').toUpperCase()] || STATUS_CONFIG.PENDING;
  const StatusIcon = status.icon;
  const amount = ((payment.amountCents || payment.amount || 0) / 100).toFixed(2);

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title="Transaction Details"
      size="md"
    >
      <div className="space-y-6">
        {/* Amount & Status */}
        <div className="text-center py-4 border-b border-border">
          <p className="text-3xl font-bold text-text">${amount}</p>
          <p className="text-sm text-muted mb-3">{payment.currency || 'USD'}</p>
          <Badge variant={status.variant} size="sm" className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Transaction ID</span>
            <span className="font-mono text-text">{payment.recordId || payment.id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Customer</span>
            <span className="text-text">
              {payment.ownerFirstName} {payment.ownerLastName}
            </span>
          </div>
          {payment.ownerEmail && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Email</span>
              <span className="text-text">{payment.ownerEmail}</span>
            </div>
          )}
          {payment.petName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Pet</span>
              <span className="text-text">{payment.petName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted">Method</span>
            <span className="text-text capitalize">{payment.method || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Date</span>
            <span className="text-text">
              {payment.capturedAt || payment.createdAt
                ? format(new Date(payment.capturedAt || payment.createdAt), 'PPpp')
                : 'N/A'}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-text mb-3">Timeline</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted">Created</span>
              <span className="text-sm text-text ml-auto">
                {payment.createdAt ? format(new Date(payment.createdAt), 'MMM d, h:mm a') : '—'}
              </span>
            </div>
            {payment.authorizedAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-muted">Authorized</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(payment.authorizedAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
            {payment.capturedAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted">Captured</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(payment.capturedAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border pt-4 space-y-2">
          <Button variant="outline" className="w-full justify-center">
            <Mail className="h-4 w-4 mr-2" />
            Send Receipt
          </Button>
          {(payment.status === 'CAPTURED' || payment.status === 'SUCCESSFUL') && (
            <Button variant="outline" className="w-full justify-center text-amber-600 hover:text-amber-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-center">
            <FileText className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>
      </div>
    </SlidePanel>
  );
};

const Payments = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState('overview');
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showOutstanding, setShowOutstanding] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data fetching
  const { data: paymentsData, isLoading, error, refetch } = usePaymentsQuery();
  const { data: summaryData } = usePaymentSummaryQuery();

  // Process payments data - normalize backend response
  const payments = useMemo(() => {
    const rawPayments = paymentsData?.payments || paymentsData?.data?.payments || (Array.isArray(paymentsData) ? paymentsData : []);

    // Transform backend fields to frontend expected format
    return rawPayments.map(p => ({
      ...p,
      // Normalize ID fields
      recordId: p.recordId || p.id,
      // Normalize amount (backend returns both amount and amountCents)
      amountCents: p.amountCents || (p.amount ? Math.round(p.amount * 100) : 0),
      // Parse customer name if combined, otherwise use individual fields
      ownerFirstName: p.ownerFirstName || (p.customerName ? p.customerName.split(' ')[0] : ''),
      ownerLastName: p.ownerLastName || (p.customerName ? p.customerName.split(' ').slice(1).join(' ') : ''),
      // Normalize date fields (backend uses processedAt, frontend expects capturedAt)
      capturedAt: p.capturedAt || p.processedAt || p.paidAt,
      createdAt: p.createdAt,
      // Normalize status to uppercase for STATUS_CONFIG lookup
      status: (p.status || 'PENDING').toUpperCase(),
      // Normalize method
      method: p.method || p.paymentMethod || 'card',
    }));
  }, [paymentsData]);

  // Calculate stats
  const stats = useMemo(() => {
    const captured = payments.filter(p => ['CAPTURED', 'SUCCESSFUL', 'COMPLETED', 'SUCCEEDED'].includes(p.status));
    const pending = payments.filter(p => ['PENDING', 'AUTHORIZED'].includes(p.status));
    const refunded = payments.filter(p => p.status === 'REFUNDED');
    const failed = payments.filter(p => ['FAILED', 'CANCELLED'].includes(p.status));

    const revenueCollected = captured.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
    const processedAmount = captured.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
    const pendingAmount = pending.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
    const refundedAmount = refunded.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
    const successRate = payments.length > 0 ? Math.round((captured.length / payments.length) * 100) : 0;
    const avgTransaction = captured.length > 0 ? revenueCollected / captured.length : 0;

    return {
      revenueCollected,
      processedAmount,
      pendingAmount,
      refundedAmount,
      successRate,
      avgTransaction,
      totalPayments: payments.length,
      capturedCount: captured.length,
      pendingCount: pending.length,
      refundedCount: refunded.length,
      failedCount: failed.length,
      chargebacks: 0, // Would come from API
    };
  }, [payments]);

  // Filter and sort payments
  const filteredPayments = useMemo(() => {
    let result = [...payments];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.recordId || p.id || '').toLowerCase().includes(term) ||
        (p.ownerFirstName || '').toLowerCase().includes(term) ||
        (p.ownerLastName || '').toLowerCase().includes(term) ||
        (p.ownerEmail || '').toLowerCase().includes(term) ||
        (p.petName || '').toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => (p.status || '').toUpperCase() === statusFilter.toUpperCase());
    }

    // Method filter
    if (methodFilter !== 'all') {
      result = result.filter(p => (p.method || '').toLowerCase() === methodFilter.toLowerCase());
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'amountCents' || sortConfig.key === 'amount') {
        aVal = a.amountCents || a.amount || 0;
        bVal = b.amountCents || b.amount || 0;
      } else if (sortConfig.key.includes('At') || sortConfig.key === 'createdAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [payments, searchTerm, statusFilter, methodFilter, sortConfig]);

  // Pagination
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredPayments.length / pageSize);

  // Outstanding items (mock data - would come from API)
  const outstandingItems = useMemo(() => {
    return payments
      .filter(p => p.status === 'FAILED' || p.status === 'PENDING')
      .slice(0, 5)
      .map(p => ({
        id: p.recordId || p.id,
        ownerName: `${p.ownerFirstName || ''} ${p.ownerLastName || ''}`.trim() || 'Unknown',
        petName: p.petName || 'N/A',
        amount: ((p.amountCents || p.amount || 0) / 100).toFixed(2),
        reason: p.status === 'FAILED' ? 'Card declined' : 'Pending authorization',
      }));
  }, [payments]);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectPayment = (id) => {
    setSelectedPayments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPayments.size === paginatedPayments.length) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(paginatedPayments.map(p => p.recordId || p.id)));
    }
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setShowDrawer(true);
  };

  const handleExport = () => {
    const paymentsToExport = selectedPayments.size > 0
      ? payments.filter(p => selectedPayments.has(p.recordId || p.id))
      : filteredPayments;

    const csv = paymentsToExport.map(p =>
      `${p.recordId || p.id},${p.ownerFirstName || ''} ${p.ownerLastName || ''},${((p.amountCents || p.amount || 0) / 100).toFixed(2)},${p.status},${p.method || ''},${p.createdAt || ''}`
    ).join('\n');

    const blob = new Blob([`ID,Customer,Amount,Status,Method,Date\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Payments exported');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || methodFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setMethodFilter('all');
    setDateRange('all');
  };

  // Processor status (mock)
  const processorStatus = {
    name: 'Stripe',
    status: 'active',
    lastSync: new Date(),
    rate: '2.9% + 30¢',
  };

  const isProcessorConnected = processorStatus.status === 'active';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><Link to="/invoices" className="hover:text-primary">Finance</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Payments</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-text">Payments</h1>
          <p className="text-xs text-muted mt-0.5">Financial command center</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs */}
          <div className="flex items-center bg-surface border border-border rounded-lg p-1">
            {[
              { key: 'overview', label: 'Overview', icon: CreditCard },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'outstanding', label: 'Outstanding', icon: Clock, badge: outstandingItems.length },
              { key: 'settings', label: 'Settings', icon: Settings },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setCurrentView(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors',
                  currentView === tab.key
                    ? 'bg-white dark:bg-surface-primary shadow-sm text-text'
                    : 'text-muted hover:text-text'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => navigate('/invoices?action=new')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Process Payment
          </Button>
        </div>
      </div>

      {/* Tier 1: KPI Tiles */}
      <div className="space-y-3">
        {/* Row 1: Big metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPITile
            icon={DollarSign}
            label="Revenue Collected"
            value={`$${stats.revenueCollected.toLocaleString()}`}
            subtext="YTD"
            trend="+15%"
            trendType="positive"
            size="large"
          />
          <KPITile
            icon={CreditCard}
            label="Processed (Card/Online)"
            value={`$${stats.processedAmount.toLocaleString()}`}
            subtext={`${stats.capturedCount} transactions`}
            size="large"
          />
          <KPITile
            icon={Clock}
            label="Pending / Outstanding"
            value={`$${stats.pendingAmount.toLocaleString()}`}
            subtext={`${stats.pendingCount} awaiting`}
            trend={stats.pendingCount > 0 ? 'Action needed' : null}
            trendType={stats.pendingCount > 0 ? 'negative' : null}
            size="large"
          />
          <KPITile
            icon={Wallet}
            label="Payouts"
            value="$0"
            subtext="Next payout: —"
            size="large"
          />
        </div>

        {/* Row 2: Operational metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPITile
            icon={Percent}
            label="Success Rate"
            value={`${stats.successRate}%`}
            trend={stats.successRate >= 95 ? 'Excellent' : stats.successRate >= 90 ? 'Good' : 'Review'}
            trendType={stats.successRate >= 95 ? 'positive' : stats.successRate >= 90 ? 'neutral' : 'negative'}
          />
          <KPITile
            icon={RotateCcw}
            label="Refunds"
            value={`$${stats.refundedAmount.toLocaleString()}`}
            subtext={`${stats.refundedCount} refunds`}
          />
          <KPITile
            icon={AlertTriangle}
            label="Chargebacks"
            value={stats.chargebacks}
            subtext="This month"
            trend={stats.chargebacks === 0 ? 'Clean' : null}
            trendType={stats.chargebacks === 0 ? 'positive' : 'negative'}
          />
          <KPITile
            icon={Receipt}
            label="Avg Transaction"
            value={`$${stats.avgTransaction.toFixed(2)}`}
            subtext="Per payment"
          />
        </div>
      </div>

      {/* Tier 2: Processor Status */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center',
              isProcessorConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
            )}>
              {isProcessorConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-text">
                  {isProcessorConnected ? `Connected: ${processorStatus.name}` : 'Payment Processor'}
                </p>
                <Badge variant={isProcessorConnected ? 'success' : 'warning'} size="sm">
                  {isProcessorConnected ? 'Active' : 'Not Connected'}
                </Badge>
              </div>
              <p className="text-xs text-muted">
                {isProcessorConnected
                  ? `Last sync: ${format(processorStatus.lastSync, 'MMM d, h:mm a')} • Processing smoothly`
                  : 'Connect a payment processor to accept payments'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isProcessorConnected && (
              <div className="text-right">
                <p className="text-xs text-muted">Your rate</p>
                <p className="text-sm font-medium text-text">{processorStatus.rate}</p>
              </div>
            )}
            <Button variant="outline" size="sm">
              {isProcessorConnected ? 'Manage' : 'Connect Processor'}
            </Button>
          </div>
        </div>
      </div>

      {/* Outstanding Section */}
      {outstandingItems.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
          <button
            onClick={() => setShowOutstanding(!showOutstanding)}
            className="w-full flex items-center justify-between p-3"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-700 dark:text-red-300">
                {outstandingItems.length} Outstanding / Failed Payments
              </span>
              <Badge variant="danger" size="sm">${outstandingItems.reduce((sum, i) => sum + parseFloat(i.amount), 0).toFixed(2)}</Badge>
            </div>
            {showOutstanding ? <ChevronUp className="h-4 w-4 text-red-500" /> : <ChevronDown className="h-4 w-4 text-red-500" />}
          </button>
          {showOutstanding && (
            <div className="px-3 pb-3 space-y-1">
              {outstandingItems.map(item => (
                <OutstandingRow
                  key={item.id}
                  item={item}
                  onRetry={() => toast.info('Retry payment functionality coming soon')}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tier 2: Filters Toolbar */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="CAPTURED">Captured</option>
            <option value="PENDING">Pending</option>
            <option value="AUTHORIZED">Authorized</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </select>

          {/* Method */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Methods</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank">Bank Transfer</option>
          </select>

          {/* Date Range */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 text-sm bg-surface border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedPayments.size > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <span className="text-sm text-muted">{selectedPayments.size} selected</span>
            <Button variant="outline" size="sm">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Email
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Refund
            </Button>
          </div>
        )}
      </div>

      {/* Tier 3: Transactions Table */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">Loading transactions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="font-medium text-text mb-1">Error loading payments</p>
            <p className="text-sm text-muted">{error.message}</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-muted" />
            </div>
            <h3 className="font-medium text-text mb-1">
              {payments.length === 0 ? 'No transactions yet' : 'No matching transactions'}
            </h3>
            <p className="text-sm text-muted mb-4">
              {payments.length === 0
                ? 'Transactions will appear here once payments are processed'
                : 'Try adjusting your filters'}
            </p>
            {payments.length === 0 ? (
              <Button size="sm" onClick={() => navigate('/invoices?action=new')}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Manual Payment
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-surface border-b border-border sticky top-0">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedPayments.size === paginatedPayments.length && paginatedPayments.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('recordId')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Transaction ID
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Customer / Pet
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('amountCents')}
                        className="flex items-center gap-1 hover:text-text ml-auto"
                      >
                        Amount
                        {sortConfig.key === 'amountCents' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Method
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Date
                        {sortConfig.key === 'createdAt' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Staff
                    </th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map(payment => (
                    <TransactionRow
                      key={payment.recordId || payment.id}
                      payment={payment}
                      isSelected={selectedPayments.has(payment.recordId || payment.id)}
                      onSelect={handleSelectPayment}
                      onClick={() => handleViewPayment(payment)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted">
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredPayments.length)} of {filteredPayments.length}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 text-sm bg-surface border-0 rounded focus:outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        payment={selectedPayment}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
      />
    </div>
  );
};

export default Payments;
