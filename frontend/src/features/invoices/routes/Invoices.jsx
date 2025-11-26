/**
 * Invoices - Full-featured invoicing command center
 * Modeled after QuickBooks Online, Stripe Invoicing, and HubSpot Billing
 */

import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import {
  FileText,
  Mail,
  Download,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  ExternalLink,
  Eye,
  Edit3,
  Send,
  Trash2,
  Ban,
  Loader2,
  User,
  PawPrint,
  Calendar,
  RefreshCw,
  Printer,
  Receipt,
  X,
  CreditCard,
  Activity,
  FileCheck,
  FileClock,
  AlertCircle,
  CircleDollarSign,
  Wallet,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import SlidePanel from '@/components/ui/SlidePanel';
import { useInvoicesQuery, useSendInvoiceEmailMutation, useMarkInvoicePaidMutation } from '../api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Status configurations
const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'neutral', icon: FileText },
  finalized: { label: 'Finalized', variant: 'info', icon: FileCheck },
  sent: { label: 'Sent', variant: 'accent', icon: Send },
  viewed: { label: 'Viewed', variant: 'warning', icon: Eye },
  paid: { label: 'Paid', variant: 'success', icon: CheckCircle },
  overdue: { label: 'Overdue', variant: 'danger', icon: AlertTriangle },
  void: { label: 'Void', variant: 'neutral', icon: Ban },
};

// KPI Tile Component
const KPITile = ({ icon: Icon, label, value, subtext, variant, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'text-left bg-white dark:bg-surface-primary border rounded-lg p-3 transition-all hover:shadow-sm flex-1 min-w-[140px]',
      variant === 'warning' ? 'border-amber-300 dark:border-amber-800' : 'border-border hover:border-primary/30'
    )}
  >
    <div className="flex items-center gap-2 mb-1">
      <Icon className={cn(
        'h-3.5 w-3.5',
        variant === 'warning' ? 'text-amber-600' : 'text-muted'
      )} />
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
    </div>
    <p className={cn(
      'text-xl font-semibold',
      variant === 'warning' ? 'text-amber-600' : 'text-text'
    )}>
      {value}
    </p>
    {subtext && (
      <p className="text-xs text-muted mt-0.5">{subtext}</p>
    )}
  </button>
);

// Invoice Row Component
const InvoiceRow = ({ invoice, isSelected, onSelect, onClick }) => {
  // Determine effective status (check for overdue)
  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'void' && invoice.dueDate && isPast(new Date(invoice.dueDate));
  const effectiveStatus = isOverdue ? 'overdue' : invoice.status;
  const status = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  const ownerName = invoice.owner
    ? `${invoice.owner.firstName || ''} ${invoice.owner.lastName || ''}`.trim()
    : 'Unknown';

  const totalAmount = (invoice.totalCents || 0) / 100;
  const paidAmount = (invoice.paidCents || 0) / 100;
  const balanceDue = totalAmount - paidAmount;

  // Get pets from line items
  const pets = useMemo(() => {
    try {
      const items = typeof invoice.lineItems === 'string' 
        ? JSON.parse(invoice.lineItems) 
        : invoice.lineItems || [];
      return [...new Set(items.map(i => i.petName).filter(Boolean))];
    } catch {
      return [];
    }
  }, [invoice.lineItems]);

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
          onChange={() => onSelect(invoice.recordId)}
          className="rounded border-border"
        />
      </td>
      <td className="px-3 py-3">
        <button className="text-sm font-mono font-medium text-primary hover:underline">
          {invoice.invoiceNumber || `INV-${invoice.recordId?.slice(0, 6)}`}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">{ownerName}</p>
            {invoice.owner?.email && (
              <p className="text-xs text-muted truncate">{invoice.owner.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {pets.length > 0 ? (
          <div className="flex items-center gap-1">
            <PawPrint className="h-3.5 w-3.5 text-muted flex-shrink-0" />
            <span className="text-sm text-muted truncate max-w-[120px]">
              {pets.join(', ')}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <span className="text-sm font-semibold text-text">${totalAmount.toFixed(2)}</span>
      </td>
      <td className="px-3 py-3 text-right">
        <span className={cn(
          'text-sm',
          paidAmount > 0 ? 'text-green-600 font-medium' : 'text-muted'
        )}>
          ${paidAmount.toFixed(2)}
        </span>
      </td>
      <td className="px-3 py-3">
        <Badge variant={status.variant} size="sm" className="gap-1">
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </Badge>
      </td>
      <td className="px-3 py-3">
        {invoice.dueDate ? (
          <span className={cn(
            'text-sm',
            isOverdue ? 'text-red-600 font-medium' : 'text-muted'
          )}>
            {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
          </span>
        ) : (
          <span className="text-sm text-muted">—</span>
        )}
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

// Invoice Detail Drawer
const InvoiceDrawer = ({ invoice, isOpen, onClose, onSendEmail, onMarkPaid }) => {
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');

  if (!invoice) return null;

  const totalAmount = (invoice.totalCents || 0) / 100;
  const paidAmount = (invoice.paidCents || 0) / 100;
  const balanceDue = totalAmount - paidAmount;

  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'void' && invoice.dueDate && isPast(new Date(invoice.dueDate));
  const effectiveStatus = isOverdue ? 'overdue' : invoice.status;
  const status = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.draft;
  const StatusIcon = status.icon;

  // Parse line items
  const lineItems = useMemo(() => {
    try {
      return typeof invoice.lineItems === 'string'
        ? JSON.parse(invoice.lineItems)
        : invoice.lineItems || [];
    } catch {
      return [];
    }
  }, [invoice.lineItems]);

  const handleApplyPayment = () => {
    const cents = Math.round(parseFloat(paymentAmount) * 100);
    if (cents > 0 && cents <= balanceDue * 100) {
      onMarkPaid(invoice.recordId, cents);
      setShowPaymentInput(false);
      setPaymentAmount('');
    } else {
      toast.error('Invalid payment amount');
    }
  };

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber || `#${invoice.recordId?.slice(0, 8)}`}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Amount & Status Header */}
        <div className="text-center py-4 border-b border-border">
          <p className="text-3xl font-bold text-text">${totalAmount.toFixed(2)}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant={status.variant} size="sm" className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            {invoice.dueDate && (
              <span className={cn(
                'text-xs',
                isOverdue ? 'text-red-600' : 'text-muted'
              )}>
                Due {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-surface/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-text">
                {invoice.owner?.firstName} {invoice.owner?.lastName}
              </p>
              <p className="text-sm text-muted">{invoice.owner?.email}</p>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Line Items</h4>
          <div className="space-y-2">
            {lineItems.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-text">{item.description}</p>
                  {item.petName && (
                    <p className="text-xs text-muted flex items-center gap-1">
                      <PawPrint className="h-3 w-3" />
                      {item.petName}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-text">
                    {formatCurrency(item.totalCents || (item.unitPriceCents || item.priceCents) * (item.quantity || 1))}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-xs text-muted">
                      {item.quantity} × {formatCurrency(item.unitPriceCents || item.priceCents)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span className="font-medium text-text">{formatCurrency(invoice.subtotalCents)}</span>
          </div>
          {invoice.discountCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Discount</span>
              <span className="text-green-600">-{formatCurrency(invoice.discountCents)}</span>
            </div>
          )}
          {invoice.taxCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tax</span>
              <span className="font-medium text-text">{formatCurrency(invoice.taxCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
            <span className="text-text">Total</span>
            <span className="text-text">${totalAmount.toFixed(2)}</span>
          </div>
          {paidAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Paid</span>
              <span>-${paidAmount.toFixed(2)}</span>
            </div>
          )}
          {balanceDue > 0 && (
            <div className="flex justify-between text-lg font-bold text-red-600 pt-2">
              <span>Balance Due</span>
              <span>${balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Activity Timeline */}
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Activity</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted">Created</span>
              <span className="text-sm text-text ml-auto">
                {invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM d, h:mm a') : '—'}
              </span>
            </div>
            {invoice.sentAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="text-sm text-muted">Sent</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(invoice.sentAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
            {invoice.viewedAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-sm text-muted">Viewed</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(invoice.viewedAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-muted">Paid</span>
                <span className="text-sm text-text ml-auto">
                  {format(new Date(invoice.paidAt), 'MMM d, h:mm a')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Apply Payment */}
        {showPaymentInput && balanceDue > 0 && (
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Apply Payment</h4>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  max={balanceDue}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={balanceDue.toFixed(2)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button size="sm" onClick={handleApplyPayment}>Apply</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowPaymentInput(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-center" onClick={() => onSendEmail(invoice)}>
              <Send className="h-4 w-4 mr-2" />
              Send Invoice
            </Button>
            <Button variant="outline" className="justify-center">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="justify-center">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Invoice
            </Button>
            {balanceDue > 0 && (
              <Button 
                variant="outline" 
                className="justify-center"
                onClick={() => setShowPaymentInput(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Apply Payment
              </Button>
            )}
          </div>
          {balanceDue > 0 && invoice.status !== 'void' && (
            <Button 
              className="w-full justify-center"
              onClick={() => onMarkPaid(invoice.recordId, balanceDue * 100)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          {invoice.status !== 'void' && invoice.status !== 'paid' && (
            <Button variant="ghost" className="w-full justify-center text-red-600 hover:text-red-700">
              <Ban className="h-4 w-4 mr-2" />
              Void Invoice
            </Button>
          )}
        </div>

        {/* Integration Note */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted">
            Invoices sync with: Payments, Bookings, Owner Profiles
          </p>
        </div>
      </div>
    </SlidePanel>
  );
};

const Invoices = () => {
  const navigate = useNavigate();
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('');

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Data fetching
  const { data: invoicesData, isLoading, error, refetch } = useInvoicesQuery();
  const sendEmailMutation = useSendInvoiceEmailMutation();
  const markPaidMutation = useMarkInvoicePaidMutation();

  // Process invoices data
  const invoices = useMemo(() => {
    return Array.isArray(invoicesData) ? invoicesData : (invoicesData?.data || []);
  }, [invoicesData]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    
    const draft = invoices.filter(i => i.status === 'draft');
    const finalized = invoices.filter(i => i.status === 'finalized');
    const sent = invoices.filter(i => i.status === 'sent');
    const viewed = invoices.filter(i => i.status === 'viewed');
    const paid = invoices.filter(i => i.status === 'paid');
    const voided = invoices.filter(i => i.status === 'void');
    const overdue = invoices.filter(i => 
      i.status !== 'paid' && 
      i.status !== 'void' && 
      i.dueDate && 
      isPast(new Date(i.dueDate))
    );

    const outstandingBalance = invoices
      .filter(i => i.status !== 'paid' && i.status !== 'void')
      .reduce((sum, i) => sum + (i.totalCents || 0) - (i.paidCents || 0), 0) / 100;

    return {
      draft: draft.length,
      finalized: finalized.length,
      sent: sent.length,
      viewed: viewed.length,
      paid: paid.length,
      void: voided.length,
      overdue: overdue.length,
      outstandingBalance,
      total: invoices.length,
    };
  }, [invoices]);

  // Tab counts
  const tabCounts = {
    all: invoices.length,
    draft: stats.draft,
    finalized: stats.finalized,
    sent: stats.sent,
    viewed: stats.viewed,
    paid: stats.paid,
    overdue: stats.overdue,
    void: stats.void,
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Tab filter
    if (activeTab !== 'all') {
      if (activeTab === 'overdue') {
        result = result.filter(i =>
          i.status !== 'paid' &&
          i.status !== 'void' &&
          i.dueDate &&
          isPast(new Date(i.dueDate))
        );
      } else {
        result = result.filter(i => i.status === activeTab);
      }
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(i =>
        (i.invoiceNumber || '').toLowerCase().includes(term) ||
        (i.owner?.firstName || '').toLowerCase().includes(term) ||
        (i.owner?.lastName || '').toLowerCase().includes(term) ||
        (i.owner?.email || '').toLowerCase().includes(term)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'totalCents' || sortConfig.key === 'paidCents') {
        aVal = a[sortConfig.key] || 0;
        bVal = b[sortConfig.key] || 0;
      } else if (sortConfig.key === 'dueDate' || sortConfig.key === 'createdAt') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else if (sortConfig.key === 'owner') {
        aVal = `${a.owner?.firstName || ''} ${a.owner?.lastName || ''}`.toLowerCase();
        bVal = `${b.owner?.firstName || ''} ${b.owner?.lastName || ''}`.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [invoices, activeTab, searchTerm, sortConfig]);

  // Pagination
  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredInvoices.length / pageSize);

  // Handlers
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectInvoice = (id) => {
    setSelectedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedInvoices.size === paginatedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map(i => i.recordId)));
    }
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowDrawer(true);
  };

  const handleSendEmail = async (invoice) => {
    try {
      await sendEmailMutation.mutateAsync(invoice.recordId);
      toast.success(`Invoice sent to ${invoice.owner?.email}`);
    } catch (error) {
      toast.error('Failed to send invoice');
    }
  };

  const handleMarkPaid = async (invoiceId, paymentCents) => {
    try {
      await markPaidMutation.mutateAsync({ invoiceId, paymentCents });
      toast.success('Payment applied');
      setShowDrawer(false);
      refetch();
    } catch (error) {
      toast.error('Failed to apply payment');
    }
  };

  const handleExport = () => {
    const toExport = selectedInvoices.size > 0
      ? invoices.filter(i => selectedInvoices.has(i.recordId))
      : filteredInvoices;

    const csv = toExport.map(i =>
      `${i.invoiceNumber || i.recordId},${i.owner?.firstName || ''} ${i.owner?.lastName || ''},${((i.totalCents || 0) / 100).toFixed(2)},${((i.paidCents || 0) / 100).toFixed(2)},${i.status},${i.dueDate || ''}`
    ).join('\n');

    const blob = new Blob([`Invoice #,Owner,Amount,Paid,Status,Due Date\n${csv}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Invoices exported');
  };

  const hasActiveFilters = searchTerm || dateRange !== 'all' || ownerFilter;

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange('all');
    setOwnerFilter('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <nav className="mb-1">
            <ol className="flex items-center gap-1 text-xs text-muted">
              <li><Link to="/payments" className="hover:text-primary">Finance</Link></li>
              <li><ChevronRight className="h-3 w-3" /></li>
              <li className="text-text font-medium">Invoices</li>
            </ol>
          </nav>
          <h1 className="text-lg font-semibold text-text">Invoices</h1>
          <p className="text-xs text-muted mt-0.5">Billing & invoicing command center</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" onClick={() => navigate('/invoices/create')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        <KPITile
          icon={FileText}
          label="Draft"
          value={stats.draft}
          onClick={() => setActiveTab('draft')}
        />
        <KPITile
          icon={FileCheck}
          label="Finalized"
          value={stats.finalized}
          onClick={() => setActiveTab('finalized')}
        />
        <KPITile
          icon={CheckCircle}
          label="Paid"
          value={stats.paid}
          subtext={`of ${stats.total} total`}
          onClick={() => setActiveTab('paid')}
        />
        <KPITile
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          variant={stats.overdue > 0 ? 'warning' : undefined}
          onClick={() => setActiveTab('overdue')}
        />
        <KPITile
          icon={CircleDollarSign}
          label="Outstanding"
          value={`$${stats.outstandingBalance.toLocaleString()}`}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        {[
          { key: 'all', label: 'All' },
          { key: 'draft', label: 'Draft' },
          { key: 'finalized', label: 'Finalized' },
          { key: 'sent', label: 'Sent' },
          { key: 'viewed', label: 'Viewed' },
          { key: 'paid', label: 'Paid' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'void', label: 'Void' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={cn(
                'ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                activeTab === tab.key ? 'bg-primary/10' : 'bg-surface'
              )}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

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
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.size > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
            <span className="text-sm text-muted">{selectedInvoices.size} selected</span>
            <Button variant="outline" size="sm">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Send
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <Ban className="h-3.5 w-3.5 mr-1.5" />
              Void
            </Button>
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">Loading invoices...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
            <p className="font-medium text-text mb-1">Error loading invoices</p>
            <p className="text-sm text-muted">{error.message}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-20 w-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
              <FileText className="h-10 w-10 text-muted" />
            </div>
            <h3 className="font-semibold text-text mb-1">
              {invoices.length === 0 ? "You haven't created any invoices yet" : 'No matching invoices'}
            </h3>
            <p className="text-sm text-muted mb-4 max-w-sm mx-auto">
              {invoices.length === 0
                ? 'Create your first invoice to start billing clients. Invoices can be generated from bookings or created manually.'
                : 'Try adjusting your filters or search term'}
            </p>
            {invoices.length === 0 ? (
              <Button onClick={() => navigate('/invoices/create')}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Your First Invoice
              </Button>
            ) : (
              <Button variant="outline" onClick={clearFilters}>
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
                        checked={selectedInvoices.size === paginatedInvoices.length && paginatedInvoices.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('invoiceNumber')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Invoice #
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('owner')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Owner
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Pets
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('totalCents')}
                        className="flex items-center gap-1 hover:text-text ml-auto"
                      >
                        Amount
                        {sortConfig.key === 'totalCents' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-muted uppercase tracking-wide">
                      Paid
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-muted uppercase tracking-wide">
                      <button
                        onClick={() => handleSort('dueDate')}
                        className="flex items-center gap-1 hover:text-text"
                      >
                        Due Date
                        {sortConfig.key === 'dueDate' && (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map(invoice => (
                    <InvoiceRow
                      key={invoice.recordId}
                      invoice={invoice}
                      isSelected={selectedInvoices.has(invoice.recordId)}
                      onSelect={handleSelectInvoice}
                      onClick={() => handleViewInvoice(invoice)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted">
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length}
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
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Invoice Detail Drawer */}
      <InvoiceDrawer
        invoice={selectedInvoice}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSendEmail={handleSendEmail}
        onMarkPaid={handleMarkPaid}
      />
    </div>
  );
};

export default Invoices;
