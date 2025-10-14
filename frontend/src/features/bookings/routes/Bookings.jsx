import { Suspense, lazy, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import NewBookingModal from '../components/NewBookingModal';
import { useTerminology } from '@/lib/terminology';

const BookingCalendar = lazy(() => import('../components/BookingCalendar'));

const Bookings = () => {
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  const terminology = useTerminology();

  return (
    <DashboardLayout
      title="Bookings & Stays"
      description={`Manage ${terminology.kennel.toLowerCase()} assignments, split stays, and deposits with drag-and-drop.`}
      actions={
        <div className="flex gap-2">
          <Button variant="ghost">Export</Button>
          <Button onClick={() => setNewBookingOpen(true)}>New Booking</Button>
        </div>
      }
    >
      <Suspense
        fallback={
          <Card>
            <Skeleton className="h-64 w-full" />
          </Card>
        }
      >
        <BookingCalendar />
      </Suspense>
      <NewBookingModal open={newBookingOpen} onClose={() => setNewBookingOpen(false)} />
    </DashboardLayout>
  );
};

export default Bookings;
