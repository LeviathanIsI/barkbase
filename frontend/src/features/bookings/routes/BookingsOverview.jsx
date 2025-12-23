import { useState, useEffect } from 'react';
import { } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, List, Activity, Layout, Search, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card, PageHeader } from '@/components/ui/Card';
import BookingCard from '../components/BookingCard';
import ListView from '../components/ListView';
import CalendarView from '../components/CalendarView';
import TimelineView from '../components/TimelineView';
import KanbanView from '../components/KanbanView';
import NewBookingModal from '../components/NewBookingModal';
import BookingDetailModal from '../components/BookingDetailModal';
import BatchOperationsPanel from '../components/BatchOperationsPanel';
import QuickStatsDashboard from '../components/QuickStatsDashboard';
import OverbookingAlert from '../components/OverbookingAlert';
import ExportReportingPanel from '../components/ExportReportingPanel';
import ConflictsWarning from '../components/ConflictsWarning';
import RecurringBookingModal from '../components/RecurringBookingModal';
import WaitlistManagement from '../components/WaitlistManagement';
import AuditLogModal from '../components/AuditLogModal';
import SmartSearchPanel from '../components/SmartSearchPanel';
import FilterSortPanel from '../components/FilterSortPanel';
import { useBookingsQuery } from '../api';

const BookingsOverview = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState('list'); // list, calendar, timeline, kanban
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showBookingDetailModal, setShowBookingDetailModal] = useState(false);
  const [showBatchOperations, setShowBatchOperations] = useState(false);
  const [showOverbookingAlert, setShowOverbookingAlert] = useState(false);
  const [showConflictsWarning, setShowConflictsWarning] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [showSmartSearch, setShowSmartSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState(new Set());

  // Real data from API - NO MORE HARDCODED MOCK
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsQuery();
  const bookings = bookingsData || [];

  // Removed all hardcoded mock bookings - using real API data above

  const [filters, setFilters] = useState({
    status: [], // Empty = show all statuses
    services: [], // Empty = show all services
    dateRange: null,
    paymentStatus: [],
    specialFlags: []
  });

  const [searchTerm, setSearchTerm] = useState('');

  // Set document title
  useEffect(() => {
    document.title = 'Bookings | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  // Stats cards removed per request

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setShowBookingDetailModal(true);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleBookingSelect = (bookingId) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) {
      newSelected.delete(bookingId);
    } else {
      newSelected.add(bookingId);
    }
    setSelectedBookings(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = filteredBookings.map(b => b.id);
    setSelectedBookings(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedBookings(new Set());
  };

  // Filter and search bookings
  const filteredBookings = bookings.filter(booking => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const petName = booking.pet?.name || booking.pets?.[0]?.name || '';
      const ownerName = booking.owner?.name || '';
      const bookingId = booking.recordId || booking.bookingId || '';
      const matchesSearch =
        petName.toLowerCase().includes(term) ||
        ownerName.toLowerCase().includes(term) ||
        bookingId.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    // Status filter (only apply if filters are selected, empty array = show all)
    if (filters.status.length > 0) {
      const bookingStatus = (booking.status || '').toLowerCase();
      if (!filters.status.map(s => s.toLowerCase()).includes(bookingStatus)) return false;
    }

    // Service filter (only apply if filters are selected, empty array = show all)
    if (filters.services.length > 0) {
      // Since backend doesn't provide a single service field yet, we'll skip for now
      // This would need to be implemented when services are properly linked
    }

    return true;
  });

  // Removed top-level stat card actions

  return (
    <div className="space-y-6">
      {/* Page Header with View Toggle */}
      <PageHeader
        breadcrumb="Home > Intake > Bookings"
        title="Bookings"
        subtitle="Complete booking management with conflict detection and automated workflows"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={activeView} onValueChange={handleViewChange} className="w-full sm:w-auto">
              <TabsList className="gap-2 sm:gap-4 flex-wrap">
                <TabsTrigger value="list" className="flex items-center gap-1.5 text-sm font-medium">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="h-4 w-4" />
                  Calendar
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-1.5 text-sm font-medium">
                  <Activity className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="kanban" className="flex items-center gap-1.5 text-sm font-medium">
                  <Layout className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button variant="outline" size="sm" onClick={() => setShowFilters(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        }
      />

      {/* Top stats cards were removed per request */}

      {/* Quick Stats Dashboard */}
      <QuickStatsDashboard bookings={filteredBookings} />

      {/* Conflicts Warning */}
      <ConflictsWarning onViewConflicts={() => setShowConflictsWarning(true)} />

      {/* Overbooking Alert */}
      <OverbookingAlert onResolveOverbooking={() => setShowOverbookingAlert(true)} />

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-surface-primary border border-gray-200 dark:border-surface-border rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-text-tertiary" />
            <input
              type="text"
              placeholder="Search bookings, pets, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md text-sm text-gray-900 dark:text-text-primary placeholder:text-gray-600 dark:placeholder:text-text-secondary dark:text-text-secondary placeholder:opacity-75 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="text-sm text-gray-600 dark:text-text-secondary">
            {filteredBookings.length} of {bookings.length} bookings
          </div>

          {selectedBookings.size > 0 && (
            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {selectedBookings.size} selected
            </div>
          )}
        </div>

        {/* Batch Actions */}
        {selectedBookings.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-surface-primary border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedBookings.size} bookings selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDeselectAll}>
                  Deselect All
                </Button>
                <Button size="sm" onClick={() => setShowBatchOperations(true)}>
                  Batch Actions
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {activeView === 'list' && (
          <ListView
            bookings={filteredBookings}
            onBookingClick={handleBookingClick}
            onBookingSelect={handleBookingSelect}
            selectedBookings={selectedBookings}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        )}

        {activeView === 'calendar' && (
          <CalendarView
            bookings={filteredBookings}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onBookingClick={handleBookingClick}
          />
        )}

        {activeView === 'timeline' && (
          <TimelineView
            bookings={filteredBookings}
            currentDate={currentDate}
            onBookingClick={handleBookingClick}
          />
        )}

        {activeView === 'kanban' && (
          <KanbanView
            bookings={filteredBookings}
            onBookingClick={handleBookingClick}
            onBookingMove={(bookingId, newStatus) => {
              // Handle status change
            }}
          />
        )}
      </div>

      {/* Modals */}
      <NewBookingModal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
      />

      <BookingDetailModal
        booking={selectedBooking}
        isOpen={showBookingDetailModal}
        onClose={() => setShowBookingDetailModal(false)}
      />

      <BatchOperationsPanel
        selectedBookings={Array.from(selectedBookings).map(id => bookings.find(b => b.id === id)).filter(Boolean)}
        isOpen={showBatchOperations}
        onClose={() => setShowBatchOperations(false)}
      />

      <FilterSortPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <ConflictsWarning
        isOpen={showConflictsWarning}
        onClose={() => setShowConflictsWarning(false)}
      />

      <OverbookingAlert
        isOpen={showOverbookingAlert}
        onClose={() => setShowOverbookingAlert(false)}
      />

      <RecurringBookingModal
        isOpen={showRecurringModal}
        onClose={() => setShowRecurringModal(false)}
      />

      <WaitlistManagement
        isOpen={showWaitlist}
        onClose={() => setShowWaitlist(false)}
      />

      <AuditLogModal
        booking={selectedBooking}
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />

      <SmartSearchPanel
        isOpen={showSmartSearch}
        onClose={() => setShowSmartSearch(false)}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <ExportReportingPanel />
    </div>
  );
};

export default BookingsOverview;
