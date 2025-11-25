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
    <div className="flex h-full flex-col space-y-[var(--bb-space-6,1.5rem)]">
      <PageHeader
        breadcrumbs={[
          { label: 'Operations', href: '/bookings' },
          { label: 'Bookings' }
        ]}
        title="Bookings & Availability"
        description="Manage reservations and facility capacity"
        actions={
          <div className="flex flex-wrap items-center gap-[var(--bb-space-3,0.75rem)]">
            {!showNewBooking && (
              <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-auto">
                <TabsList className="gap-[var(--bb-space-2,0.5rem)]">
                  <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]">
                    <Calendar className="h-4 w-4" />
                    Run Board
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-1.5 text-[var(--bb-font-size-sm,0.875rem)] font-[var(--bb-font-weight-medium,500)]">
                    <List className="h-4 w-4" />
                    List View
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button variant="primary" onClick={() => setShowNewBooking(true)}>
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
