import Button from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Card";
import SlidePanel from "@/components/ui/SlidePanel";
import BookingHUD from "@/features/bookings/components/BookingHUD";
import NewBookingModal from "@/features/bookings/components/NewBookingModal";
import { Home, Plus, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";
import BookingDetailModal from "@/features/calendar/components/BookingDetailModal";
import CalendarWeekView from "@/features/calendar/components/CalendarWeekView";
import CheckInOutDashboard from "@/features/calendar/components/CheckInOutDashboard";
import KennelLayoutView from "@/features/calendar/components/KennelLayoutView";
import FilterOptionsPanel from "@/features/calendar/components/FilterOptionsPanel";
import ScheduleStatsDashboard from "../components/ScheduleStatsDashboard";
import CapacitySection from "../components/CapacitySection";
import SmartSchedulingSection from "../components/SmartSchedulingSection";
import DailyChecklistSection from "../components/DailyChecklistSection";
import { useTodayStats } from "../hooks/useTodayStats";

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayStats = useTodayStats(currentDate);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showKennelsPanel, setShowKennelsPanel] = useState(false);
  const [showCheckInOutPanel, setShowCheckInOutPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    services: ["boarding", "daycare", "grooming"],
    kennels: ["all"],
    status: ["CONFIRMED", "PENDING", "CHECKED_IN"],
    highlights: ["check-in-today", "check-out-today", "medication-required"],
  });

  useEffect(() => {
    document.title = "Today's Schedule | BarkBase";
    return () => {
      document.title = "BarkBase";
    };
  }, []);

  const handleBookingClick = (booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/schedule' },
          { label: 'Schedule' }
        ]}
        title="Today's Schedule"
        description="Complete operations dashboard for kennel management"
        actions={
          <div className="flex items-center gap-2">
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

      <BookingHUD date={currentDate} stats={todayStats} />

      <ScheduleStatsDashboard currentDate={currentDate} stats={todayStats} />

      <CalendarWeekView
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        onBookingClick={handleBookingClick}
        filters={filters}
      />

      <CapacitySection currentDate={currentDate} />

      <SmartSchedulingSection currentDate={currentDate} />

      <DailyChecklistSection currentDate={currentDate} />

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

      <FilterOptionsPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={handleFilterChange}
      />

      {/* Slide Panels */}
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

export default Schedule;

