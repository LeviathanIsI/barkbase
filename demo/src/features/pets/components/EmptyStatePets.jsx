/**
 * EmptyStatePets - Empty state for pets directory
 * Uses unified empty state system with design tokens
 */

import { Plus, PawPrint } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/emptystates';

const EmptyStatePets = ({ onAddPet, onImport }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-[var(--bb-space-6)]">
      <EmptyState
        icon={PawPrint}
        title="No pets yet"
        description="Add your first pet profile to start managing stays, vaccinations, and care notes."
        actions={
          <div className="flex flex-col items-center gap-[var(--bb-space-3)]">
            <Button variant="primary" onClick={onAddPet}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Pet
            </Button>
            {onImport && (
              <button
                onClick={onImport}
                className="text-[var(--bb-font-size-sm)] text-[var(--bb-color-accent)] hover:underline"
              >
                Import from spreadsheet
              </button>
            )}
          </div>
        }
        className="max-w-md w-full"
      />
    </div>
  );
};

export default EmptyStatePets;

