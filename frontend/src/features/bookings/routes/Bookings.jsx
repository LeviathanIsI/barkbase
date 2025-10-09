import { Suspense, lazy } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

const BookingCalendar = lazy(() => import('../components/BookingCalendar'));

const Bookings = () => (
  <DashboardLayout
    title="Bookings & Stays"
    description="Manage kennel assignments, split stays, and deposits with drag-and-drop."
    actions={
      <div className="flex gap-2">
        <Button variant="ghost">Export</Button>
        <Button>New Booking</Button>
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
  </DashboardLayout>
);

export default Bookings;
