import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Plus, List } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/ui/Card';
import SinglePageBookingWizard from '../components/SinglePageBookingWizard';
import VisualRunBoard from '../components/VisualRunBoard';
import BookingsOverview from './BookingsOverview';

const Bookings = () => {
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState('calendar'); // calendar, list, new
  const [showNewBooking, setShowNewBooking] = useState(searchParams.get('action') === 'new');

  // Handle booking completion
  // The wizard already handles API calls internally, we just need to close it
  const handleBookingComplete = () => {
    setShowNewBooking(false);
    setViewMode('calendar');
    // Views will automatically refresh via React Query
  };

  return (
    <div className="flex h-full flex-col px-4 py-4 sm:px-6 lg:px-8">
      <PageHeader
        breadcrumb="Home > Intake > Bookings"
        title="Bookings & Availability"
        description="Manage reservations and facility capacity"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {!showNewBooking && (
              <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-auto">
                <TabsList className="gap-4">
                  <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-sm font-medium">
                    <Calendar className="h-4 w-4" />
                    Run Board
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-1.5 text-sm font-medium">
                    <List className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button onClick={() => setShowNewBooking(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        }
      />

      <div className="flex-1 min-h-0">
        {showNewBooking ? (
          <SinglePageBookingWizard 
            onComplete={handleBookingComplete}
          />
        ) : viewMode === 'calendar' ? (
          <VisualRunBoard />
        ) : (
          <BookingsOverview />
        )}
      </div>
    </div>
  );
};

export default Bookings;
