import { Suspense, lazy } from 'react';
import {
  Calendar, Users, DollarSign, MapPin, Clock, CheckCircle,
  UserPlus, FileText, AlertTriangle, Bell
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, MetricCard, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useDashboardStats,
  useDashboardOccupancy,
  useDashboardVaccinations,
} from '../api';

const DashboardCharts = lazy(() => import('../components/Charts'));

const DashboardEnhanced = () => {
  const { isLoading } = useAuth();

  // Always call hooks at the top level
  const statsQuery = useDashboardStats();
  const occupancyQuery = useDashboardOccupancy();
  const vaccinationsQuery = useDashboardVaccinations({ limit: 5 });

  // Don't load dashboard data until authentication is complete
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const occupancyData = occupancyQuery.data?.map((item) => ({
    day: item.dayLabel,
    occupancy: item.occupancy,
  })) ?? [];

  const vaccinations = vaccinationsQuery.data ?? [];

  // Mock data for the dashboard metrics
  const metrics = [
    {
      title: "Today's Occupancy",
      value: statsQuery.data?.activeBookings ?? 0,
      subtitle: "vs yesterday",
      trend: "+12%",
      icon: Users,
      gradient: "blue"
    },
    {
      title: "Revenue Today",
      value: `$${statsQuery.data?.revenueToday ?? 0}`,
      subtitle: "vs yesterday",
      trend: "+8%",
      icon: DollarSign,
      gradient: "orange"
    },
    {
      title: "Pending Check-ins",
      value: statsQuery.data?.pendingCheckins ?? 0,
      subtitle: "next 2 hours",
      trend: "-5%",
      icon: Clock,
      gradient: "purple"
    },
    {
      title: "Available Spots",
      value: statsQuery.data?.availableSpots ?? 0,
      subtitle: "across all facilities",
      trend: "+3%",
      icon: MapPin,
      gradient: "gray"
    }
  ];

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Dashboard"
        title="Dashboard"
        actions={
          <>
            <Button variant="secondary" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </>
        }
      />

      {/* Top Metrics Row */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {statsQuery.isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-32 rounded-lg" />
            ))
          : metrics.map((metric) => (
              <MetricCard
                key={metric.title}
                title={metric.title}
                value={metric.value}
                subtitle={metric.subtitle}
                trend={metric.trend}
                icon={metric.icon}
                gradient={metric.gradient}
              />
            ))}
      </div>

      {/* Middle Row - Schedule and Occupancy Trend */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Today's Schedule */}
        <Card title="Today's Schedule" description="Upcoming check-ins, check-outs, and activities">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#263238]">Check-in: Bella (Golden Retriever)</p>
                <p className="text-sm text-[#64748B]">9:00 AM - Sarah Johnson</p>
              </div>
              <Badge variant="success" className="text-xs">Confirmed</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#263238]">Check-out: Max (German Shepherd)</p>
                <p className="text-sm text-[#64748B]">2:00 PM - Mike Wilson</p>
              </div>
              <Badge variant="warning" className="text-xs">Pending</Badge>
            </div>

            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#263238]">Feeding Round</p>
                <p className="text-sm text-[#64748B]">11:00 AM - All facilities</p>
              </div>
              <Badge variant="info" className="text-xs">Scheduled</Badge>
            </div>
          </div>
        </Card>

        {/* Occupancy Trend */}
        <Card title="Occupancy Trend" description="7-day occupancy overview">
          <div className="h-64">
            {occupancyQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <Suspense fallback={<Skeleton className="h-full w-full" />}>
                <DashboardCharts occupancyData={occupancyData} />
              </Suspense>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Row - Quick Actions, Recent Bookings, Vaccination Alerts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card title="Quick Actions" description="Common tasks and shortcuts">
          <div className="space-y-3">
            <Button variant="primary" className="w-full justify-start">
              <UserPlus className="h-4 w-4 mr-2" />
              Check In Pet
            </Button>
            <Button variant="secondary" className="w-full justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users className="h-4 w-4 mr-2" />
              View Today's Schedule
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </Card>

        {/* Recent Bookings */}
        <Card title="Recent Bookings" description="Latest reservations and check-ins">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-green-600">BJ</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#263238]">Bella Johnson</p>
                <p className="text-sm text-[#64748B]">Golden Retriever • 3 nights</p>
              </div>
              <Badge variant="success" className="text-xs">Checked In</Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-600">MW</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#263238]">Mike Wilson</p>
                <p className="text-sm text-[#64748B]">German Shepherd • Check-out today</p>
              </div>
              <Badge variant="warning" className="text-xs">Pending</Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-600">AS</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-[#263238]">Anna Smith</p>
                <p className="text-sm text-[#64748B]">Siamese Cat • 5 nights</p>
              </div>
              <Badge variant="info" className="text-xs">Confirmed</Badge>
            </div>
          </div>
        </Card>

        {/* Vaccination Alerts */}
        <Card title="Vaccination Alerts" description="Upcoming vaccination reminders">
          {vaccinationsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : vaccinations.length ? (
            <div className="space-y-3">
              {vaccinations.map((item) => (
                <div key={item.recordId} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#263238] text-sm">{item.petName}</p>
                    <p className="text-xs text-[#64748B]">{item.vaccine}</p>
                  </div>
                  <Badge variant={item.severity === 'danger' ? 'danger' : 'warning'} className="text-xs">
                    {item.daysUntil}d
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-[#64748B]">All vaccinations up to date!</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DashboardEnhanced;
