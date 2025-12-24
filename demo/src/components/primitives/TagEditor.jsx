import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import Button from '@/components/ui/Button';
import TagList from './TagList';

/**
 * Editable tag list with inline add/remove affordances.
 */
export default function TagEditor({
  tags = [],
  onAdd,
  onRemove,
  isSaving = false,
  className,
  inputPlaceholder = 'Add tag',
}) {
  const [draft, setDraft] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd?.(trimmed);
    setDraft('');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <TagList tags={tags} onRemove={onRemove} />
      {onAdd && (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={inputPlaceholder}
            className="flex-1 rounded-md border border-border bg-white dark:bg-surface-primary px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={isSaving}
          />
          <Button type="submit" size="sm" disabled={isSaving || !draft.trim()} icon={<Plus className="h-4 w-4" />}>
            Add
          </Button>
        </form>
      )}
    </div>
  );
}
