import { format, formatDistanceToNow, parseISO } from 'date-fns';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

const placeholderImage =
  'https://images.unsplash.com/photo-1507149833265-60c372daea22?auto=format&fit=crop&w=400&q=80';

const PetProfile = ({ pet }) => {
  const primaryOwner = pet.owners?.find((owner) => owner.isPrimary)?.owner ?? pet.owners?.[0]?.owner;
  const behaviorFlags = Array.isArray(pet.behaviorFlags) ? pet.behaviorFlags : [];
  const birthdate = pet.birthdate ? parseISO(pet.birthdate) : null;
  const ageLabel = birthdate ? formatDistanceToNow(birthdate, { addSuffix: false }) : 'Unknown';

  return (
    <Card
      title={pet.name}
      description={primaryOwner ? `${primaryOwner.firstName} ${primaryOwner.lastName}` : 'Owner pending assignment'}
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="w-full lg:w-48">
          <div className="relative overflow-hidden rounded-lg border border-border/60 bg-surface/60">
            <img
              src={pet.photoUrl || placeholderImage}
              alt={`${pet.name} profile`}
              className="h-48 w-full object-cover"
            />
          </div>
          <div className="mt-3 space-y-1 text-xs text-muted">
            <p>Breed: {pet.breed || 'Unknown'}</p>
            <p>Age: {ageLabel}</p>
            {birthdate && <p>Birthday: {format(birthdate, 'MMM d, yyyy')}</p>}
          </div>
        </div>
        <div className="flex-1 space-y-4 text-sm text-text/90">
          <div>
            <h4 className="text-sm font-semibold text-text">Behavior Flags</h4>
            {behaviorFlags.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {behaviorFlags.map((flag) => (
                  <Badge key={flag} variant="warning" className="capitalize">
                    {String(flag).replace(/-/g, ' ')}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted">No flags recorded.</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Dietary Notes</h4>
            <p className="mt-2 text-xs text-muted">{pet.dietaryNotes || 'Not provided.'}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text">Medical Notes</h4>
            <p className="mt-2 whitespace-pre-line text-xs text-muted">{pet.medicalNotes || 'No active notes.'}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PetProfile;
