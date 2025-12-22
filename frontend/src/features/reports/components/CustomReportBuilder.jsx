/**
 * CustomReportBuilder - HubSpot-style custom report builder
 * 3-column layout: Data sources/Fields | Configure/Filters | Chart Preview
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  TrendingUp,
  Table2,
  Filter as FilterIcon,
  ArrowLeft,
  Save,
  Download,
  X,
  Plus,
  Hash,
  Type,
  Calendar,
  Search,
  ChevronRight,
  ChevronDown,
  Users,
  PawPrint,
  CalendarDays,
  Wrench,
  CreditCard,
  UserCog,
  Trash2,
  RefreshCw,
  BarChart2,
  Activity,
  Circle,
  Layers,
  Grid3X3,
  Map,
  Gauge,
  Info,
  Undo2,
  Redo2,
  CheckSquare,
  ListFilter,
  Phone,
  AtSign,
  AlignLeft,
  FolderTree,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '@/components/ui/Button';
import StyledSelect from '@/components/ui/StyledSelect';
import { apiClient } from '@/lib/apiClient';
import { chartColorSequence } from '@/components/ui/charts/palette';
import { tooltipContentStyle } from '@/components/ui/charts/ChartTooltip';
import { cn } from '@/lib/cn';

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
  { value: 'gauge', label: 'Gauge', icon: Gauge },
];

const AGGREGATION_OPTIONS = [
  { value: 'COUNT', label: 'Count' },
  { value: 'SUM', label: 'Sum' },
  { value: 'AVG', label: 'Average' },
  { value: 'MIN', label: 'Min' },
  { value: 'MAX', label: 'Max' },
];

// HubSpot-style operators organized by field type
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
// DROP ZONE COMPONENT - With drag-and-drop support and validation
// =============================================================================

const DropZone = ({
  label,
  tooltip,
  field,
  onRemove,
  onDrop,
  placeholder,
  acceptsDateOnly = false,
  acceptsMeasures = false,
  acceptsDimensions = true,
  isDragging = false,
  draggedItem = null
}) => {
  const [isOver, setIsOver] = useState(false);

  // Check if the currently dragged item can be dropped here
  const canAcceptCurrentDrag = () => {
    if (!draggedItem || field) return false;

    const { field: dragField, isDimension } = draggedItem;

    if (acceptsDateOnly && dragField.type !== 'date') {
      return false;
    }
    if (acceptsMeasures && isDimension) {
      return false;
    }
    if (acceptsDimensions && !isDimension && !acceptsMeasures) {
      return false;
    }
    return true;
  };

  const isValidTarget = canAcceptCurrentDrag();

  const handleDragOver = (e) => {
    e.preventDefault();
    if (isValidTarget) {
      e.dataTransfer.dropEffect = 'copy';
      setIsOver(true);
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
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2">
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
          "min-h-[44px] rounded-lg border-2 border-dashed transition-all duration-200",
          field
            ? "border-primary/40 bg-primary/5"
            : isOver && isValidTarget
              ? "border-primary bg-primary/10 scale-[1.02]"
              : isDragging && isValidTarget
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-surface-secondary/50"
        )}
      >
        {field ? (
          <div className="flex items-center justify-between px-3 py-2.5">
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
          <div className="flex items-center justify-center px-3 py-2.5">
            <span className={cn(
              "text-xs transition-colors",
              isOver && isValidTarget ? "text-primary font-medium" : "text-muted"
            )}>
              {isOver && isValidTarget ? 'Drop here' : placeholder || 'Drag fields here'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// FILTER PILL COMPONENT - HubSpot-style filter chip
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
// FILTER EDITOR POPOVER - HubSpot-style inline editor
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
  const [xAxis, setXAxis] = useState(null); // dimension for x-axis
  const [yAxis, setYAxis] = useState(null); // measure for y-axis
  const [groupBy, setGroupBy] = useState(null); // optional second dimension (break down by)
  const [compareBy, setCompareBy] = useState(null); // optional date dimension for comparison
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
        console.log('[REPORT-BUILDER] Fetching fields for dataSource:', dataSource);
        const response = await apiClient.get(`/api/v1/analytics/reports/fields?dataSource=${dataSource}`);
        console.log('[REPORT-BUILDER] Raw API response:', response);
        console.log('[REPORT-BUILDER] response.data:', response.data);
        console.log('[REPORT-BUILDER] response.data?.data:', response.data?.data);
        console.log('[REPORT-BUILDER] response.data?.data?.[dataSource]:', response.data?.data?.[dataSource]);

        const data = response.data?.data?.[dataSource] || { dimensions: [], measures: [] };
        console.log('[REPORT-BUILDER] Extracted data:', data);

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
        console.log('[REPORT-BUILDER] Mapped fields:', mappedFields);
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
        if (yAxis?.type === 'currency' && newRow[yAxis.key] !== undefined) {
          newRow[yAxis.key] = newRow[yAxis.key] / 100;
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

  // Fetch data when config changes
  const fetchData = useCallback(() => {
    if (!xAxis || !yAxis) return;

    const dimensions = [xAxis.key];
    if (groupBy) dimensions.push(groupBy.key);

    const measures = [{ field: yAxis.key }];

    queryMutation.mutate({
      dataSource,
      dimensions,
      measures,
      filters: filters.filter(f => f.field && f.value),
      dateRange,
    });
  }, [dataSource, xAxis, yAxis, groupBy, filters, dateRange, queryMutation]);

  // Auto-fetch when config changes
  useEffect(() => {
    if (!xAxis || !yAxis) return;

    const dimensions = [xAxis.key];
    if (groupBy) dimensions.push(groupBy.key);

    const measures = [{ field: yAxis.key }];

    queryMutation.mutate({
      dataSource,
      dimensions,
      measures,
      filters: filters.filter(f => f.field && f.value),
      dateRange,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xAxis?.key, yAxis?.key, groupBy?.key, JSON.stringify(filters), dateRange.startDate, dateRange.endDate, dataSource]);

  // Reset selections when data source changes
  useEffect(() => {
    setXAxis(null);
    setYAxis(null);
    setGroupBy(null);
    setCompareBy(null);
    setFilters([]);
    setChartData([]);
  }, [dataSource]);

  // Handle field click
  const handleFieldClick = (field, isDimension) => {
    if (isDimension) {
      if (!xAxis) {
        setXAxis(field);
      } else if (!groupBy && field.key !== xAxis.key) {
        setGroupBy(field);
      }
    } else {
      setYAxis(field);
    }
  };

  // Remove field from config
  const removeField = (type) => {
    switch (type) {
      case 'xAxis':
        setXAxis(null);
        break;
      case 'yAxis':
        setYAxis(null);
        break;
      case 'groupBy':
        setGroupBy(null);
        break;
      case 'compareBy':
        setCompareBy(null);
        break;
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

      await apiClient.post('/analytics/reports/saved', {
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
      {/* Top Bar - HubSpot Style */}
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

              {/* Chart Type Grid - 2 rows of icons with labels */}
              <div className="px-4 py-3 border-b border-border">
                <div className="grid grid-cols-6 gap-1">
                  {CHART_TYPES.map((ct) => (
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
                  className="px-2 py-1 text-xs text-muted hover:text-text border border-border rounded hover:bg-surface-hover"
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

              {/* Drop Zones */}
              <div className="px-4 py-4 space-y-1">
                <DropZone
                  label="X-axis"
                  field={xAxis}
                  onRemove={() => removeField('xAxis')}
                  onDrop={(droppedField) => setXAxis(droppedField)}
                  placeholder="Drag dimension here"
                  acceptsDimensions={true}
                  acceptsMeasures={false}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                />

                <DropZone
                  label="Y-axis"
                  field={yAxis}
                  onRemove={() => removeField('yAxis')}
                  onDrop={(droppedField) => setYAxis(droppedField)}
                  placeholder="Drag measure here"
                  acceptsDimensions={false}
                  acceptsMeasures={true}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                />

                <DropZone
                  label="Break down by"
                  field={groupBy}
                  onRemove={() => removeField('groupBy')}
                  onDrop={(droppedField) => setGroupBy(droppedField)}
                  placeholder="Drag dimension here"
                  acceptsDimensions={true}
                  acceptsMeasures={false}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                />

                <DropZone
                  label="Compare by"
                  tooltip="Compare data across time periods"
                  field={compareBy}
                  onRemove={() => removeField('compareBy')}
                  onDrop={(droppedField) => setCompareBy(droppedField)}
                  placeholder="Drag date field here"
                  acceptsDateOnly={true}
                  isDragging={isDragging}
                  draggedItem={draggedItem}
                />

                {/* Date Range in Configure tab */}
                <div className="mb-4">
                  <div className="flex items-center gap-1.5 mb-2">
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
            /* Filters Tab - HubSpot Style */
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

            {!xAxis || !yAxis ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-24 h-24 mx-auto mb-4 bg-surface-secondary rounded-full flex items-center justify-center">
                    <BarChart3 className="h-10 w-10 text-muted" />
                  </div>
                  <p className="text-sm text-muted">
                    Add one 'x' field or one 'y' field to display the report.
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
