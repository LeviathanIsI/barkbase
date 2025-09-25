import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { usePaymentsQuery, usePaymentSummaryQuery } from '../api';

const formatCurrency = (cents = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);

const statusVariant = {
  CAPTURED: 'success',
  PENDING: 'warning',
  AUTHORIZED: 'info',
  FAILED: 'danger',
  REFUNDED: 'neutral',
};

const Payments = () => {
  const [page, setPage] = useState(1);
  const paymentsQuery = usePaymentsQuery({ page });
  const summaryQuery = usePaymentSummaryQuery();

  const payments = paymentsQuery.data?.items ?? [];
  const meta = paymentsQuery.data?.meta;
  const summary = summaryQuery.data;

  useEffect(() => {
    if (paymentsQuery.isError) {
      toast.error(paymentsQuery.error?.message ?? 'Unable to load payments', {
        id: 'payments-error',
      });
    }
  }, [paymentsQuery.isError, paymentsQuery.error]);

  useEffect(() => {
    if (summaryQuery.isError) {
      toast.error(summaryQuery.error?.message ?? 'Unable to load payment summary', {
        id: 'payments-summary-error',
      });
    }
  }, [summaryQuery.isError, summaryQuery.error]);

  const disablePrev = !meta || meta.page <= 1 || paymentsQuery.isLoading;
  const disableNext = !meta || meta.page >= meta.totalPages || paymentsQuery.isLoading;

  const statusBreakdown = useMemo(
    () => summary?.byStatus ?? [],
    [summary],
  );

  const handleRefresh = () => {
    paymentsQuery.refetch();
    summaryQuery.refetch();
  };

  return (
    <DashboardLayout
      title="Payments & Deposits"
      description="Securely capture deposits, reconcile payouts, and sync to accounting."
      actions={
        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={paymentsQuery.isFetching || summaryQuery.isFetching}>
          Refresh
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Captured Revenue" description="Total of successful payments.">
          {summaryQuery.isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : summaryQuery.isError ? (
            <p className="text-sm text-danger">Failed to load summary.</p>
          ) : (
            <p className="text-3xl font-semibold text-text">
              {formatCurrency(summary?.totalCapturedCents ?? 0)}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            {summary?.capturedCount ?? 0} payments captured
          </p>
        </Card>
        <Card title="Status Mix" description="Distribution by payment state.">
          {summaryQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : summaryQuery.isError ? (
            <p className="text-xs text-danger">Unable to load distribution.</p>
          ) : statusBreakdown.length === 0 ? (
            <p className="text-xs text-muted">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {statusBreakdown.map((item) => (
                <li key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[item.status] ?? 'neutral'}>{item.status}</Badge>
                    <span className="text-muted">{item.count} payments</span>
                  </div>
                  <span className="font-medium text-text">
                    {formatCurrency(item.amountCents ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent Capture" description="Latest successful transaction.">
          {summaryQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : summaryQuery.isError ? (
            <p className="text-xs text-danger">Unable to load latest capture.</p>
          ) : summary?.lastCaptured ? (
            <div className="text-sm">
              <p className="font-medium text-text">{formatCurrency(summary.lastCaptured.amountCents)}</p>
              <p className="text-xs text-muted">
                {summary.lastCaptured.owner
                  ? `${summary.lastCaptured.owner.firstName} ${summary.lastCaptured.owner.lastName}`
                  : 'Owner not set'}
              </p>
              <p className="text-xs text-muted">
                {new Date(summary.lastCaptured.createdAt).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted">No captured payments yet.</p>
          )}
        </Card>
      </div>

      <Card
        title="Recent Payments"
        description="Integrate with Stripe, Square, or custom processors via backend drivers."
      >
        <div className="overflow-hidden rounded-xl border border-border/60">
          {paymentsQuery.isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : paymentsQuery.isError ? (
            <div className="space-y-2 p-4 text-sm text-danger">
              <p>Failed to load payments.</p>
              <Button variant="ghost" size="sm" onClick={handleRefresh}>
                Retry
              </Button>
            </div>
          ) : payments.length === 0 ? (
            <p className="p-4 text-sm text-muted">No payments recorded.</p>
          ) : (
            <table className="w-full divide-y divide-border/70 text-sm">
              <thead className="bg-surface/80 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 bg-surface">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text">
                        {payment.booking?.pet?.name ?? payment.bookingId ?? 'Booking'}
                      </p>
                      <p className="text-xs text-muted">{payment.booking?.id}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {payment.owner
                        ? `${payment.owner.firstName} ${payment.owner.lastName}`
                        : 'Unknown owner'}
                    </td>
                    <td className="px-4 py-3 text-text">
                      {formatCurrency(payment.amountCents, payment.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[payment.status] ?? 'neutral'}>
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {meta && payments.length > 0 ? (
          <div className="mt-4 flex items-center justify-between text-xs text-muted">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled={disablePrev} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disableNext}
                onClick={() => setPage((value) => (meta ? Math.min(meta.totalPages, value + 1) : value))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </DashboardLayout>
  );
};

export default Payments;
