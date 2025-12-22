/**
 * CustomReportBuilder - Functional custom report builder
 * 3-column layout: Data sources | Live Preview | Configuration
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
  GripVertical,
  Hash,
  Type,
  Calendar,
  Search,
  ChevronDown,
  Users,
  PawPrint,
  CalendarDays,
  Wrench,
  CreditCard,
  UserCog,
  Settings,
  Trash2,
  RefreshCw,
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

const FIELD_CONFIG = {
  owners: {
    dimensions: [
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'source', label: 'Lead Source', type: 'text' },
      { key: 'created_month', label: 'Signup Month', type: 'date' },
      { key: 'created_date', label: 'Signup Date', type: 'date' },
    ],
    measures: [
      { key: 'count', label: 'Count', type: 'number', defaultAgg: 'COUNT' },
    ],
  },
  pets: {
    dimensions: [
      { key: 'species', label: 'Species', type: 'text' },
      { key: 'breed', label: 'Breed', type: 'text' },
      { key: 'size', label: 'Size', type: 'text' },
      { key: 'gender', label: 'Gender', type: 'text' },
      { key: 'age_range', label: 'Age Range', type: 'text' },
      { key: 'fixed', label: 'Fixed Status', type: 'text' },
    ],
    measures: [
      { key: 'count', label: 'Count', type: 'number', defaultAgg: 'COUNT' },
    ],
  },
  bookings: {
    dimensions: [
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'service_type', label: 'Service Type', type: 'text' },
      { key: 'booking_date', label: 'Booking Date', type: 'date' },
      { key: 'booking_month', label: 'Booking Month', type: 'date' },
      { key: 'booking_dow', label: 'Day of Week', type: 'text' },
      { key: 'created_date', label: 'Created Date', type: 'date' },
    ],
    measures: [
      { key: 'count', label: 'Count', type: 'number', defaultAgg: 'COUNT' },
      { key: 'revenue', label: 'Revenue', type: 'currency', defaultAgg: 'SUM' },
      { key: 'avg_revenue', label: 'Avg Revenue', type: 'currency', defaultAgg: 'AVG' },
    ],
  },
  services: {
    dimensions: [
      { key: 'name', label: 'Service Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'is_active', label: 'Status', type: 'text' },
    ],
    measures: [
      { key: 'count', label: 'Count', type: 'number', defaultAgg: 'COUNT' },
      { key: 'avg_price', label: 'Avg Price', type: 'currency', defaultAgg: 'AVG' },
      { key: 'total_bookings', label: 'Total Bookings', type: 'number', defaultAgg: 'SUM' },
    ],
  },
  payments: {
    dimensions: [
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'payment_method', label: 'Payment Method', type: 'text' },
      { key: 'payment_date', label: 'Payment Date', type: 'date' },
      { key: 'payment_month', label: 'Payment Month', type: 'date' },
    ],
    measures: [
      { key: 'count', label: 'Count', type: 'number', defaultAgg: 'COUNT' },
      { key: 'total', label: 'Total Amount', type: 'currency', defaultAgg: 'SUM' },
      { key: 'avg_amount', label: 'Avg Amount', type: 'currency', defaultAgg: 'AVG' },
    ],
  },
  staff: {
    dimensions: [
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'hire_month', label: 'Hire Month', type: 'date' },
    ],
    measures: [
      { key: 'count', label: 'Count', type: 'number', defaultAgg: 'COUNT' },
    ],
  },
};

const CHART_TYPES = [
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChartIcon },
  { value: 'pie', label: 'Pie', icon: PieChartIcon },
  { value: 'area', label: 'Area', icon: TrendingUp },
  { value: 'table', label: 'Table', icon: Table2 },
];

const AGGREGATION_OPTIONS = [
  { value: 'COUNT', label: 'Count' },
  { value: 'SUM', label: 'Sum' },
  { value: 'AVG', label: 'Average' },
  { value: 'MIN', label: 'Min' },
  { value: 'MAX', label: 'Max' },
];

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
// FIELD TYPE ICONS
// =============================================================================

const FieldTypeIcon = ({ type }) => {
  switch (type) {
    case 'number':
    case 'currency':
      return <Hash className="h-3 w-3 text-blue-500" />;
    case 'date':
      return <Calendar className="h-3 w-3 text-amber-500" />;
    default:
      return <Type className="h-3 w-3 text-gray-500" />;
  }
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
  const [groupBy, setGroupBy] = useState(null); // optional second dimension
  const [filters, setFilters] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [fieldSearch, setFieldSearch] = useState('');

  // Chart data state
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);

  // Get current field config
  const currentFields = useMemo(() => {
    return FIELD_CONFIG[dataSource] || { dimensions: [], measures: [] };
  }, [dataSource]);

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
    }
  };

  // Add filter
  const addFilter = () => {
    setFilters([...filters, { field: '', operator: '=', value: '' }]);
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
  };

  // Save report to localStorage
  const saveReport = () => {
    const report = {
      id: `report-${Date.now()}`,
      name: reportName,
      dataSource,
      chartType,
      xAxis,
      yAxis,
      groupBy,
      filters,
      dateRange,
      savedAt: new Date().toISOString(),
    };

    const savedReports = JSON.parse(localStorage.getItem('barkbase_saved_reports') || '[]');
    savedReports.push(report);
    localStorage.setItem('barkbase_saved_reports', JSON.stringify(savedReports));
    alert('Report saved!');
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

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[600px] -mt-3">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-surface-primary border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/reports')}
            className="h-7 px-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <input
            type="text"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-text w-48"
            placeholder="Report Name"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={fetchData}>
            <RefreshCw className={cn("h-3 w-3 mr-1", queryMutation.isPending && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2" onClick={exportCSV} disabled={!chartData.length}>
            <Download className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
          <Button variant="primary" size="sm" className="h-7 px-2" onClick={saveReport}>
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Main Content - 3 Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL - Data Sources & Fields */}
        <div className="w-56 border-r border-border bg-surface-secondary dark:bg-surface-secondary flex flex-col overflow-hidden">
          {/* Data Source Selector */}
          <div className="p-2 border-b border-border">
            <label className="text-[10px] uppercase text-muted font-medium mb-1 block">Data Source</label>
            <StyledSelect
              options={DATA_SOURCES.map(ds => ({ value: ds.value, label: ds.label }))}
              value={dataSource}
              onChange={(opt) => setDataSource(opt?.value || 'bookings')}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          {/* Field Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted" />
              <input
                type="text"
                placeholder="Search fields..."
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs bg-white dark:bg-surface-primary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Field Lists */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* Dimensions */}
            <div>
              <div className="text-[10px] uppercase text-muted font-medium mb-1 flex items-center gap-1">
                <GripVertical className="h-3 w-3" />
                Dimensions (Group By)
              </div>
              <div className="space-y-0.5">
                {filteredDimensions.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => handleFieldClick(field, true)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-surface-hover text-left transition-colors",
                      (xAxis?.key === field.key || groupBy?.key === field.key) && "bg-primary/10 text-primary"
                    )}
                  >
                    <FieldTypeIcon type={field.type} />
                    <span className="truncate">{field.label}</span>
                  </button>
                ))}
                {filteredDimensions.length === 0 && (
                  <p className="text-[10px] text-muted py-2">No dimensions found</p>
                )}
              </div>
            </div>

            {/* Measures */}
            <div>
              <div className="text-[10px] uppercase text-muted font-medium mb-1 flex items-center gap-1">
                <Hash className="h-3 w-3" />
                Measures (Aggregate)
              </div>
              <div className="space-y-0.5">
                {filteredMeasures.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => handleFieldClick(field, false)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-surface-hover text-left transition-colors",
                      yAxis?.key === field.key && "bg-primary/10 text-primary"
                    )}
                  >
                    <FieldTypeIcon type={field.type} />
                    <span className="truncate">{field.label}</span>
                  </button>
                ))}
                {filteredMeasures.length === 0 && (
                  <p className="text-[10px] text-muted py-2">No measures found</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER PANEL - Chart Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-surface-primary">
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 p-2 border-b border-border">
            {CHART_TYPES.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setChartType(ct.value)}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
                  chartType === ct.value
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-surface-hover"
                )}
              >
                <ct.icon className="h-3.5 w-3.5" />
                {ct.label}
              </button>
            ))}
          </div>

          {/* Chart Area */}
          <div className="flex-1 p-4 overflow-auto">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {!xAxis || !yAxis ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <Settings className="h-12 w-12 text-muted mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-text mb-1">Configure Your Report</h3>
                  <p className="text-xs text-muted">
                    Select a dimension for the X-Axis and a measure for the Y-Axis from the left panel to see your chart.
                  </p>
                </div>
              </div>
            ) : queryMutation.isPending ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
                  <p className="text-xs text-muted">Loading data...</p>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <BarChart3 className="h-12 w-12 text-muted mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-text mb-1">No Data</h3>
                  <p className="text-xs text-muted">
                    No data matches your current filters. Try adjusting your date range or filters.
                  </p>
                </div>
              </div>
            ) : chartType === 'table' ? (
              <div className="overflow-auto max-h-full">
                <table className="w-full text-xs">
                  <thead className="bg-surface-secondary">
                    <tr>
                      {Object.keys(chartData[0] || {}).map(key => (
                        <th key={key} className="px-3 py-2 text-left font-medium text-muted uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((row, i) => (
                      <tr key={i} className="border-b border-border hover:bg-surface-hover">
                        {Object.entries(row).map(([key, value]) => (
                          <td key={key} className="px-3 py-2 text-text">
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
                      outerRadius={120}
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
                ) : null}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Configuration */}
        <div className="w-64 border-l border-border bg-surface-secondary dark:bg-surface-secondary flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border">
            <h3 className="text-xs font-semibold text-text uppercase">Configure Chart</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-3">
            {/* X-Axis */}
            <div>
              <label className="text-[10px] uppercase text-muted font-medium mb-1 block">X-Axis (Dimension)</label>
              <div className="min-h-[36px] p-2 bg-white dark:bg-surface-primary border border-dashed border-border rounded">
                {xAxis ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FieldTypeIcon type={xAxis.type} />
                      <span className="text-xs text-text">{xAxis.label}</span>
                    </div>
                    <button onClick={() => removeField('xAxis')} className="text-muted hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted text-center">Click a dimension to add</p>
                )}
              </div>
            </div>

            {/* Y-Axis */}
            <div>
              <label className="text-[10px] uppercase text-muted font-medium mb-1 block">Y-Axis (Measure)</label>
              <div className="min-h-[36px] p-2 bg-white dark:bg-surface-primary border border-dashed border-border rounded">
                {yAxis ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FieldTypeIcon type={yAxis.type} />
                      <span className="text-xs text-text">{yAxis.label}</span>
                    </div>
                    <button onClick={() => removeField('yAxis')} className="text-muted hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted text-center">Click a measure to add</p>
                )}
              </div>
            </div>

            {/* Group By */}
            <div>
              <label className="text-[10px] uppercase text-muted font-medium mb-1 block">Group By (Optional)</label>
              <div className="min-h-[36px] p-2 bg-white dark:bg-surface-primary border border-dashed border-border rounded">
                {groupBy ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <FieldTypeIcon type={groupBy.type} />
                      <span className="text-xs text-text">{groupBy.label}</span>
                    </div>
                    <button onClick={() => removeField('groupBy')} className="text-muted hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted text-center">Click another dimension</p>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="text-[10px] uppercase text-muted font-medium mb-1 block">Date Range</label>
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={dateRange.startDate || ''}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-primary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={dateRange.endDate || ''}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="w-full px-2 py-1 text-xs bg-white dark:bg-surface-primary border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="End Date"
                />
              </div>
            </div>

            {/* Filters */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase text-muted font-medium">Filters</label>
                <button onClick={addFilter} className="text-primary hover:text-primary-dark">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                {filters.length === 0 && (
                  <p className="text-[10px] text-muted text-center py-2">No filters added</p>
                )}
                {filters.map((filter, index) => (
                  <div key={index} className="p-2 bg-white dark:bg-surface-primary border border-border rounded space-y-1.5">
                    <div className="flex items-center justify-between">
                      <select
                        value={filter.field}
                        onChange={(e) => updateFilter(index, { field: e.target.value })}
                        className="flex-1 px-1 py-0.5 text-[10px] bg-transparent border border-border rounded focus:outline-none"
                      >
                        <option value="">Select field...</option>
                        {currentFields.dimensions.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <button onClick={() => removeFilter(index)} className="ml-1 text-muted hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <select
                        value={filter.operator}
                        onChange={(e) => updateFilter(index, { operator: e.target.value })}
                        className="w-24 px-1 py-0.5 text-[10px] bg-transparent border border-border rounded focus:outline-none"
                      >
                        {FILTER_OPERATORS.map(op => (
                          <option key={op.value} value={op.value}>{op.label}</option>
                        ))}
                      </select>
                      {!['is_null', 'is_not_null'].includes(filter.operator) && (
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          className="flex-1 px-1 py-0.5 text-[10px] bg-transparent border border-border rounded focus:outline-none"
                          placeholder="Value"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomReportBuilder;
