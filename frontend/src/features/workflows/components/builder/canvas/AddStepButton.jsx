/**
 * AddStepButton - Button to add a new step in the workflow canvas
 * Opens the left panel action selector when clicked
 */
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useWorkflowBuilderStore } from '../../../stores/builderStore';

export default function AddStepButton({
  afterStepId = null,
  branchId = null,
  size = 'default',
}) {
  const { openActionSelector } = useWorkflowBuilderStore();

  const handleClick = () => {
    // Open the action selector in the left panel with context
    openActionSelector(afterStepId, branchId);
  };

  const buttonSize = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';
  const iconSize = size === 'small' ? 10 : 12;

  return (
    <button
      onClick={handleClick}
      className={cn(
        buttonSize,
        "rounded-full",
        "bg-[var(--bb-color-bg-elevated)] border border-[var(--bb-color-border-subtle)]",
        "flex items-center justify-center",
        "text-[var(--bb-color-text-tertiary)]",
        "hover:border-[var(--bb-color-accent)] hover:text-[var(--bb-color-accent)]",
        "hover:bg-[var(--bb-color-accent-soft)]",
        "transition-all duration-150"
      )}
    >
      <Plus size={iconSize} />
    </button>
  );
}
