/**
 * CustomReportBuilder - enterprise custom report builder
 * 3-column layout: Data sources/Fields | Configure/Filters | Chart Preview
 */

import Button from '@/components/ui/Button';
import { tooltipContentStyle } from '@/components/ui/charts/ChartTooltip';
import { chartColorSequence } from '@/components/ui/charts/palette';
import StyledSelect from '@/components/ui/StyledSelect';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/cn';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation } from '@tanstack/react-query';
import {
  Activity,
  AlignLeft,
  AtSign,
  BarChart2,
  BarChart3,
  Calendar,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Circle,
  CreditCard,
  Download,
  Filter as FilterIcon,
  FolderTree,
  Gauge,
  GitMerge,
  Grid3X3,
  Info,
  Layers,
  ListFilter,
  PawPrint,
  Phone,
  PieChart as PieChartIcon,
  Plus,
  Redo2,
  RefreshCw,
  Search,
  Table2,
  TrendingUp,
  Undo2,
  UserCog,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// =============================================================================
// DATA SOURCE CONFIGURATION
// =============================================================================

const DATA_SOURCES = [
  { value: 'owners', label: 'Owners', icon: Users, color: 'bg-blue-500' },
  { value: 'pets', label: 'Pets', icon: PawPrint, color: 'bg-green-500' },
  { value: 'bookings', label: 'Bookings', icon: CalendarDays, color: 'bg-purple-500' },
  { value: 'services', label: 'Services', icon: Wrench, color: 'bg-amber-500' },
  { value: 'payments', label: 'Payments', icon: CreditCard, color: 'bg-emerald-500' },
  { value: 'staff', label: 'Staff', icon: UserCog, color: 'bg-rose-500' },
];

// Chart types organized in 2 rows for icon grid
const CHART_TYPES = [
  // Row 1
  { value: 'line', label: 'Line', icon: Activity },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'column', label: 'Column', icon: BarChart2 },
  { value: 'area', label: 'Area', icon: TrendingUp },
  { value: 'stacked', label: 'Stacked', icon: Layers },
  { value: 'treemap', label: 'Treemap', icon: FolderTree },
  // Row 2
  { value: 'pie', label: 'Pie', icon: PieChartIcon },
  { value: 'donut', label: 'Donut', icon: Circle },
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'pivot', label: 'Pivot', icon: Grid3X3 },
  { value: 'funnel', label: 'Funnel', icon: FilterIcon },
  { value: 'sankey', label: 'Sankey', icon: GitMerge },
  { value: 'gauge', label: 'Gauge', icon: Gauge },
];

const AGGREGATION_OPTIONS = [
  { value: 'COUNT', label: 'Count' },
  { value: 'SUM', label: 'Sum' },
  { value: 'AVG', label: 'Average' },
  { value: 'MIN', label: 'Min' },
  { value: 'MAX', label: 'Max' },
];

// Chart-specific drop zone configuration
const CHART_ZONE_CONFIG = {
  line: ['xAxis', 'yAxis', 'breakDownBy', 'compareBy'],
  bar: ['xAxis', 'yAxis', 'breakDownBy', 'compareBy'],
  column: ['xAxis', 'yAxis', 'breakDownBy', 'compareBy'],
  area: ['xAxis', 'yAxis', 'breakDownBy', 'compareBy'],
  scatter: ['xAxis', 'yAxis', 'breakDownBy', 'pointDetails', 'pointSize'],
  pie: ['breakDownBy', 'values'],
  donut: ['breakDownBy', 'values'],
  table: ['columns'],
  pivot: ['rows', 'columns', 'values'],
  kpi: ['groupBy', 'values', 'compareBy'],
  gauge: ['value', 'compareBy'],
  combo: ['xAxis', 'yAxis1', 'yAxis2', 'breakDownBy'],
  funnel: ['stages', 'values'],
  treemap: ['category', 'size', 'color'],
  stacked: ['xAxis', 'yAxis', 'stackBy'],
  sankey: ['source', 'target', 'values'],
};

// Minimum required fields per chart type for query execution
// Each entry specifies required zones - for arrays, at least 1 item required
const CHART_MINIMUM_REQUIREMENTS = {
  line: { required: ['xAxis', 'yAxis'], message: 'Add a dimension to X-axis and a measure to Y-axis' },
  bar: { required: ['xAxis', 'yAxis'], message: 'Add a dimension to X-axis and a measure to Y-axis' },
  column: { required: ['xAxis', 'yAxis'], message: 'Add a dimension to X-axis and a measure to Y-axis' },
  area: { required: ['xAxis', 'yAxis'], message: 'Add a dimension to X-axis and a measure to Y-axis' },
  stacked: { required: ['xAxis', 'yAxis'], message: 'Add a dimension to X-axis and a measure to Y-axis' },
  scatter: { required: ['xAxis', 'yAxis'], message: 'Add dimensions to both X-axis and Y-axis' },
  pie: { required: ['breakDownBy', 'values'], message: 'Add a dimension to Break down by and a measure to Values' },
  donut: { required: ['breakDownBy', 'values'], message: 'Add a dimension to Break down by and a measure to Values' },
  table: { required: ['columns'], message: 'Add at least one column to display' },
  pivot: { required: ['rows', 'columns', 'values'], message: 'Add at least one Row, Column, and Value' },
  kpi: { required: ['values'], message: 'Add a measure to Values' },
  gauge: { required: ['value'], message: 'Add a measure to Value' },
  combo: { required: ['xAxis', 'yAxis1'], message: 'Add a dimension to X-axis and a measure to Y-axis (Left)' },
  funnel: { required: ['stages', 'values'], message: 'Add a dimension to Stages and a measure to Values' },
  treemap: { required: ['category', 'size'], message: 'Add a dimension to Category and a measure to Size' },
  sankey: { required: ['source', 'target', 'values'], message: 'Add Source, Target dimensions and a Value measure' },
};

// Drop zone definitions with labels, tooltips, and field type requirements
const DROP_ZONE_DEFINITIONS = {
  xAxis: {
    label: 'X-axis',
    tooltip: 'Category or time dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  yAxis: {
    label: 'Y-axis',
    tooltip: 'Numeric measure to aggregate',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  yAxis1: {
    label: 'Y-axis (Left)',
    tooltip: 'Primary measure (left axis)',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  yAxis2: {
    label: 'Y-axis (Right)',
    tooltip: 'Secondary measure (right axis)',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  breakDownBy: {
    label: 'Break down by',
    tooltip: 'Split data by this dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  compareBy: {
    label: 'Compare by',
    tooltip: 'Compare across time periods',
    placeholder: 'Drag date field here',
    acceptsDateOnly: true,
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  stackBy: {
    label: 'Stack by',
    tooltip: 'Stack bars by this dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  values: {
    label: 'Values',
    tooltip: 'Numeric values to display',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: true,
  },
  value: {
    label: 'Value',
    tooltip: 'Single numeric value',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  columns: {
    label: 'Columns',
    tooltip: 'Fields to display as columns',
    placeholder: 'Drag fields here',
    acceptsDimensions: true,
    acceptsMeasures: true,
    multiple: true,
  },
  rows: {
    label: 'Rows',
    tooltip: 'Row grouping dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: true,
  },
  groupBy: {
    label: 'Group by',
    tooltip: 'Group results by this field',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  stages: {
    label: 'Stages',
    tooltip: 'Funnel stage dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  category: {
    label: 'Category',
    tooltip: 'Treemap category grouping',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  size: {
    label: 'Size',
    tooltip: 'Determines box size',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  color: {
    label: 'Color',
    tooltip: 'Determines color intensity',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  source: {
    label: 'Source',
    tooltip: 'Flow source dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  target: {
    label: 'Target',
    tooltip: 'Flow target dimension',
    placeholder: 'Drag dimension here',
    acceptsDimensions: true,
    acceptsMeasures: false,
    multiple: false,
  },
  pointDetails: {
    label: 'Point details',
    tooltip: 'Additional info shown on hover',
    placeholder: 'Drag fields here',
    acceptsDimensions: true,
    acceptsMeasures: true,
    multiple: true,
  },
  pointSize: {
    label: 'Point size',
    tooltip: 'Determines scatter point size',
    placeholder: 'Drag measure here',
    acceptsDimensions: false,
    acceptsMeasures: true,
    multiple: false,
  },
  fields: {
    label: 'Additional fields',
    tooltip: 'Extra detail fields for tooltips/exports',
    placeholder: 'Drag fields here',
    acceptsDimensions: true,
    acceptsMeasures: true,
    multiple: true,
  },
};

// enterprise operators organized by field type
const FILTER_OPERATORS_BY_TYPE = {
  text: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'doesn\'t contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  number: [
    { value: 'is', label: 'is equal to' },
    { value: 'is_not', label: 'is not equal to' },
    { value: 'gt', label: 'is greater than' },
    { value: 'gte', label: 'is greater than or equal to' },
    { value: 'lt', label: 'is less than' },
    { value: 'lte', label: 'is less than or equal to' },
    { value: 'between', label: 'is between' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  date: [
    { value: 'is', label: 'is' },
    { value: 'is_before', label: 'is before' },
    { value: 'is_after', label: 'is after' },
    { value: 'is_between', label: 'is between' },
    { value: 'in_last', label: 'in the last' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  enum: [
    { value: 'is_any_of', label: 'is any of' },
    { value: 'is_none_of', label: 'is none of' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
    { value: 'is_known', label: 'is known' },
    { value: 'is_unknown', label: 'is unknown' },
  ],
};

// Get operators for a field type
const getOperatorsForType = (fieldType) => {
  if (['number', 'integer', 'currency'].includes(fieldType)) return FILTER_OPERATORS_BY_TYPE.number;
  if (['date', 'datetime'].includes(fieldType)) return FILTER_OPERATORS_BY_TYPE.date;
  if (['enum', 'select', 'multi_enum'].includes(fieldType)) return FILTER_OPERATORS_BY_TYPE.enum;
  if (fieldType === 'boolean') return FILTER_OPERATORS_BY_TYPE.boolean;
  return FILTER_OPERATORS_BY_TYPE.text;
};

// Legacy operators for backward compatibility
const FILTER_OPERATORS = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
  { value: 'is_null', label: 'Is Empty' },
  { value: 'is_not_null', label: 'Is Not Empty' },
];

// =============================================================================
// FIELD TYPE ICONS - Clean icons with brand colors
// =============================================================================

const FieldTypeIcon = ({ type, className = '' }) => {
  const baseClass = cn('h-3.5 w-3.5 flex-shrink-0', className);
  switch (type) {
    // Numeric types → #
    case 'number':
    case 'integer':
    case 'currency':
      return (
        <span className={cn(baseClass, 'text-primary font-semibold text-[10px] leading-none flex items-center justify-center')}>
          #
        </span>
      );
    // Date types → Calendar
    case 'date':
    case 'datetime':
      return <Calendar className={cn(baseClass, 'text-primary')} />;
    // Boolean → Checkbox
    case 'boolean':
      return <CheckSquare className={cn(baseClass, 'text-purple-500')} />;
    // Select/Enum → Dropdown
    case 'enum':
    case 'select':
    case 'multi_enum':
      return <ListFilter className={cn(baseClass, 'text-amber-500')} />;
    // Phone
    case 'phone':
      return <Phone className={cn(baseClass, 'text-green-500')} />;
    // Email → @
    case 'email':
      return <AtSign className={cn(baseClass, 'text-blue-500')} />;
    // Textarea → multi-line text
    case 'textarea':
      return <AlignLeft className={cn(baseClass, 'text-muted')} />;
    // Default text → Aa
    case 'text':
    case 'string':
    default:
      return (
        <span className={cn(baseClass, 'text-muted font-medium text-[10px] leading-none flex items-center justify-center')}>
          Aa
        </span>
      );
  }
};

// =============================================================================
// DRAGGABLE FIELD ITEM COMPONENT
// =============================================================================

const DraggableField = ({ field, isDimension, isSelected, onClick }) => {
  const fieldData = JSON.stringify({ field, isDimension });

  const handleDragStart = (e) => {
    e.dataTransfer.setData('application/json', fieldData);
    e.dataTransfer.effectAllowed = 'copy';
    e.target.classList.add('opacity-50');
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('opacity-50');
  };

  return (
    <button
      draggable
      data-field-data={fieldData}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md text-left transition-all cursor-grab active:cursor-grabbing",
        "hover:bg-surface-hover border border-transparent",
        isSelected && "bg-primary/10 text-primary border-primary/20"
      )}
    >
      <FieldTypeIcon type={field.type} />
      <span className="truncate flex-1">{field.label}</span>
    </button>
  );
};

// =============================================================================
// COLLAPSIBLE FIELD GROUP COMPONENT
// =============================================================================

const CollapsibleFieldGroup = ({ title, icon: Icon, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-surface-hover/50 transition-colors text-left"
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-muted transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
        {Icon && <Icon className="h-3.5 w-3.5 text-muted" />}
        <span className="text-xs font-medium text-text flex-1">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="pb-2">
          {children}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SORTABLE FIELD ROW - Used for drag-to-reorder in drop zones
// =============================================================================

// Static field row component for drag overlay
const FieldRowStatic = forwardRef(({ fieldItem, style, isDragging: isDragOverlay, ...props }, ref) => (
  <div
    ref={ref}
    style={style}
    className={cn(
      "flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-surface-primary rounded-md border border-border w-full",
      isDragOverlay && "shadow-lg ring-2 ring-primary/50 cursor-grabbing"
    )}
    {...props}
  >
    <FieldTypeIcon type={fieldItem.type} className="flex-shrink-0" />
    <span className="text-xs text-text flex-1 truncate">{fieldItem.label}</span>
  </div>
));
FieldRowStatic.displayName = 'FieldRowStatic';

// Sortable field row using @dnd-kit
const SortableFieldRow = ({ fieldItem, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldItem.key || `field-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-surface-primary rounded-md border border-border group transition-colors w-full",
        "cursor-grab active:cursor-grabbing hover:border-primary/50 hover:bg-primary/5",
        isDragging && "opacity-40 bg-primary/10 border-primary/30"
      )}
      {...attributes}
      {...listeners}
    >
      <FieldTypeIcon type={fieldItem.type} className="flex-shrink-0" />
      <span className="text-xs text-text flex-1 truncate">{fieldItem.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-0.5 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

// =============================================================================
// DROP ZONE COMPONENT - With drag-and-drop support and validation
// Supports both single field and multiple field modes
// =============================================================================

const DropZone = ({
  label,
  tooltip,
  field,        // Single field mode: field object or null
  fields,       // Multiple field mode: array of fields
  onRemove,     // Single mode: () => void, Multiple mode: (index) => void
  onDrop,
  onReorder,    // Multiple mode: (fromIndex, toIndex) => void
  placeholder,
  acceptsDateOnly = false,
  acceptsMeasures = false,
  acceptsDimensions = true,
  multiple = false,
  isDragging = false,
  draggedItem = null
}) => {
  const [isOver, setIsOver] = useState(false);
  const [activeId, setActiveId] = useState(null);

  // dnd-kit sensors for smooth drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // For multiple mode, check if we have any fields
  const hasFields = multiple ? (fields && fields.length > 0) : !!field;

  // Get field IDs for sortable context
  const fieldIds = useMemo(() => {
    if (!fields || !multiple) return [];
    return fields.map((f, i) => f.key || `field-${i}`);
  }, [fields, multiple]);

  // Find the active field for drag overlay
  const activeField = useMemo(() => {
    if (!activeId || !fields) return null;
    const index = fields.findIndex((f, i) => (f.key || `field-${i}`) === activeId);
    return index >= 0 ? fields[index] : null;
  }, [activeId, fields]);

  // Check if the currently dragged item can be dropped here
  const canAcceptCurrentDrag = () => {
    // For single field mode, don't accept if already has a field
    if (!multiple && field) return false;
    if (!draggedItem) return false;

    const { field: dragField, isDimension } = draggedItem;

    // Date-only zones: must be date/datetime type
    if (acceptsDateOnly) {
      return ['date', 'datetime'].includes(dragField.type);
    }

    // Zone accepts BOTH dimensions and measures → accept anything
    if (acceptsDimensions && acceptsMeasures) {
      return true;
    }

    // Zone only accepts measures (numeric fields) → reject dimensions
    if (acceptsMeasures && !acceptsDimensions) {
      return !isDimension; // Only accept measures (isDimension = false)
    }

    // Zone only accepts dimensions → reject measures
    if (acceptsDimensions && !acceptsMeasures) {
      return isDimension; // Only accept dimensions (isDimension = true)
    }

    return false;
  };

  const isValidTarget = canAcceptCurrentDrag();
  const isInvalidTarget = isDragging && draggedItem && !isValidTarget && !(!multiple && field);

  // dnd-kit handlers for reordering
  const handleSortDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleSortDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = fieldIds.indexOf(active.id);
      const newIndex = fieldIds.indexOf(over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onReorder(oldIndex, newIndex);
      }
    }
  };

  // HTML5 drag handlers for dropping NEW fields (from left panel)
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
    if (isValidTarget) {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'none';
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);

    if (!isValidTarget) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      onDrop?.(data.field, data.isDimension);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-medium text-text">{label}</span>
        {tooltip && (
          <div className="group relative">
            <Info className="h-3 w-3 text-muted cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "min-h-[40px] rounded-lg border-2 border-dashed transition-all duration-200",
          // Has fields - show filled state
          hasFields && "border-primary/40 bg-primary/5 p-2",
          // Valid drop target - highlight green/primary
          !hasFields && isOver && isValidTarget && "border-primary bg-primary/10 scale-[1.01] cursor-copy",
          !hasFields && isDragging && isValidTarget && !isOver && "border-primary/50 bg-primary/5",
          // Invalid drop target - show red/forbidden
          !hasFields && isOver && isInvalidTarget && "border-red-400 bg-red-50 dark:bg-red-900/20 cursor-not-allowed",
          !hasFields && isDragging && isInvalidTarget && !isOver && "border-red-300/50 bg-red-50/30 dark:bg-red-900/10 opacity-60",
          // Default state
          !hasFields && !isDragging && "border-border bg-surface-secondary/50"
        )}
      >
        {multiple ? (
          // Multiple fields mode - vertical list with dnd-kit sortable
          <div className="flex flex-col gap-1 p-2">
            {fields && fields.length > 0 && onReorder ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleSortDragStart}
                onDragEnd={handleSortDragEnd}
              >
                <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
                  {fields.map((f, i) => (
                    <SortableFieldRow
                      key={f.key || `field-${i}`}
                      fieldItem={f}
                      index={i}
                      onRemove={onRemove}
                    />
                  ))}
                </SortableContext>
                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                  {activeField ? (
                    <FieldRowStatic fieldItem={activeField} isDragging />
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              // No reorder or no fields - just render static
              fields && fields.map((f, i) => (
                <div
                  key={f.key || i}
                  className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-surface-primary rounded-md border border-border group w-full"
                >
                  <FieldTypeIcon type={f.type} className="flex-shrink-0" />
                  <span className="text-xs text-text flex-1 truncate">{f.label}</span>
                  <button
                    onClick={() => onRemove(i)}
                    className="p-0.5 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
            {/* Always show drop prompt at bottom */}
            <div className={cn(
              "flex items-center justify-center py-1.5 rounded border border-dashed border-transparent transition-colors",
              isOver && isValidTarget && "border-primary/50 bg-primary/5",
              isOver && isInvalidTarget && "border-red-400/50 bg-red-50/50 dark:bg-red-900/10"
            )}>
              <span className={cn(
                "text-xs transition-colors",
                isOver && isValidTarget && "text-primary font-medium",
                isOver && isInvalidTarget && "text-red-500 font-medium",
                !isOver && "text-muted"
              )}>
                {isOver && isValidTarget && 'Drop here'}
                {isOver && isInvalidTarget && 'Cannot drop here'}
                {!isOver && (fields && fields.length > 0 ? '+ Add more' : (placeholder || 'Drag fields here'))}
              </span>
            </div>
          </div>
        ) : (
          // Single field mode
          field ? (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <FieldTypeIcon type={field.type} />
                <span className="text-sm text-text">{field.label}</span>
              </div>
              <button
                onClick={onRemove}
                className="p-1 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center px-3 py-2">
              <span className={cn(
                "text-xs transition-colors",
                isOver && isValidTarget && "text-primary font-medium",
                isOver && isInvalidTarget && "text-red-500 font-medium",
                !isOver && "text-muted"
              )}>
                {isOver && isValidTarget && 'Drop here'}
                {isOver && isInvalidTarget && 'Cannot drop here'}
                {!isOver && (placeholder || 'Drag fields here')}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// =============================================================================
// FILTER PILL COMPONENT - enterprise filter chip
// =============================================================================

const FilterPill = ({ filter, field, onClick, onRemove }) => {
  // Format the display value
  const getDisplayValue = () => {
    if (['is_known', 'is_unknown', 'is_true', 'is_false'].includes(filter.operator)) {
      return null;
    }
    if (Array.isArray(filter.value)) {
      return filter.value.join(', ');
    }
    return filter.value;
  };

  const getOperatorLabel = () => {
    const operators = getOperatorsForType(field?.type || 'text');
    const op = operators.find(o => o.value === filter.operator);
    return op?.label || filter.operator;
  };

  const displayValue = getDisplayValue();

  return (
    <div
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs cursor-pointer hover:bg-primary/15 transition-colors group"
    >
      <span className="font-medium text-primary">{field?.label || filter.field}</span>
      <span className="text-primary/70">{getOperatorLabel()}</span>
      {displayValue && (
        <span className="text-primary font-medium">{displayValue}</span>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 p-0.5 text-primary/50 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

// =============================================================================
// FILTER EDITOR POPOVER - enterprise inline editor
// =============================================================================

const FilterEditorPopover = ({ filter, field, allFields, onUpdate, onClose, onRemove }) => {
  const [localFilter, setLocalFilter] = useState({ ...filter });
  const operators = getOperatorsForType(field?.type || 'text');

  // Get field options if it's an enum type
  const fieldOptions = field?.options ? (
    typeof field.options === 'string' ? JSON.parse(field.options) : field.options
  ) : null;

  const handleApply = () => {
    onUpdate(localFilter);
    onClose();
  };

  const needsValue = !['is_known', 'is_unknown', 'is_true', 'is_false'].includes(localFilter.operator);

  return (
    <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white dark:bg-surface-secondary rounded-lg border border-border shadow-lg z-50">
      {/* Field selector */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-muted mb-1.5">Field</label>
        <select
          value={localFilter.field}
          onChange={(e) => {
            const newField = allFields.find(f => f.key === e.target.value);
            setLocalFilter({
              ...localFilter,
              field: e.target.value,
              operator: getOperatorsForType(newField?.type || 'text')[0].value,
              value: '',
            });
          }}
          className="w-full px-3 py-2 text-sm bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {allFields.map(f => (
            <option key={f.key} value={f.key}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Operator selector */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-muted mb-1.5">Condition</label>
        <select
          value={localFilter.operator}
          onChange={(e) => setLocalFilter({ ...localFilter, operator: e.target.value })}
          className="w-full px-3 py-2 text-sm bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {operators.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>

      {/* Value input - varies by field type */}
      {needsValue && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5">Value</label>
          {['enum', 'select', 'multi_enum'].includes(field?.type) && fieldOptions ? (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {fieldOptions.map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-surface-hover px-2 py-1 rounded">
                  <input
                    type="checkbox"
                    checked={Array.isArray(localFilter.value) ? localFilter.value.includes(option) : localFilter.value === option}
                    onChange={(e) => {
                      const currentValues = Array.isArray(localFilter.value) ? localFilter.value : (localFilter.value ? [localFilter.value] : []);
                      if (e.target.checked) {
                        setLocalFilter({ ...localFilter, value: [...currentValues, option] });
                      } else {
                        setLocalFilter({ ...localFilter, value: currentValues.filter(v => v !== option) });
                      }
                    }}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          ) : field?.type === 'boolean' ? (
            <select
              value={localFilter.value}
              onChange={(e) => setLocalFilter({ ...localFilter, value: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select...</option>
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          ) : ['date', 'datetime'].includes(field?.type) ? (
            <input
              type="date"
              value={localFilter.value || ''}
              onChange={(e) => setLocalFilter({ ...localFilter, value: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : ['number', 'integer', 'currency'].includes(field?.type) ? (
            <input
              type="number"
              value={localFilter.value || ''}
              onChange={(e) => setLocalFilter({ ...localFilter, value: e.target.value })}
              placeholder="Enter number..."
              className="w-full px-3 py-2 text-sm bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            <input
              type="text"
              value={localFilter.value || ''}
              onChange={(e) => setLocalFilter({ ...localFilter, value: e.target.value })}
              placeholder="Enter value..."
              className="w-full px-3 py-2 text-sm bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <button
          onClick={onRemove}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Delete filter
        </button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-3 text-xs">
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleApply} className="h-8 px-3 text-xs">
            Apply filter
          </Button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// FILTER DROP ZONE - For dragging fields to create filters
// =============================================================================

const FilterDropZone = ({ onDrop, isDragging, draggedItem }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (draggedItem?.isDimension) {
      e.dataTransfer.dropEffect = 'copy';
      setIsOver(true);
    }
  };

  const handleDragLeave = () => setIsOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.field) {
        onDrop(data.field);
      }
    } catch (err) {
      console.error('Filter drop error:', err);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-4 text-center transition-all",
        isOver
          ? "border-primary bg-primary/10"
          : isDragging
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-surface-secondary/30"
      )}
    >
      <FilterIcon className={cn(
        "h-6 w-6 mx-auto mb-2 transition-colors",
        isOver ? "text-primary" : "text-muted"
      )} />
      <p className={cn(
        "text-xs transition-colors",
        isOver ? "text-primary font-medium" : "text-muted"
      )}>
        {isOver ? 'Drop to add filter' : 'Drag a field here to filter'}
      </p>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CustomReportBuilder = () => {
  const navigate = useNavigate();

  // Report configuration state
  const [reportName, setReportName] = useState('Untitled Report');
  const [dataSource, setDataSource] = useState('bookings');
  const [chartType, setChartType] = useState('bar');

  // Dynamic zone values - keyed by zone name
  // Single zones store: { field } or null
  // Multiple zones store: [{ field }, ...] or []
  const [zoneValues, setZoneValues] = useState({});

  // Get/set helpers for zone values (prefixed with _ to suppress unused warnings - may be used externally)
  const _getZoneValue = useCallback((zoneName) => {
    return zoneValues[zoneName] || null;
  }, [zoneValues]);

  const _setZoneValue = useCallback((zoneName, value) => {
    setZoneValues(prev => ({ ...prev, [zoneName]: value }));
  }, []);

  // Expose for potential future use
  void _getZoneValue;
  void _setZoneValue;

  const addToZone = useCallback((zoneName, field) => {
    const def = DROP_ZONE_DEFINITIONS[zoneName];
    if (def?.multiple) {
      setZoneValues(prev => ({
        ...prev,
        [zoneName]: [...(prev[zoneName] || []), field],
      }));
    } else {
      setZoneValues(prev => ({ ...prev, [zoneName]: field }));
    }
  }, []);

  const removeFromZone = useCallback((zoneName, index = null) => {
    const def = DROP_ZONE_DEFINITIONS[zoneName];
    if (def?.multiple && index !== null) {
      setZoneValues(prev => ({
        ...prev,
        [zoneName]: (prev[zoneName] || []).filter((_, i) => i !== index),
      }));
    } else {
      setZoneValues(prev => ({ ...prev, [zoneName]: def?.multiple ? [] : null }));
    }
  }, []);

  const reorderInZone = useCallback((zoneName, fromIndex, toIndex) => {
    setZoneValues(prev => {
      const items = [...(prev[zoneName] || [])];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      return { ...prev, [zoneName]: items };
    });
  }, []);

  // Legacy accessors for backward compatibility with chart rendering
  const xAxis = zoneValues.xAxis || null;
  const yAxis = zoneValues.yAxis || zoneValues.values?.[0] || zoneValues.value || null;
  const groupBy = zoneValues.breakDownBy || zoneValues.stackBy || zoneValues.category || null;
  const compareBy = zoneValues.compareBy || null;

  const [filters, setFilters] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'any'
  const [editingFilterIndex, setEditingFilterIndex] = useState(null); // index of filter being edited
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [fieldSearch, setFieldSearch] = useState('');
  const [activeMiddleTab, setActiveMiddleTab] = useState('configure'); // 'configure' or 'filters'
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Chart data state
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);

  // Fields from API
  const [fieldsConfig, setFieldsConfig] = useState({ dimensions: [], measures: [] });
  const [fieldsLoading, setFieldsLoading] = useState(false);

  // Fetch fields when data source changes
  useEffect(() => {
    const fetchFields = async () => {
      setFieldsLoading(true);
      try {
        const response = await apiClient.get(`/api/v1/analytics/reports/fields?dataSource=${dataSource}`);

        const data = response.data?.data?.[dataSource] || { dimensions: [], measures: [] };

        // Map API response to expected format
        const mappedFields = {
          dimensions: (data.dimensions || []).map(d => ({
            key: d.key,
            label: d.label,
            type: d.dataType || 'text',
            group: d.group,
            isComputed: d.isComputed,
            options: d.options, // For enum fields
          })),
          measures: (data.measures || []).map(m => ({
            key: m.key,
            label: m.label,
            type: m.dataType || 'number',
            defaultAgg: m.defaultAggregation || 'COUNT',
            group: m.group,
            options: m.options, // For enum fields
          })),
        };
        setFieldsConfig(mappedFields);
      } catch (err) {
        console.error('[REPORT-BUILDER] Failed to fetch report fields:', err);
        // Keep existing fields on error
      } finally {
        setFieldsLoading(false);
      }
    };

    fetchFields();
  }, [dataSource]);

  // Global drag event listeners to track drag state and item
  useEffect(() => {
    const handleDragStart = (e) => {
      setIsDragging(true);
      // Try to get the dragged field data
      try {
        // We need to get this from the element's data since dataTransfer isn't accessible in dragstart on document
        const target = e.target;
        if (target.dataset?.fieldData) {
          setDraggedItem(JSON.parse(target.dataset.fieldData));
        }
      } catch {
        // Ignore parse errors
      }
    };
    const handleDragEnd = () => {
      setIsDragging(false);
      setDraggedItem(null);
    };

    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);

    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  // Get current field config from API
  const currentFields = useMemo(() => {
    return fieldsConfig;
  }, [fieldsConfig]);

  // Filter fields by search
  const filteredDimensions = useMemo(() => {
    if (!fieldSearch) return currentFields.dimensions;
    const search = fieldSearch.toLowerCase();
    return currentFields.dimensions.filter(f => f.label.toLowerCase().includes(search));
  }, [currentFields.dimensions, fieldSearch]);

  const filteredMeasures = useMemo(() => {
    if (!fieldSearch) return currentFields.measures;
    const search = fieldSearch.toLowerCase();
    return currentFields.measures.filter(f => f.label.toLowerCase().includes(search));
  }, [currentFields.measures, fieldSearch]);

  // Check if minimum requirements are met for current chart type
  const checkMinimumRequirements = useCallback(() => {
    const requirements = CHART_MINIMUM_REQUIREMENTS[chartType];
    if (!requirements) return { met: false, message: 'Unknown chart type' };

    for (const zoneName of requirements.required) {
      const value = zoneValues[zoneName];
      const def = DROP_ZONE_DEFINITIONS[zoneName];

      if (def?.multiple) {
        // For multi-value zones, need at least 1 item
        if (!value || !Array.isArray(value) || value.length === 0) {
          return { met: false, message: requirements.message };
        }
      } else {
        // For single-value zones, need a value
        if (!value) {
          return { met: false, message: requirements.message };
        }
      }
    }

    return { met: true, message: null };
  }, [chartType, zoneValues]);

  // Build query config from zone values
  const buildQueryConfig = useCallback(() => {
    const dimensions = [];
    const measures = [];

    // Collect dimensions from zone values
    const dimensionZones = ['xAxis', 'breakDownBy', 'stackBy', 'groupBy', 'category', 'stages', 'source', 'target', 'rows'];
    for (const zone of dimensionZones) {
      const value = zoneValues[zone];
      if (value) {
        if (Array.isArray(value)) {
          dimensions.push(...value.map(v => v.key));
        } else {
          dimensions.push(value.key);
        }
      }
    }

    // Collect measures from zone values
    const measureZones = ['yAxis', 'yAxis1', 'yAxis2', 'values', 'value', 'size', 'color', 'pointSize'];
    for (const zone of measureZones) {
      const value = zoneValues[zone];
      if (value) {
        if (Array.isArray(value)) {
          measures.push(...value.map(v => ({ field: v.key })));
        } else {
          measures.push({ field: value.key });
        }
      }
    }

    // For table view, columns can be both dimensions and measures
    if (chartType === 'table' && zoneValues.columns) {
      const cols = zoneValues.columns;
      // Clear and rebuild - columns go to dimensions for grouping
      dimensions.length = 0;
      measures.length = 0;
      cols.forEach(col => {
        // Add to dimensions for grouping
        dimensions.push(col.key);
      });
      // Add record_count as default measure for tables
      if (measures.length === 0) {
        measures.push({ field: 'record_count' });
      }
    }

    return {
      dataSource,
      dimensions,
      measures,
      filters: filters.filter(f => f.field && f.value),
      dateRange,
    };
  }, [chartType, dataSource, zoneValues, filters, dateRange]);

  // Get requirements status
  const requirementsStatus = useMemo(() => checkMinimumRequirements(), [checkMinimumRequirements]);

  // Query mutation
  const queryMutation = useMutation({
    mutationFn: async (queryConfig) => {
      const response = await apiClient.post('/api/v1/analytics/reports/query', queryConfig);
      return response.data;
    },
    onSuccess: (response) => {
      const data = response.data || [];
      // Transform currency values from cents to dollars
      const transformed = data.map(row => {
        const newRow = { ...row };
        // Check all measure zones for currency types
        const measureZones = ['yAxis', 'yAxis1', 'yAxis2', 'values', 'value', 'size'];
        for (const zone of measureZones) {
          const field = zoneValues[zone];
          if (field?.type === 'currency' && newRow[field.key] !== undefined) {
            newRow[field.key] = newRow[field.key] / 100;
          }
          if (Array.isArray(field)) {
            field.forEach(f => {
              if (f?.type === 'currency' && newRow[f.key] !== undefined) {
                newRow[f.key] = newRow[f.key] / 100;
              }
            });
          }
        }
        return newRow;
      });
      setChartData(transformed);
      setError(null);
    },
    onError: (err) => {
      setError(err.message || 'Failed to fetch report data');
      setChartData([]);
    },
  });

  // Manual fetch data function
  const fetchData = useCallback(() => {
    if (!requirementsStatus.met) return;
    const config = buildQueryConfig();
    queryMutation.mutate(config);
  }, [requirementsStatus.met, buildQueryConfig, queryMutation]);

  // Auto-fetch when config changes (respects autoRefresh setting)
  useEffect(() => {
    // Don't fetch if requirements aren't met
    if (!requirementsStatus.met) {
      setChartData([]);
      return;
    }

    // Don't auto-fetch if autoRefresh is disabled
    if (!autoRefresh) return;

    const config = buildQueryConfig();
    queryMutation.mutate(config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    requirementsStatus.met,
    autoRefresh,
    chartType,
    dataSource,
    JSON.stringify(zoneValues),
    JSON.stringify(filters),
    dateRange.startDate,
    dateRange.endDate,
  ]);

  // Reset selections when data source changes
  useEffect(() => {
    setZoneValues({});
    setFilters([]);
    setChartData([]);
  }, [dataSource]);

  // Get active zones for current chart type
  const activeZones = useMemo(() => {
    return CHART_ZONE_CONFIG[chartType] || ['xAxis', 'yAxis', 'breakDownBy'];
  }, [chartType]);

  // Handle field click - adds to first empty zone that accepts it
  const handleFieldClick = (field, isDimension) => {
    for (const zoneName of activeZones) {
      const def = DROP_ZONE_DEFINITIONS[zoneName];
      if (!def) continue;

      const accepts = isDimension ? def.acceptsDimensions : def.acceptsMeasures;
      if (!accepts) continue;

      const currentValue = zoneValues[zoneName];
      if (def.multiple) {
        // Multi-zone: always add
        addToZone(zoneName, field);
        return;
      } else if (!currentValue) {
        // Single zone: add if empty
        addToZone(zoneName, field);
        return;
      }
    }
  };

  // Add filter
  // Get all filterable fields (dimensions + some measures)
  const allFilterableFields = useMemo(() => {
    return [...currentFields.dimensions, ...currentFields.measures];
  }, [currentFields]);

  // Get field by key
  const getFieldByKey = useCallback((key) => {
    return allFilterableFields.find(f => f.key === key);
  }, [allFilterableFields]);

  // Add filter - optionally with a pre-selected field
  const addFilter = (field = null) => {
    const defaultOperator = field
      ? getOperatorsForType(field.type)[0].value
      : 'is';

    const newFilter = {
      field: field?.key || '',
      operator: defaultOperator,
      value: '',
    };

    setFilters([...filters, newFilter]);
    // Open editor for the new filter
    setEditingFilterIndex(filters.length);
  };

  // Add filter from drag & drop
  const addFilterFromDrop = (field) => {
    addFilter(field);
    setActiveMiddleTab('filters'); // Switch to filters tab
  };

  // Update filter
  const updateFilter = (index, updates) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  // Remove filter
  const removeFilter = (index) => {
    setFilters(filters.filter((_, i) => i !== index));
    setEditingFilterIndex(null);
  };

  // Save report to API
  const saveReport = async () => {
    try {
      const config = {
        xAxis,
        yAxis,
        breakdown: groupBy,
        filters,
        dateRange,
      };

      await apiClient.post('/api/v1/analytics/reports/saved', {
        name: reportName,
        description: '', // Could add a description field later
        dataSource,
        chartType,
        config,
      });

      alert('Report saved successfully!');
    } catch (err) {
      console.error('Failed to save report:', err);
      alert('Failed to save report: ' + (err.message || 'Unknown error'));
    }
  };

  // Export as CSV
  const exportCSV = () => {
    if (!chartData.length) return;

    const headers = Object.keys(chartData[0]);
    const csv = [
      headers.join(','),
      ...chartData.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format value for display
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    if (type === 'currency') return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  // Get data key for chart
  const dataKey = yAxis?.key || 'count';
  const nameKey = xAxis?.key || 'name';

  // Get current data source info
  const currentDataSource = DATA_SOURCES.find(ds => ds.value === dataSource);

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px] -mt-3">
      {/* Top Bar - enterprise style */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a2433] dark:bg-[#1a2433] border-b border-[#2d3e50]">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="h-8 px-3 text-white/80 hover:text-white hover:bg-white/10"
          >
            Exit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reports')}
            className="h-8 px-3 border-white/20 text-white/80 hover:text-white hover:bg-white/10"
          >
            Back
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="text-base font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-white text-center min-w-[200px]"
            placeholder="Enter report name"
          />
          <button className="text-white/60 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 border-white/20 text-white/80 hover:text-white hover:bg-white/10"
          >
            Sample reports
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={saveReport}
            className="h-8 px-4"
          >
            Save report
          </Button>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Data Sources & Fields */}
        <div className="w-56 border-r border-border bg-white dark:bg-surface-secondary flex flex-col overflow-hidden">
          {/* Edit Data Sources Link */}
          <div className="px-3 py-2 border-b border-border">
            <button className="text-xs text-primary hover:text-primary-dark flex items-center gap-1">
              Edit data sources
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          {/* Data Source Count */}
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-text">1 data source</p>
          </div>

          {/* Search Across Sources */}
          <div className="px-3 py-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search across sources"
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-secondary dark:bg-surface-primary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Browse Data Source Dropdown */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Browse:</span>
              <StyledSelect
                options={DATA_SOURCES.map(ds => ({ value: ds.value, label: ds.label }))}
                value={dataSource}
                onChange={(opt) => setDataSource(opt?.value || 'bookings')}
                isClearable={false}
                isSearchable={false}
                className="flex-1"
              />
            </div>
          </div>

          {/* Field Lists - Collapsible Groups */}
          <div className="flex-1 overflow-y-auto">
            {fieldsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 text-muted animate-spin" />
                <span className="ml-2 text-xs text-muted">Loading fields...</span>
              </div>
            ) : (
            <>
            {/* Default Measures */}
            <CollapsibleFieldGroup
              title="Measures"
              defaultOpen={true}
              count={filteredMeasures.length}
            >
              <div className="px-1 group">
                {filteredMeasures.map((field) => (
                  <DraggableField
                    key={field.key}
                    field={field}
                    isDimension={false}
                    isSelected={yAxis?.key === field.key}
                    onClick={() => handleFieldClick(field, false)}
                  />
                ))}
                {filteredMeasures.length === 0 && (
                  <p className="text-xs text-muted px-3 py-2">No measures found</p>
                )}
              </div>
            </CollapsibleFieldGroup>

            {/* Top Properties (Dimensions) */}
            <CollapsibleFieldGroup
              title="Top properties"
              defaultOpen={true}
              count={Math.min(filteredDimensions.length, 3)}
            >
              <div className="px-1 group">
                {filteredDimensions.slice(0, 3).map((field) => (
                  <DraggableField
                    key={field.key}
                    field={field}
                    isDimension={true}
                    isSelected={xAxis?.key === field.key || groupBy?.key === field.key || compareBy?.key === field.key}
                    onClick={() => handleFieldClick(field, true)}
                  />
                ))}
              </div>
            </CollapsibleFieldGroup>

            {/* All Fields */}
            <CollapsibleFieldGroup
              title={currentDataSource?.label || 'Fields'}
              icon={currentDataSource?.icon}
              defaultOpen={true}
              count={filteredDimensions.length}
            >
              <div className="px-1 group">
                {filteredDimensions.map((field) => (
                  <DraggableField
                    key={field.key}
                    field={field}
                    isDimension={true}
                    isSelected={xAxis?.key === field.key || groupBy?.key === field.key || compareBy?.key === field.key}
                    onClick={() => handleFieldClick(field, true)}
                  />
                ))}
                {filteredDimensions.length === 0 && (
                  <p className="text-xs text-muted px-3 py-2">No fields found</p>
                )}
              </div>
            </CollapsibleFieldGroup>
            </>
            )}
          </div>
        </div>

        {/* MIDDLE PANEL - Configure/Filters Tabs + Drop Zones */}
        <div className="w-80 border-r border-border bg-white dark:bg-surface-primary flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveMiddleTab('configure')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                activeMiddleTab === 'configure'
                  ? "text-primary"
                  : "text-muted hover:text-text"
              )}
            >
              Configure
              {activeMiddleTab === 'configure' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveMiddleTab('filters')}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium transition-colors relative",
                activeMiddleTab === 'filters'
                  ? "text-primary"
                  : "text-muted hover:text-text"
              )}
            >
              Filters ({filters.length})
              {activeMiddleTab === 'filters' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {activeMiddleTab === 'configure' ? (
            <div className="flex-1 overflow-y-auto">
              {/* Chart Section Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium text-text">Chart</span>
                <button className="text-xs text-primary hover:text-primary-dark">
                  Chart settings
                </button>
              </div>

              {/* Chart Type Grid - 4, 4, 5 layout */}
              <div className="px-4 py-3 border-b border-border space-y-1">
                {/* Row 1: 4 items */}
                <div className="grid grid-cols-4 gap-1">
                  {CHART_TYPES.slice(0, 4).map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setChartType(ct.value)}
                      title={ct.label}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition-all",
                        chartType === ct.value
                          ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                          : "text-muted hover:bg-surface-hover hover:text-text"
                      )}
                    >
                      <ct.icon className="h-4.5 w-4.5 mb-0.5" />
                      <span className={cn(
                        "text-[10px] leading-tight",
                        chartType === ct.value ? "text-primary" : "text-muted"
                      )}>
                        {ct.label}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Row 2: 4 items */}
                <div className="grid grid-cols-4 gap-1">
                  {CHART_TYPES.slice(4, 8).map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setChartType(ct.value)}
                      title={ct.label}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition-all",
                        chartType === ct.value
                          ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                          : "text-muted hover:bg-surface-hover hover:text-text"
                      )}
                    >
                      <ct.icon className="h-4.5 w-4.5 mb-0.5" />
                      <span className={cn(
                        "text-[10px] leading-tight",
                        chartType === ct.value ? "text-primary" : "text-muted"
                      )}>
                        {ct.label}
                      </span>
                    </button>
                  ))}
                </div>
                {/* Row 3: 5 items */}
                <div className="grid grid-cols-5 gap-1">
                  {CHART_TYPES.slice(8).map((ct) => (
                    <button
                      key={ct.value}
                      onClick={() => setChartType(ct.value)}
                      title={ct.label}
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 px-1 rounded-md transition-all",
                        chartType === ct.value
                          ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                          : "text-muted hover:bg-surface-hover hover:text-text"
                      )}
                    >
                      <ct.icon className="h-4.5 w-4.5 mb-0.5" />
                      <span className={cn(
                        "text-[10px] leading-tight",
                        chartType === ct.value ? "text-primary" : "text-muted"
                      )}>
                        {ct.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toolbar - Undo/Redo/Refresh */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
                <button className="px-2 py-1 text-xs text-muted hover:text-text border border-border rounded hover:bg-surface-hover">
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button className="px-2 py-1 text-xs text-muted hover:text-text border border-border rounded hover:bg-surface-hover">
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={fetchData}
                  disabled={!requirementsStatus.met || queryMutation.isPending}
                  title={!requirementsStatus.met ? requirementsStatus.message : 'Refresh data'}
                  className={cn(
                    "px-2 py-1 text-xs border border-border rounded transition-colors",
                    requirementsStatus.met
                      ? "text-muted hover:text-text hover:bg-surface-hover"
                      : "text-muted/50 cursor-not-allowed"
                  )}
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", queryMutation.isPending && "animate-spin")} />
                </button>
                <label className="flex items-center gap-2 ml-auto text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-border"
                  />
                  Refresh as I make changes
                </label>
              </div>

              {/* Dynamic Drop Zones based on chart type */}
              <div className="px-4 py-4 space-y-1">
                {activeZones.map((zoneName) => {
                  const def = DROP_ZONE_DEFINITIONS[zoneName];
                  if (!def) return null;

                  const value = zoneValues[zoneName];
                  const isMultiple = def.multiple;

                  return (
                    <DropZone
                      key={zoneName}
                      label={def.label}
                      tooltip={def.tooltip}
                      field={isMultiple ? undefined : value}
                      fields={isMultiple ? (value || []) : undefined}
                      onRemove={isMultiple ? (index) => removeFromZone(zoneName, index) : () => removeFromZone(zoneName)}
                      onDrop={(droppedField) => addToZone(zoneName, droppedField)}
                      onReorder={isMultiple ? (from, to) => reorderInZone(zoneName, from, to) : undefined}
                      placeholder={def.placeholder}
                      acceptsDateOnly={def.acceptsDateOnly || false}
                      acceptsDimensions={def.acceptsDimensions}
                      acceptsMeasures={def.acceptsMeasures}
                      multiple={isMultiple}
                      isDragging={isDragging}
                      draggedItem={draggedItem}
                    />
                  );
                })}

                {/* Additional Fields zone - always shown */}
                <DropZone
                  label={DROP_ZONE_DEFINITIONS.fields.label}
                  tooltip={DROP_ZONE_DEFINITIONS.fields.tooltip}
                  fields={zoneValues.fields || []}
                  onRemove={(index) => removeFromZone('fields', index)}
                  onDrop={(droppedField) => addToZone('fields', droppedField)}
                  onReorder={(from, to) => reorderInZone('fields', from, to)}
                  placeholder={DROP_ZONE_DEFINITIONS.fields.placeholder}
                  acceptsDimensions={true}
                  acceptsMeasures={true}
                  multiple={true}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                />

                {/* Date Range in Configure tab */}
                <div className="mb-4 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-medium text-text">Date Range</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.startDate || ''}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs bg-surface-secondary dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="date"
                      value={dateRange.endDate || ''}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs bg-surface-secondary dark:bg-surface-primary border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Filters Tab - enterprise style */
            <div className="flex-1 overflow-y-auto">
              {/* ALL/ANY Toggle */}
              <div className="px-4 py-3 border-b border-border bg-surface-secondary/50">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted">Include data if it matches</span>
                  <select
                    value={filterMode}
                    onChange={(e) => setFilterMode(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-surface-primary border border-border rounded-md font-medium text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="all">ALL</option>
                    <option value="any">ANY</option>
                  </select>
                  <span className="text-muted">of the filters below</span>
                </div>
              </div>

              <div className="p-4">
                {/* Active Filter Pills */}
                {filters.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-text">Active filters</span>
                      <span className="text-[10px] text-muted bg-surface-hover px-1.5 py-0.5 rounded">
                        {filters.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 relative">
                      {filters.map((filter, index) => {
                        const field = getFieldByKey(filter.field);
                        return (
                          <div key={index} className="relative">
                            <FilterPill
                              filter={filter}
                              field={field}
                              onClick={() => setEditingFilterIndex(editingFilterIndex === index ? null : index)}
                              onRemove={() => removeFilter(index)}
                            />
                            {/* Inline Editor Popover */}
                            {editingFilterIndex === index && (
                              <FilterEditorPopover
                                filter={filter}
                                field={field}
                                allFields={allFilterableFields}
                                onUpdate={(updated) => updateFilter(index, updated)}
                                onClose={() => setEditingFilterIndex(null)}
                                onRemove={() => removeFilter(index)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Filter Drop Zone */}
                <div className="mb-4">
                  <FilterDropZone
                    onDrop={addFilterFromDrop}
                    isDragging={isDragging}
                    draggedItem={draggedItem}
                  />
                </div>

                {/* Add Filter Button */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addFilter()}
                    className="h-8 px-3 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add filter
                  </Button>
                  {filters.length > 0 && (
                    <button
                      onClick={() => setFilters([])}
                      className="text-xs text-muted hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Quick Filters Suggestions */}
                {filters.length === 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-medium text-muted mb-3">Suggested filters</p>
                    <div className="space-y-1">
                      {currentFields.dimensions.slice(0, 5).map((field) => (
                        <button
                          key={field.key}
                          onClick={() => addFilter(field)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-md hover:bg-surface-hover transition-colors"
                        >
                          <FieldTypeIcon type={field.type} />
                          <span className="text-text">{field.label}</span>
                          <Plus className="h-3 w-3 ml-auto text-muted" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Chart Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-secondary dark:bg-surface-primary">
          {/* Preview Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-secondary border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex rounded-md border border-border overflow-hidden">
                <button className="px-3 py-1.5 text-xs bg-surface-hover text-text">
                  Unsummarized data
                </button>
                <button className="px-3 py-1.5 text-xs text-muted hover:text-text hover:bg-surface-hover">
                  Summarized data
                </button>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={!chartData.length}
              className="h-7 px-3 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export unsummarized data
            </Button>
          </div>

          {/* Chart Area */}
          <div className="flex-1 p-6 overflow-auto bg-white dark:bg-surface-primary">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {!requirementsStatus.met ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                    <BarChart3 className="h-10 w-10 text-muted" />
                  </div>
                  <h3 className="text-base font-medium text-text mb-2">Configure your report</h3>
                  <p className="text-sm text-muted">
                    {requirementsStatus.message}
                  </p>
                </div>
              </div>
            ) : queryMutation.isPending ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-10 w-10 text-primary animate-spin mx-auto mb-3" />
                  <p className="text-sm text-muted">Loading data...</p>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                    <BarChart3 className="h-10 w-10 text-muted" />
                  </div>
                  <h3 className="text-base font-medium text-text mb-2">No Data</h3>
                  <p className="text-sm text-muted">
                    No data matches your current configuration. Try adjusting your date range or filters.
                  </p>
                </div>
              </div>
            ) : chartType === 'table' || chartType === 'pivot' ? (
              <div className="overflow-auto max-h-full rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-secondary sticky top-0">
                    <tr>
                      {Object.keys(chartData[0] || {}).map(key => (
                        <th key={key} className="px-4 py-3 text-left font-medium text-muted uppercase text-xs tracking-wide border-b border-border">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-surface-primary">
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-surface-hover transition-colors">
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} className="px-4 py-3 text-text">
                            {formatValue(value, key === yAxis?.key ? yAxis?.type : 'text')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bb-color-chart-grid)" strokeOpacity={0.4} />
                    <XAxis
                      dataKey={nameKey}
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      tickLine={{ stroke: 'var(--bb-color-chart-axis)' }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      tickLine={{ stroke: 'var(--bb-color-chart-axis)' }}
                      tickFormatter={(v) => yAxis?.type === 'currency' ? `$${v}` : v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                    <Bar dataKey={dataKey} fill={chartColorSequence[0]} radius={[4, 4, 0, 0]} name={yAxis?.label || dataKey} />
                  </BarChart>
                ) : chartType === 'column' ? (
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bb-color-chart-grid)" strokeOpacity={0.4} />
                    <XAxis
                      type="number"
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => yAxis?.type === 'currency' ? `$${v}` : v.toLocaleString()}
                    />
                    <YAxis
                      dataKey={nameKey}
                      type="category"
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                    <Bar dataKey={dataKey} fill={chartColorSequence[0]} radius={[0, 4, 4, 0]} name={yAxis?.label || dataKey} />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bb-color-chart-grid)" strokeOpacity={0.4} />
                    <XAxis
                      dataKey={nameKey}
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => yAxis?.type === 'currency' ? `$${v}` : v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={dataKey}
                      stroke={chartColorSequence[0]}
                      strokeWidth={2}
                      dot={{ fill: chartColorSequence[0], r: 4 }}
                      name={yAxis?.label || dataKey}
                    />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bb-color-chart-grid)" strokeOpacity={0.4} />
                    <XAxis
                      dataKey={nameKey}
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => yAxis?.type === 'currency' ? `$${v}` : v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey={dataKey}
                      stroke={chartColorSequence[0]}
                      fill={chartColorSequence[0]}
                      fillOpacity={0.3}
                      name={yAxis?.label || dataKey}
                    />
                  </AreaChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey={dataKey}
                      nameKey={nameKey}
                      cx="50%"
                      cy="50%"
                      outerRadius={140}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: 'var(--bb-color-text-muted)' }}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColorSequence[index % chartColorSequence.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                  </PieChart>
                ) : chartType === 'donut' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey={dataKey}
                      nameKey={nameKey}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: 'var(--bb-color-text-muted)' }}
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={chartColorSequence[index % chartColorSequence.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                  </PieChart>
                ) : chartType === 'treemap' ? (
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bb-color-chart-grid)" strokeOpacity={0.4} />
                    <XAxis
                      dataKey={nameKey}
                      type="category"
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                    />
                    <YAxis
                      dataKey={dataKey}
                      stroke="var(--bb-color-chart-axis)"
                      tick={{ fill: 'var(--bb-color-text-muted)', fontSize: 11 }}
                      tickFormatter={(v) => yAxis?.type === 'currency' ? `$${v}` : v.toLocaleString()}
                    />
                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      formatter={(value) => formatValue(value, yAxis?.type)}
                    />
                    <Legend />
                    <Scatter name={yAxis?.label || dataKey} data={chartData} fill={chartColorSequence[0]} />
                  </ScatterChart>
                ) : null}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
