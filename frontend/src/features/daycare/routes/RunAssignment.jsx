import { useState, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Calendar, Printer, Save, ExternalLink, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useTodaysAssignmentsQuery, useAssignPetsToRunMutation } from '../api';
import { useRunTemplatesQuery } from '../api-templates';
import { useBookingsQuery } from '@/features/bookings/api';
import TimeSlotPicker from '../components/TimeSlotPicker';
import toast from 'react-hot-toast';

const PetCard = ({ pet, startTime, endTime, isDragging = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `pet-${pet.recordId}`,
    data: { pet },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const ownerName = pet.owners?.[0]?.owner
    ? `${pet.owners[0].owner.firstName} ${pet.owners[0].owner.lastName}`
    : 'Unknown Owner';

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
      {...listeners}
      {...attributes}
      className={`bg-white dark:bg-surface-primary border ${hasWarnings ? 'border-yellow-400 dark:border-yellow-700' : 'border-border'} rounded-lg p-3 mb-2 cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-text">{pet.name}</h4>
            {hasWarnings && (
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" title="Has behavioral notes" />
            )}
          </div>
          <p className="text-sm text-muted">{pet.breed || 'Unknown breed'}</p>
          <p className="text-xs text-muted">{ownerName}</p>
          {startTime && endTime && (
            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Clock className="h-3 w-3" />
              <span>{startTime} - {endTime}</span>
            </div>
          )}
          {behaviorFlags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {behaviorFlags.slice(0, 2).map((flag) => (
                <Badge key={flag} variant="warning" className="text-xs capitalize">
                  {String(flag).replace(/-/g, ' ').replace(/_/g, ' ')}
                </Badge>
              ))}
              {behaviorFlags.length > 2 && (
                <Badge variant="warning" className="text-xs">
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

const RunColumn = ({ run, assignments }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: run.recordId,
    data: { run },
  });

  const maxCapacity = run.maxCapacity || run.capacity || 10;
  const utilizationPercent = Math.round((assignments.length / maxCapacity) * 100);

  return (
    <div className={`bg-white dark:bg-surface-primary border border-border rounded-lg p-4 ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text">{run.name}</h3>
        <Badge variant={utilizationPercent > 80 ? 'danger' : utilizationPercent > 60 ? 'warning' : 'success'}>
          {assignments.length}/{maxCapacity}
        </Badge>
      </div>

      {run.timePeriodMinutes && (
        <div className="flex items-center gap-2 mb-2 text-xs text-muted">
          <Clock className="h-3 w-3" />
          <span>{run.timePeriodMinutes} min slots</span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-surface-secondary rounded text-xs">
            {run.capacityType === 'concurrent' ? 'Concurrent' : 'Total'}
          </span>
        </div>
      )}

      <div className="w-full bg-surface rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-primary to-primary-dark h-2 rounded-full transition-all duration-300"
          style={{ width: `${utilizationPercent}%` }}
        />
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[200px] border-2 border-dashed rounded-lg p-3 transition-colors ${
          isOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
      >
        {assignments.map((assignment) => (
          <PetCard 
            key={assignment.pet.recordId} 
            pet={assignment.pet}
            startTime={assignment.startTime}
            endTime={assignment.endTime}
          />
        ))}
        {assignments.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Drop pets here
          </div>
        )}
      </div>
    </div>
  );
};

const RunAssignment = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignmentState, setAssignmentState] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [initializedDate, setInitializedDate] = useState(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
  const assignPetsMutation = useAssignPetsToRunMutation();

  const isLoading = runsLoading || bookingsLoading || templatesLoading;

  // Get checked-in pets for the day with owner information
  const checkedInPets = useMemo(() => {
    
    // Handle both wrapped and unwrapped responses
    const bookings = bookingsData?.data || bookingsData || [];
    
    
    const checked = bookings.filter(b => b.status === 'CHECKED_IN');
    
    const pets = checked
      .map(b => {
        if (!b.pet) {
          console.warn('⚠️ Booking has no pet object:', b);
          return null;
        }
        // Enrich pet with owner info from booking
        return {
          ...b.pet,
          owners: b.owner ? [{ owner: b.owner }] : []
        };
      })
      .filter(Boolean);
    
    return pets;
  }, [bookingsData, selectedDate, bookingsLoading]);

  // Initialize assignment state from API data (only when date changes or first load)
  useEffect(() => {
    if (!runs || initializedDate === selectedDate) return;
    
    const newState = {};
    runs.forEach(run => {
      // Store full assignment objects with pet, startTime, endTime
      newState[run.recordId] = run.assignments || [];
    });
    setAssignmentState(newState);
    setInitializedDate(selectedDate);
  }, [runs, selectedDate, initializedDate]);

  // Get unassigned pets
  const unassignedPets = useMemo(() => {
    const allAssignedPetIds = new Set(
      Object.values(assignmentState).flat().map(a => a.pet?.recordId).filter(Boolean)
    );
    return checkedInPets.filter(pet => !allAssignedPetIds.has(pet.recordId));
  }, [checkedInPets, assignmentState]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const petId = active.id.replace('pet-', '');
    const targetRunId = over.id;

    // Find the pet - check unassigned pets first, then assigned runs
    let pet = checkedInPets.find(p => p.recordId === petId);
    
    if (!pet) {
      // Pet is already in a run, find it there
      for (const assignments of Object.values(assignmentState)) {
        const assignment = assignments.find(a => a.pet?.recordId === petId);
        if (assignment) {
          pet = assignment.pet;
          break;
        }
      }
    }
    
    if (!pet) {
      console.error('Could not find pet with ID:', petId);
      return;
    }

    // Find the target run to get its template info
    const targetRun = runs?.find(r => r.recordId === targetRunId);
    if (!targetRun) {
      console.error('Could not find target run');
      return;
    }

    // Open time picker modal with the pending assignment
    setPendingAssignment({
      pet,
      run: targetRun,
      runId: targetRunId
    });
    setTimePickerOpen(true);
  };

  const handleTimeSlotConfirm = async ({ startTime, endTime }) => {
    if (!pendingAssignment) return;

    const { pet, runId } = pendingAssignment;

    // Update local state with the time-slotted assignment
    const newState = { ...assignmentState };

    // Remove from all runs first
    Object.keys(newState).forEach(rid => {
      newState[rid] = newState[rid].filter(a => a.pet?.recordId !== pet.recordId);
    });

    // Add to target run with time slots
    if (!newState[runId]) {
      newState[runId] = [];
    }
    newState[runId].push({
      pet,
      startTime,
      endTime
    });

    setAssignmentState(newState);
    setTimePickerOpen(false);
    setPendingAssignment(null);
  };

  const handleSaveAssignments = async () => {
    try {
      const promises = Object.entries(assignmentState).map(([runId, assignments]) =>
        assignPetsMutation.mutateAsync({
          runId,
          assignedPets: assignments.map(a => ({
            petId: a.pet.recordId,
            startTime: a.startTime,
            endTime: a.endTime
          })),
          date: selectedDate
        })
      );

      await Promise.all(promises);
      
      // Reset initialized date and refetch to get updated data from server
      setInitializedDate(null);
      await refetchRuns();
      
      toast.success('Run assignments saved successfully');
    } catch (error) {
      console.error('Failed to save run assignments:', error);
      toast.error(error?.message || 'Failed to save run assignments');
    }
  };

  const handlePrintRunSheets = () => {
    const printContent = runs?.map(run => {
      const assignments = assignmentState[run.recordId] || [];
      return `
        <div style="page-break-after: always; padding: 20px;">
          <h2>${run.name}</h2>
          <p>Date: ${new Date(selectedDate).toLocaleDateString()}</p>
          <p>Capacity: ${assignments.length}/${run.maxCapacity || run.capacity}</p>
          <hr style="margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pet Name</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Breed</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Owner</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Time</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Check</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.map(assignment => {
                const pet = assignment.pet;
                const ownerName = pet.owners?.[0]?.owner
                  ? `${pet.owners[0].owner.firstName} ${pet.owners[0].owner.lastName}`
                  : 'Unknown';
                const timeSlot = assignment.startTime && assignment.endTime 
                  ? `${assignment.startTime} - ${assignment.endTime}`
                  : '—';
                return `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${pet.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${pet.breed || '—'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${ownerName}</td>
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
          <title>Run Sheets - ${new Date(selectedDate).toLocaleDateString()}</title>
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

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Run Assignment" breadcrumb="Home > Daycare > Run Assignment" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Check if no templates exist
  if (!templates || templates.length === 0) {
    return (
      <div>
        <PageHeader title="Run Assignment" breadcrumb="Home > Daycare > Run Assignment" />
        <Card>
          <div className="text-center py-12">
            <Clock className="h-16 w-16 text-gray-400 dark:text-text-tertiary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-text-primary mb-2">No Run Templates Configured</h3>
            <p className="text-gray-600 dark:text-text-secondary mb-6 max-w-md mx-auto">
              Before you can assign pets to runs, you need to create run templates in Settings. These templates define the schedule, capacity, and time slots for each run.
            </p>
            <Link to="/settings/facility?tab=run-templates">
              <Button>
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Run Templates Settings
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Run Assignment"
        breadcrumb="Home > Daycare > Run Assignment"
        actions={
          <div className="flex gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
            <Button variant="outline" onClick={handlePrintRunSheets}>
              <Printer className="h-4 w-4 mr-2" />
              Print Sheets
            </Button>
            <Button onClick={handleSaveAssignments} disabled={assignPetsMutation.isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {assignPetsMutation.isLoading ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        }
      />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unassigned Pets */}
          <Card title="Unassigned Pets" description={`${unassignedPets.length} pets checked in`}>
            <div className="space-y-2">
              {unassignedPets.map((pet) => (
                <PetCard key={pet.recordId} pet={pet} />
              ))}
              {unassignedPets.length === 0 && (
                <p className="text-sm text-muted text-center py-8">All pets assigned</p>
              )}
            </div>
          </Card>

          {/* Run Columns */}
          {runs?.map((run) => (
            <RunColumn
              key={run.recordId}
              run={run}
              assignments={assignmentState[run.recordId] || []}
            />
          ))}

          {runs?.length === 0 && (
            <div className="col-span-3">
              <Card>
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Runs for This Date</h3>
                  <p className="text-sm text-muted mb-4">
                    Runs will be created automatically when you assign the first pet
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeId && (() => {
            // Try to find pet in unassigned list first
            let pet = checkedInPets.find(p => `pet-${p.recordId}` === activeId);
            
            // If not found, search in all assigned runs
            if (!pet) {
              for (const assignments of Object.values(assignmentState)) {
                const assignment = assignments.find(a => `pet-${a.pet?.recordId}` === activeId);
                if (assignment) {
                  pet = assignment.pet;
                  break;
                }
              }
            }
            
            return pet ? <PetCard pet={pet} isDragging /> : null;
          })()}
        </DragOverlay>
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

