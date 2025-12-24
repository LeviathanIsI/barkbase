import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';

const getVariant = (days) => {
  if (days <= 30) return 'danger';
  if (days <= 60) return 'warning';
  if (days <= 90) return 'info';
  return 'neutral';
};

const VaccinationTimeline = ({ vaccinations = [] }) => (
  <Card
    title="Vaccinations"
    description="Automatic alerts at 90/60/30 days ensure compliance."
  >
    {vaccinations.length === 0 ? (
      <p className="text-xs text-muted">No vaccinations recorded.</p>
    ) : (
      <ul className="space-y-3 text-sm">
        {vaccinations.map((vaccination) => {
          const expiry = parseISO(vaccination.expiresAt);
          const daysRemaining = differenceInCalendarDays(expiry, new Date());
          return (
            <li
              key={vaccination.recordId}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-surface/60 p-3"
            >
              <div>
                <p className="font-medium text-text">{vaccination.type}</p>
                <p className="text-xs text-muted">
                  Administered {format(parseISO(vaccination.administeredAt), 'MMM d, yyyy')}
                </p>
              </div>
              <Badge variant={getVariant(daysRemaining)}>
                {daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`}
              </Badge>
            </li>
          );
        })}
      </ul>
    )}
  </Card>
);

export default VaccinationTimeline;
