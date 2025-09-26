import { Suspense, lazy } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import QuickCheckIn from '../components/QuickCheckIn';
import WaitlistManager from '../components/WaitlistManager';

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
    <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <Suspense
          fallback={
            <Card>
              <Skeleton className="h-64 w-full" />
            </Card>
          }
        >
          <BookingCalendar />
        </Suspense>
      </div>
      <div className="space-y-6">
        <QuickCheckIn />
        <WaitlistManager />
      </div>
    </div>
  </DashboardLayout>
);

export default Bookings;
