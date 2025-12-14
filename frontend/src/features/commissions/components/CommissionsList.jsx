import { useState } from 'react';
import { format } from 'date-fns';
import {
  DollarSign,
  Check,
  Clock,
  CreditCard,
  XCircle,
  Loader2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import StyledSelect from '@/components/ui/StyledSelect';
import { cn } from '@/lib/cn';
import {
  useCommissionsQuery,
  useApproveCommissionMutation,
  useMarkCommissionPaidMutation,
} from '../api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Check,
  },
  paid: {
    label: 'Paid',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    icon: CreditCard,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle,
  },
};

const CommissionsList = ({ staffId, showActions = true }) => {
  const [statusFilter, setStatusFilter] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const { data: commissions = [], isLoading, error } = useCommissionsQuery({
    staffId,
    status: statusFilter || undefined,
  });

  const approveMutation = useApproveCommissionMutation();
  const markPaidMutation = useMarkCommissionPaidMutation();

  const handleApprove = async (commission) => {
    setProcessingId(commission.id);
    try {
      await approveMutation.mutateAsync(commission.id);
      toast.success('Commission approved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve commission');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkPaid = async (commission) => {
    const reference = prompt('Enter payment reference (optional):');
    if (reference === null) return; // User cancelled

    setProcessingId(commission.id);
    try {
      await markPaidMutation.mutateAsync({
        commissionId: commission.id,
        paymentReference: reference || undefined,
      });
      toast.success('Commission marked as paid');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to mark commission as paid');
    } finally {
      setProcessingId(null);
    }
  };

  // Calculate totals
  const totals = commissions.reduce(
    (acc, c) => ({
      total: acc.total + (c.commissionAmount || 0),
      pending: acc.pending + (c.status === 'pending' ? c.commissionAmount || 0 : 0),
      approved: acc.approved + (c.status === 'approved' ? c.commissionAmount || 0 : 0),
      paid: acc.paid + (c.status === 'paid' ? c.commissionAmount || 0 : 0),
    }),
    { total: 0, pending: 0, approved: 0, paid: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load commissions: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-surface-secondary rounded-lg">
              <DollarSign className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-text-secondary">Total</p>
              <p className="text-xl font-bold">${totals.total.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-text-secondary">Pending</p>
              <p className="text-xl font-bold">${totals.pending.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Check className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-text-secondary">Approved</p>
              <p className="text-xl font-bold">${totals.approved.toFixed(2)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-text-secondary">Paid</p>
              <p className="text-xl font-bold">${totals.paid.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="min-w-[130px]">
            <StyledSelect
              options={[
                { value: '', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'paid', label: 'Paid' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              value={statusFilter}
              onChange={(opt) => setStatusFilter(opt?.value || '')}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {commissions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-text-secondary">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No commissions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {commissions.map((commission) => {
            const statusConfig = STATUS_CONFIG[commission.status] || STATUS_CONFIG.pending;
            const StatusIcon = statusConfig.icon;
            const isProcessing = processingId === commission.id;

            return (
              <Card key={commission.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {commission.staffName && (
                        <span className="font-medium">{commission.staffName}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-text-secondary">
                      {commission.serviceName && (
                        <span>{commission.serviceName}</span>
                      )}
                      {commission.bookingStartDate && (
                        <span>
                          Booking: {format(new Date(commission.bookingStartDate), 'MMM d')}
                          {commission.bookingEndDate && (
                            <> - {format(new Date(commission.bookingEndDate), 'MMM d')}</>
                          )}
                        </span>
                      )}
                      <span>
                        Created: {format(new Date(commission.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <div className="mt-2 text-sm">
                      <span className="text-gray-500 dark:text-text-secondary">
                        Booking: ${commission.bookingAmount?.toFixed(2)} ×{' '}
                        {commission.rateType === 'percentage'
                          ? `${commission.rateValue}%`
                          : `$${commission.rateValue}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${commission.commissionAmount?.toFixed(2)}
                    </p>

                    {showActions && (
                      <div className="flex gap-2 mt-3 justify-end">
                        {commission.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(commission)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        )}
                        {commission.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(commission)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CreditCard className="w-4 h-4 mr-1" />
                                Mark Paid
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {commission.paymentReference && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-text-secondary">
                    Payment Ref: {commission.paymentReference}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CommissionsList;

