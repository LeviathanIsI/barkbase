import { useState, useEffect, useRef } from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { Bed, Home, Scissors, Dumbbell, Sun, HeartPulse, ZoomIn, ZoomOut, Maximize2, RotateCcw, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import FacilityDetailsModal from './FacilityDetailsModal';

/**
 * Get icon component for facility type
 */
const getFacilityIcon = (type) => {
  const iconMap = {
    'SUITE': Bed,
    'KENNEL': Bed,
    'CABIN': Home,
    'DAYCARE': Sun,
    'GROOMING': Scissors,
    'TRAINING': Dumbbell,
    'MEDICAL': HeartPulse,
    'ISOLATION': HeartPulse,
  };
  
  const IconComponent = iconMap[type?.toUpperCase()] || Bed;
  return <IconComponent className="h-5 w-5" />;
};

/**
 * Get border color class based on occupancy rate
 */
const getBorderColor = (occupancyRate) => {
  if (occupancyRate >= 95) return 'border-gray-400 dark:border-surface-border';
  if (occupancyRate >= 80) return 'border-red-500 dark:border-red-700';
  if (occupancyRate >= 50) return 'border-yellow-500 dark:border-yellow-700';
  return 'border-green-500 dark:border-green-700';
};

/**
 * Get background color class based on occupancy rate
 */
const getBgColor = (occupancyRate) => {
  if (occupancyRate >= 95) return 'bg-gray-50 dark:bg-surface-secondary';
  if (occupancyRate >= 80) return 'bg-red-50 dark:bg-surface-primary';
  if (occupancyRate >= 50) return 'bg-yellow-50 dark:bg-surface-primary';
  return 'bg-green-50 dark:bg-surface-primary';
};

/**
 * Calculate proportional size based on capacity
 * Min 200px, max 400px
 */
const getProportionalSize = (capacity) => {
  const minSize = 200;
  const maxSize = 400;
  const minCapacity = 1;
  const maxCapacity = 30;
  
  const normalized = Math.min(Math.max(capacity, minCapacity), maxCapacity);
  const size = minSize + ((normalized - minCapacity) / (maxCapacity - minCapacity)) * (maxSize - minSize);
  
  return Math.round(size);
};

/**
 * Draggable Facility Card Component (React 18 Compatible, Transform-Aware)
 */
const DraggableFacilityCard = ({ facility, position, onPositionChange, onClick, scale = 1, isPanDisabled, setIsPanDisabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef(null);
  
  const occupancyRate = facility.capacity > 0 
    ? (facility.occupied / facility.capacity) * 100 
    : 0;
  const available = Math.max(0, facility.capacity - facility.occupied);
  const borderColor = getBorderColor(occupancyRate);
  const bgColor = getBgColor(occupancyRate);
  const size = getProportionalSize(facility.capacity);
  
  const isFull = occupancyRate >= 95;
  
  const handleMouseDown = (e) => {
    if (e.target.closest('.click-area')) return; // Don't drag when clicking details area
    
    setIsDragging(true);
    setIsPanDisabled(true); // Disable canvas panning while dragging card
    
    // Calculate offset from card position to mouse position (in canvas coordinates)
    const rect = cardRef.current.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    });
    
    e.stopPropagation();
    e.preventDefault();
  };
  
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      if (!cardRef.current) return;
      
      // Get the canvas container to calculate relative position
      const canvasElement = cardRef.current.parentElement;
      const canvasRect = canvasElement.getBoundingClientRect();
      
      // Convert screen coordinates to canvas coordinates (accounting for scale and pan)
      const canvasX = (e.clientX - canvasRect.left) / scale;
      const canvasY = (e.clientY - canvasRect.top) / scale;
      
      // Apply the offset to position the card correctly under the mouse
      const newX = canvasX - dragOffset.x;
      const newY = canvasY - dragOffset.y;
      
      onPositionChange({ x: Math.max(0, newX), y: Math.max(0, newY) });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsPanDisabled(false); // Re-enable canvas panning
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, scale, onPositionChange, setIsPanDisabled]);
  
  return (
    <div
      ref={cardRef}
      className={`
        absolute p-4 rounded-lg border-2 ${borderColor} ${bgColor}
        transition-shadow duration-200
        hover:shadow-lg
        group
        ${isDragging ? 'cursor-grabbing shadow-2xl scale-105' : 'cursor-grab'}
      `}
      style={{
        width: `${size}px`,
        minHeight: `${Math.round(size * 0.75)}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        userSelect: 'none',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Drag Handle + Full Badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className={`p-2 rounded-lg ${borderColor} bg-white dark:bg-surface-primary`}>
            {getFacilityIcon(facility.type)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-text-primary truncate text-sm">
              {facility.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-text-secondary capitalize">
              {(facility.type || 'kennel').toLowerCase()}
            </p>
          </div>
        </div>
        {isFull && (
          <span className="px-2 py-1 text-xs font-bold bg-gray-400 dark:bg-surface-secondary text-white rounded-full">
            FULL
          </span>
        )}
      </div>
      
      {/* Capacity Display */}
      <div
        className="cursor-pointer click-area"
        onClick={(e) => {
          e.stopPropagation();
          onClick(facility);
        }}
      >
        <p className="text-2xl font-bold text-gray-900 dark:text-text-primary">
          {available}<span className="text-base text-gray-500 dark:text-text-secondary">/{facility.capacity}</span>
        </p>
        <p className="text-xs text-gray-600 dark:text-text-secondary mt-1">
          {available === 0 ? 'Fully booked' : `${available} available`}
        </p>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-3 w-full bg-gray-200 dark:bg-surface-border rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            isFull
              ? 'bg-gray-400 dark:bg-surface-secondary'
              : occupancyRate >= 80
              ? 'bg-red-500 dark:bg-red-400'
              : occupancyRate >= 50
              ? 'bg-yellow-500 dark:bg-yellow-400'
              : 'bg-green-500 dark:bg-green-400'
          }`}
          style={{ width: `${Math.min(occupancyRate, 100)}%` }}
        />
      </div>
      
      {/* Hover Indicator */}
      <div className="mt-3 text-xs text-gray-400 dark:text-text-tertiary group-hover:text-primary transition-colors click-area">
        Click for details →
      </div>
    </div>
  );
};

/**
 * Main Facility Map View Component with Interactive Canvas
 */
const FacilityMapView = ({ kennels = [] }) => {
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [facilityPositions, setFacilityPositions] = useState({});
  const [isPanDisabled, setIsPanDisabled] = useState(false);
  const [currentScale, setCurrentScale] = useState(1);
  
  // Group kennels by building to show facility-level aggregation
  const groupedKennels = (kennels || []).reduce((acc, kennel) => {
    if (!kennel) return acc;
    const building = kennel.building || kennel.type || 'Other';
    if (!acc[building]) {
      acc[building] = {
        name: building,
        type: kennel.type,
        building: building,
        capacity: 0,
        occupied: 0,
        kennels: []
      };
    }
    acc[building].capacity += kennel.capacity || 0;
    acc[building].occupied += kennel.occupied || 0;
    acc[building].kennels.push(kennel);
    return acc;
  }, {});

  // Convert to array of aggregated facilities
  const aggregatedFacilities = Object.values(groupedKennels);
  
  // Load saved positions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('facility-positions');
      if (saved) {
        setFacilityPositions(JSON.parse(saved));
      } else {
        // Initialize with default grid positions
        const defaultPositions = {};
        aggregatedFacilities.forEach((facility, index) => {
          const row = Math.floor(index / 3);
          const col = index % 3;
          defaultPositions[facility.name] = {
            x: col * 320 + 50,
            y: row * 250 + 50
          };
        });
        setFacilityPositions(defaultPositions);
      }
    } catch (error) {
      console.error('Failed to load facility positions:', error);
    }
  }, [aggregatedFacilities.length]);
  
  // Save positions to localStorage
  const savePositions = (positions) => {
    try {
      localStorage.setItem('facility-positions', JSON.stringify(positions));
    } catch (error) {
      console.error('Failed to save facility positions:', error);
    }
  };
  
  const handlePositionChange = (facilityName, newPosition) => {
    const newPositions = {
      ...facilityPositions,
      [facilityName]: newPosition
    };
    setFacilityPositions(newPositions);
    savePositions(newPositions);
  };
  
  const handleFacilityClick = (facility) => {
    setSelectedFacility(facility);
  };
  
  const handleCloseModal = () => {
    setSelectedFacility(null);
  };
  
  const handleBook = () => {
    alert('Booking functionality coming soon!');
    setSelectedFacility(null);
  };
  
  const handleResetView = (resetTransform) => {
    resetTransform();
  };
  
  const handleResetLayout = () => {
    // Reset to default grid positions
    const defaultPositions = {};
    aggregatedFacilities.forEach((facility, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      defaultPositions[facility.name] = {
        x: col * 320 + 50,
        y: row * 250 + 50
      };
    });
    setFacilityPositions(defaultPositions);
    savePositions(defaultPositions);
  };

  return (
    <div className="relative w-full h-screen bg-gray-50 dark:bg-surface-secondary">
      {/* Canvas Controls */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={2}
        centerOnInit={false}
        wheel={{ step: 0.1 }}
        panning={{ disabled: isPanDisabled }}
        onTransformed={(ref) => {
          setCurrentScale(ref.state.scale);
        }}
      >
        {({ zoomIn, zoomOut, resetTransform, state }) => (
          <>
            {/* Control Panel */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => zoomIn()}
                className="bg-white dark:bg-surface-primary shadow-lg"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
          <Button 
            variant="outline" 
            size="sm"
                onClick={() => zoomOut()}
                className="bg-white dark:bg-surface-primary shadow-lg"
                title="Zoom Out"
          >
                <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
                onClick={() => handleResetView(resetTransform)}
                className="bg-white dark:bg-surface-primary shadow-lg"
                title="Reset View"
          >
                <Maximize2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
                onClick={handleResetLayout}
                className="bg-white dark:bg-surface-primary shadow-lg"
                title="Reset Layout"
          >
                <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
            
            {/* Instructions */}
            <div className="absolute top-4 left-4 z-10 bg-white dark:bg-surface-primary p-3 rounded-lg shadow-lg max-w-xs">
              <p className="text-xs text-gray-600 dark:text-text-secondary mb-1">
                <strong>Pan:</strong> Click and drag background
              </p>
              <p className="text-xs text-gray-600 dark:text-text-secondary mb-1">
                <strong>Zoom:</strong> Scroll or use buttons
              </p>
              <p className="text-xs text-gray-600 dark:text-text-secondary">
                <strong>Move Facilities:</strong> Drag facility cards
              </p>
      </div>

      {/* Legend */}
            <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-surface-primary p-3 rounded-lg shadow-lg">
              <p className="text-xs font-semibold text-gray-700 dark:text-text-primary mb-2">Status:</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-green-500 dark:border-green-700 bg-green-50 dark:bg-surface-primary"></div>
                  <span className="text-xs text-gray-600 dark:text-text-secondary">Available (&lt;50%)</span>
        </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-yellow-500 dark:border-yellow-700 bg-yellow-50 dark:bg-surface-primary"></div>
                  <span className="text-xs text-gray-600 dark:text-text-secondary">Moderate (50-80%)</span>
        </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-red-500 dark:border-red-700 bg-red-50 dark:bg-surface-primary"></div>
                  <span className="text-xs text-gray-600 dark:text-text-secondary">High (80-95%)</span>
        </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded border-2 border-gray-400 dark:border-surface-border bg-gray-50 dark:bg-surface-secondary"></div>
                  <span className="text-xs text-gray-600 dark:text-text-secondary">Full (95-100%)</span>
                </div>
              </div>
            </div>

            {/* Interactive Canvas */}
            <TransformComponent
              wrapperClass="w-full h-full"
              contentClass="w-full h-full"
            >
              <div className="relative w-[3000px] h-[2000px] bg-white dark:bg-surface-primary">
                {/* Grid Background */}
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                  }}
                />
                
                {/* Facility Cards */}
                {aggregatedFacilities.map((facility) => (
                  <DraggableFacilityCard
                    key={facility.name}
                    facility={facility}
                    position={facilityPositions[facility.name] || { x: 0, y: 0 }}
                    onPositionChange={(newPosition) => handlePositionChange(facility.name, newPosition)}
                    onClick={handleFacilityClick}
                    scale={state?.scale || currentScale || 1}
                    isPanDisabled={isPanDisabled}
                    setIsPanDisabled={setIsPanDisabled}
                  />
                ))}
              </div>
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
      
      {/* Facility Details Modal */}
      {selectedFacility && (
        <FacilityDetailsModal
          facility={selectedFacility}
          pets={[]} // TODO: Fetch pets for this facility
          onClose={handleCloseModal}
          onBook={handleBook}
        />
      )}
    </div>
  );
};

export default FacilityMapView;
