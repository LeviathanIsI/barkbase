import { format, parseISO } from 'date-fns';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const MedicationSchedule = ({ schedule }) => (
  <Card
    title="Medication Schedule"
    description="Reminders notify assigned staff with acknowledgement tracking."
  >
    <ul className="space-y-3 text-sm">
      {schedule.map((item) => (
        <li key={item.recordId} className="flex items-center justify-between rounded-lg border border-border/60 bg-surface/60 p-3">
          <div>
            <p className="font-medium text-text">{item.medication}</p>
            <p className="text-xs text-muted">
              {item.dosage} · {item.frequency} · Next dose {format(parseISO(item.nextDoseAt), 'p')}
            </p>
            <p className="mt-1 text-xs text-muted">Assigned to {item.staff}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={item.completed ? 'success' : 'warning'}>
              {item.completed ? 'Acknowledged' : 'Awaiting'}
            </Badge>
            <Button size="sm" variant="ghost">
              Remind
            </Button>
          </div>
        </li>
      ))}
    </ul>
  </Card>
);

export default MedicationSchedule;
