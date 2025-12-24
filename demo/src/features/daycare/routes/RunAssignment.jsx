import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Clock,
  Printer,
  Save,
  ExternalLink,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Phone,
  PawPrint,
  User,
  Calendar,
  RotateCcw,
  GripVertical,
  Square,
  CheckSquare,
  Users,
  Settings,
  Loader2,
  TrendingUp,
  BarChart3,
  Zap,
  Info,
  UserCheck,
} from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollableTableContainer } from '@/components/ui/ScrollableTableContainer';
import { useTodaysAssignmentsQuery, useSaveRunAssignmentsMutation, useRemovePetFromRunMutation } from '../api';
import { useRunTemplatesQuery } from '../api-templates';
import { useBookingsQuery } from '@/features/bookings/api';
import TimeSlotPicker from '../components/TimeSlotPicker';
import toast from 'react-hot-toast';
import { cn } from '@/lib/cn';

// Stat Card Component - Matching Schedule page style
const StatCard = ({ icon: Icon, label, value, delta, variant = 'primary', tooltip }) => {
  const variantStyles = {
    primary: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      icon: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/50',
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      icon: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      icon: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/50',
    },
    danger: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      icon: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800/50',
    },
  };

  const styles = variantStyles[variant] || variantStyles.primary;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 rounded-xl border p-4',
        styles.bg,
        styles.border
      )}
      title={tooltip}
    >
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', styles.iconBg)}>
        <Icon className={cn('h-5 w-5', styles.icon)} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-[color:var(--bb-color-text-muted)]">
          {label}
        </p>
        <p className="text-2xl font-bold text-[color:var(--bb-color-text-primary)] leading-tight">
          {value}
        </p>
        {delta !== undefined && delta !== 0 && (
          <p className={cn('text-xs font-medium', delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
            {delta > 0 ? '+' : ''}{delta} vs yesterday
          </p>
        )}
      </div>
    </div>
  );
};

// Sortable Pet Card for assigned pets (can be reordered)
const SortablePetCard = ({ 
  assignment, 
  isSelected, 
  onSelect, 
  onRemove,
  showCheckbox = true,
}) => {
  const pet = assignment.pet;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `pet-${pet.recordId}`,
    data: { pet, assignment },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ownerName = pet.owners?.[0]?.owner
    ? `${pet.owners[0].owner.firstName} ${pet.owners[0].owner.lastName}`
    : 'Unknown Owner';
  const ownerPhone = pet.owners?.[0]?.owner?.phone || '';

  // Parse behavioral flags
  const behaviorFlags = useMemo(() => {
    if (!pet.behaviorFlags) return [];
    if (typeof pet.behaviorFlags === 'string') {
      try {
        const parsed = JSON.parse(pet.behaviorFlags);
        return Object.keys(parsed).filter(key => parsed[key] === true);
      } catch {
        return [];
      }
    }
    if (typeof pet.behaviorFlags === 'object') {
      return Object.keys(pet.behaviorFlags).filter(key => pet.behaviorFlags[key] === true);
    }
    return [];
  }, [pet.behaviorFlags]);

  const hasWarnings = behaviorFlags.length > 0 || pet.medicalNotes || pet.dietaryNotes;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-white dark:bg-surface-primary border rounded-lg p-3 transition-all duration-200',
        hasWarnings ? 'border-amber-400 dark:border-amber-600' : 'border-border',
        isDragging ? 'shadow-lg ring-2 ring-primary/50' : 'hover:shadow-md hover:border-primary/30',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        {showCheckbox && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(pet.recordId);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-0.5 text-muted hover:text-primary transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        )}

        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted hover:text-text mt-0.5 touch-none"
          style={{ userSelect: 'none' }}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Pet Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
          <PawPrint className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-text truncate">{pet.name}</h4>
            {hasWarnings && (
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" title="Has behavioral notes" />
            )}
          </div>
          <p className="text-sm text-muted truncate">{pet.breed || pet.species || 'Unknown breed'}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <User className="h-3 w-3 text-muted" />
            <span className="text-xs text-muted truncate">{ownerName}</span>
          </div>
          {ownerPhone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3 w-3 text-muted" />
              <span className="text-xs text-muted">{ownerPhone}</span>
            </div>
          )}
          {assignment.startTime && assignment.endTime && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">
                {assignment.startTime} - {assignment.endTime}
              </span>
            </div>
          )}
          {behaviorFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {behaviorFlags.slice(0, 2).map((flag) => (
                <Badge key={flag} variant="warning" size="sm" className="text-xs capitalize">
                  {String(flag).replace(/-/g, ' ').replace(/_/g, ' ')}
                </Badge>
              ))}
              {behaviorFlags.length > 2 && (
                <Badge variant="warning" size="sm" className="text-xs">
                  +{behaviorFlags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(pet.recordId);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-danger hover:bg-danger/10 rounded transition-all"
          title="Remove from run"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Draggable Pet Card for unassigned pets
const DraggablePetCard = ({
  pet,
  isSelected,
  onSelect,
  isDragOverlay = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pet-${pet.recordId}`,
    data: { pet },
  });

  const style = isDragOverlay
    ? {}
    : {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      };

  const ownerName = pet.owners?.[0]?.owner
    ? `${pet.owners[0].owner.firstName} ${pet.owners[0].owner.lastName}`
    : 'Unknown Owner';
  const ownerPhone = pet.owners?.[0]?.owner?.phone || '';

  // Parse behavioral flags
  const behaviorFlags = useMemo(() => {
    if (!pet.behaviorFlags) return [];
    if (typeof pet.behaviorFlags === 'string') {
      try {
        const parsed = JSON.parse(pet.behaviorFlags);
        return Object.keys(parsed).filter(key => parsed[key] === true);
      } catch {
        return [];
      }
    }
    if (typeof pet.behaviorFlags === 'object') {
      return Object.keys(pet.behaviorFlags).filter(key => pet.behaviorFlags[key] === true);
    }
    return [];
  }, [pet.behaviorFlags]);

  const hasWarnings = behaviorFlags.length > 0 || pet.medicalNotes || pet.dietaryNotes;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group bg-white dark:bg-surface-primary border rounded-lg p-3 transition-all duration-200',
        hasWarnings ? 'border-amber-400 dark:border-amber-600' : 'border-border',
        isDragging ? 'shadow-lg ring-2 ring-primary/50' : 'hover:shadow-md hover:border-primary/30',
        isDragOverlay && 'shadow-xl ring-2 ring-primary rotate-3',
        isSelected && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        {!isDragOverlay && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(pet.recordId);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-0.5 text-muted hover:text-primary transition-colors"
          >
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>
        )}

        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted hover:text-text mt-0.5 touch-none"
          style={{ userSelect: 'none' }}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Pet Avatar */}
        <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center flex-shrink-0">
          <PawPrint className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-text truncate">{pet.name}</h4>
            {hasWarnings && (
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" title="Has behavioral notes" />
            )}
          </div>
          <p className="text-sm text-muted truncate">{pet.breed || pet.species || 'Unknown breed'}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <User className="h-3 w-3 text-muted" />
            <span className="text-xs text-muted truncate">{ownerName}</span>
          </div>
          {ownerPhone && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3 w-3 text-muted" />
              <span className="text-xs text-muted">{ownerPhone}</span>
            </div>
          )}
          {behaviorFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {behaviorFlags.slice(0, 2).map((flag) => (
                <Badge key={flag} variant="warning" size="sm" className="text-xs capitalize">
                  {String(flag).replace(/-/g, ' ').replace(/_/g, ' ')}
                </Badge>
              ))}
              {behaviorFlags.length > 2 && (
                <Badge variant="warning" size="sm" className="text-xs">
                  +{behaviorFlags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Run Column with drop zone
const RunColumn = ({
  run,
  assignments,
  selectedPets,
  onSelect,
  onRemove,
  onReorder,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: run.recordId,
    data: { run },
  });

  const maxCapacity = run.maxCapacity || run.capacity || 10;
  const currentCount = assignments.length;
  const utilizationPercent = Math.round((currentCount / maxCapacity) * 100);
  const isOverCapacity = currentCount > maxCapacity;

  // Get sortable IDs for pets in this run
  const sortableIds = assignments.map(a => `pet-${a.pet.recordId}`);

  // Capacity color based on utilization
  const capacityColor = isOverCapacity
    ? 'text-red-600 dark:text-red-400'
    : utilizationPercent >= 90
    ? 'text-red-600 dark:text-red-400'
    : utilizationPercent >= 70
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const barColor = isOverCapacity
    ? 'bg-red-500'
    : utilizationPercent >= 90
    ? 'bg-red-500'
    : utilizationPercent >= 70
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className="flex flex-col h-full min-w-[280px] flex-shrink-0">
      {/* Run Header */}
      <div
        className="rounded-t-lg p-4 border border-b-0"
        style={{
          backgroundColor: 'var(--bb-color-bg-surface)',
          borderColor: 'var(--bb-color-border-subtle)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[color:var(--bb-color-text-primary)] truncate">{run.name}</h3>
          <span className={cn('text-lg font-bold', capacityColor)}>
            {currentCount}/{maxCapacity}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[color:var(--bb-color-text-muted)]">
          <span className="px-2 py-0.5 rounded capitalize" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            {run.type || 'Standard'}
          </span>
          {run.timePeriodMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {run.timePeriodMinutes}min
            </span>
          )}
        </div>

        {/* Utilization bar */}
        <div className="mt-3">
          <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
            <div
              className={cn('h-full rounded-full transition-all duration-300', barColor)}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-[color:var(--bb-color-text-muted)]">
            <span>{utilizationPercent}% full</span>
            <span>{maxCapacity - currentCount} spots left</span>
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 border-2 border-dashed rounded-b-lg p-3 transition-all min-h-[200px] max-h-[400px] overflow-y-auto',
          isOver
            ? 'border-[color:var(--bb-color-accent)] bg-[color:var(--bb-color-accent-soft)]'
            : 'border-[color:var(--bb-color-border-subtle)]'
        )}
        style={{
          backgroundColor: isOver ? undefined : 'var(--bb-color-bg-body)',
        }}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <SortablePetCard
                key={assignment.pet.recordId}
                assignment={assignment}
                isSelected={selectedPets.has(assignment.pet.recordId)}
                onSelect={onSelect}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>

        {assignments.length === 0 && (
          <div className={cn(
            'flex flex-col items-center justify-center h-full text-center py-8',
            isOver ? 'text-[color:var(--bb-color-accent)]' : 'text-[color:var(--bb-color-text-muted)]'
          )}>
            <PawPrint className={cn('h-8 w-8 mb-2', isOver ? 'text-[color:var(--bb-color-accent)]' : 'opacity-30')} />
            <p className="text-sm font-medium">
              {isOver ? 'Drop pet here' : 'No pets assigned'}
            </p>
            <p className="text-xs mt-1">Drag pets here to assign</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Assignment Overview Card for sidebar
const AssignmentOverview = ({ unassignedCount, runsCount, totalAssigned, totalCapacity }) => {
  const utilizationPercent = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  const getThresholdColor = (pct) => {
    if (pct >= 90) return 'text-red-600 dark:text-red-400';
    if (pct >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const barColor = utilizationPercent >= 90 ? 'bg-red-500' : utilizationPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Assignment Overview</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <p className={cn('text-xl font-bold', unassignedCount > 0 ? 'text-amber-600' : 'text-emerald-600')}>
            {unassignedCount}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Unassigned</p>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <p className="text-xl font-bold text-[color:var(--bb-color-text-primary)]">{runsCount}</p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)]">Runs Available</p>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[color:var(--bb-color-text-muted)]">Overall Utilization</span>
          <span className={cn('text-lg font-bold', getThresholdColor(utilizationPercent))}>{utilizationPercent}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[color:var(--bb-color-text-muted)]">
          <span>{totalAssigned} assigned</span>
          <span>{totalCapacity - totalAssigned} spots left</span>
        </div>
      </div>
    </div>
  );
};

// Unassigned Pets Sidebar Card (droppable for returning pets)
const UnassignedPetsSidebar = ({ pets, selectedPets, onSelect, onSelectAll }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned',
    data: { isUnassigned: true },
  });

  const allSelected = pets.length > 0 && pets.every(p => selectedPets.has(p.recordId));

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--bb-color-border-subtle)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-[color:var(--bb-color-text-muted)]" />
            <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Unassigned Pets</h3>
          </div>
          <Badge variant={pets.length > 0 ? 'warning' : 'success'}>{pets.length}</Badge>
        </div>
        <p className="text-xs text-[color:var(--bb-color-text-muted)]">Drag pets to assign to runs</p>

        {pets.length > 0 && (
          <button
            onClick={() => onSelectAll(pets.map(p => p.recordId))}
            className="mt-3 flex items-center gap-2 text-xs text-[color:var(--bb-color-accent)] hover:opacity-80 transition-colors"
          >
            {allSelected ? (
              <>
                <CheckSquare className="h-3.5 w-3.5" />
                Deselect all
              </>
            ) : (
              <>
                <Square className="h-3.5 w-3.5" />
                Select all ({pets.length})
              </>
            )}
          </button>
        )}
      </div>

      {/* Pet List */}
      <div
        ref={setNodeRef}
        className={cn(
          'p-3 max-h-[280px] overflow-y-auto transition-colors',
          isOver && 'bg-[color:var(--bb-color-accent-soft)]'
        )}
      >
        <div className="space-y-2">
          {pets.map((pet) => (
            <DraggablePetCard
              key={pet.recordId}
              pet={pet}
              isSelected={selectedPets.has(pet.recordId)}
              onSelect={onSelect}
            />
          ))}
        </div>

        {pets.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <Check className="h-10 w-10 text-emerald-500 mb-3" />
            <p className="font-medium text-emerald-600 dark:text-emerald-400">All pets assigned!</p>
            <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">No unassigned pets for this date</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Smart Suggestions Card for sidebar
const SmartSuggestions = ({ unassignedPets, runs }) => {
  // Generate simple suggestions based on pet size/breed matching run type
  const suggestions = useMemo(() => {
    if (!unassignedPets || unassignedPets.length === 0 || !runs || runs.length === 0) return [];

    const result = [];
    unassignedPets.slice(0, 3).forEach(pet => {
      // Simple matching logic - could be enhanced
      const breed = pet.breed?.toLowerCase() || '';
      const species = pet.species?.toLowerCase() || 'dog';

      // Try to find a matching run
      const matchingRun = runs.find(run => {
        const runType = run.type?.toLowerCase() || '';
        const runName = run.name?.toLowerCase() || '';

        // Big dogs
        if ((breed.includes('lab') || breed.includes('retriever') || breed.includes('shepherd')) &&
            (runName.includes('big') || runType.includes('large'))) {
          return true;
        }
        // Small dogs
        if ((breed.includes('chihuahua') || breed.includes('terrier') || breed.includes('poodle')) &&
            (runName.includes('small') || runType.includes('small'))) {
          return true;
        }
        return false;
      });

      if (matchingRun) {
        result.push({
          pet,
          run: matchingRun,
          reason: 'size match',
        });
      }
    });

    return result;
  }, [unassignedPets, runs]);

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-5 w-5 text-[color:var(--bb-color-accent)]" />
        <h3 className="font-semibold text-[color:var(--bb-color-text-primary)]">Smart Suggestions</h3>
      </div>

      {suggestions.length > 0 ? (
        <div className="space-y-2">
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border p-2 text-sm"
              style={{ backgroundColor: 'var(--bb-color-bg-elevated)', borderColor: 'var(--bb-color-border-subtle)' }}
            >
              <PawPrint className="h-4 w-4 text-[color:var(--bb-color-accent)]" />
              <span className="font-medium text-[color:var(--bb-color-text-primary)]">{s.pet.name}</span>
              <span className="text-[color:var(--bb-color-text-muted)]">→</span>
              <span className="text-[color:var(--bb-color-text-secondary)]">{s.run.name}</span>
              <span className="text-xs text-[color:var(--bb-color-text-muted)]">({s.reason})</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <Info className="h-6 w-6 text-[color:var(--bb-color-text-muted)] mx-auto mb-2 opacity-50" />
          <p className="text-sm text-[color:var(--bb-color-text-muted)]">
            {unassignedPets?.length === 0 ? 'All pets are assigned' : 'No suggestions available'}
          </p>
          <p className="text-xs text-[color:var(--bb-color-text-muted)] mt-1">
            Drag pets manually to assign
          </p>
        </div>
      )}
    </div>
  );
};

const RunAssignment = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentState, setAssignmentState] = useState({});
  const [initialState, setInitialState] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [activePet, setActivePet] = useState(null);
  const [initializedDate, setInitializedDate] = useState(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);
  const [selectedPets, setSelectedPets] = useState(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Fetch today's assignments, templates, and checked-in pets
  const { data: runs, isLoading: runsLoading, refetch: refetchRuns } = useTodaysAssignmentsQuery(selectedDate);
  const { data: templates, isLoading: templatesLoading } = useRunTemplatesQuery();
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsQuery({ 
    status: 'CHECKED_IN',
    from: selectedDate,
    to: selectedDate
  });
  const saveAssignmentsMutation = useSaveRunAssignmentsMutation();

  const isLoading = runsLoading || bookingsLoading || templatesLoading;

  // Get checked-in pets for the day with owner information
  const checkedInPets = useMemo(() => {
    const bookings = bookingsData?.data || bookingsData || [];
    const checked = bookings.filter(b => b.status === 'CHECKED_IN');
    const pets = checked
      .map(b => {
        if (!b.pet) return null;
        return {
          ...b.pet,
          recordId: b.pet.recordId || b.pet.id, // ensure recordId is set
          owners: b.owner ? [{ owner: b.owner }] : [],
          bookingInfo: {
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            serviceName: b.service?.name || 'Boarding',
          }
        };
      })
      .filter(Boolean);
    return pets;
  }, [bookingsData]);

  // Initialize assignment state from API data
  useEffect(() => {
    if (!runs || initializedDate === selectedDate) return;

    const newState = {};
    runs.forEach(run => {
      newState[run.recordId] = run.assignments || [];
    });
    setAssignmentState(newState);
    setInitialState(JSON.parse(JSON.stringify(newState)));
    setInitializedDate(selectedDate);
    setSelectedPets(new Set());
  }, [runs, selectedDate, initializedDate]);

  // Get unassigned pets
  const unassignedPets = useMemo(() => {
    const allAssignedPetIds = new Set(
      Object.values(assignmentState).flat().map(a => a.pet?.recordId).filter(Boolean)
    );
    return checkedInPets.filter(pet => !allAssignedPetIds.has(pet.recordId));
  }, [checkedInPets, assignmentState]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return JSON.stringify(assignmentState) !== JSON.stringify(initialState);
  }, [assignmentState, initialState]);

  // Calculate stats for the stat cards (MUST be before any early returns)
  const stats = useMemo(() => {
    const totalAssigned = Object.values(assignmentState).flat().length;
    const totalCapacity = runs?.reduce((sum, run) => sum + (run.maxCapacity || run.capacity || 10), 0) || 0;
    const utilizationPercent = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

    return {
      petsCheckedIn: checkedInPets.length,
      unassigned: unassignedPets.length,
      totalAssigned,
      totalCapacity,
      utilization: utilizationPercent,
    };
  }, [checkedInPets.length, unassignedPets.length, assignmentState, runs]);

  // Date formatting (before early returns)
  const formattedDate = format(new Date(selectedDate), 'EEEE, MMMM d, yyyy');
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Date navigation
  const navigateDate = (direction) => {
    const current = new Date(selectedDate);
    const newDate = direction === 'prev' 
      ? subDays(current, 1) 
      : addDays(current, 1);
    setSelectedDate(newDate.toISOString().split('T')[0]);
    setInitializedDate(null);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setInitializedDate(null);
  };

  // Selection handlers
  const handleSelectPet = useCallback((petId) => {
    setSelectedPets(prev => {
      const next = new Set(prev);
      if (next.has(petId)) {
        next.delete(petId);
      } else {
        next.add(petId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((petIds) => {
    setSelectedPets(prev => {
      const allSelected = petIds.every(id => prev.has(id));
      if (allSelected) {
        return new Set();
      } else {
        return new Set(petIds);
      }
    });
  }, []);

  // Remove pet from run
  const handleRemovePet = useCallback((petId, runId) => {
    setAssignmentState(prev => {
      const newState = { ...prev };
      if (newState[runId]) {
        newState[runId] = newState[runId].filter(a => a.pet?.recordId !== petId);
      }
      return newState;
    });
  }, []);

  // Drag handlers
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);

    const petId = active.id.replace('pet-', '');
    let pet = checkedInPets.find(p => p.recordId === petId);

    if (!pet) {
      for (const assignments of Object.values(assignmentState)) {
        const assignment = assignments.find(a => a.pet?.recordId === petId);
        if (assignment) {
          pet = assignment.pet;
          break;
        }
      }
    }

    setActivePet(pet);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActivePet(null);

    if (!over) return;

    const petId = active.id.replace('pet-', '');
    const targetId = over.id;

    // Handle dropping back to unassigned
    if (targetId === 'unassigned') {
      // Remove from all runs
      setAssignmentState(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(runId => {
          newState[runId] = newState[runId].filter(a => a.pet?.recordId !== petId);
        });
        return newState;
      });
      return;
    }

    // Check if dropping onto a run
    const targetRun = runs?.find(r => r.recordId === targetId);
    if (!targetRun) {
      // Might be reordering within the same run - check if target is another pet
      // Find which run contains the target pet
      let sourceRunId = null;
      let targetRunId = null;
      let sourceIndex = -1;
      let targetIndex = -1;

      for (const [runId, assignments] of Object.entries(assignmentState)) {
        const sIdx = assignments.findIndex(a => `pet-${a.pet?.recordId}` === active.id);
        const tIdx = assignments.findIndex(a => `pet-${a.pet?.recordId}` === targetId);

        if (sIdx !== -1) {
          sourceRunId = runId;
          sourceIndex = sIdx;
        }
        if (tIdx !== -1) {
          targetRunId = runId;
          targetIndex = tIdx;
        }
      }

      // If both are in the same run, reorder
      if (sourceRunId && sourceRunId === targetRunId && sourceIndex !== targetIndex) {
        setAssignmentState(prev => {
          const newState = { ...prev };
          newState[sourceRunId] = arrayMove(newState[sourceRunId], sourceIndex, targetIndex);
          return newState;
        });
      }
      return;
    }

    // Find the pet
    let pet = checkedInPets.find(p => p.recordId === petId);
    if (!pet) {
      for (const assignments of Object.values(assignmentState)) {
        const assignment = assignments.find(a => a.pet?.recordId === petId);
        if (assignment) {
          pet = assignment.pet;
          break;
        }
      }
    }

    if (!pet) return;

    // Open time picker modal
    setPendingAssignment({
      pet,
      run: targetRun,
      runId: targetId
    });
    setTimePickerOpen(true);
  };

  const handleTimeSlotConfirm = async ({ startTime, endTime }) => {
    if (!pendingAssignment) return;

    const { pet, runId } = pendingAssignment;

    // Update local state
    const newState = { ...assignmentState };
    Object.keys(newState).forEach(rid => {
      newState[rid] = newState[rid].filter(a => a.pet?.recordId !== pet.recordId);
    });
    if (!newState[runId]) {
      newState[runId] = [];
    }
    newState[runId].push({ pet, startTime, endTime });
    setAssignmentState(newState);

    // Save immediately to API
    const assignments = [];
    for (const [rId, runAssignments] of Object.entries(newState)) {
      for (const assignment of runAssignments) {
        assignments.push({
          runId: rId,
          petId: assignment.pet?.recordId || assignment.pet?.id,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          bookingId: assignment.bookingId || null,
          notes: assignment.notes || null,
        });
      }
    }

    try {
      await saveAssignmentsMutation.mutateAsync({
        date: selectedDate,
        assignments,
      });
      setInitialState(JSON.parse(JSON.stringify(newState)));
      toast.success(`${pet.name} assigned to run`);
      refetchRuns();
    } catch (error) {
      console.error('[RunAssignment] Save failed:', error);
      toast.error(error.message || 'Failed to save assignment');
    }

    setTimePickerOpen(false);
    setPendingAssignment(null);
  };

  /**
   * Handle save button click - saves all run assignments for the current date.
   */
  const handleSaveAssignments = async () => {
    // Transform assignmentState into flat array for API
    const assignments = [];

    for (const [runId, runAssignments] of Object.entries(assignmentState)) {
      for (const assignment of runAssignments) {
        assignments.push({
          runId,
          petId: assignment.pet?.recordId || assignment.pet?.id,
          startTime: assignment.startTime,
          endTime: assignment.endTime,
          bookingId: assignment.bookingId || null,
          notes: assignment.notes || null,
        });
      }
    }

    try {
      await saveAssignmentsMutation.mutateAsync({
        date: selectedDate,
        assignments,
      });

      // Update initial state to match current state (no more "unsaved changes")
      setInitialState(JSON.parse(JSON.stringify(assignmentState)));
      toast.success(`${assignments.length} assignment(s) saved successfully`);

      // Refetch to get server-generated IDs
      refetchRuns();
    } catch (error) {
      console.error('[RunAssignment] Save failed:', error);
      toast.error(error.message || 'Failed to save assignments');
    }
  };

  const handleResetChanges = () => {
    setAssignmentState(JSON.parse(JSON.stringify(initialState)));
    setSelectedPets(new Set());
    toast.success('Changes reset');
  };

  const handlePrintRunSheets = () => {
    const printContent = runs?.map(run => {
      const assignments = assignmentState[run.recordId] || [];
      return `
        <div style="page-break-after: always; padding: 20px;">
          <h2>${run.name}</h2>
          <p>Date: ${format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
          <p>Capacity: ${assignments.length}/${run.maxCapacity || run.capacity}</p>
          <hr style="margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pet Name</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Breed</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Owner</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Phone</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Check</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.map(assignment => {
                const pet = assignment.pet;
                const owner = pet.owners?.[0]?.owner;
                const ownerName = owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown';
                const ownerPhone = owner?.phone || '—';
                const timeSlot = assignment.startTime && assignment.endTime 
                  ? `${assignment.startTime} - ${assignment.endTime}`
                  : '—';
                return `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${pet.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${pet.breed || '—'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${ownerName}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${ownerPhone}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${timeSlot}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">☐</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Run Sheets - ${format(new Date(selectedDate), 'MMMM d, yyyy')}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            @media print { @page { size: letter; margin: 0.5in; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printContent}
        </body>
      </html>
    `);
    win.document.close();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-[500px] w-[320px]" />
          <Skeleton className="h-[500px] w-[300px]" />
          <Skeleton className="h-[500px] w-[300px]" />
        </div>
      </div>
    );
  }

  // No templates configured
  if (!templates || templates.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Run Assignment"
          description="Assign checked-in pets to daycare runs"
          breadcrumbs={[
            { label: 'Operations' },
            { label: 'Runs' }
          ]}
        />
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-surface-secondary rounded-full flex items-center justify-center mb-4">
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-text mb-2">No Run Templates Configured</h3>
            <p className="text-muted mb-6">
              Before you can assign pets to runs, you need to create run templates in Settings. 
              These templates define the schedule, capacity, and time slots for each run.
            </p>
            <Button onClick={() => navigate('/settings/facility?tab=run-templates')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Run Templates Settings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav className="mb-2">
            <ol className="flex items-center gap-1 text-xs text-[color:var(--bb-color-text-muted)]">
              <li><span>Operations</span></li>
              <li><ChevronLeft className="h-3 w-3 rotate-180" /></li>
              <li className="text-[color:var(--bb-color-text-primary)] font-medium">Runs</li>
            </ol>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[color:var(--bb-color-text-primary)]">Run Assignment</h1>
            <span className="text-sm text-[color:var(--bb-color-text-muted)]">{formattedDate}</span>
            {isToday && <Badge variant="success" size="sm">Today</Badge>}
          </div>
          <p className="text-sm text-[color:var(--bb-color-text-muted)] mt-1">Drag and drop to assign checked-in pets to daycare runs</p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Navigation */}
          <div
            className="flex items-center gap-1 rounded-lg p-1 border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <button
              onClick={() => navigateDate('prev')}
              className="p-1.5 hover:bg-[color:var(--bb-color-bg-elevated)] rounded transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                'px-2 py-1 text-sm rounded transition-colors',
                isToday ? 'bg-[color:var(--bb-color-accent)] text-white' : 'hover:bg-[color:var(--bb-color-bg-elevated)]'
              )}
            >
              Today
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-1.5 hover:bg-[color:var(--bb-color-bg-elevated)] rounded transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{ backgroundColor: 'var(--bb-color-bg-surface)', borderColor: 'var(--bb-color-border-subtle)' }}
          >
            <Calendar className="h-4 w-4 text-[color:var(--bb-color-text-muted)]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setInitializedDate(null);
              }}
              className="bg-transparent text-sm border-none focus:outline-none cursor-pointer text-[color:var(--bb-color-text-primary)]"
            />
          </div>

          <Button variant="outline" onClick={handlePrintRunSheets}>
            <Printer className="h-4 w-4 mr-2" />
            Print Sheets
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UserCheck}
          label="Pets Checked In"
          value={stats.petsCheckedIn}
          variant="primary"
          tooltip="Total pets checked in today"
        />
        <StatCard
          icon={AlertTriangle}
          label="Unassigned"
          value={stats.unassigned}
          variant={stats.unassigned > 0 ? 'warning' : 'success'}
          tooltip="Pets waiting to be assigned to a run"
        />
        <StatCard
          icon={Users}
          label="Total Capacity"
          value={`${stats.totalAssigned}/${stats.totalCapacity}`}
          variant="primary"
          tooltip="Assigned pets across all runs"
        />
        <StatCard
          icon={TrendingUp}
          label="Utilization"
          value={`${stats.utilization}%`}
          variant={stats.utilization >= 90 ? 'danger' : stats.utilization >= 70 ? 'warning' : 'success'}
          tooltip="Overall run utilization"
        />
      </div>

      {/* Two-Column Layout: Runs (left) + Sidebar (right) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Run Columns */}
          <ScrollableTableContainer className="flex gap-4 pb-4">
            {runs?.length > 0 ? (
              runs.map((run) => (
                <RunColumn
                  key={run.recordId}
                  run={run}
                  assignments={assignmentState[run.recordId] || []}
                  selectedPets={selectedPets}
                  onSelect={handleSelectPet}
                  onRemove={(petId) => handleRemovePet(petId, run.recordId)}
                  onReorder={() => {}}
                />
              ))
            ) : (
              <div
                className="flex-1 flex items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg"
                style={{ borderColor: 'var(--bb-color-border-subtle)', backgroundColor: 'var(--bb-color-bg-surface)' }}
              >
                <div className="text-center max-w-md px-4">
                  <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bb-color-bg-elevated)' }}>
                    <Clock className="h-8 w-8 text-[color:var(--bb-color-text-muted)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[color:var(--bb-color-text-primary)] mb-2">No Runs for This Date</h3>
                  <p className="text-sm text-[color:var(--bb-color-text-muted)]">
                    Runs are created based on your run templates. Make sure you have templates configured.
                  </p>
                </div>
              </div>
            )}
          </ScrollableTableContainer>

          {/* Right: Sidebar */}
          <div className="space-y-6">
            <AssignmentOverview
              unassignedCount={stats.unassigned}
              runsCount={runs?.length || 0}
              totalAssigned={stats.totalAssigned}
              totalCapacity={stats.totalCapacity}
            />

            <UnassignedPetsSidebar
              pets={unassignedPets}
              selectedPets={selectedPets}
              onSelect={handleSelectPet}
              onSelectAll={handleSelectAll}
            />

            <SmartSuggestions
              unassignedPets={unassignedPets}
              runs={runs}
            />
          </div>
        </div>

        {/* Drag Overlay - Portal entire component to body to escape overflow clipping */}
        {createPortal(
          <>
            <DragOverlay
              dropAnimation={null}
              zIndex={9999}
            >
              {activeId && activePet ? (
                <div style={{ width: 280 }}>
                  <DraggablePetCard pet={activePet} isDragOverlay />
                </div>
              ) : null}
            </DragOverlay>
          </>,
          document.body
        )}
      </DndContext>

      {/* Time Slot Picker Modal */}
      {pendingAssignment && (
        <TimeSlotPicker
          isOpen={timePickerOpen}
          onClose={() => {
            setTimePickerOpen(false);
            setPendingAssignment(null);
          }}
          onConfirm={handleTimeSlotConfirm}
          runId={pendingAssignment.runId}
          runName={pendingAssignment.run.name}
          template={pendingAssignment.run}
          selectedDate={selectedDate}
          petName={pendingAssignment.pet.name}
        />
      )}
    </div>
  );
};

export default RunAssignment;
