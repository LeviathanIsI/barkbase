import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Home, Users, MapPin, Clock, AlertTriangle, Plus, Search, Filter, Shuffle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card, PageHeader } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data for demonstration
const mockPets = [
  { id: '1', name: 'Bella', breed: 'Golden Retriever', owner: 'Sarah Johnson', size: 'Large', status: 'Checked In' },
  { id: '2', name: 'Max', breed: 'German Shepherd', owner: 'Mike Wilson', size: 'Large', status: 'Checked In' },
  { id: '3', name: 'Luna', breed: 'Pug', owner: 'Emma Davis', size: 'Small', status: 'Checked In' },
  { id: '4', name: 'Charlie', breed: 'Beagle', owner: 'Tom Brown', size: 'Medium', status: 'Checked In' },
  { id: '5', name: 'Lucy', breed: 'Siamese Cat', owner: 'Anna Smith', size: 'Small', status: 'Checked In' },
];

const mockRuns = [
  { id: 'run-1', name: 'Morning Walk Run', capacity: 8, assigned: 3, time: '8:00 AM', color: 'bg-blue-100 dark:bg-surface-secondary border-blue-300' },
  { id: 'run-2', name: 'Afternoon Play Run', capacity: 6, assigned: 5, time: '2:00 PM', color: 'bg-green-100 dark:bg-surface-secondary border-green-300' },
  { id: 'run-3', name: 'Evening Calm Run', capacity: 4, assigned: 2, time: '6:00 PM', color: 'bg-purple-100 dark:bg-surface-secondary border-purple-300 dark:border-purple-700' },
  { id: 'run-4', name: 'Indoor Rest Area', capacity: 10, assigned: 7, time: 'All Day', color: 'bg-orange-100 dark:bg-surface-secondary border-orange-300' },
];

const PetCard = ({ pet, isDragging = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `pet-${pet.id}`,
    data: { pet },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white dark:bg-surface-primary border border-gray-300 dark:border-surface-border rounded-lg p-3 mb-2 cursor-move transition-all duration-200 hover:shadow-md ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-text-primary">{pet.name}</h4>
          <p className="text-sm text-[#64748B] dark:text-text-secondary">{pet.breed}</p>
          <p className="text-xs text-[#64748B] dark:text-text-secondary">{pet.owner}</p>
        </div>
        <Badge variant={pet.size === 'Small' ? 'secondary' : pet.size === 'Medium' ? 'info' : 'warning'}>
          {pet.size}
        </Badge>
      </div>
    </div>
  );
};

const RunColumn = ({ run, assignedPets, onDrop }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: run.id,
    data: { run },
  });

  const utilizationPercent = Math.round((run.assigned / run.capacity) * 100);

  return (
    <div className={`bg-white dark:bg-surface-primary border border-gray-300 dark:border-surface-border rounded-lg p-4 ${isOver ? 'ring-2 ring-[#4B5DD3]' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-text-primary">{run.name}</h3>
        <Badge variant={utilizationPercent > 80 ? 'danger' : utilizationPercent > 60 ? 'warning' : 'success'}>
          {run.assigned}/{run.capacity}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mb-3 text-sm text-[#64748B] dark:text-text-secondary">
        <Clock className="h-4 w-4" />
        <span>{run.time}</span>
      </div>

      <div className="w-full bg-[#F5F6FA] rounded-full h-2 mb-4">
        <div
          className="bg-primary-600 dark:bg-primary-700 h-2 rounded-full transition-all duration-300"
          style={{ width: `${utilizationPercent}%` }}
        />
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[200px] border-2 border-dashed rounded-lg p-3 transition-colors ${
          isOver ? 'border-[#4B5DD3] bg-blue-50 dark:bg-surface-primary' : 'border-gray-300 dark:border-surface-border'
        }`}
      >
        {assignedPets.map((pet) => (
          <PetCard key={pet.id} pet={pet} />
        ))}
        {assignedPets.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#64748B] dark:text-text-secondary text-sm">
            Drop pets here
          </div>
        )}
      </div>
    </div>
  );
};

const RunAssignment = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [assignments, setAssignments] = useState({
    'run-1': [mockPets[0], mockPets[1]],
    'run-2': [mockPets[2], mockPets[3], mockPets[4]],
    'run-3': [],
    'run-4': [],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const filteredPets = useMemo(() => {
    return mockPets.filter(pet =>
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.owner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activePet = active.data.current?.pet;
    const targetRunId = over.id;

    if (!activePet || !targetRunId) return;

    // Remove pet from current run
    const currentRunId = Object.keys(assignments).find(runId =>
      assignments[runId].some(pet => pet.id === activePet.id)
    );

    if (currentRunId === targetRunId) return;

    setAssignments(prev => {
      const newAssignments = { ...prev };

      // Remove from current run
      if (currentRunId) {
        newAssignments[currentRunId] = newAssignments[currentRunId].filter(pet => pet.id !== activePet.id);
      }

      // Add to target run
      newAssignments[targetRunId] = [...newAssignments[targetRunId], activePet];

      return newAssignments;
    });
  };

  const activePet = activeId
    ? mockPets.find(pet => `pet-${pet.id}` === activeId)
    : null;

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        breadcrumb="Home > Intake > Run Assignment"
        title="Run Assignment"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm">
              <Shuffle className="h-4 w-4 mr-2" />
              Auto Assign
            </Button>
            <Button variant="secondary" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Run
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Total Pets</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{mockPets.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Active Runs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">{mockRuns.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Home className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">
                {mockRuns.reduce((sum, run) => sum + run.capacity, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#64748B] dark:text-text-secondary">Avg. Utilization</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">68%</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-surface-secondary rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-text-secondary" />
            <input
              type="text"
              placeholder="Search pets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-surface-border rounded-md focus:outline-none focus:ring-2 focus:ring-[#4B5DD3] focus:border-transparent"
            />
          </div>

          <div className="text-sm text-[#64748B] dark:text-text-secondary">
            Showing {filteredPets.length} of {mockPets.length} pets
          </div>
        </div>
      </Card>

      {/* Drag and Drop Interface */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Unassigned Pets Sidebar */}
          <div className="lg:col-span-1">
            <Card title="Unassigned Pets" description="Drag pets to assign to runs">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPets
                  .filter(pet => !Object.values(assignments).flat().some(assigned => assigned.id === pet.id))
                  .map((pet) => (
                    <PetCard key={pet.id} pet={pet} />
                  ))}
              </div>
            </Card>
          </div>

          {/* Runs Grid */}
          <div className="lg:col-span-4">
            <div className="grid gap-6 md:grid-cols-2">
              {mockRuns.map((run) => (
                <RunColumn
                  key={run.id}
                  run={run}
                  assignedPets={assignments[run.id] || []}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeId && activePet ? <PetCard pet={activePet} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions */}
      <Card className="mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-[#64748B] dark:text-text-secondary mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-text-primary mb-1">How to Assign Runs</h3>
            <ul className="text-sm text-[#64748B] dark:text-text-secondary space-y-1">
              <li>• Drag pets from the unassigned list to any run</li>
              <li>• Move pets between runs by dragging them</li>
              <li>• Monitor capacity utilization in real-time</li>
              <li>• Use auto-assign for optimal distribution</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default RunAssignment;
