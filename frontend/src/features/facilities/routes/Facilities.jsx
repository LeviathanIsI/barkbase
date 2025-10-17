import { useState } from 'react';
import { Building, MapPin } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/Card';
import BookingHUD from '@/features/bookings/components/BookingHUD';
import Skeleton from '@/components/ui/Skeleton';
import { useKennels } from '@/features/kennels/api';
import FacilityMapView from '../components/FacilityMapView';

const Facilities = () => {
  const { data: kennels, isLoading } = useKennels();

  // Add mock occupancy data for demonstration
  // TODO: Replace with real occupancy from booking data
  const kennelsWithOccupancy = kennels?.map((kennel) => ({
    ...kennel,
    capacity: kennel.capacity || 1,
    occupied: Math.floor(Math.random() * ((kennel.capacity || 1) + 1)), // Random for demo
    building: kennel.type === 'suite' ? 'Suites Wing' : 
              kennel.type === 'daycare' ? 'Daycare Area' : 
              'Standard Kennels',
    type: kennel.type || 'kennel'
  })) || [];

  if (isLoading) {
    return (
      <div>
        <PageHeader 
          title="Capacity View" 
          breadcrumb="Home > Intake > Capacity View" 
        />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!kennels || kennels.length === 0) {
    return (
      <div>
        <PageHeader
          title="Capacity View"
          subtitle="Visual map of facility layout with real-time availability"
          breadcrumb="Home > Intake > Capacity View"
        />
        <Card>
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Facilities Configured</h3>
            <p className="text-sm text-muted mb-4">
              Kennels must be created in Settings before they appear on the capacity map
            </p>
            <p className="text-xs text-gray-500">
              Go to Settings → Facilities to configure your kennels
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <BookingHUD
        date={new Date()}
        stats={{}}
        onNewBooking={() => {}}
        onOpenFilters={() => {}}
        onCheckInOut={() => {}}
      />
      <PageHeader
        title="Capacity View"
        subtitle="Visual map of facility layout with real-time availability"
        breadcrumb="Home > Intake > Capacity View"
      />

      <FacilityMapView kennels={kennelsWithOccupancy} editable />
    </div>
  );
};

export default Facilities;

