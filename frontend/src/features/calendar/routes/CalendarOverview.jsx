import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Grid3x3, Home, AlertTriangle, Users, Clock, CheckCircle, Plus, Settings, BarChart3, List, Brain, CheckSquare } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import EnhancedStatsDashboard from '../components/EnhancedStatsDashboard';
import CapacityOverviewSection from '../components/CapacityOverviewSection';
import CalendarWeekView from '../components/CalendarWeekView';
import KennelLayoutView from '../components/KennelLayoutView';
import BookingDetailModal from '../components/BookingDetailModal';
import CapacityHeatmapView from '../components/CapacityHeatmapView';
import FilterOptionsPanel from '../components/FilterOptionsPanel';
import QuickActionsBar from '../components/QuickActionsBar';
import CheckInOutDashboard from '../components/CheckInOutDashboard';

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
