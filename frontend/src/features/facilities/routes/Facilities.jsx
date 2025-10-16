import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useKennels } from '@/features/kennels/api';

const Facilities = () => {
  const navigate = useNavigate();
  const { data: kennels, isLoading } = useKennels();

  const groupedKennels = kennels?.reduce((acc, kennel) => {
    const type = kennel.type || 'OTHER';
    if (!acc[type]) acc[type] = [];
    acc[type].push(kennel);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Facilities & Kennels" breadcrumb="Home > Operations > Facilities" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Facilities & Kennels"
        breadcrumb="Home > Operations > Facilities"
        actions={
          <Button onClick={() => navigate('/kennels')}>
            <Plus className="h-4 w-4 mr-2" />
            Manage Kennels
          </Button>
        }
      />

      {Object.entries(groupedKennels || {}).map(([type, kennelsOfType]) => (
        <div key={type} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 capitalize">
            {type.toLowerCase()} ({kennelsOfType.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {kennelsOfType.map((kennel) => (
              <Card key={kennel.recordId}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{kennel.name}</h3>
                  <Badge variant={kennel.isActive ? 'success' : 'neutral'}>
                    {kennel.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {kennel.location && (
                  <p className="text-sm text-muted">Location: {kennel.location}</p>
                )}
                <p className="text-sm text-muted">Capacity: {kennel.capacity}</p>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {kennels?.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Facilities Configured</h3>
            <p className="text-sm text-muted mb-4">
              Create kennels and facilities to start taking bookings
            </p>
            <Button onClick={() => navigate('/kennels')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Kennels
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Facilities;

