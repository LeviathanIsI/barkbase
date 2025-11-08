import { X, MapPin } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

/**
 * Modal showing detailed information about a facility
 * Including current occupants and capacity breakdown
 */
const FacilityDetailsModal = ({ facility, pets = [], onClose, onBook }) => {
  if (!facility) return null;

  const available = Math.max(0, facility.capacity - facility.occupied);
  const occupancyRate = facility.capacity > 0 ? (facility.occupied / facility.capacity) * 100 : 0;

  // Generate placeholder avatar with pet initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const getOccupancyColor = () => {
    if (occupancyRate >= 95) return 'text-gray-600 dark:text-text-secondary';
    if (occupancyRate >= 80) return 'text-red-600';
    if (occupancyRate >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getOccupancyBadge = () => {
    if (occupancyRate >= 95) return <Badge variant="neutral">FULL</Badge>;
    if (occupancyRate >= 80) return <Badge variant="danger">High Occupancy</Badge>;
    if (occupancyRate >= 50) return <Badge variant="warning">Moderate</Badge>;
    return <Badge variant="success">Available</Badge>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-surface-primary rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">{facility.name}</h3>
              <p className="text-sm text-gray-500 dark:text-text-secondary">{facility.building || facility.type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Capacity Overview */}
        <div className="p-6 bg-gray-50 dark:bg-surface-secondary border-b border-gray-200 dark:border-surface-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-text-secondary mb-1">Capacity Status</p>
              <p className={`text-2xl font-bold ${getOccupancyColor()}`}>
                {available}/{facility.capacity} available
              </p>
            </div>
            {getOccupancyBadge()}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 dark:bg-surface-border rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all ${
                occupancyRate >= 95
                  ? 'bg-gray-400 dark:bg-surface-secondary'
                  : occupancyRate >= 80
                  ? 'bg-red-50 dark:bg-red-950/20'
                  : occupancyRate >= 50
                  ? 'bg-yellow-50 dark:bg-yellow-950/20'
                  : 'bg-green-50 dark:bg-green-950/20'
              }`}
              style={{ width: `${Math.min(occupancyRate, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-text-secondary mt-2 text-center">
            {occupancyRate.toFixed(0)}% occupied
          </p>
        </div>

        {/* Current Occupants */}
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-text-primary mb-4">
            Current Occupants ({facility.occupied})
          </h4>
          
          {pets.length === 0 && facility.occupied === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-text-secondary">
              <p className="text-sm">No pets currently in this facility</p>
            </div>
          ) : pets.length === 0 && facility.occupied > 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-text-secondary">
              <p className="text-sm">Loading occupant details...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pets.map((pet, index) => (
                <div
                  key={pet.recordId || index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-surface-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-surface-secondary transition-colors"
                >
                  {/* Placeholder Avatar with Initials */}
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                    {getInitials(pet.name || pet.petName)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-text-primary">{pet.name || pet.petName}</p>
                    {pet.breed && (
                      <p className="text-xs text-gray-500 dark:text-text-secondary">{pet.breed}</p>
                    )}
                  </div>
                  {pet.ownerName && (
                    <p className="text-xs text-gray-500 dark:text-text-secondary">Owner: {pet.ownerName}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={onBook}
            disabled={available === 0}
          >
            {available === 0 ? 'Fully Booked' : 'Book this Facility'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FacilityDetailsModal;

