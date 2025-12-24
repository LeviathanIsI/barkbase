/**
 * DeterminatorConfig - Configuration panel for determinator (if/then) steps
 * Supports multiple conditional branches with a "None matched" default branch
 * Similar to HubSpot's branch workflow feature
 */
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';
import ConditionBuilder from './ConditionBuilder';

// Generate unique branch ID
const generateBranchId = () => crypto.randomUUID();

export default function DeterminatorConfig({ step, objectType, onChange }) {
  const config = step.config || {};

  // Get branches or initialize with default structure
  const branches = config.branches || [
    {
      id: generateBranchId(),
      name: 'Branch 1',
      conditions: { logic: 'and', conditions: [] },
      order: 0,
    },
    {
      id: 'none-matched',
      name: 'None matched',
      conditions: null,
      order: 999,
      isDefault: true,
    },
  ];

  // Handle step name change
  const handleNameChange = (name) => {
    onChange({ name });
  };

  // Handle branch name change
  const handleBranchNameChange = (branchId, name) => {
    const updatedBranches = branches.map((b) =>
      b.id === branchId ? { ...b, name } : b
    );
    onChange({
      config: { ...config, branches: updatedBranches },
    });
  };

  // Handle branch conditions change
  const handleBranchConditionsChange = (branchId, conditions) => {
    const updatedBranches = branches.map((b) =>
      b.id === branchId ? { ...b, conditions } : b
    );
    onChange({
      config: { ...config, branches: updatedBranches },
    });
  };

  // Add a new branch (before "None matched")
  const handleAddBranch = () => {
    const nonDefaultBranches = branches.filter((b) => !b.isDefault);
    const defaultBranch = branches.find((b) => b.isDefault);
    const newOrder = nonDefaultBranches.length;

    const newBranch = {
      id: generateBranchId(),
      name: `Branch ${newOrder + 1}`,
      conditions: { logic: 'and', conditions: [] },
      order: newOrder,
    };

    const updatedBranches = [...nonDefaultBranches, newBranch];
    if (defaultBranch) {
      updatedBranches.push(defaultBranch);
    }

    onChange({
      config: { ...config, branches: updatedBranches },
    });
  };

  // Delete a branch (cannot delete default branch or last non-default branch)
  const handleDeleteBranch = (branchId) => {
    const nonDefaultBranches = branches.filter((b) => !b.isDefault);
    if (nonDefaultBranches.length <= 1) return; // Keep at least one non-default branch

    const updatedBranches = branches
      .filter((b) => b.id !== branchId)
      .map((b, index) => (b.isDefault ? b : { ...b, order: index }));

    onChange({
      config: { ...config, branches: updatedBranches },
    });
  };

  // Separate non-default branches from the default one for rendering
  const conditionalBranches = branches
    .filter((b) => !b.isDefault)
    .sort((a, b) => a.order - b.order);
  const defaultBranch = branches.find((b) => b.isDefault);

  return (
    <div className="p-4 space-y-4">
      {/* Step name */}
      <div>
        <label className="block text-xs font-medium text-[var(--bb-color-text-secondary)] mb-1">
          Step Name
        </label>
        <input
          type="text"
          value={step.name || ''}
          onChange={(e) => handleNameChange(e.target.value)}
          className={cn(
            "w-full px-3 py-2 rounded-md",
            "bg-[var(--bb-color-bg-body)] border border-[var(--bb-color-border-subtle)]",
            "text-sm text-[var(--bb-color-text-primary)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
        />
      </div>

      {/* Info */}
      <div className="px-3 py-2 rounded-md bg-[var(--bb-color-bg-body)]">
        <div className="text-sm text-[var(--bb-color-text-secondary)]">
          Records are evaluated against each branch in order. The first matching branch is followed.
          Records that don't match any conditions follow the <strong className="text-[#6B7280]">None matched</strong> branch.
        </div>
      </div>

      {/* Conditional Branches */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--bb-color-text-secondary)]">
            Branches ({conditionalBranches.length + 1})
          </label>
          <button
            onClick={handleAddBranch}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded",
              "text-xs text-[var(--bb-color-accent)]",
              "hover:bg-[var(--bb-color-accent-soft)]",
              "transition-colors"
            )}
          >
            <Plus size={14} />
            Add branch
          </button>
        </div>

        {/* Conditional branches */}
        {conditionalBranches.map((branch, index) => (
          <BranchEditor
            key={branch.id}
            branch={branch}
            index={index}
            objectType={objectType}
            canDelete={conditionalBranches.length > 1}
            onNameChange={(name) => handleBranchNameChange(branch.id, name)}
            onConditionsChange={(conditions) => handleBranchConditionsChange(branch.id, conditions)}
            onDelete={() => handleDeleteBranch(branch.id)}
          />
        ))}

        {/* Default "None matched" branch */}
        {defaultBranch && (
          <div
            className={cn(
              "rounded-lg border border-[var(--bb-color-border-subtle)]",
              "bg-[var(--bb-color-bg-surface)]"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--bb-color-border-subtle)]">
              <div className="flex items-center justify-center w-5 h-5 rounded bg-[#6B7280] text-white text-xs font-medium">
                ?
              </div>
              <span className="text-sm font-medium text-[var(--bb-color-text-secondary)]">
                None matched
              </span>
              <span className="ml-auto text-xs text-[var(--bb-color-text-tertiary)]">
                Default fallback
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs text-[var(--bb-color-text-tertiary)]">
                Records that don't match any of the above conditions will follow this branch.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * BranchEditor - Editor for a single conditional branch
 */
function BranchEditor({
  branch,
  index,
  objectType,
  canDelete,
  onNameChange,
  onConditionsChange,
  onDelete,
}) {
  const conditions = branch.conditions || { logic: 'and', conditions: [] };

  // Generate branch color based on index
  const branchColors = [
    '#10B981', // Green
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#84CC16', // Lime
  ];
  const branchColor = branchColors[index % branchColors.length];

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--bb-color-border-subtle)]",
        "bg-[var(--bb-color-bg-surface)]"
      )}
    >
      {/* Branch header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--bb-color-border-subtle)]">
        <GripVertical
          size={14}
          className="text-[var(--bb-color-text-tertiary)] cursor-grab"
        />
        <div
          className="flex items-center justify-center w-5 h-5 rounded text-white text-xs font-medium"
          style={{ backgroundColor: branchColor }}
        >
          {index + 1}
        </div>
        <input
          type="text"
          value={branch.name}
          onChange={(e) => onNameChange(e.target.value)}
          className={cn(
            "flex-1 px-2 py-1 rounded",
            "bg-transparent border border-transparent",
            "text-sm text-[var(--bb-color-text-primary)]",
            "hover:border-[var(--bb-color-border-subtle)]",
            "focus:outline-none focus:border-[var(--bb-color-accent)]"
          )}
          placeholder="Branch name"
        />
        {canDelete && (
          <button
            onClick={onDelete}
            className={cn(
              "p-1 rounded",
              "text-[var(--bb-color-text-tertiary)]",
              "hover:text-[var(--bb-color-status-negative)] hover:bg-[rgba(239,68,68,0.1)]",
              "transition-colors"
            )}
            title="Delete branch"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Branch conditions */}
      <div className="p-3">
        <ConditionBuilder
          objectType={objectType}
          conditions={conditions}
          onChange={onConditionsChange}
          label="When record matches"
          compact
        />
      </div>
    </div>
  );
}
