export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'security' | 'compliance' | 'performance' | 'threat-intel' | 'incident' | 'custom';
  type: 'dashboard' | 'chart' | 'table' | 'summary' | 'detailed';
  dataSources: string[];
  parameters: ReportParameter[];
  layout: ReportLayout;
  scheduleOptions: ScheduleOptions;
  exportFormats: ExportFormat[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
}

export interface ReportParameter {
  id: string;
  name: string;
  type: 'date-range' | 'dropdown' | 'multiselect' | 'text' | 'number' | 'boolean';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ReportLayout {
  type: 'grid' | 'single' | 'tabbed';
  sections: ReportSection[];
  styling: {
    theme: 'light' | 'dark' | 'auto';
    colors: string[];
    fontFamily?: string;
    fontSize?: number;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'image';
  position: { x: number; y: number; width: number; height: number };
  dataQuery: DataQuery;
  visualization: VisualizationConfig;
  filters?: ReportFilter[];
}

export interface DataQuery {
  source: string;
  query: string;
  parameters: Record<string, any>;
  aggregation?: {
    groupBy: string[];
    metrics: { field: string; operation: 'sum' | 'count' | 'avg' | 'max' | 'min' }[];
  };
  sorting?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
}

export interface VisualizationConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'funnel';
  xAxis?: { field: string; label?: string; type?: 'category' | 'numeric' | 'datetime' };
  yAxis?: { field: string; label?: string; type?: 'numeric' | 'percentage' };
  series?: { field: string; name: string; color?: string }[];
  options?: {
    showLegend?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    stackedBars?: boolean;
    fillArea?: boolean;
    smoothLines?: boolean;
  };
  tableConfig?: {
    columns: TableColumn[];
    pagination?: boolean;
    pageSize?: number;
    sorting?: boolean;
    filtering?: boolean;
  };
}

export interface TableColumn {
  field: string;
  header: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'severity' | 'status' | 'link';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  formatter?: string;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'between' | 'in' | 'not-in';
  value: any;
  label?: string;
}

export interface ScheduleOptions {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  timezone: string;
  recipients: string[];
  format: ExportFormat;
  includeData: boolean;
}

export interface ExportFormat {
  type: 'pdf' | 'excel' | 'csv' | 'png' | 'json' | 'html';
  options: {
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    includeCharts?: boolean;
    includeFilters?: boolean;
    compression?: boolean;
    quality?: number;
  };
}

export interface ReportExecution {
  id: string;
  templateId: string;
  parameters: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: ReportResult;
  error?: string;
  executedBy: string;
}

export interface ReportResult {
  data: ReportData[];
  metadata: {
    recordCount: number;
    executionTime: number;
    generatedAt: Date;
    parameters: Record<string, any>;
  };
  visualizations: GeneratedVisualization[];
  exports?: { format: string; url: string; size: number }[];
}

export interface ReportData {
  sectionId: string;
  data: any[];
  summary?: {
    totalRecords: number;
    aggregations?: Record<string, number>;
  };
}

export interface GeneratedVisualization {
  sectionId: string;
  type: string;
  config: any;
  data: any[];
  imageUrl?: string;
}

export interface ReportDashboard {
  id: string;
  name: string;
  description: string;
  reports: { templateId: string; position: { x: number; y: number; width: number; height: number } }[];
  refreshInterval: number;
  autoRefresh: boolean;
  lastRefresh?: Date;
  permissions: {
    viewers: string[];
    editors: string[];
    admins: string[];
  };
}

export interface ChartConfiguration {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap' | 'gauge' | 'treemap' | 'sankey';
  title: string;
  subtitle?: string;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  series: SeriesConfig[];
  legend: LegendConfig;
  tooltip: TooltipConfig;
  colors: string[];
  animations: boolean;
  responsive: boolean;
}

export interface AxisConfig {
  title: string;
  type: 'category' | 'numeric' | 'datetime' | 'logarithmic';
  position: 'top' | 'bottom' | 'left' | 'right';
  gridLines: boolean;
  tickInterval?: number;
  min?: number;
  max?: number;
  format?: string;
}

export interface SeriesConfig {
  name: string;
  field: string;
  type?: string;
  color?: string;
  thickness?: number;
  fillOpacity?: number;
  markers?: boolean;
  smooth?: boolean;
  stacked?: boolean;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  alignment: 'start' | 'center' | 'end';
  orientation: 'horizontal' | 'vertical';
}

export interface TooltipConfig {
  show: boolean;
  format: string;
  shared: boolean;
  followCursor: boolean;
}