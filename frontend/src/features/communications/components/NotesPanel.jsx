import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Plus, Pin, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import CreatableSelect from '@/components/ui/CreatableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEntityNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  useNoteCategories,
  useAddNoteCategory
} from '../api';
import { useAuth } from '@/features/auth/hooks/useAuth';

const visibilityColors = {
  ALL: 'gray',
  STAFF: 'blue',
  ADMIN: 'orange',
  PRIVATE: 'red',
};

const NoteItem = ({ note, onEdit, onDelete }) => {
  const { user } = useAuth();
  const togglePin = useToggleNotePin();

  const isAuthor = note.author.recordId === user?.recordId;
  const canEdit = isAuthor || user?.role === 'ADMIN' || user?.role === 'OWNER';

  return (
    <div className={`p-4 border rounded-lg ${note.isPinned ? 'border-primary bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={visibilityColors[note.visibility]} size="sm">
            {note.visibility}
          </Badge>
          {note.category && (
            <Badge variant="gray" size="sm">
              {note.category}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => togglePin.mutate(note.recordId)}
            className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary ${note.isPinned ? 'text-primary' : 'text-gray-400 dark:text-text-tertiary'}`}
            title={note.isPinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin className="w-4 h-4" />
          </button>

          {isAuthor && (
            <button
              onClick={() => onEdit(note)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary text-gray-400 dark:text-text-tertiary"
              title="Edit note"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onDelete(note)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-surface-secondary dark:bg-surface-secondary text-danger"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-text whitespace-pre-wrap">{note.content}</p>

      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <span>{note.author.name || note.author.email}</span>
        <span>{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
      </div>
    </div>
  );
};

const NoteForm = ({ entityType, entityId, note, onClose }) => {
  const [content, setContent] = useState(note?.content || '');
  const [category, setCategory] = useState(note?.category || '');
  const [visibility, setVisibility] = useState(note?.visibility || 'ALL');

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const { data: categories, isLoading: categoriesLoading } = useNoteCategories();
  const addNoteCategory = useAddNoteCategory();

  // Convert categories array to options format for CreatableSelect
  const categoryOptions = (categories || []).map(c => ({ value: c, label: c }));

  // Handle creating a new category
  const handleCreateCategory = useCallback(async (newCategoryName) => {
    const result = await addNoteCategory.mutateAsync(newCategoryName);
    return result; // Returns { value, label } for immediate selection
  }, [addNoteCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (note) {
        await updateNote.mutateAsync({
          noteId: note.recordId,
          content,
          category: category || null,
          visibility,
        });
      } else {
        await createNote.mutateAsync({
          entityType,
          entityId,
          content,
          category: category || null,
          visibility,
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        label="Note"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
        placeholder="Add your note..."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CreatableSelect
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onCreate={handleCreateCategory}
          options={categoryOptions}
          placeholder="Select or add category..."
          isLoading={categoriesLoading}
          menuPortalTarget={document.body}
          helpText="Optional"
        />

        <Select
          label="Visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          options={[
            { value: 'ALL', label: 'All Staff' },
            { value: 'STAFF', label: 'Staff Only' },
            { value: 'ADMIN', label: 'Admin Only' },
            { value: 'PRIVATE', label: 'Private' },
          ]}
          menuPortalTarget={document.body}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={createNote.isPending || updateNote.isPending}
        >
          {note ? 'Update Note' : 'Add Note'}
        </Button>
      </div>
    </form>
  );
};

export default function NotesPanel({ entityType, entityId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [filterVisibility, setFilterVisibility] = useState('');

  const { data: notes, isLoading } = useEntityNotes(entityType, entityId, {
    visibility: filterVisibility || undefined,
  });

  const deleteNote = useDeleteNote();

  const handleDelete = async (note) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote.mutateAsync(note.recordId);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Notes</h3>

        <div className="flex items-center gap-2">
          <Select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="w-32"
            options={[
              { value: '', label: 'All' },
              { value: 'ALL', label: 'All Staff' },
              { value: 'STAFF', label: 'Staff Only' },
              { value: 'ADMIN', label: 'Admin Only' },
              { value: 'PRIVATE', label: 'Private' },
            ]}
            menuPortalTarget={document.body}
          />

          <Button
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingNote(null);
              setShowForm(true);
            }}
          >
            Add Note
          </Button>
        </div>
      </div>

      {(showForm || editingNote) && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-surface-secondary rounded-lg">
          <NoteForm
            entityType={entityType}
            entityId={entityId}
            note={editingNote}
            onClose={() => {
              setShowForm(false);
              setEditingNote(null);
            }}
          />
        </div>
      )}

      <div className="space-y-3">
        {notes?.length === 0 ? (
          <p className="text-center py-8 text-text-secondary">No notes yet</p>
        ) : (
          notes?.map((note) => (
            <NoteItem
              key={note.recordId}
              note={note}
              onEdit={(note) => {
                setEditingNote(note);
                setShowForm(false);
              }}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </Card>
  );
}
