import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

const ConflictsWarning = ({ onViewConflicts }) => {
  // TODO: Wire up to conflicts API when available
  const hasConflicts = false; // Replace with real conflicts query

  if (!hasConflicts) {
    return null;
  }

  return (
    <Alert variant="warning" icon={AlertTriangle} title="Booking Conflicts Detected">
      <p className="mb-[var(--bb-space-3)]">Conflicts detected that need attention.</p>
      <Button size="sm" variant="outline" onClick={onViewConflicts}>
        View Conflicts
      </Button>
    </Alert>
  );
};

export default ConflictsWarning;
