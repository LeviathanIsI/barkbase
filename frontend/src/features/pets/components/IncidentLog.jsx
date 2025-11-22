import { format, parseISO } from 'date-fns';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const IncidentLog = ({ incidents }) => (
  <Card
    title="Incident Reports"
    description="Documented events with media attachments and staff notes."
  >
    <ul className="space-y-3 text-sm">
      {incidents.map((incident) => (
        <li key={incident.recordId} className="rounded-lg border border-border/60 bg-surface/60 p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-text">{incident.title}</p>
            <Badge variant="warning">{incident.severity}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">{format(parseISO(incident.occurredAt), 'MMM d, yyyy · p')}</p>
          <p className="mt-2 text-xs text-muted">{incident.description}</p>
          {incident.followUp && <p className="mt-2 text-xs text-muted">Follow-up: {incident.followUp}</p>}
        </li>
      ))}
    </ul>
  </Card>
);

export default IncidentLog;
