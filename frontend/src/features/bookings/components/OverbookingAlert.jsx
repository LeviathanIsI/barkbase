import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

const OverbookingAlert = ({ onResolveOverbooking }) => {
  // TODO: Wire up to capacity/overbooking API when available
  const hasOverbooking = false; // Replace with real overbooking query

  if (!hasOverbooking) {
    return null;
  }

  return (
    <Alert variant="danger" icon={AlertTriangle} title="Overbooking Alert">
      <p className="mb-[var(--bb-space-3)]">Capacity conflict detected that needs resolution.</p>
      <Button size="sm" variant="outline" onClick={onResolveOverbooking}>
        Resolve Now
      </Button>
    </Alert>
  );
};

export default OverbookingAlert;
