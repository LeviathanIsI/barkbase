/**
 * EmptyStatePets - Premium empty state for pets directory
 * Uses unified empty state system with branded styling
 */

import { Plus, PawPrint, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/emptystates';

const EmptyStatePets = ({ onAddPet, onImport }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-[var(--bb-space-6)]">
      <EmptyState
        icon={PawPrint}
        title="Welcome to your pet directory"
        description="This is where all your furry guests will live. Add your first pet to start managing stays, vaccinations, and care notes."
        variant="neutral"
        actions={
          <div className="flex flex-col items-center gap-[var(--bb-space-3)]">
            <Button variant="primary" onClick={onAddPet}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Pet
            </Button>
            {onImport && (
              <Button variant="ghost" size="sm" onClick={onImport}>
                <Upload className="w-4 h-4 mr-2" />
                Import from spreadsheet
              </Button>
            )}
          </div>
        }
        className="max-w-md w-full"
      />
    </div>
  );
};

export default EmptyStatePets;
