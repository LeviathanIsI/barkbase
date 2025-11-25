/**
 * RunDetailModal - Run/Kennel detail inspector using unified Inspector system
 */

import { Home, Edit2 } from 'lucide-react';
import {
  InspectorRoot,
  InspectorHeader,
  InspectorSection,
  InspectorField,
  InspectorFooter,
} from '@/components/ui/inspector';
import Button from '@/components/ui/Button';

const RunDetailModal = ({ run, isOpen, onClose, onEdit }) => {
  if (!isOpen || !run) return null;

  return (
    <InspectorRoot
      isOpen={isOpen}
      onClose={onClose}
      title={run.name || 'Run Details'}
      subtitle={run.type || 'Kennel'}
      variant="info"
      size="md"
    >
      <InspectorHeader
        status={run.status || 'Available'}
        statusIntent={run.status === 'occupied' ? 'info' : 'success'}
        metrics={[
          { label: 'Capacity', value: run.capacity || 1 },
          { label: 'Size', value: run.size || 'Standard' },
          { label: 'Zone', value: run.zone || 'Main' },
        ]}
      />

      <InspectorSection title="Run Information" icon={Home}>
        <div className="text-center py-[var(--bb-space-8)]">
          <div className="text-6xl mb-[var(--bb-space-4)]">🏠</div>
          <h3 className="text-[var(--bb-font-size-lg)] font-[var(--bb-font-weight-semibold)] text-[var(--bb-color-text-primary)] mb-[var(--bb-space-2)]">
            Complete Run Details
          </h3>
          <p className="text-[var(--bb-color-text-muted)]">
            Full run information, history, and management coming soon...
          </p>
        </div>
      </InspectorSection>

      <InspectorFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        {onEdit && (
          <Button variant="primary" onClick={onEdit}>
            <Edit2 className="w-4 h-4 mr-[var(--bb-space-2)]" />
            Edit Run
          </Button>
        )}
      </InspectorFooter>
    </InspectorRoot>
  );
};

export default RunDetailModal;
