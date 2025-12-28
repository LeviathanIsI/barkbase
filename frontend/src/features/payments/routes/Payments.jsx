import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, isWithinInterval } from 'date-fns';
import { useSlideout, SLIDEOUT_TYPES } from '@/components/slideout';
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
  Building,
  Key,
  Link as LinkIcon,
  Shield,
  PieChart,
  Activity,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import SlidePanel from '@/components/ui/SlidePanel';
import StyledSelect from '@/components/ui/StyledSelect';
// Unified loader: replaced inline loading with LoadingState
import LoadingState from '@/components/ui/LoadingState';
import { usePaymentsQuery, usePaymentSummaryQuery, useCreatePaymentMutation } from '../api';
import { useOwnersQuery } from '@/features/owners/api';
import { useEntityNotes } from '@/features/communications/api';
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
  bank_transfer: { label: 'Bank Transfer', icon: Building },
  stripe: { label: 'Stripe', icon: CreditCard },
  ach: { label: 'ACH', icon: Wallet },
  wire: { label: 'Wire', icon: Wallet },
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
const TransactionRow = ({ payment, isSelected, onSelect, onClick, onCustomerClick }) => {
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
        <button className="text-sm font-medium text-primary hover:underline font-mono">
          {(() => {
            const id = payment.recordId || payment.id || '';
            return id.length > 12 ? `${id.slice(0, 12)}...` : id;
          })()}
        </button>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (payment.ownerId && onCustomerClick) {
                  onCustomerClick(payment.ownerId);
                }
              }}
              className="text-sm font-medium text-primary hover:underline truncate block"
            >
              {customerName}
            </button>
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
const TransactionDrawer = ({ payment, isOpen, onClose, onSendReceipt, onAddNote }) => {
  const paymentId = payment?.recordId || payment?.id;
  const { data: notes = [], isLoading: notesLoading } = useEntityNotes('payment', paymentId, { enabled: !!paymentId && isOpen });

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
          <Button variant="outline" className="w-full justify-center" onClick={() => onSendReceipt?.(payment)}>
            <Mail className="h-4 w-4 mr-2" />
            Send Receipt
          </Button>
          {(payment.status === 'CAPTURED' || payment.status === 'SUCCESSFUL') && (
            <Button variant="outline" className="w-full justify-center text-amber-600 hover:text-amber-700">
              <RotateCcw className="h-4 w-4 mr-2" />
              Process Refund
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-center" onClick={() => onAddNote?.(payment)}>
            <FileText className="h-4 w-4 mr-2" />
            Add Note
          </Button>
        </div>

        {/* Notes */}
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-text mb-3">Notes</h4>
          {notesLoading ? (
            <div className="text-sm text-muted">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="text-sm text-muted">No notes yet</div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-surface-secondary rounded-lg p-3">
                  <p className="text-sm text-text whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted">
                    <span>{note.createdByName || 'Staff'}</span>
                    <span>{note.createdAt ? format(new Date(note.createdAt), 'MMM d, h:mm a') : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SlidePanel>
  );
};

// Manual Payment Drawer
const ManualPaymentDrawer = ({ isOpen, onClose, outstandingItems = [], owners = [], onSuccess }) => {
  const [formData, setFormData] = useState({
    ownerId: '',
    amount: '',
    method: 'cash',
    notes: '',
    outstandingItemId: '',
  });
  const [ownerSearch, setOwnerSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createPayment = useCreatePaymentMutation();

  // Filter owners based on search
  const filteredOwners = useMemo(() => {
    if (!ownerSearch) return owners.slice(0, 10);
    const term = ownerSearch.toLowerCase();
    return owners.filter(owner => {
      const name = `${owner.firstName || ''} ${owner.lastName || ''}`.toLowerCase();
      const email = (owner.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    }).slice(0, 10);
  }, [owners, ownerSearch]);

  // Get selected owner details
  const selectedOwner = useMemo(() => {
    return owners.find(o => o.recordId === formData.ownerId || o.id === formData.ownerId);
  }, [owners, formData.ownerId]);

  // Handle selecting from outstanding items
  const handleSelectOutstanding = (item) => {
    setFormData(prev => ({
      ...prev,
      outstandingItemId: item.id,
      ownerId: item.ownerId || '',
      amount: item.amount || '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate owner is selected
    if (!formData.ownerId) {
      toast.error('Please select a customer');
      return;
    }

    // Validate amount
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPayment.mutateAsync({
        ownerId: formData.ownerId,
        amount: parseFloat(formData.amount),
        amountCents: Math.round(parseFloat(formData.amount) * 100),
        paymentMethod: formData.method.toUpperCase(),
        method: formData.method.toUpperCase(),
        status: 'CAPTURED',
        notes: formData.notes,
        customerName: selectedOwner ? `${selectedOwner.firstName || ''} ${selectedOwner.lastName || ''}`.trim() : 'Walk-in',
      });
      toast.success('Payment recorded successfully');
      onSuccess?.();
      onClose();
      setFormData({ ownerId: '', amount: '', method: 'cash', notes: '', outstandingItemId: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ ownerId: '', amount: '', method: 'cash', notes: '', outstandingItemId: '' });
    setOwnerSearch('');
  };

  return (
    <SlidePanel
      open={isOpen}
      onClose={() => { resetForm(); onClose(); }}
      title="Record Manual Payment"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Outstanding Balances Quick Select */}
        {outstandingItems.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Quick Select: Outstanding Balances
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {outstandingItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectOutstanding(item)}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    formData.outstandingItemId === item.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 bg-surface'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-text">{item.ownerName}</span>
                    </div>
                    <span className="font-semibold text-red-600">${item.amount}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">{item.petName} • {item.reason}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Customer Search / Selection */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Customer
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search customers..."
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {(ownerSearch || !formData.ownerId) && filteredOwners.length > 0 && !isSubmitting && (
            <div className="mt-2 max-h-40 overflow-y-auto border border-border rounded-lg">
              {filteredOwners.map(owner => (
                <button
                  key={owner.recordId || owner.id}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, ownerId: owner.recordId || owner.id }));
                    setOwnerSearch('');
                  }}
                  disabled={isSubmitting}
                  className={cn(
                    'w-full p-2 text-left hover:bg-surface/80 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                    formData.ownerId === (owner.recordId || owner.id) && 'bg-primary/5'
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text">
                      {owner.firstName} {owner.lastName}
                    </p>
                    <p className="text-xs text-muted">{owner.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {selectedOwner && !ownerSearch && (
            <div className="mt-2 p-2 bg-primary/5 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text">
                    {selectedOwner.firstName} {selectedOwner.lastName}
                  </p>
                  <p className="text-xs text-muted">{selectedOwner.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, ownerId: '' }))}
                disabled={isSubmitting}
                className="p-1 hover:bg-surface rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4 text-muted" />
              </button>
            </div>
          )}
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Amount *
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'cash', label: 'Cash', icon: Banknote },
              { value: 'card', label: 'Card', icon: CreditCard },
              { value: 'check', label: 'Check', icon: FileText },
              { value: 'bank_transfer', label: 'Bank Transfer', icon: Building },
            ].map(method => (
              <button
                key={method.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, method: method.value }))}
                disabled={isSubmitting}
                className={cn(
                  'p-3 rounded-lg border flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  formData.method === method.value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/50 text-muted'
                )}
              >
                <method.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Notes (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Add payment notes..."
            rows={3}
            disabled={isSubmitting}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => { resetForm(); onClose(); }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={isSubmitting || !formData.amount || !formData.ownerId}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Record Payment
              </>
            )}
          </Button>
        </div>
      </form>
    </SlidePanel>
  );
};

// Stripe Settings Modal
const StripeSettingsModal = ({ isOpen, onClose, processorStatus }) => {
  const isConnected = processorStatus?.status === 'active';

  return (
    <SlidePanel
      open={isOpen}
      onClose={onClose}
      title="Payment Processor Settings"
      size="md"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        <div className={cn(
          'p-4 rounded-lg border',
          isConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              isConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
            )}>
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <div>
              <p className={cn(
                'font-medium',
                isConnected ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
              )}>
                {isConnected ? `Connected: ${processorStatus?.name || 'Stripe'}` : 'Not Connected'}
              </p>
              <p className="text-sm text-muted">
                {isConnected
                  ? `Last sync: ${processorStatus?.lastSync ? format(new Date(processorStatus.lastSync), 'MMM d, h:mm a') : 'N/A'}`
                  : 'Connect Stripe to accept online payments'}
              </p>
            </div>
          </div>
        </div>

        {isConnected ? (
          <>
            {/* Account Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-text">Account Details</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Processor</span>
                  <span className="text-text font-medium">{processorStatus?.name || 'Stripe'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Processing Rate</span>
                  <span className="text-text">{processorStatus?.rate || '2.9% + 30¢'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Status</span>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-text">Quick Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Stripe Dashboard
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Key className="h-4 w-4 mr-2" />
                  View API Keys
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Webhook Settings
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-red-600 mb-3">Danger Zone</h4>
              <Button
                variant="outline"
                className="w-full justify-center text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => toast.info('Disconnect functionality coming soon')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Disconnect Stripe
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Connect Stripe */}
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium text-text mb-2">Connect Stripe</h3>
              <p className="text-sm text-muted mb-6">
                Accept credit cards, debit cards, and online payments securely with Stripe.
              </p>
              <Button onClick={() => toast.info('Stripe connect flow coming soon')}>
                <Shield className="h-4 w-4 mr-2" />
                Connect with Stripe
              </Button>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text">Benefits</h4>
              {[
                'Accept all major credit and debit cards',
                'Secure, PCI-compliant payment processing',
                'Automatic invoicing and receipts',
                'Real-time payment notifications',
              ].map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  {benefit}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SlidePanel>
  );
};

// Contextual Sidebar Component
const PaymentsSidebar = ({ payments, stats, onRecordPayment, onExport, periodToggle, onPeriodToggle }) => {
  // Calculate method breakdown
  const methodBreakdown = useMemo(() => {
    const breakdown = {};
    payments.forEach(p => {
      const method = (p.method || 'card').toLowerCase();
      if (!breakdown[method]) {
        breakdown[method] = { count: 0, amountCents: 0 };
      }
      breakdown[method].count += 1;
      breakdown[method].amountCents += parseInt(p.amountCents, 10) || 0;
    });
    return breakdown;
  }, [payments]);

  const totalRevenue = stats.revenueCollected || 0;
  const cardAmount = (methodBreakdown.card?.amountCents || 0) / 100;
  const cashAmount = (methodBreakdown.cash?.amountCents || 0) / 100;
  const cardPercent = totalRevenue > 0 ? (cardAmount / totalRevenue) * 100 : 0;
  const cashPercent = totalRevenue > 0 ? (cashAmount / totalRevenue) * 100 : 0;

  // Calculate period stats
  const now = new Date();
  const periodStats = useMemo(() => {
    const isWeekly = periodToggle === 'week';
    const start = isWeekly ? startOfWeek(now) : startOfMonth(now);
    const end = isWeekly ? endOfWeek(now) : endOfMonth(now);
    const prevStart = isWeekly ? startOfWeek(subWeeks(now, 1)) : startOfMonth(subMonths(now, 1));
    const prevEnd = isWeekly ? endOfWeek(subWeeks(now, 1)) : endOfMonth(subMonths(now, 1));

    const currentPayments = payments.filter(p => {
      const date = new Date(p.capturedAt || p.createdAt);
      return isWithinInterval(date, { start, end }) &&
        ['CAPTURED', 'SUCCESSFUL', 'COMPLETED', 'SUCCEEDED'].includes(p.status);
    });

    const prevPayments = payments.filter(p => {
      const date = new Date(p.capturedAt || p.createdAt);
      return isWithinInterval(date, { start: prevStart, end: prevEnd }) &&
        ['CAPTURED', 'SUCCESSFUL', 'COMPLETED', 'SUCCEEDED'].includes(p.status);
    });

    const currentTotal = currentPayments.reduce((sum, p) => sum + (parseInt(p.amountCents, 10) || 0), 0) / 100;
    const prevTotal = prevPayments.reduce((sum, p) => sum + (parseInt(p.amountCents, 10) || 0), 0) / 100;
    const change = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    return {
      collected: currentTotal,
      transactions: currentPayments.length,
      avgTransaction: currentPayments.length > 0 ? currentTotal / currentPayments.length : 0,
      change,
    };
  }, [payments, periodToggle, now]);

  // Mock recent payouts (would come from Stripe API)
  const recentPayouts = [
    { id: 'po_1', amount: 2450.00, date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), status: 'paid' },
    { id: 'po_2', amount: 1875.50, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), status: 'paid' },
    { id: 'po_3', amount: 3200.00, date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), status: 'paid' },
  ];

  return (
    <div className="space-y-4">
      {/* Revenue Breakdown Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Revenue Breakdown</h3>
        </div>

        {/* Simple horizontal bar chart */}
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted flex items-center gap-1.5">
                <CreditCard className="h-3 w-3" />
                Card
              </span>
              <span className="text-text font-medium">${cardAmount.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${cardPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted flex items-center gap-1.5">
                <Banknote className="h-3 w-3" />
                Cash
              </span>
              <span className="text-text font-medium">${cashAmount.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${cashPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted">Total</span>
          <span className="text-sm font-semibold text-text">${totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      {/* This Week / This Month Toggle Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-medium text-text">Quick Stats</h3>
          </div>
          <div className="flex bg-surface rounded-lg p-0.5">
            <button
              onClick={() => onPeriodToggle('week')}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                periodToggle === 'week'
                  ? 'bg-white dark:bg-surface-primary text-text shadow-sm'
                  : 'text-muted hover:text-text'
              )}
            >
              Week
            </button>
            <button
              onClick={() => onPeriodToggle('month')}
              className={cn(
                'px-2 py-1 text-xs rounded-md transition-colors',
                periodToggle === 'month'
                  ? 'bg-white dark:bg-surface-primary text-text shadow-sm'
                  : 'text-muted hover:text-text'
              )}
            >
              Month
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Collected</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">${periodStats.collected.toLocaleString()}</span>
              {periodStats.change !== 0 && (
                <span className={cn(
                  'text-xs flex items-center gap-0.5',
                  periodStats.change > 0 ? 'text-green-600' : 'text-red-600'
                )}>
                  {periodStats.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(periodStats.change).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Transactions</span>
            <span className="text-sm font-medium text-text">{periodStats.transactions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted">Avg Transaction</span>
            <span className="text-sm font-medium text-text">${periodStats.avgTransaction.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Recent Payouts Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted" />
            <h3 className="text-sm font-medium text-text">Recent Payouts</h3>
          </div>
          <button className="text-xs text-primary hover:underline">
            View All
          </button>
        </div>

        <div className="space-y-2">
          {recentPayouts.map(payout => (
            <div
              key={payout.id}
              className="flex items-center justify-between p-2 bg-surface rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-xs text-muted">
                  {format(payout.date, 'MMM d')}
                </span>
              </div>
              <span className="text-sm font-medium text-text">${payout.amount.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button
          className="w-full mt-3 pt-3 border-t border-border flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
          onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
        >
          <ExternalLink className="h-3 w-3" />
          Open Stripe Dashboard
        </button>
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-muted" />
          <h3 className="text-sm font-medium text-text">Quick Actions</h3>
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onRecordPayment}
          >
            <Plus className="h-3.5 w-3.5 mr-2" />
            Record Payment
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => toast.info('View Outstanding coming soon')}
          >
            <Clock className="h-3.5 w-3.5 mr-2" />
            View Outstanding
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Export Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => toast.info('Reconciliation coming soon')}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Reconcile
          </Button>
        </div>
      </div>
    </div>
  );
};

const Payments = () => {
  const navigate = useNavigate();
  const { openSlideout } = useSlideout();
  const [currentView, setCurrentView] = useState('overview');
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showOutstanding, setShowOutstanding] = useState(true);
  const [showManualPayment, setShowManualPayment] = useState(false);
  const [showStripeSettings, setShowStripeSettings] = useState(false);
  const [sidebarPeriod, setSidebarPeriod] = useState('week');

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
  const { data: ownersData } = useOwnersQuery();

  // Process payments data - normalize backend response
  const payments = useMemo(() => {
    const rawPayments = paymentsData?.payments || paymentsData?.data?.payments || (Array.isArray(paymentsData) ? paymentsData : []);

    // Transform backend fields to frontend expected format
    return rawPayments.map(p => ({
      ...p,
      // Normalize ID fields
      recordId: p.recordId || p.id,
      // Normalize amount (backend returns both amount and amountCents) - ensure integer
      amountCents: parseInt(p.amountCents, 10) || (p.amount ? Math.round(parseFloat(p.amount) * 100) : 0),
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

    // Ensure amountCents is parsed as integer to avoid string concatenation
    const revenueCollected = captured.reduce((sum, p) => sum + (parseInt(p.amountCents, 10) || 0), 0) / 100;
    const processedAmount = captured.reduce((sum, p) => sum + (parseInt(p.amountCents, 10) || 0), 0) / 100;
    const pendingAmount = pending.reduce((sum, p) => sum + (parseInt(p.amountCents, 10) || 0), 0) / 100;
    const refundedAmount = refunded.reduce((sum, p) => sum + (parseInt(p.amountCents, 10) || 0), 0) / 100;
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

  // DAFE handler for customer click
  const handleCustomerClick = (ownerId) => {
    if (ownerId) {
      navigate(`/customers/${ownerId}`);
    }
  };

  // Send receipt handler - opens receipt email slideout
  const handleSendReceipt = (payment) => {
    if (payment?.ownerId) {
      openSlideout(SLIDEOUT_TYPES.SEND_RECEIPT, {
        ownerId: payment.ownerId,
        payment,
      });
    }
  };

  // Add note handler - opens note slideout
  const handleAddNote = (payment) => {
    const paymentId = payment?.recordId || payment?.id;
    if (paymentId) {
      openSlideout(SLIDEOUT_TYPES.NOTE_CREATE, {
        paymentId,
      });
    }
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
              <li><span>Finance</span></li>
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

          <div>
            <Button size="sm" onClick={() => setShowManualPayment(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Record Payment
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {currentView === 'overview' && (
        <>
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
        </>
      )}

      {/* Overview Tab - Processor Status and Outstanding */}
      {currentView === 'overview' && (
        <>
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
                <Button variant="outline" size="sm" onClick={() => setShowStripeSettings(true)}>
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
        </>
      )}

      {/* Overview Tab - Two Column Layout with Filters, Table, and Sidebar */}
      {currentView === 'overview' && (
        <div className="flex gap-5">
          {/* Left Column: Filters & Transactions Table (70%) */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Filters Toolbar */}
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
                <div className="min-w-[130px]">
                  <StyledSelect
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'CAPTURED', label: 'Captured' },
                      { value: 'PENDING', label: 'Pending' },
                      { value: 'AUTHORIZED', label: 'Authorized' },
                      { value: 'REFUNDED', label: 'Refunded' },
                      { value: 'FAILED', label: 'Failed' },
                    ]}
                    value={statusFilter}
                    onChange={(opt) => setStatusFilter(opt?.value || 'all')}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>

                {/* Method */}
                <div className="min-w-[130px]">
                  <StyledSelect
                    options={[
                      { value: 'all', label: 'All Methods' },
                      { value: 'card', label: 'Card' },
                      { value: 'cash', label: 'Cash' },
                      { value: 'check', label: 'Check' },
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                    ]}
                    value={methodFilter}
                    onChange={(opt) => setMethodFilter(opt?.value || 'all')}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>

                {/* Date Range */}
                <div className="min-w-[130px]">
                  <StyledSelect
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' },
                      { value: 'quarter', label: 'This Quarter' },
                    ]}
                    value={dateRange}
                    onChange={(opt) => setDateRange(opt?.value || 'all')}
                    isClearable={false}
                    isSearchable={false}
                  />
                </div>

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

            {/* Transactions Table */}
            <div className="bg-white dark:bg-surface-primary border border-border rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <LoadingState label="Loading payments…" variant="spinner" />
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
                    <Button size="sm" onClick={() => setShowManualPayment(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Record Payment
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
                    <table className="w-full min-w-[800px]">
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
                            onCustomerClick={handleCustomerClick}
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
                      <div className="min-w-[80px]">
                        <StyledSelect
                          options={[
                            { value: 25, label: '25' },
                            { value: 50, label: '50' },
                            { value: 100, label: '100' },
                          ]}
                          value={pageSize}
                          onChange={(opt) => { setPageSize(Number(opt?.value || 25)); setCurrentPage(1); }}
                          isClearable={false}
                          isSearchable={false}
                        />
                      </div>
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
          </div>

          {/* Right Column: Contextual Sidebar (30%) */}
          <div className="w-80 flex-shrink-0 hidden lg:block">
            <PaymentsSidebar
              payments={payments}
              stats={stats}
              onRecordPayment={() => setShowManualPayment(true)}
              onExport={handleExport}
              periodToggle={sidebarPeriod}
              onPeriodToggle={setSidebarPeriod}
            />
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {currentView === 'analytics' && (
        <div className="space-y-6">
          {/* Analytics Header */}
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text">Payment Analytics</h2>
                <p className="text-sm text-muted">Insights and trends from your payment data</p>
              </div>
            </div>

            {/* Analytics KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-surface rounded-lg">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-text">${stats.revenueCollected.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+15% from last month</p>
              </div>
              <div className="p-4 bg-surface rounded-lg">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Avg Transaction</p>
                <p className="text-2xl font-bold text-text">${stats.avgTransaction.toFixed(2)}</p>
                <p className="text-xs text-muted mt-1">{stats.capturedCount} transactions</p>
              </div>
              <div className="p-4 bg-surface rounded-lg">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-text">{stats.successRate}%</p>
                <p className="text-xs text-green-600 mt-1">Above industry avg</p>
              </div>
              <div className="p-4 bg-surface rounded-lg">
                <p className="text-xs text-muted uppercase tracking-wide mb-1">Refund Rate</p>
                <p className="text-2xl font-bold text-text">
                  {stats.capturedCount > 0 ? ((stats.refundedCount / stats.capturedCount) * 100).toFixed(1) : 0}%
                </p>
                <p className="text-xs text-muted mt-1">${stats.refundedAmount.toLocaleString()} total</p>
              </div>
            </div>

            {/* Payment Methods Breakdown */}
            <div>
              <h3 className="text-sm font-medium text-text mb-3">Payment Methods</h3>
              <div className="space-y-3">
                {['card', 'cash', 'check', 'bank'].map(method => {
                  const methodPayments = payments.filter(p => (p.method || '').toLowerCase() === method);
                  const methodTotal = methodPayments.reduce((sum, p) => sum + (p.amountCents || 0), 0) / 100;
                  const percentage = stats.revenueCollected > 0 ? (methodTotal / stats.revenueCollected) * 100 : 0;
                  const config = METHOD_CONFIG[method] || { label: method, icon: CreditCard };
                  const MethodIcon = config.icon;

                  return (
                    <div key={method} className="flex items-center gap-3">
                      <MethodIcon className="h-4 w-4 text-muted" />
                      <span className="text-sm text-text w-20">{config.label}</span>
                      <div className="flex-1 bg-surface rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted w-20 text-right">${methodTotal.toLocaleString()}</span>
                      <span className="text-xs text-muted w-12 text-right">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Monthly Trend Placeholder */}
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-6">
            <h3 className="font-medium text-text mb-4">Revenue Trend</h3>
            <div className="h-48 flex items-center justify-center border border-dashed border-border rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">Chart visualization coming soon</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Tab */}
      {currentView === 'outstanding' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-text">Outstanding Balances</h2>
                  <p className="text-sm text-muted">Payments requiring attention</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-red-600">
                  ${outstandingItems.reduce((sum, i) => sum + parseFloat(i.amount), 0).toFixed(2)}
                </p>
                <p className="text-xs text-muted">{outstandingItems.length} items</p>
              </div>
            </div>

            {outstandingItems.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-medium text-text mb-1">All caught up!</h3>
                <p className="text-sm text-muted">No outstanding balances at this time</p>
              </div>
            ) : (
              <div className="space-y-3">
                {outstandingItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-text">{item.ownerName}</p>
                        <p className="text-sm text-muted">{item.petName} • {item.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-red-600">${item.amount}</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowManualPayment(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Collect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {currentView === 'settings' && (
        <div className="space-y-6">
          {/* Payment Processor Settings */}
          <div className="bg-white dark:bg-surface-primary border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text">Payment Settings</h2>
                <p className="text-sm text-muted">Configure your payment processing options</p>
              </div>
            </div>

            {/* Processor Card */}
            <div className={cn(
              'p-4 rounded-lg border mb-6',
              isProcessorConnected ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-surface border-border'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    isProcessorConnected ? 'bg-green-100 dark:bg-green-900/30' : 'bg-surface'
                  )}>
                    {isProcessorConnected ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <CreditCard className="h-5 w-5 text-muted" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-text">
                      {isProcessorConnected ? processorStatus.name : 'Payment Processor'}
                    </p>
                    <p className="text-sm text-muted">
                      {isProcessorConnected ? `Rate: ${processorStatus.rate}` : 'Not connected'}
                    </p>
                  </div>
                </div>
                <Button
                  variant={isProcessorConnected ? 'outline' : 'primary'}
                  size="sm"
                  onClick={() => setShowStripeSettings(true)}
                >
                  {isProcessorConnected ? 'Manage' : 'Connect Stripe'}
                </Button>
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-text">Accepted Payment Methods</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'card', label: 'Credit/Debit Cards', icon: CreditCard, enabled: true },
                  { value: 'cash', label: 'Cash', icon: Banknote, enabled: true },
                  { value: 'check', label: 'Check', icon: FileText, enabled: true },
                  { value: 'bank', label: 'Bank Transfer', icon: Building, enabled: false },
                ].map(method => (
                  <div
                    key={method.value}
                    className={cn(
                      'p-3 rounded-lg border flex items-center gap-3',
                      method.enabled ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800' : 'border-border bg-surface'
                    )}
                  >
                    <method.icon className={cn('h-5 w-5', method.enabled ? 'text-green-600' : 'text-muted')} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text">{method.label}</p>
                    </div>
                    <Badge variant={method.enabled ? 'success' : 'neutral'} size="sm">
                      {method.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Settings */}
            <div className="mt-6 pt-6 border-t border-border space-y-4">
              <h3 className="text-sm font-medium text-text">Receipt Settings</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-surface rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted" />
                    <span className="text-sm text-text">Auto-send email receipts</span>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-border" />
                </label>
                <label className="flex items-center justify-between p-3 bg-surface rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted" />
                    <span className="text-sm text-text">Include business logo on receipts</span>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded border-border" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        payment={selectedPayment}
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onSendReceipt={handleSendReceipt}
        onAddNote={handleAddNote}
      />

      {/* Manual Payment Drawer */}
      <ManualPaymentDrawer
        isOpen={showManualPayment}
        onClose={() => setShowManualPayment(false)}
        outstandingItems={outstandingItems}
        owners={ownersData || []}
        onSuccess={() => refetch()}
      />

      {/* Stripe Settings Modal */}
      <StripeSettingsModal
        isOpen={showStripeSettings}
        onClose={() => setShowStripeSettings(false)}
        processorStatus={processorStatus}
      />
    </div>
  );
};

export default Payments;
