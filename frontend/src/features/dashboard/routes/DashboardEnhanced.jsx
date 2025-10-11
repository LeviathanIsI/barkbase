import { Suspense, lazy } from 'react';
import {
  CalendarClock, Dog, TrendingUp, Users, AlertTriangle, HeartPulse,
  MessageCircle, Grid3x3, DollarSign, UsersRound, BarChart3, BriefcaseMedical
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import {
  useDashboardStats,
  useDashboardOccupancy,
  useDashboardVaccinations,
  useShiftHandoff,
  useEmergencyAccess,
  useWellnessMonitoring,
  useParentCommunication,
  useFacilityHeatmap,
  useRevenueOptimizer,
  useSocialCompatibility,
  useStaffingIntelligence,
  useCustomerCLV,
  useIncidentAnalytics
} from '../api';
import { useKennelAvailability } from '@/features/kennels/api';
import { useOnboardingStatus, useOnboardingDismissMutation } from '@/features/tenants/api';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { format } from 'date-fns';

const metricIcons = [CalendarClock, Dog, TrendingUp, Users];
const metricLabels = ['Active Bookings', 'Checked In Today', 'Waitlist', 'New Clients'];

const DashboardCharts = lazy(() => import('../components/Charts'));

const DashboardEnhanced = () => {
  const statsQuery = useDashboardStats();
  const occupancyQuery = useDashboardOccupancy();
  const vaccinationsQuery = useDashboardVaccinations({ limit: 5 });
  const kennelQuery = useKennelAvailability();
  const onboardingQuery = useOnboardingStatus();
  const dismissOnboarding = useOnboardingDismissMutation();

  // New widget queries
  const shiftHandoffQuery = useShiftHandoff();
  const emergencyQuery = useEmergencyAccess();
  const wellnessQuery = useWellnessMonitoring();
  const parentCommQuery = useParentCommunication();
  const heatmapQuery = useFacilityHeatmap();
  const revenueQuery = useRevenueOptimizer();
  const socialQuery = useSocialCompatibility();
  const staffingQuery = useStaffingIntelligence();
  const clvQuery = useCustomerCLV();
  const incidentQuery = useIncidentAnalytics();

  const metrics = metricLabels.map((label, index) => ({
    label,
    value: statsQuery.data?.[['activeBookings', 'checkedInToday', 'waitlist', 'newClients'][index]] ?? 0,
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
    onboardingStatus && !onboardingStatus.dismissed && totalSteps > 0 && completedSteps < totalSteps
  );

  // New widget data
  const shiftHandoff = shiftHandoffQuery.data;
  const emergencyAccess = emergencyQuery.data ?? [];
  const wellness = wellnessQuery.data;
  const parentComm = parentCommQuery.data;
  const heatmap = heatmapQuery.data ?? [];
  const revenue = revenueQuery.data;
  const social = socialQuery.data;
  const staffing = staffingQuery.data;
  const clv = clvQuery.data;
  const incidents = incidentQuery.data;

  return (
    <DashboardLayout
      title="Kennel Overview"
      description="Monitor occupancy, check-ins, and operational intelligence across your facilities."
      actions={<Button>New Booking</Button>}
    >
      {/* Onboarding */}
      {onboardingQuery.isLoading && (
        <Card className="mb-6">
          <Skeleton className="h-32 w-full" />
        </Card>
      )}
      {showOnboarding && (
        <div className="mb-6">
          <OnboardingChecklist
            status={onboardingStatus}
            isMutating={dismissOnboarding.isPending}
            onDismiss={(dismissed) => dismissOnboarding.mutate(dismissed)}
          />
        </div>
      )}

      {/* 1. SHIFT HANDOFF WIDGET - Critical for staff transitions */}
      {shiftHandoffQuery.isLoading ? (
        <Card className="mb-6">
          <Skeleton className="h-48 w-full" />
        </Card>
      ) : shiftHandoff && (shiftHandoff.alerts?.length > 0 || shiftHandoff.tasks?.length > 0) ? (
        <Card
          title="Today's Shift Handoff"
          description="Critical information for staff transitions"
          className="mb-6 border-l-4 border-l-warning"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-danger" />
                Critical Alerts ({shiftHandoff.alerts?.length || 0})
              </h4>
              <ul className="space-y-2">
                {shiftHandoff.alerts?.slice(0, 3).map((alert) => (
                  <li key={alert.id} className="rounded-lg border border-danger/30 bg-danger/5 p-2 text-xs">
                    <p className="font-semibold">{alert.petName} - {alert.kennelName}</p>
                    <p className="text-muted">{alert.message}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-warning" />
                Pending Tasks ({shiftHandoff.tasks?.length || 0})
              </h4>
              <ul className="space-y-2">
                {shiftHandoff.tasks?.slice(0, 3).map((task) => (
                  <li key={task.id} className="rounded-lg border border-border p-2 text-xs">
                    <p className="font-semibold">{task.petName}</p>
                    <p className="text-muted">{task.task}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageCircle className="h-4 w-4 text-info" />
                Staff Notes ({shiftHandoff.staffNotes?.length || 0})
              </h4>
              <ul className="space-y-2">
                {shiftHandoff.staffNotes?.slice(0, 3).map((note) => (
                  <li key={note.id} className="rounded-lg border border-border p-2 text-xs">
                    <p className="font-semibold">{note.petName}</p>
                    <p className="text-muted">{note.note}</p>
                    <p className="mt-1 text-xs text-muted">- {note.staffName}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Core Metrics */}
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

      {/* 2. EMERGENCY QUICK ACCESS & 3. WELLNESS MONITORING */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Emergency Quick Access"
          description="Critical medical info & emergency contacts"
          className="border-l-4 border-l-danger"
        >
          {emergencyQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : emergencyAccess.length > 0 ? (
            <div className="space-y-3">
              {emergencyAccess.slice(0, 3).map((pet) => (
                <div key={pet.id} className="rounded-lg border border-danger/30 bg-danger/5 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BriefcaseMedical className="h-4 w-4 text-danger" />
                        <p className="font-semibold">{pet.petName}</p>
                        <Badge variant="neutral" className="text-xs">{pet.kennelName}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted">{pet.medicalNotes?.substring(0, 100)}...</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                          📞 {pet.ownerPhone || 'No phone'}
                        </Button>
                        {pet.vetInfo && (
                          <Badge variant="info" className="text-xs">Vet: {pet.vetInfo}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No pets with critical medical flags currently boarding.</p>
          )}
        </Card>

        <Card
          title="Pet Wellness Watch"
          description="Health monitoring & pattern detection"
        >
          {wellnessQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : wellness?.concerns?.length > 0 ? (
            <div className="space-y-3">
              {wellness.concerns.slice(0, 5).map((concern, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border border-border p-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <HeartPulse className="h-4 w-4 text-warning" />
                      <p className="text-sm font-semibold">{concern.petName}</p>
                    </div>
                    <p className="text-xs text-muted">{concern.message}</p>
                  </div>
                  <Badge variant={concern.severity === 'danger' ? 'danger' : 'warning'}>
                    {concern.type.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              <p className="text-xs text-muted">Monitoring {wellness.totalMonitored} active pets</p>
            </div>
          ) : (
            <p className="text-sm text-success">✓ All {wellness?.totalMonitored || 0} monitored pets are healthy!</p>
          )}
        </Card>
      </div>

      {/* 4. PARENT COMMUNICATION HUB & 6. REVENUE OPTIMIZER */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Parent Updates Due"
          description="Photo updates reduce calls by 45%"
        >
          {parentCommQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : parentComm ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-2xl font-bold">{parentComm.needsUpdate?.length || 0}</p>
                <Badge variant={parentComm.needsUpdate?.length > 5 ? 'warning' : 'success'}>
                  {parentComm.updateRate}% updated today
                </Badge>
              </div>
              {parentComm.needsUpdate?.length > 0 ? (
                <ul className="space-y-2">
                  {parentComm.needsUpdate.slice(0, 5).map((pet) => (
                    <li key={pet.id} className="flex items-center justify-between text-sm">
                      <span>{pet.petName} - {pet.ownerName}</span>
                      <Badge variant={pet.priority === 'high' ? 'danger' : 'neutral'} className="text-xs">
                        {pet.priority === 'high' ? 'High Priority' : `Day ${pet.daysStayed}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-success">✓ All parents received updates today!</p>
              )}
            </div>
          ) : null}
        </Card>

        <Card
          title="Revenue Optimizer"
          description="AI-driven revenue opportunities"
          className="border-l-4 border-l-success"
        >
          {revenueQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : revenue ? (
            <div>
              <div className="mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-success" />
                  <p className="text-2xl font-bold text-success">+${revenue.potentialRevenue?.toFixed(0) || 0}</p>
                </div>
                <p className="text-xs text-muted">Potential revenue this week</p>
              </div>
              <ul className="space-y-2">
                {revenue.opportunities?.map((opp, idx) => (
                  <li key={idx} className="rounded-lg border border-border bg-success/5 p-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{opp.message}</p>
                        <p className="text-xs text-muted">{opp.action}</p>
                      </div>
                      <Badge variant="success" className="text-xs">+${opp.potential.toFixed(0)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      {/* Occupancy Chart & Vaccinations */}
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

      {/* 5. FACILITY HEATMAP & 7. SOCIAL COMPATIBILITY */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Live Facility Heatmap"
          description="Real-time kennel status visualization"
        >
          {heatmapQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : heatmap.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {heatmap.map((kennel) => {
                const statusColors = {
                  available: 'border-success bg-success/10 text-success',
                  reserved: 'border-warning bg-warning/10 text-warning',
                  occupied: 'border-danger bg-danger/10 text-danger',
                };
                return (
                  <div
                    key={kennel.id}
                    className={`rounded-lg border-2 p-2 text-center ${statusColors[kennel.status]}`}
                    title={kennel.pet ? `${kennel.pet.name} - ${kennel.pet.ownerName}` : 'Available'}
                  >
                    <p className="text-xs font-bold">{kennel.name}</p>
                    <p className="text-xs">{kennel.type}</p>
                    {kennel.pet && (
                      <p className="mt-1 truncate text-xs opacity-80">{kennel.pet.name}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted">No kennels configured</p>
          )}
        </Card>

        <Card
          title="Social Play Groups"
          description="AI-suggested compatible play groups"
        >
          {socialQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : social ? (
            <div className="space-y-4">
              {social.suggestedGroups?.map((group, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-success/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{group.name}</p>
                    <Badge variant="success">{group.compatibilityScore}% match</Badge>
                  </div>
                  <p className="text-xs text-muted">{group.recommendedTime}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.pets?.slice(0, 5).map((pet, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-2 py-1 text-xs">{pet.name}</span>
                    ))}
                  </div>
                </div>
              ))}
              {social.warnings?.length > 0 && (
                <div className="rounded-lg border border-warning bg-warning/5 p-2">
                  <p className="text-xs font-semibold text-warning">⚠️ Individual Play Only:</p>
                  {social.warnings.slice(0, 3).map((warn, i) => (
                    <p key={i} className="text-xs text-muted">{warn.petName} - {warn.warnings[0]}</p>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      {/* 8. STAFFING INTELLIGENCE & 9. CUSTOMER CLV */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Staffing Optimizer"
          description="Predictive staffing recommendations"
        >
          {staffingQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : staffing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Today's Status</p>
                  <p className="text-2xl font-bold">{staffing.today?.currentStaff} / {staffing.today?.recommended} staff</p>
                </div>
                <Badge variant={staffing.today?.status === 'optimal' ? 'success' : 'warning'}>
                  {staffing.today?.status}
                </Badge>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">Tomorrow's Forecast</p>
                <p className="text-xs text-muted">{staffing.tomorrow?.expectedCheckIns} check-ins expected</p>
                <p className="text-xs text-muted">Recommended: {staffing.tomorrow?.recommended} staff</p>
                {staffing.tomorrow?.skillsNeeded?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold">Skills Needed:</p>
                    {staffing.tomorrow.skillsNeeded.map((skill, i) => (
                      <Badge key={i} variant="info" className="mr-1 mt-1 text-xs">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Card>

        <Card
          title="Customer Intelligence (CLV)"
          description="VIP clients & churn prediction"
        >
          {clvQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : clv ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-2xl font-bold">${clv.totalRevenue?.toFixed(0) || 0}</p>
                <Badge variant="neutral">{clv.activeCustomers} active</Badge>
              </div>
              {clv.atRiskCustomers?.length > 0 && (
                <div className="mb-3 rounded-lg border border-danger bg-danger/5 p-2">
                  <p className="text-xs font-semibold text-danger">⚠️ VIP Clients At Risk:</p>
                  {clv.atRiskCustomers.slice(0, 3).map((customer, i) => (
                    <div key={i} className="mt-1 flex items-center justify-between text-xs">
                      <span>{customer.name}</span>
                      <Badge variant="danger" className="text-xs">${customer.lifetimeValue.toFixed(0)} LTV</Badge>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-semibold">Top VIP Clients:</p>
                {clv.vipCustomers?.slice(0, 5).map((customer, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span>{customer.name}</span>
                    <Badge variant="success" className="text-xs">${customer.lifetimeValue.toFixed(0)}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      {/* 10. INCIDENT ANALYTICS */}
      <Card
        title="Incident & Trend Analytics"
        description="Pattern detection for proactive prevention"
      >
        {incidentQuery.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : incidents ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="mb-2 text-sm font-semibold">Total Incidents (90 days)</p>
              <p className="text-3xl font-bold">{incidents.totalIncidents}</p>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Minor:</span>
                  <Badge variant="info">{incidents.bySeverity?.minor || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Moderate:</span>
                  <Badge variant="warning">{incidents.bySeverity?.moderate || 0}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Major:</span>
                  <Badge variant="danger">{incidents.bySeverity?.major || 0}</Badge>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Kennel Hotspots</p>
              <ul className="space-y-1">
                {incidents.kennelHotspots?.slice(0, 5).map((hotspot, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span>{hotspot.kennel}</span>
                    <Badge variant="warning">{hotspot.incidents} incidents</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Recommendations</p>
              <ul className="space-y-2">
                {incidents.recommendations?.slice(0, 3).map((rec, i) => (
                  <li key={i} className="rounded-lg border border-warning bg-warning/5 p-2 text-xs">{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Card>
    </DashboardLayout>
  );
};

export default DashboardEnhanced;
