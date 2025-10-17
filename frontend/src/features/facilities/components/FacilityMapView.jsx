import { useState, useEffect, useRef } from 'react';
import { MapPin, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import SlidePanel from '@/components/ui/SlidePanel';
import KennelMapCard from './KennelMapCard';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

/**
 * FacilityMapView - Visual map representation of facility layout
 * Shows kennels positioned to match actual facility layout with availability indicators
 */
const FacilityMapView = ({ kennels = [], editable = false }) => {
  const [selectedKennel, setSelectedKennel] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [selectedArea, setSelectedArea] = useState(null);
  const containerRef = useRef(null);
  const [layout, setLayout] = useState({}); // building -> { x, y }
  const dragRef = useRef({ name: null, lastClientX: 0, lastClientY: 0 });
  const [isDraggingBuilding, setIsDraggingBuilding] = useState(false);

  // Add richer mock buildings/kennels for visualization
  const mockKennels = [
    // Training Center - 3 rings, medium capacity
    { recordId: 'demo-tr-1', name: 'Training Ring A', type: 'training', capacity: 10, occupied: 6, building: 'Training Center' },
    { recordId: 'demo-tr-2', name: 'Training Ring B', type: 'training', capacity: 8, occupied: 3, building: 'Training Center' },
    { recordId: 'demo-tr-3', name: 'Training Ring C', type: 'training', capacity: 6, occupied: 2, building: 'Training Center' },

    // Grooming - individual tables/rooms
    { recordId: 'demo-gr-1', name: 'Groom 1', type: 'grooming', capacity: 1, occupied: 1, building: 'Grooming' },
    { recordId: 'demo-gr-2', name: 'Groom 2', type: 'grooming', capacity: 1, occupied: 0, building: 'Grooming' },
    { recordId: 'demo-gr-3', name: 'Groom 3', type: 'grooming', capacity: 1, occupied: 1, building: 'Grooming' },
    { recordId: 'demo-gr-4', name: 'Groom 4', type: 'grooming', capacity: 1, occupied: 0, building: 'Grooming' },

    // Outdoor Runs - many small slots
    { recordId: 'demo-or-1', name: 'Run 1', type: 'run', capacity: 1, occupied: 1, building: 'Outdoor Runs' },
    { recordId: 'demo-or-2', name: 'Run 2', type: 'run', capacity: 1, occupied: 0, building: 'Outdoor Runs' },
    { recordId: 'demo-or-3', name: 'Run 3', type: 'run', capacity: 1, occupied: 0, building: 'Outdoor Runs' },
    { recordId: 'demo-or-4', name: 'Run 4', type: 'run', capacity: 1, occupied: 1, building: 'Outdoor Runs' },
    { recordId: 'demo-or-5', name: 'Run 5', type: 'run', capacity: 1, occupied: 0, building: 'Outdoor Runs' },
    { recordId: 'demo-or-6', name: 'Run 6', type: 'run', capacity: 1, occupied: 1, building: 'Outdoor Runs' },
    { recordId: 'demo-or-7', name: 'Run 7', type: 'run', capacity: 1, occupied: 0, building: 'Outdoor Runs' },
    { recordId: 'demo-or-8', name: 'Run 8', type: 'run', capacity: 1, occupied: 0, building: 'Outdoor Runs' },

    // Isolation Ward - few rooms, low capacity
    { recordId: 'demo-iso-1', name: 'Iso A', type: 'isolation', capacity: 1, occupied: 1, building: 'Isolation Ward' },
    { recordId: 'demo-iso-2', name: 'Iso B', type: 'isolation', capacity: 2, occupied: 1, building: 'Isolation Ward' },
    { recordId: 'demo-iso-3', name: 'Iso C', type: 'isolation', capacity: 1, occupied: 0, building: 'Isolation Ward' },
  ];

  const allKennels = [ ...(kennels || []), ...mockKennels ];

  // Group kennels by building/type
  const groupedKennels = (allKennels || []).reduce((acc, kennel) => {
    if (!kennel) return acc;
    const building = kennel.building || kennel.type || 'Other';
    if (!acc[building]) acc[building] = [];
    acc[building].push(kennel);
    return acc;
  }, {});

  // Fallback stats if no underlying kennels yet (used to size boxes)
  const fallbackBuildingStats = {
    'Suites Wing': { capacity: 24, occupied: 12 },
    'Standard Kennels': { capacity: 32, occupied: 18 },
    'Daycare': { capacity: 30, occupied: 12 },
    'Training': { capacity: 18, occupied: 7 },
    'Grooming': { capacity: 4, occupied: 2 },
    'Outdoor Runs': { capacity: 12, occupied: 5 },
    'Isolation Ward': { capacity: 6, occupied: 2 }
  };

  const getBuildingStats = (name) => {
    const items = groupedKennels[name] || [];
    if (!items.length) return fallbackBuildingStats[name] || { capacity: 0, occupied: 0 };
    return items.reduce(
      (acc, k) => ({ capacity: acc.capacity + (k?.capacity || 0), occupied: acc.occupied + (k?.occupied || 0) }),
      { capacity: 0, occupied: 0 }
    );
  };

  const occupancyBadge = (capacity, occupied) => {
    const available = Math.max(0, (capacity || 0) - (occupied || 0));
    const rate = capacity > 0 ? (occupied / capacity) * 100 : 0;
    let cls = 'bg-green-100 text-green-800 border-green-300';
    if (rate >= 95) cls = 'bg-red-100 text-red-800 border-red-300';
    else if (rate >= 80) cls = 'bg-orange-100 text-orange-800 border-orange-300';
    else if (rate >= 50) cls = 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return (
      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
        <div className={`relative px-3 py-1 rounded-full border text-xs font-bold shadow ${cls}`}>
          {available} open
          {/* pin tail */}
          <div className="absolute left-1/2 -bottom-1 w-2 h-2 bg-inherit border-inherit border rotate-45 -translate-x-1/2" />
        </div>
      </div>
    );
  };

  // Helpers to render building outlines
  const getStrokeClass = (borderClass) => borderClass.replace('border-', 'stroke-');
  const pickVariant = (name) => {
    const variants = ['house', 'warehouse', 'notched', 'u', 'long'];
    const hash = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return variants[hash % variants.length];
  };

  const BuildingOutline = ({ variant, strokeClass }) => {
    const common = {
      fill: 'none',
      vectorEffect: 'non-scaling-stroke'
    };
    switch (variant) {
      case 'warehouse':
        // Gable roof rectangle
        return (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline {...common} className={cn(strokeClass, 'stroke-2')} points="5,35 50,12 95,35" />
            <rect {...common} className={cn(strokeClass, 'stroke-2')} x="5" y="35" width="90" height="60" />
          </svg>
        );
      case 'notched':
        // Rectangle with an entrance notch on top edge
        return (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path {...common} className={cn(strokeClass, 'stroke-2')} d="M5 35 L40 35 L50 25 L60 35 L95 35 L95 95 L5 95 Z" />
          </svg>
        );
      case 'u':
        // U-shaped footprint
        return (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path {...common} className={cn(strokeClass, 'stroke-2')} d="M5 35 L95 35 L95 95 L65 95 L65 60 L35 60 L35 95 L5 95 Z" />
          </svg>
        );
      case 'long':
        // Long hall with slight bay
        return (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path {...common} className={cn(strokeClass, 'stroke-2')} d="M5 45 L80 45 L95 55 L95 95 L5 95 Z" />
          </svg>
        );
      case 'house':
      default:
        // Simple house silhouette
        return (
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon {...common} className={cn(strokeClass, 'stroke-2')} points="10,30 50,8 90,30 90,95 10,95" />
            <line {...common} className={cn(strokeClass, 'stroke-2')} x1="10" y1="30" x2="90" y2="30" />
          </svg>
        );
    }
  };

  const handleKennelClick = (kennel) => {
    setSelectedKennel(kennel);
  };

  const totalKennels = Object.values(groupedKennels).flat().length;
  const gridSize = 40;

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY;
    const step = 0.05;
    const next = delta > 0 ? Math.max(0.4, zoom - step) : Math.min(2.5, zoom + step);
    // Zoom towards the cursor position (anchor zoom)
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - pan.x) / zoom;
      const worldY = (mouseY - pan.y) / zoom;
      const newPanX = mouseX - worldX * next;
      const newPanY = mouseY - worldY * next;
      setPan({ x: newPanX, y: newPanY });
    }
    setZoom(next);
  };

  // Mouse drag panning
  const handleMouseDown = (e) => {
    setIsPanning(true);
    setLastPos({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e) => {
    if (!isPanning || isDraggingBuilding) return;
    const dx = e.clientX - lastPos.x;
    const dy = e.clientY - lastPos.y;
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPos({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsPanning(false);

  const openAreaDetails = (name) => {
    const stats = getBuildingStats(name);
    const items = groupedKennels[name] || [];
    setSelectedArea({ name, stats, items });
  };

  // Force wheel listener to be non-passive to fully block page scroll when zooming
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const blockScroll = (e) => {
      e.preventDefault();
    };
    el.addEventListener('wheel', blockScroll, { passive: false });
    el.addEventListener('touchmove', blockScroll, { passive: false });
    const captureBlock = (e) => {
      if (containerRef.current && containerRef.current.contains(e.target)) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', captureBlock, { passive: false, capture: true });
    window.addEventListener('touchmove', captureBlock, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', blockScroll, { passive: false });
      el.removeEventListener('touchmove', blockScroll, { passive: false });
      window.removeEventListener('wheel', captureBlock, { passive: false, capture: true });
      window.removeEventListener('touchmove', captureBlock, { passive: false, capture: true });
    };
  }, []);

  // Initialize layout from localStorage or grid defaults
  useEffect(() => {
    const key = 'bb.facilityLayout.v1';
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setLayout(JSON.parse(saved) || {}); } catch {}
    }
  }, []);

  useEffect(() => {
    const key = 'bb.facilityLayout.v1';
    localStorage.setItem(key, JSON.stringify(layout));
  }, [layout]);

  return (
    <div className="space-y-4">
      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
        <p>Debug: {totalKennels} kennels loaded, {Object.keys(groupedKennels).length} building groups</p>
      </div>

      {/* Map Controls */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Facility Map View</h3>
          <Badge variant="info" className="ml-2">Live</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(Math.min(2, zoom + 0.1))}
            disabled={zoom >= 2}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setZoom(1)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 text-sm">
        <span className="font-medium text-gray-700">Status:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Available (&lt;50%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-gray-600">Moderate (50-80%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-gray-600">High (80-95%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600">Critical (95-100%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
          <span className="text-gray-600">Full</span>
        </div>
      </div>

      {/* Map Canvas */}
      <div
        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        onWheel={handleWheel}
        style={{ overscrollBehavior: 'contain' }}
        ref={containerRef}
      >
        <div
          className={cn(
            'relative select-none',
            isPanning ? 'cursor-grabbing' : 'cursor-grab'
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            width: '100%',
            height: 'calc(100vh - 220px)',
            backgroundColor: '#ffffff',
            backgroundImage:
              'linear-gradient(to right, #eef2ff 1px, transparent 1px), linear-gradient(to bottom, #eef2ff 1px, transparent 1px)',
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${pan.x % gridSize}px ${pan.y % gridSize}px`
          }}
        >
          {/* Pannable + Zoomable world */}
          <div
            className="absolute"
            style={{
              left: pan.x,
              top: pan.y,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: '2000px',
              height: '1400px'
            }}
          >
            {/* Dynamic Building Blocks - auto layout */}
            {(() => {
              const defaultOrder = [
                'Suites Wing',
                'Standard Kennels',
                'Daycare',
                'Training',
                'Grooming',
                'Outdoor Runs',
                'Isolation Ward'
              ];
              const buildingNames = Array.from(
                new Set([ ...defaultOrder, ...Object.keys(groupedKennels) ])
              );

              const cols = 3;
              const gap = 80;
              const originX = 80;
              const originY = 60;
              const colWidth = (2000 - originX * 2 - gap * (cols - 1)) / cols;
              const rowHeight = 300;

              return buildingNames.map((name, i) => {
                const stats = getBuildingStats(name);
                // Size scales with capacity (bounded)
                const baseW = Math.max(220, Math.min(colWidth, 160 + stats.capacity * 8));
                const baseH = Math.max(120, Math.min(rowHeight, 100 + stats.capacity * 6));

              const col = i % cols;
              const row = Math.floor(i / cols);
              const defaultX = originX + col * (colWidth + gap) + (colWidth - baseW) / 2;
              const defaultY = originY + row * (rowHeight + gap);
              const x = layout[name]?.x ?? defaultX;
              const y = layout[name]?.y ?? defaultY;

                const rate = stats.capacity > 0 ? stats.occupied / stats.capacity : 0;
                const border = rate >= 0.95 ? 'border-red-500' : rate >= 0.8 ? 'border-orange-500' : rate >= 0.5 ? 'border-yellow-500' : 'border-green-500';

                const onDragStart = (e) => {
                  if (!editable) return;
                  e.stopPropagation();
                  setIsDraggingBuilding(true);
                  dragRef.current = { name, lastClientX: e.clientX, lastClientY: e.clientY };
                };
                const onDragMove = (e) => {
                  if (!editable) return;
                  e.stopPropagation();
                  if (dragRef.current.name !== name) return;
                  const dx = e.clientX - dragRef.current.lastClientX;
                  const dy = e.clientY - dragRef.current.lastClientY;
                  dragRef.current.lastClientX = e.clientX;
                  dragRef.current.lastClientY = e.clientY;
                  setLayout((prev) => ({
                    ...prev,
                    [name]: { x: (prev[name]?.x ?? x) + dx, y: (prev[name]?.y ?? y) + dy }
                  }));
                };
                const onDragEnd = (e) => {
                  if (editable) e.stopPropagation();
                  dragRef.current = { name: null, lastClientX: 0, lastClientY: 0 };
                  setIsDraggingBuilding(false);
                };

                return (
                  <div
                    key={name}
                    className={cn('absolute', editable ? 'cursor-move' : '')}
                    style={{ left: x, top: y, width: baseW, height: baseH }}
                    onMouseDown={onDragStart}
                    onMouseMove={onDragMove}
                    onMouseUp={onDragEnd}
                    onMouseLeave={onDragEnd}
                  >
                    {/* Availability pin (clickable) */}
                    <button
                      type="button"
                      onClick={() => openAreaDetails(name)}
                      className="absolute -top-6 left-1/2 -translate-x-1/2 z-10"
                    >
                      {occupancyBadge(stats.capacity, stats.occupied)}
                    </button>
                    <div className={cn('relative w-full h-full rounded-md shadow-sm border-2 bg-transparent', border)}>
                      <div className="absolute left-3 top-2 text-gray-700 font-semibold uppercase tracking-wide text-sm">{name}</div>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Empty State */}
            {(kennels || []).length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <MapPin className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-lg font-medium">No kennels configured</p>
                  <p className="text-sm">Add kennels in settings to see them on the map</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Kennel Details Panel */}
      <SlidePanel
        open={Boolean(selectedArea)}
        onClose={() => setSelectedArea(null)}
        title={selectedArea?.name || 'Area Details'}
        width="w-full md:w-96"
      >
        {selectedArea && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Capacity</p>
                <p className="text-lg font-semibold text-gray-900">{selectedArea.stats.capacity}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Occupied</p>
                <p className="text-lg font-semibold text-gray-900">{selectedArea.stats.occupied}</p>
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Available</p>
              <p className="text-2xl font-bold text-gray-900">{Math.max(0, (selectedArea.stats.capacity || 0) - (selectedArea.stats.occupied || 0))}</p>
            </div>
            {selectedArea.items?.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Items in this area</h4>
                <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1 max-h-60 overflow-auto">
                  {selectedArea.items.slice(0, 20).map((k) => (
                    <li key={k.recordId || k.name}>{k.name} — cap {k.capacity || 0}</li>
                  ))}
                  {selectedArea.items.length > 20 && (
                    <li className="text-gray-500">and {selectedArea.items.length - 20} more…</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
      <SlidePanel
        open={Boolean(selectedKennel)}
        onClose={() => setSelectedKennel(null)}
        title={selectedKennel?.name || 'Kennel Details'}
        width="w-full md:w-96"
      >
        {selectedKennel && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Type</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{selectedKennel.type || 'Unknown'}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Capacity</p>
                <p className="text-lg font-semibold text-gray-900">{selectedKennel.capacity || 0}</p>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Status</p>
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedKennel.occupied || 0}/{selectedKennel.capacity || 0}
                </p>
                <Badge variant={(selectedKennel.occupied || 0) >= (selectedKennel.capacity || 0) ? 'danger' : 'success'}>
                  {(selectedKennel.occupied || 0) >= (selectedKennel.capacity || 0) ? 'Full' : `${(selectedKennel.capacity || 0) - (selectedKennel.occupied || 0)} Available`}
                </Badge>
              </div>
            </div>

            {selectedKennel.location && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Location</p>
                <p className="text-gray-900">{selectedKennel.location}</p>
              </div>
            )}

            {selectedKennel.building && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Building</p>
                <p className="text-gray-900">{selectedKennel.building}</p>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Occupancy Rate</p>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    (() => {
                      const rate = (selectedKennel.capacity || 0) > 0 ? 
                        ((selectedKennel.occupied || 0) / (selectedKennel.capacity || 1)) * 100 : 0;
                      if (rate >= 100) return 'bg-gray-500';
                      if (rate >= 95) return 'bg-red-500';
                      if (rate >= 80) return 'bg-orange-500';
                      if (rate >= 50) return 'bg-yellow-500';
                      return 'bg-green-500';
                    })()
                  )}
                  style={{ width: `${(selectedKennel.capacity || 0) > 0 ? ((selectedKennel.occupied || 0) / (selectedKennel.capacity || 1)) * 100 : 0}%` }}
                />
              </div>
              <p className="text-right text-sm font-medium text-gray-700 mt-1">
                {((selectedKennel.capacity || 0) > 0 ? ((selectedKennel.occupied || 0) / (selectedKennel.capacity || 1)) * 100 : 0).toFixed(0)}%
              </p>
            </div>

            {(selectedKennel.occupied || 0) > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium text-gray-900 mb-2">Current Guests</h4>
                <p className="text-sm text-gray-600">
                  {selectedKennel.occupied || 0} pet{(selectedKennel.occupied || 0) !== 1 ? 's' : ''} currently housed
                </p>
                {/* TODO: Show actual pet names when integrated with booking data */}
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
};

export default FacilityMapView;

