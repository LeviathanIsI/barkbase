import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Grid3x3, Home, AlertTriangle, Users, Clock, CheckCircle, Plus, Settings, BarChart3, List } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import EnhancedStatsDashboard from '../components/EnhancedStatsDashboard';
import CapacityOverviewSection from '../components/CapacityOverviewSection';
import CalendarWeekView from '../components/CalendarWeekView';
import KennelLayoutView from '../components/KennelLayoutView';
import SmartSchedulingAssistant from '../components/SmartSchedulingAssistant';
import BookingDetailModal from '../components/BookingDetailModal';
import CapacityHeatmapView from '../components/CapacityHeatmapView';
import FilterOptionsPanel from '../components/FilterOptionsPanel';
import QuickActionsBar from '../components/QuickActionsBar';
import CheckInOutDashboard from '../components/CheckInOutDashboard';
import DailyOperationsChecklist from '../components/DailyOperationsChecklist';

const CalendarOverview = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeView, setActiveView] = useState('calendar'); // calendar, kennels, heatmap, checkinout
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    services: ['boarding', 'daycare', 'grooming'],
    kennels: ['all'],
    status: ['confirmed', 'pending', 'checked-in'],
    highlights: ['check-in-today', 'check-out-today', 'medication-required']
  });

  // Set document title
  useEffect(() => {
    document.title = 'Calendar & Capacity | BarkBase';
    return () => {
      document.title = 'BarkBase';
    };
  }, []);

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Enhanced Navigation */}
      <PageHeader
        breadcrumb="Home > Operations > Calendar"
        title="Calendar & Capacity"
        subtitle="Complete operations dashboard for kennel management"
        actions={
          <div className="flex items-center gap-2">
            {/* View Toggle Buttons */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <Button
                variant={activeView === 'calendar' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('calendar')}
                className="px-3"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={activeView === 'kennels' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('kennels')}
                className="px-3"
              >
                <Home className="h-4 w-4 mr-2" />
                Kennels
              </Button>
              <Button
                variant={activeView === 'heatmap' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('heatmap')}
                className="px-3"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant={activeView === 'checkinout' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange('checkinout')}
                className="px-3"
              >
                <Users className="h-4 w-4 mr-2" />
                Check-in/out
              </Button>
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        }
      />

      {/* Enhanced Stats Dashboard */}
      <EnhancedStatsDashboard currentDate={currentDate} />

      {/* Capacity Overview Section */}
      <CapacityOverviewSection currentDate={currentDate} />

      {/* Smart Scheduling Assistant */}
      <SmartSchedulingAssistant />

      {/* Daily Operations Checklist */}
      <DailyOperationsChecklist />

      {/* Main Content Area */}
      <div className="space-y-6">
        {activeView === 'calendar' && (
          <CalendarWeekView
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onBookingClick={handleBookingClick}
            filters={filters}
          />
        )}

        {activeView === 'kennels' && (
          <KennelLayoutView
            currentDate={currentDate}
            onBookingClick={handleBookingClick}
            filters={filters}
          />
        )}

        {activeView === 'heatmap' && (
          <CapacityHeatmapView
            currentDate={currentDate}
            filters={filters}
          />
        )}

        {activeView === 'checkinout' && (
          <CheckInOutDashboard
            currentDate={currentDate}
            onBookingClick={handleBookingClick}
          />
        )}
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar />

      {/* Modals */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />

      <FilterOptionsPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFilterChange}
      />
    </div>
  );
};

export default CalendarOverview;
