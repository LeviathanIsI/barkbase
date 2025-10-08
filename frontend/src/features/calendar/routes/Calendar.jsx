import { Suspense } from 'react';
import WeekView from '../components/WeekView';
import Skeleton from '@/components/ui/Skeleton';

const Calendar = () => {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Calendar & Capacity</h1>
        <p className="text-muted">Manage kennel assignments and view occupancy at a glance</p>
      </div>

      <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
        <WeekView />
      </Suspense>
    </div>
  );
};

export default Calendar;
