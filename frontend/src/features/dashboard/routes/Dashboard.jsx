import { Suspense, lazy } from 'react';
import { CalendarClock, Dog, TrendingUp, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useDashboardOccupancy, useDashboardStats, useDashboardVaccinations } from '../api';
import { useKennelAvailability } from '@/features/kennels/api';
import { useOnboardingStatus, useOnboardingDismissMutation } from '@/features/tenants/api';
import OnboardingChecklist from '../components/OnboardingChecklist';

const metricIcons = [CalendarClock, Dog, TrendingUp, Users];
const metricLabels = ['Active Bookings', 'Checked In Today', 'Waitlist', 'New Clients'];

const DashboardCharts = lazy(() => import('../components/Charts'));

const Dashboard = () => {
  const statsQuery = useDashboardStats();
  const occupancyQuery = useDashboardOccupancy();
  const vaccinationsQuery = useDashboardVaccinations({ limit: 5 });
  const kennelQuery = useKennelAvailability();
  const onboardingQuery = useOnboardingStatus();
  const dismissOnboarding = useOnboardingDismissMutation();

  const metrics = metricLabels.map((label, index) => ({
    label,
    value:
      statsQuery.data?.[
        ['activeBookings', 'checkedInToday', 'waitlist', 'newClients'][index]
      ] ?? 0,
    icon: metricIcons[index],
  }));

  const occupancyData = occupancyQuery.data?.map((item) => ({
    day: item.dayLabel,
    occupancy: item.occupancy,
  })) ?? [];

  const vaccinations = vaccinationsQuery.data ?? [];
  const kennelAvailability = kennelQuery.data ?? [];
  const onboardingStatus = onboardingQuery.data;
  const totalSteps = onboardingStatus?.progress?.total ?? onboardingStatus?.checklist?.length ?? 0;
  const completedSteps = onboardingStatus?.progress?.completed ?? 0;
  const showOnboarding = Boolean(
    onboardingStatus &&
      !onboardingStatus.dismissed &&
      totalSteps > 0 &&
      completedSteps < totalSteps,
  );

  return (
    <DashboardLayout
      title="Kennel Overview"
      description="Monitor occupancy, check-ins, and upcoming actions across your locations."
      actions={<Button>New Booking</Button>}
    >
      {onboardingQuery.isLoading ? (
        <Card className="mb-6">
          <Skeleton className="h-32 w-full" />
        </Card>
      ) : null}
      {showOnboarding ? (
        <div className="mb-6">
          <OnboardingChecklist
            status={onboardingStatus}
            isMutating={dismissOnboarding.isPending}
            onDismiss={(dismissed) => dismissOnboarding.mutate(dismissed)}
          />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <Skeleton className="h-24 w-full" />
              </Card>
            ))
          : metrics.map((metric) => {
              const IconComponent = metric.icon;

              return (
                <Card key={metric.label}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-muted">{metric.label}</p>
                      <p className="mt-2 text-3xl font-semibold text-text">{metric.value}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 p-3 text-primary">
                      <IconComponent className="h-6 w-6" />
                    </span>
                  </div>
                </Card>
              );
            })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr,1fr]">
        <Card title="Occupancy by Day" description="Hover to inspect capacity trends.">
          <div className="h-64 w-full">
            {occupancyQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <DashboardCharts occupancyData={occupancyData} />
              </Suspense>
            )}
          </div>
        </Card>
        <Card title="Vaccinations Due" description="Automatic reminders scheduled 90/60/30 days ahead.">
          {vaccinationsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : vaccinations.length ? (
            <ul className="space-y-3 text-sm">
              {vaccinations.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.petName}</p>
                    <p className="text-xs text-muted">{item.ownerName ?? 'Primary owner pending'}</p>
                  </div>
                  <Badge variant={item.severity === 'danger' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info'}>
                    {item.vaccine} · {item.daysUntil}d
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No upcoming expirations in the next 180 days.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Realtime Feed" description="Socket updates appear instantly across devices.">
          <p className="text-sm text-muted">Activity feed integration coming soon.</p>
        </Card>
        <Card title="Capacity Snapshot" description="Compare kennel types at a glance.">
          {kennelQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {kennelAvailability.map((kennel) => (
                <div key={kennel.id} className="rounded-xl border border-border/60 p-4">
                  <p className="text-xs uppercase text-muted">{kennel.name}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {kennel.occupied} / {kennel.capacity}
                  </p>
                  <p className="text-xs text-muted">Available today: {kennel.available}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
