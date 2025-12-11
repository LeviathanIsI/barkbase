import { useState } from 'react';
import { Building, MapPin } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/Card';
import BookingHUD from '@/features/bookings/components/BookingHUD';
import { Skeleton } from '@/components/ui/skeleton';
import { useKennelsWithOccupancy } from '@/features/kennels/api';
import FacilityMapView from '../components/FacilityMapView';

const Facilities = () => {
  const { data: kennels, isLoading } = useKennelsWithOccupancy();

  // Map kennel types to building names for visual grouping
  const kennelsWithBuilding = kennels?.map((kennel) => ({
    ...kennel,
    building: kennel.type === 'SUITE' ? 'Suites Wing' : 
              kennel.type === 'DAYCARE' ? 'Daycare Area' : 
              kennel.type === 'CABIN' ? 'Luxury Cabins' :
              kennel.type === 'MEDICAL' ? 'Medical Ward' :
              'Standard Kennels',
  })) || [];

  if (isLoading) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: 'Operations' },
            { label: 'Facilities' }
          ]}
          title="Capacity View"
        />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!kennels || kennels.length === 0) {
    return (
      <div>
        <PageHeader
          breadcrumbs={[
            { label: 'Operations' },
            { label: 'Facilities' }
          ]}
          title="Capacity View"
          description="Visual map of facility layout with real-time availability"
        />
        <Card>
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Facilities Configured</h3>
            <p className="text-sm text-muted mb-4">
              Kennels must be created in Settings before they appear on the capacity map
            </p>
            <p className="text-xs text-gray-500 dark:text-text-secondary">
              Go to Settings → Facilities to configure your kennels
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <FacilityMapView kennels={kennelsWithBuilding} />
    </div>
  );
};

export default Facilities;

