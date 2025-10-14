import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useReportDashboard } from '../api';
import { usePaymentSummaryQuery } from '@/features/payments/api';
import { useDashboardOccupancy } from '@/features/dashboard/api';
import { useTenantStore } from '@/stores/tenant';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/lib/acl';

const formatCurrency = (cents = 0, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);

const RevenueByMethodChart = lazy(() => import('../components/RevenueByMethodChart'));
const WeeklyOccupancyChart = lazy(() => import('../components/WeeklyOccupancyChart'));

const Reports = () => {
  const navigate = useNavigate();
  const tenant = useTenantStore((state) => state.tenant);
  const role = useAuthStore((state) => state.role);
  const permissionContext = {
    role,
    plan: tenant?.plan,
    features: tenant?.features,
    featureFlags: tenant?.featureFlags,
  };
  const canViewReports = can(permissionContext, 'viewReports');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const dashboardQuery = useReportDashboard({ month }, { enabled: canViewReports });
  const paymentsSummaryQuery = usePaymentSummaryQuery({ enabled: canViewReports });
  const occupancyQuery = useDashboardOccupancy({ enabled: canViewReports });

  useEffect(() => {
    if (!canViewReports) {
      return;
    }
    if (dashboardQuery.isError) {
      toast.error(dashboardQuery.error?.message ?? 'Unable to load revenue metrics', { recordId: 'reports-dashboard-error',
      });
    }
  }, [canViewReports, dashboardQuery.isError, dashboardQuery.error]);

  useEffect(() => {
    if (!canViewReports) {
      return;
    }
    if (paymentsSummaryQuery.isError) {
      toast.error(paymentsSummaryQuery.error?.message ?? 'Unable to load payment summary', { recordId: 'reports-payments-error',
      });
    }
  }, [canViewReports, paymentsSummaryQuery.isError, paymentsSummaryQuery.error]);

  useEffect(() => {
    if (!canViewReports) {
      return;
    }
    if (occupancyQuery.isError) {
      toast.error(occupancyQuery.error?.message ?? 'Unable to load occupancy data', { recordId: 'reports-occupancy-error',
      });
    }
  }, [canViewReports, occupancyQuery.isError, occupancyQuery.error]);

  const revenueByMethod = useMemo(
    () =>
      (paymentsSummaryQuery.data?.byMethod ?? []).map((item) => ({
        method: item.method ?? 'Unknown',
        amount: (item.amountCents ?? 0) / 100,
      })),
    [paymentsSummaryQuery.data],
  );

  const occupancyData = useMemo(
    () =>
      (occupancyQuery.data ?? []).map((entry) => ({
        day: entry.dayLabel,
        occupancy: entry.occupancy,
      })),
    [occupancyQuery.data],
  );

  const handleRefresh = () => {
    dashboardQuery.refetch();
    paymentsSummaryQuery.refetch();
    occupancyQuery.refetch();
  };

  if (!canViewReports) {
    return (
      <DashboardLayout
        title="Reports & Analytics"
        description="Upgrade to unlock revenue analytics, trend charts, and export tools."
        actions={
          <Button variant="secondary" size="sm" onClick={() => navigate('/settings/billing')}>
            Compare plans
          </Button>
        }
      >
        <Card>
          <div className="space-y-4 text-sm text-muted">
            <p>
              Advanced reports, revenue dashboards, and chart exports are available on BarkBase PRO. Upgrade to bring
              financial, occupancy, and staff insights into one workspace.
            </p>
            <Button onClick={() => navigate('/settings/billing')}>Upgrade to PRO</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Reports & Analytics"
      description="Drill into financials, occupancy, and staff performance."
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={dashboardQuery.isFetching || paymentsSummaryQuery.isFetching || occupancyQuery.isFetching}>
            Refresh
          </Button>
          <Button variant="ghost" size="sm">Schedule Email</Button>
          <Button size="sm">Export CSV</Button>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Monthly Revenue" description="Captured payments for the selected month.">
          <div className="mb-4 flex items-center justify-between text-sm">
            <div>
              <p className="text-xs uppercase text-muted">Total revenue</p>
              {dashboardQuery.isLoading ? (
                <Skeleton className="mt-1 h-6 w-32" />
              ) : dashboardQuery.isError ? (
                <span className="text-sm text-danger">Failed to load revenue.</span>
              ) : (
                <p className="text-2xl font-semibold text-text">
                  {formatCurrency(dashboardQuery.data?.revenueCents ?? 0)}
                </p>
              )}
            </div>
            <label className="text-xs font-medium text-text">
              Month
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="ml-2 rounded-lg border border-border bg-surface px-3 py-1"
              />
            </label>
          </div>
          <div className="h-64">
            {paymentsSummaryQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : paymentsSummaryQuery.isError ? (
              <p className="text-sm text-danger">Unable to load payment breakdown.</p>
            ) : revenueByMethod.length === 0 ? (
              <p className="text-sm text-muted">No captured payments to summarise.</p>
            ) : (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <RevenueByMethodChart data={revenueByMethod} />
              </Suspense>
            )}
          </div>
        </Card>
        <Card title="Weekly Occupancy" description="Current check-ins impacting capacity.">
          <div className="h-72">
            {occupancyQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : occupancyQuery.isError ? (
              <p className="text-sm text-danger">Unable to load occupancy.</p>
            ) : occupancyData.length === 0 ? (
              <p className="text-sm text-muted">No segments scheduled for this week.</p>
            ) : (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <WeeklyOccupancyChart data={occupancyData} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Bookings this Month" description="Check-ins for the selected period.">
          {dashboardQuery.isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : dashboardQuery.isError ? (
            <span className="text-sm text-danger">—</span>
          ) : (
            <p className="text-2xl font-semibold text-text">
              {dashboardQuery.data?.bookingCount ?? 0}
            </p>
          )}
        </Card>
        <Card title="Active Payments" description="Status snapshot.">
          {paymentsSummaryQuery.isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : paymentsSummaryQuery.isError ? (
            <span className="text-sm text-danger">—</span>
          ) : (
            <p className="text-2xl font-semibold text-text">
              {(paymentsSummaryQuery.data?.byStatus ?? []).reduce(
                (acc, item) => acc + (item.count ?? 0),
                0,
              )}
            </p>
          )}
        </Card>
        <Card title="Average Occupancy" description="Weekly data averaged across days.">
          {occupancyQuery.isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : occupancyQuery.isError ? (
            <span className="text-sm text-danger">—</span>
          ) : (
            <p className="text-2xl font-semibold text-text">
              {occupancyData.length
                ? `${Math.round(
                    occupancyData.reduce((acc, item) => acc + item.occupancy, 0) /
                      occupancyData.length,
                  )}%`
                : '0%'}
            </p>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
