import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PetAvatar from '@/components/ui/PetAvatar';
import PetHoverPreview from '@/components/ui/PetHoverPreview';
import OwnerHoverPreview from '@/components/ui/OwnerHoverPreview';
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  Heart,
  CalendarPlus,
  MessageSquare,
  Edit,
  MoreVertical,
  PawPrint,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// TODO (C1:3 - Directory UX Cleanup): Tighten card spacing and action layout.
const UnifiedOwnerCard = ({ owner, getVaccinationStatus }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-gray-100 p-6 dark:border-surface-border">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-semibold text-white">
              {owner.name?.charAt(0) || owner.email?.charAt(0) || '?'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-primary">
                <OwnerHoverPreview owner={owner}>
                  {owner.name || 'Unknown Owner'}
                </OwnerHoverPreview>
              </h3>
              <div className="mt-1 flex items-center gap-3 text-sm text-gray-600 dark:text-text-secondary">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {owner.email || 'No email'}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {owner.phone || 'No phone'}
                </span>
              </div>
              {(owner.address?.street || owner.address) && (
                <div className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-text-secondary">
                  <MapPin className="h-3 w-3" />
                  {typeof owner.address === 'string'
                    ? owner.address
                    : `${owner.address?.street || ''} ${owner.address?.city || ''}, ${owner.address?.state || ''} ${owner.address?.zip || ''}`.trim()}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <Badge variant={owner.activePets?.length > 0 ? 'success' : 'neutral'}>
              {owner.activePets?.length > 0 ? 'Active' : 'Inactive'}
            </Badge>
            <p className="mt-1 text-xs text-gray-600 dark:text-text-secondary">
              Customer since {new Date(owner.createdAt || Date.now()).getFullYear()}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 border-t border-gray-100 pt-4 dark:border-surface-border">
          <Stat label="Pets" value={owner.pets?.length || 0} />
          <Stat label="Total Spent" value={`$${owner.totalSpent || 0}`} />
          <Stat
            label="Last Visit"
            value={owner.lastVisit ? new Date(owner.lastVisit).toLocaleDateString() : 'Never'}
          />
          <Stat label="Bookings" value={owner.totalBookings || 0} />
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-text-secondary">
            PETS ({owner.pets?.length || 0})
          </h4>
          <Button size="sm" variant="outline" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show Less' : 'Show All'}
          </Button>
        </div>

        <div className="space-y-3">
          {(expanded ? owner.pets : owner.pets?.slice(0, 2))?.map((pet) => {
            const vaccStatus = getVaccinationStatus(pet);

            return (
              <div
                key={pet.id}
                className="flex items-center gap-4 rounded-lg bg-gray-50 p-3 dark:bg-surface-secondary"
              >
                <PetAvatar pet={pet} size="md" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      <PetHoverPreview pet={pet}>{pet.name}</PetHoverPreview>
                    </p>
                    {pet.status === 'inactive' && (
                      <Badge variant="neutral" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                    {pet.hasMedicalAlerts && (
                      <Heart className="h-4 w-4 text-orange-500" title="Medical alerts" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-text-secondary">
                    {pet.breed || 'Unknown'} • {pet.age ? `${pet.age}y` : 'Age unknown'}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <Shield
                      className={cn(
                        'h-3 w-3',
                        vaccStatus === 'current' && 'text-green-600',
                        vaccStatus === 'due-soon' && 'text-yellow-600',
                        vaccStatus === 'expired' && 'text-red-600',
                        vaccStatus === 'missing' && 'text-gray-400'
                      )}
                    />
                    <span
                      className={cn(
                        'text-xs',
                        vaccStatus === 'current' && 'text-green-600',
                        vaccStatus === 'due-soon' && 'text-yellow-600',
                        vaccStatus === 'expired' && 'text-red-600',
                        vaccStatus === 'missing' && 'text-gray-500'
                      )}
                    >
                      Vaccinations:{' '}
                      {vaccStatus === 'current'
                        ? 'Up to date'
                        : vaccStatus === 'due-soon'
                          ? 'Due soon'
                          : vaccStatus === 'expired'
                            ? 'Expired'
                            : 'Missing'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="px-2">
                    <CalendarPlus className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="px-2">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="px-2">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          {!expanded && owner.pets?.length > 2 && (
            <p className="text-center text-sm text-gray-500">
              +{owner.pets.length - 2} more pets
            </p>
          )}

          {owner.pets?.length === 0 && (
            <div className="py-4 text-center text-gray-500">
              <PawPrint className="mx-auto mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No pets registered</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-surface-border">
          <Button className="flex-1" size="sm">
            <CalendarPlus className="mr-1 h-4 w-4" />
            New Booking
          </Button>
          <Button variant="outline" className="flex-1" size="sm">
            <MessageSquare className="mr-1 h-4 w-4" />
            Message
          </Button>
          <Button variant="outline" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

const Stat = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-600 dark:text-text-secondary">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

export default UnifiedOwnerCard;

