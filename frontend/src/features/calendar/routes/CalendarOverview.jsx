import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Grid3x3, Home, AlertTriangle, Users, Clock, CheckCircle, Plus, Settings, BarChart3, List, Brain, CheckSquare } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import EnhancedStatsDashboard from '../components/EnhancedStatsDashboard';
import CapacityOverviewSection from '../components/CapacityOverviewSection';
import CalendarWeekView from '../components/CalendarWeekView';
import KennelLayoutView from '../components/KennelLayoutView';
import BookingDetailModal from '../components/BookingDetailModal';
import NewBookingModal from '@/features/bookings/components/NewBookingModal';
import SlidePanel from '@/components/ui/SlidePanel';
import FilterOptionsPanel from '../components/FilterOptionsPanel';
import BookingHUD from '@/features/bookings/components/BookingHUD';
import { useLiveQuery } from '@/lib/useLiveQuery';
import CheckInOutDashboard from '../components/CheckInOutDashboard';

const CalendarOverview = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showKennelsPanel, setShowKennelsPanel] = useState(false);
  const [showCheckInOutPanel, setShowCheckInOutPanel] = useState(false);
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // The useLiveQuery hook and direct apiClient calls are no longer used in this component.
  // Data fetching is handled by the custom hooks in the respective `api.js` files.

  return (
    <div className="space-y-6">
      {/* Page Header with Enhanced Navigation */}
      <PageHeader
        breadcrumb="Home > Intake > Calendar"
        title="Calendar & Capacity"
        subtitle="Complete operations dashboard for kennel management"
        actions={
          <div className="flex items-center gap-2">
            {/* Quick Access Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKennelsPanel(true)}
            >
              <Home className="h-4 w-4 mr-2" />
              Kennels
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCheckInOutPanel(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              Check-in/out
            </Button>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowNewBookingModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        }
      />

      {/* Booking HUD */}
      <BookingHUD
        date={currentDate}
        stats={{}}
      />

      {/* Enhanced Stats Dashboard */}
      <EnhancedStatsDashboard currentDate={currentDate} />

      {/* Main Calendar - Priority view for quick booking glance */}
      <CalendarWeekView
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onBookingClick={handleBookingClick}
        filters={filters}
      />

      {/* Capacity Overview Section */}
      <CapacityOverviewSection currentDate={currentDate} />

      {/* Smart Scheduling Assistant - Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Brain className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Smart Scheduling Assistant</h3>
            <p className="text-sm text-gray-600">AI-powered scheduling recommendations</p>
          </div>
        </div>
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Smart scheduling features will be available once AI recommendations API is implemented</p>
        </div>
      </div>

      {/* Daily Operations Checklist - Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Daily Operations Checklist</h3>
            <p className="text-sm text-gray-600">Track daily tasks and operations</p>
          </div>
        </div>
        <div className="text-center py-8">
          <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Daily checklist features will be available once operations tracking API is implemented</p>
        </div>
      </div>

      {/* Quick Actions Bar removed to avoid duplicate actions (header and HUD already provide controls) */}

      {/* Modals */}
      <BookingDetailModal
        booking={selectedBooking}
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />

      <NewBookingModal
        isOpen={showNewBookingModal}
        onClose={() => setShowNewBookingModal(false)}
      />

      {/* Note: FilterOptionsPanel now uses SlidePanel - see UI_PATTERNS.md */}
      <FilterOptionsPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFilterChange}
      />

      {/* Flyout Panels */}
      <SlidePanel
        open={showKennelsPanel}
        onClose={() => setShowKennelsPanel(false)}
        title="Kennel Layout"
      >
        <KennelLayoutView
          currentDate={currentDate}
          onBookingClick={handleBookingClick}
          filters={filters}
        />
      </SlidePanel>

      <SlidePanel
        open={showCheckInOutPanel}
        onClose={() => setShowCheckInOutPanel(false)}
        title="Check-in / Check-out"
      >
        <CheckInOutDashboard
          currentDate={currentDate}
          onBookingClick={handleBookingClick}
        />
      </SlidePanel>
    </div>
  );
};

export default CalendarOverview;
