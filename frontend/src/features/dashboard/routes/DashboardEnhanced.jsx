import { Suspense, lazy, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Users, DollarSign, MapPin, Clock, CheckCircle,
  UserPlus, UserX, FileText, AlertTriangle, Bell, List, LayoutDashboard, PawPrint
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, MetricCard, PageHeader } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useDashboardStats,
  useDashboardOccupancy,
  useDashboardVaccinations,
  useUpcomingArrivalsQuery,
  useUpcomingDeparturesQuery,
} from '../api';
import { useBookingsQuery } from '@/features/bookings/api';
import { useMemo } from 'react';

const DashboardCharts = lazy(() => import('../components/Charts'));
const HighDensityTodayView = lazy(() => import('../components/HighDensityTodayView'));

const DashboardEnhanced = () => {
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  const [viewMode, setViewMode] = useState('overview'); // overview, today

  // Always call hooks at the top level
  const statsQuery = useDashboardStats();
  const occupancyQuery = useDashboardOccupancy();
  const vaccinationsQuery = useDashboardVaccinations({ limit: 5 });
  const { data: todayArrivals = [] } = useUpcomingArrivalsQuery(1);
  const { data: todayDepartures = [] } = useUpcomingDeparturesQuery(1);
  const { data: recentBookingsData = [] } = useBookingsQuery({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' });

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

  // Combine arrivals and departures for schedule
  const scheduleItems = useMemo(() => {
    const items = [];
    
    todayArrivals.slice(0, 5).forEach(item => {
      const checkIn = item.checkIn ? new Date(item.checkIn) : null;
      if (checkIn) {
        items.push({
          type: 'arrival',
          petName: item.pet?.name || item.petName || 'Unknown',
          ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : item.ownerName || 'Unknown',
          time: checkIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        });
      }
    });
    
    todayDepartures.slice(0, 5).forEach(item => {
      const checkOut = item.checkOut ? new Date(item.checkOut) : null;
      if (checkOut) {
        items.push({
          type: 'departure',
          petName: item.pet?.name || item.petName || 'Unknown',
          ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName || ''}`.trim() : item.ownerName || 'Unknown',
          time: checkOut.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        });
      }
    });
    
    // Sort by time
    return items.sort((a, b) => {
      const timeA = parseInt(a.time.replace(/[^0-9]/g, ''));
      const timeB = parseInt(b.time.replace(/[^0-9]/g, ''));
      return timeA - timeB;
    }).slice(0, 5);
  }, [todayArrivals, todayDepartures]);

  // Recent bookings
  const recentBookings = useMemo(() => {
    return recentBookingsData.slice(0, 5);
  }, [recentBookingsData]);

  // Real data for dashboard metrics - professional design, no gradients
  const metrics = [
    {
      title: "Today's Occupancy",
      value: statsQuery.data?.activeBookings ?? 0,
      subtitle: "active bookings",
      trend: null, // Will be calculated from historical data
      icon: Users,
    },
    {
      title: "Revenue Today",
      value: `$${statsQuery.data?.revenueToday ?? 0}`,
      subtitle: "today's revenue",
      trend: null, // Will be calculated from historical data
      icon: DollarSign,
    },
    {
      title: "Pending Check-ins",
      value: statsQuery.data?.pendingCheckins ?? 0,
      subtitle: "awaiting check-in",
      trend: null, // Will be calculated from historical data
      icon: Clock,
    },
    {
      title: "Available Spots",
      value: statsQuery.data?.availableSpots ?? 0,
      subtitle: "across all facilities",
      trend: null, // Will be calculated from historical data
      icon: MapPin,
    }
  ];

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard' }
        ]}
        title="Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-auto">
              <TabsList className="gap-4">
                <TabsTrigger value="overview" className="flex items-center gap-1.5 text-sm font-medium">
                  <LayoutDashboard className="h-4 w-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="today" className="flex items-center gap-1.5 text-sm font-medium">
                  <List className="h-4 w-4" />
                  Today's Pets
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button variant="secondary" size="sm" onClick={() => navigate('/bookings?action=new')}>
              <UserPlus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/reports')}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        }
      />

      {viewMode === 'today' ? (
        /* High Density Today View */
        <div className="h-[calc(100vh-200px)]">
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            <HighDensityTodayView />
          </Suspense>
        </div>
      ) : (
        /* Overview Dashboard */
        <>
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
              />
            ))}
      </div>

      {/* Middle Row - Schedule and Occupancy Trend */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Today's Schedule */}
        <Card title="Today's Schedule" description="Upcoming check-ins, check-outs, and activities">
          <div className="space-y-4">
            {statsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-surface-border rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-surface-border rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-surface-border rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-surface-border rounded"></div>
                </div>
              ))
            ) : scheduleItems.length > 0 ? (
              <div className="space-y-3">
                {scheduleItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      {item.type === 'arrival' ? (
                        <UserPlus className="h-5 w-5 text-primary-600" />
                      ) : (
                        <UserX className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-text-primary text-sm truncate">{item.petName}</p>
                      <p className="text-xs text-gray-600 dark:text-text-secondary">{item.ownerName} • {item.time}</p>
                    </div>
                    <Badge variant={item.type === 'arrival' ? 'success' : 'secondary'} className="text-xs">
                      {item.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 dark:text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-text-secondary">No schedule items for today</p>
              </div>
            )}
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
            <Button variant="primary" className="w-full justify-start" onClick={() => navigate('/daycare/checkin')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Check In Pet
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={() => navigate('/bookings?action=new')}>
              <Calendar className="h-4 w-4 mr-2" />
              New Booking
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={() => navigate('/schedule')}>
              <Users className="h-4 w-4 mr-2" />
              View Today's Schedule
            </Button>
            <Button variant="secondary" className="w-full justify-start" onClick={() => navigate('/reports')}>
              <FileText className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </Card>

        {/* Recent Bookings */}
        <Card title="Recent Bookings" description="Latest reservations and check-ins">
          <div className="space-y-4">
            {statsQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-surface-border rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-surface-border rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-surface-border rounded w-1/2"></div>
                  </div>
                  <div className="w-16 h-6 bg-gray-200 dark:bg-surface-border rounded"></div>
                </div>
              ))
            ) : recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div key={booking.recordId || booking.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <PawPrint className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-text-primary text-sm truncate">
                        {booking.pet?.name || booking.petName || 'Unknown Pet'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-text-secondary">
                        {booking.owner ? `${booking.owner.firstName || ''} ${booking.owner.lastName || ''}`.trim() : booking.ownerName || 'Unknown Owner'}
                      </p>
                    </div>
                    <Badge 
                      variant={
                        booking.status === 'CHECKED_IN' ? 'success' : 
                        booking.status === 'CONFIRMED' ? 'primary' : 
                        'secondary'
                      } 
                      className="text-xs"
                    >
                      {booking.status?.replace('_', ' ') || 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 dark:text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-text-secondary">No recent bookings</p>
              </div>
            )}
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
                <div key={item.recordId} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-surface-primary rounded-lg">
                  <div className="w-8 h-8 bg-yellow-100 dark:bg-surface-secondary rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-text-primary text-sm">{item.petName}</p>
                    <p className="text-xs text-gray-600 dark:text-text-secondary">{item.vaccine}</p>
                  </div>
                  <Badge variant={item.severity === 'danger' ? 'error' : 'warning'} className="text-xs">
                    {item.daysUntil}d
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-success-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-text-secondary">All vaccinations up to date!</p>
            </div>
          )}
        </Card>
      </div>
        </>
      )}
    </div>
  );
};

export default DashboardEnhanced;
