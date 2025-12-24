import { Edit, Trash2, DollarSign, Users, MapPin, Hash } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';

const KennelList = ({ kennels, onEdit, onDelete, terminology }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'SUITE': return 'primary';
      case 'DAYCARE': return 'info';
      case 'MEDICAL': return 'warning';
      case 'CABIN': return 'success';
      default: return 'secondary';
    }
  };

  const getSizeLabel = (size) => {
    switch (size) {
      case 'SMALL': return 'S';
      case 'MEDIUM': return 'M';
      case 'LARGE': return 'L';
      case 'XLARGE': return 'XL';
      default: return null;
    }
  };

  const parseAmenities = (amenities) => {
    if (!amenities) return [];
    try {
      const parsed = typeof amenities === 'string' ? JSON.parse(amenities) : amenities;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {kennels.map((kennel) => (
        <Card key={kennel.recordId} className="relative">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-semibold text-lg">{kennel.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getTypeColor(kennel.type)} size="sm">
                  {terminology[kennel.type.toLowerCase()] || kennel.type}
                </Badge>
                {kennel.size && (
                  <Badge variant="outline" size="sm">
                    {getSizeLabel(kennel.size)}
                  </Badge>
                )}
                {!kennel.isActive && (
                  <Badge variant="error" size="sm">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(kennel)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(kennel.recordId)}
                className="h-8 w-8 p-0 text-error hover:bg-error/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {/* Location */}
            {(kennel.location || kennel.zone) && (
              <div className="flex items-center gap-2 text-muted">
                <MapPin className="h-4 w-4" />
                <span>{[kennel.zone, kennel.location].filter(Boolean).join(' - ')}</span>
              </div>
            )}

            {/* Capacity */}
            <div className="flex items-center gap-2 text-muted">
              <Users className="h-4 w-4" />
              <span>Capacity: {kennel.capacity} {kennel.capacity === 1 ? 'pet' : 'pets'}</span>
            </div>

            {/* Pricing */}
            {(kennel.dailyRate || kennel.hourlyRate || kennel.weeklyRate) && (
              <div className="flex items-center gap-2 text-muted">
                <DollarSign className="h-4 w-4" />
                <span>
                  {kennel.dailyRate && `${formatCurrency(kennel.dailyRate)}/day`}
                  {kennel.dailyRate && kennel.hourlyRate && ' • '}
                  {kennel.hourlyRate && `${formatCurrency(kennel.hourlyRate)}/hr`}
                  {(kennel.dailyRate || kennel.hourlyRate) && kennel.weeklyRate && ' • '}
                  {kennel.weeklyRate && `${formatCurrency(kennel.weeklyRate)}/wk`}
                </span>
              </div>
            )}

            {/* Amenities */}
            {parseAmenities(kennel.amenities).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {parseAmenities(kennel.amenities).map((amenity, idx) => (
                  <Badge key={idx} variant="outline" size="xs">
                    {amenity}
                  </Badge>
                ))}
              </div>
            )}

            {/* Notes */}
            {kennel.notes && (
              <p className="text-xs text-muted italic mt-2">{kennel.notes}</p>
            )}

            {/* Booking count */}
            {kennel._count && (
              <div className="flex items-center gap-2 text-xs text-muted mt-2">
                <Hash className="h-3 w-3" />
                <span>{kennel._count.bookings} active bookings</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default KennelList;
