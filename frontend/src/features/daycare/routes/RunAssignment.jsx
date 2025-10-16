import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Clock, Plus, Calendar, Printer, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { useTodaysAssignmentsQuery, useAssignPetsToRunMutation } from '../api';
import { useBookingsQuery } from '@/features/bookings/api';
import toast from 'react-hot-toast';

const PetCard = ({ pet, isDragging = false }) => {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-border rounded-lg p-3 mb-2 cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-text">{pet.name}</h4>
          <p className="text-sm text-muted">{pet.breed || 'Unknown breed'}</p>
          <p className="text-xs text-muted">{ownerName}</p>
        </div>
      </div>
    </div>
  );
};

const RunColumn = ({ run, assignedPets }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: run.recordId,
    data: { run },
  });

  const utilizationPercent = Math.round((assignedPets.length / run.capacity) * 100);

  return (
    <div className={`bg-white border border-border rounded-lg p-4 ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-text">{run.name}</h3>
        <Badge variant={utilizationPercent > 80 ? 'danger' : utilizationPercent > 60 ? 'warning' : 'success'}>
          {assignedPets.length}/{run.capacity}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-3 text-sm text-muted">
        <Clock className="h-4 w-4" />
        <span>{run.scheduleTime}</span>
      </div>

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
        {assignedPets.map((pet) => (
          <PetCard key={pet.recordId} pet={pet} />
        ))}
        {assignedPets.length === 0 && (
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch today's assignments and checked-in pets
  const { data: runs, isLoading: runsLoading } = useTodaysAssignmentsQuery(selectedDate);
  const { data: bookingsData, isLoading: bookingsLoading } = useBookingsQuery({ 
    status: 'CHECKED_IN',
    checkInDate: selectedDate 
  });
  const assignPetsMutation = useAssignPetsToRunMutation();

  const isLoading = runsLoading || bookingsLoading;

  // Get checked-in pets for the day
  const checkedInPets = useMemo(() => {
    if (!bookingsData?.data) return [];
    return bookingsData.data
      .filter(b => b.status === 'CHECKED_IN')
      .map(b => b.pet)
      .filter(Boolean);
  }, [bookingsData]);

  // Initialize assignment state from API data
  useMemo(() => {
    if (!runs) return;
    
    const newState = {};
    runs.forEach(run => {
      newState[run.recordId] = run.assignments?.map(a => a.pet) || [];
    });
    setAssignmentState(newState);
  }, [runs]);

  // Get unassigned pets
  const unassignedPets = useMemo(() => {
    const allAssignedPetIds = new Set(
      Object.values(assignmentState).flat().map(p => p.recordId)
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

    // Find the pet
    const pet = checkedInPets.find(p => p.recordId === petId);
    if (!pet) return;

    // Update local state optimistically
    const newState = { ...assignmentState };

    // Remove from all runs
    Object.keys(newState).forEach(runId => {
      newState[runId] = newState[runId].filter(p => p.recordId !== petId);
    });

    // Add to target run
    if (!newState[targetRunId]) {
      newState[targetRunId] = [];
    }
    newState[targetRunId].push(pet);

    setAssignmentState(newState);
  };

  const handleSaveAssignments = async () => {
    try {
      const promises = Object.entries(assignmentState).map(([runId, pets]) =>
        assignPetsMutation.mutateAsync({
          runId,
          petIds: pets.map(p => p.recordId),
          date: selectedDate
        })
      );

      await Promise.all(promises);
      toast.success('Run assignments saved successfully');
    } catch (error) {
      toast.error('Failed to save run assignments');
    }
  };

  const handlePrintRunSheets = () => {
    const printContent = runs?.map(run => {
      const pets = assignmentState[run.recordId] || [];
      return `
        <div style="page-break-after: always; padding: 20px;">
          <h2>${run.name} - ${run.scheduleTime}</h2>
          <p>Date: ${new Date(selectedDate).toLocaleDateString()}</p>
          <p>Capacity: ${pets.length}/${run.capacity}</p>
          <hr style="margin: 20px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Pet Name</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Breed</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Owner</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Check</th>
              </tr>
            </thead>
            <tbody>
              ${pets.map(pet => {
                const ownerName = pet.owners?.[0]?.owner
                  ? `${pet.owners[0].owner.firstName} ${pet.owners[0].owner.lastName}`
                  : 'Unknown';
                return `
                  <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">${pet.name}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${pet.breed || '—'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">${ownerName}</td>
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
              assignedPets={assignmentState[run.recordId] || []}
            />
          ))}

          {runs?.length === 0 && (
            <div className="col-span-3">
              <Card>
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Runs Configured</h3>
                  <p className="text-sm text-muted mb-4">
                    Create runs to organize daycare groups by time and activity
                  </p>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Run
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        <DragOverlay>
          {activeId && (
            <PetCard
              pet={checkedInPets.find(p => `pet-${p.recordId}` === activeId)}
              isDragging
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default RunAssignment;

