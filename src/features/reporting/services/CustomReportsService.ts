import { EventEmitter } from 'events';
import type {
  ReportTemplate,
  ReportExecution,
  ReportResult,
  ReportDashboard,
  ReportParameter,
  ExportFormat,
  ChartConfiguration,
  DataQuery
} from '../types/CustomReports';

export class CustomReportsService extends EventEmitter {
  private templates: Map<string, ReportTemplate> = new Map();
  private executions: Map<string, ReportExecution> = new Map();
  private dashboards: Map<string, ReportDashboard> = new Map();
  private dataCache: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'security-overview',
        name: 'Security Overview Report',
        description: 'Comprehensive security posture and threat landscape overview',
        category: 'security',
        type: 'dashboard',
        dataSources: ['siem', 'threat-intel', 'compliance'],
        parameters: [
          {
            id: 'timeRange',
            name: 'timeRange',
            type: 'dropdown',
            label: 'Time Range',
            required: true,
            defaultValue: '30d',
            options: [
              { label: 'Last 24 Hours', value: '24h' },
              { label: 'Last 7 Days', value: '7d' },
              { label: 'Last 30 Days', value: '30d' },
              { label: 'Last 90 Days', value: '90d' }
            ]
          },
          {
            id: 'severity',
            name: 'severity',
            type: 'multiselect',
            label: 'Severity Levels',
            required: false,
            defaultValue: ['critical', 'high'],
            options: [
              { label: 'Critical', value: 'critical' },
              { label: 'High', value: 'high' },
              { label: 'Medium', value: 'medium' },
              { label: 'Low', value: 'low' }
            ]
          }
        ],
        layout: {
          type: 'grid',
          sections: [
            {
              id: 'threat-trends',
              title: 'Threat Trends',
              type: 'chart',
              position: { x: 0, y: 0, width: 8, height: 6 },
              dataQuery: {
                source: 'siem',
                query: 'SELECT date, COUNT(*) as threats FROM alerts GROUP BY date ORDER BY date',
                parameters: {}
              },
              visualization: {
                chartType: 'line',
                xAxis: { field: 'date', label: 'Date', type: 'datetime' },
                yAxis: { field: 'threats', label: 'Number of Threats', type: 'numeric' },
                series: [{ field: 'threats', name: 'Threats', color: '#1976d2' }],
                options: { showLegend: true, showGrid: true, smoothLines: true }
              }
            },
            {
              id: 'severity-breakdown',
              title: 'Severity Breakdown',
              type: 'chart',
              position: { x: 8, y: 0, width: 4, height: 6 },
              dataQuery: {
                source: 'siem',
                query: 'SELECT severity, COUNT(*) as count FROM alerts GROUP BY severity',
                parameters: {}
              },
              visualization: {
                chartType: 'pie',
                series: [{ field: 'count', name: 'Count' }],
                options: { showLegend: true }
              }
            }
          ],
          styling: {
            theme: 'light',
            colors: ['#1976d2', '#dc004e', '#ed6c02', '#2e7d32', '#9c27b0']
          }
        },
        scheduleOptions: {
          enabled: false,
          frequency: 'daily',
          timezone: 'UTC',
          recipients: [],
          format: { type: 'pdf', options: { pageSize: 'A4', orientation: 'landscape' } },
          includeData: true
        },
        exportFormats: [
          { type: 'pdf', options: { pageSize: 'A4', orientation: 'landscape', includeCharts: true } },
          { type: 'excel', options: { includeCharts: true, compression: true } },
          { type: 'png', options: { quality: 100 } }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: true,
        tags: ['security', 'overview', 'threats']
      },
      {
        id: 'compliance-status',
        name: 'Compliance Status Report',
        description: 'Detailed compliance status across all frameworks',
        category: 'compliance',
        type: 'detailed',
        dataSources: ['compliance', 'audit'],
        parameters: [
          {
            id: 'frameworks',
            name: 'frameworks',
            type: 'multiselect',
            label: 'Compliance Frameworks',
            required: true,
            defaultValue: ['NIST', 'ISO27001'],
            options: [
              { label: 'NIST Cybersecurity Framework', value: 'NIST' },
              { label: 'ISO 27001', value: 'ISO27001' },
              { label: 'SOC 2', value: 'SOC2' },
              { label: 'PCI DSS', value: 'PCIDSS' }
            ]
          }
        ],
        layout: {
          type: 'single',
          sections: [
            {
              id: 'compliance-table',
              title: 'Compliance Controls Status',
              type: 'table',
              position: { x: 0, y: 0, width: 12, height: 12 },
              dataQuery: {
                source: 'compliance',
                query: 'SELECT * FROM compliance_controls WHERE framework IN (?)',
                parameters: {}
              },
              visualization: {
                tableConfig: {
                  columns: [
                    { field: 'framework', header: 'Framework', type: 'text', sortable: true },
                    { field: 'control_id', header: 'Control ID', type: 'text', sortable: true },
                    { field: 'control_name', header: 'Control Name', type: 'text', sortable: true },
                    { field: 'status', header: 'Status', type: 'status', sortable: true },
                    { field: 'last_assessment', header: 'Last Assessment', type: 'date', sortable: true }
                  ],
                  pagination: true,
                  pageSize: 50,
                  sorting: true,
                  filtering: true
                }
              }
            }
          ],
          styling: {
            theme: 'light',
            colors: ['#2e7d32', '#ed6c02', '#dc004e']
          }
        },
        scheduleOptions: {
          enabled: false,
          frequency: 'monthly',
          timezone: 'UTC',
          recipients: [],
          format: { type: 'excel', options: { includeCharts: false } },
          includeData: true
        },
        exportFormats: [
          { type: 'excel', options: { compression: true } },
          { type: 'pdf', options: { pageSize: 'A4', orientation: 'portrait' } }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: true,
        tags: ['compliance', 'audit', 'controls']
      },
      {
        id: 'incident-analysis',
        name: 'Incident Analysis Report',
        description: 'Detailed analysis of security incidents and response metrics',
        category: 'incident',
        type: 'detailed',
        dataSources: ['incidents', 'siem'],
        parameters: [
          {
            id: 'dateRange',
            name: 'dateRange',
            type: 'date-range',
            label: 'Date Range',
            required: true,
            defaultValue: { start: '30d-ago', end: 'now' }
          },
          {
            id: 'includeResolved',
            name: 'includeResolved',
            type: 'boolean',
            label: 'Include Resolved Incidents',
            required: false,
            defaultValue: true
          }
        ],
        layout: {
          type: 'tabbed',
          sections: [
            {
              id: 'incident-overview',
              title: 'Incident Overview',
              type: 'chart',
              position: { x: 0, y: 0, width: 12, height: 8 },
              dataQuery: {
                source: 'incidents',
                query: 'SELECT created_date, severity, status FROM incidents WHERE created_date BETWEEN ? AND ?',
                parameters: {}
              },
              visualization: {
                chartType: 'bar',
                xAxis: { field: 'created_date', label: 'Date', type: 'datetime' },
                yAxis: { field: 'count', label: 'Number of Incidents', type: 'numeric' },
                series: [
                  { field: 'critical', name: 'Critical', color: '#dc004e' },
                  { field: 'high', name: 'High', color: '#ed6c02' },
                  { field: 'medium', name: 'Medium', color: '#1976d2' },
                  { field: 'low', name: 'Low', color: '#2e7d32' }
                ],
                options: { stackedBars: true, showLegend: true }
              }
            }
          ],
          styling: {
            theme: 'light',
            colors: ['#dc004e', '#ed6c02', '#1976d2', '#2e7d32']
          }
        },
        scheduleOptions: {
          enabled: false,
          frequency: 'weekly',
          timezone: 'UTC',
          recipients: [],
          format: { type: 'pdf', options: { pageSize: 'A4', orientation: 'landscape' } },
          includeData: true
        },
        exportFormats: [
          { type: 'pdf', options: { pageSize: 'A4', orientation: 'landscape', includeCharts: true } },
          { type: 'excel', options: { includeCharts: true } }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        isPublic: true,
        tags: ['incidents', 'analysis', 'response']
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async createTemplate(template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: ReportTemplate = {
      ...template,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(id, newTemplate);
    this.emit('templateCreated', newTemplate);
    return id;
  }

  async updateTemplate(id: string, updates: Partial<ReportTemplate>): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      id,
      updatedAt: new Date()
    };

    this.templates.set(id, updatedTemplate);
    this.emit('templateUpdated', updatedTemplate);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    this.templates.delete(id);
    this.emit('templateDeleted', { id, template });
  }

  async getTemplate(id: string): Promise<ReportTemplate | null> {
    return this.templates.get(id) || null;
  }

  async listTemplates(category?: string, tags?: string[]): Promise<ReportTemplate[]> {
    const templates = Array.from(this.templates.values());
    
    return templates.filter(template => {
      if (category && template.category !== category) return false;
      if (tags && tags.length > 0 && !tags.some(tag => template.tags.includes(tag))) return false;
      return true;
    });
  }

  async executeReport(templateId: string, parameters: Record<string, any> = {}): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution: ReportExecution = {
      id: executionId,
      templateId,
      parameters,
      startTime: new Date(),
      status: 'running',
      progress: 0,
      executedBy: 'current-user'
    };

    this.executions.set(executionId, execution);
    this.emit('executionStarted', execution);

    this.processReportExecution(execution, template);
    
    return executionId;
  }

  private async processReportExecution(execution: ReportExecution, template: ReportTemplate): Promise<void> {
    try {
      const sections = template.layout.sections;
      const results: any[] = [];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        execution.progress = ((i + 1) / sections.length) * 100;
        this.executions.set(execution.id, execution);
        this.emit('executionProgress', execution);

        const data = await this.executeDataQuery(section.dataQuery, execution.parameters);
        results.push({
          sectionId: section.id,
          data,
          summary: {
            totalRecords: data.length,
            aggregations: this.calculateAggregations(data)
          }
        });

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const result: ReportResult = {
        data: results,
        metadata: {
          recordCount: results.reduce((sum, r) => sum + r.data.length, 0),
          executionTime: Date.now() - execution.startTime.getTime(),
          generatedAt: new Date(),
          parameters: execution.parameters
        },
        visualizations: this.generateVisualizations(sections, results),
        exports: []
      };

      execution.result = result;
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.progress = 100;

      this.executions.set(execution.id, execution);
      this.emit('executionCompleted', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      execution.endTime = new Date();

      this.executions.set(execution.id, execution);
      this.emit('executionFailed', execution);
    }
  }

  private async executeDataQuery(query: DataQuery, parameters: Record<string, any>): Promise<any[]> {
    const cacheKey = `${query.source}_${JSON.stringify(query)}_${JSON.stringify(parameters)}`;
    
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey);
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    let data: any[];
    
    switch (query.source) {
      case 'siem':
        data = this.generateSIEMData(query, parameters);
        break;
      case 'compliance':
        data = this.generateComplianceData(query, parameters);
        break;
      case 'incidents':
        data = this.generateIncidentData(query, parameters);
        break;
      case 'threat-intel':
        data = this.generateThreatIntelData(query, parameters);
        break;
      default:
        data = this.generateMockData(query, parameters);
    }

    this.dataCache.set(cacheKey, data);
    return data;
  }

  private generateSIEMData(query: DataQuery, parameters: Record<string, any>): any[] {
    const data = [];
    const days = 30;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        threats: Math.floor(Math.random() * 100) + 50,
        critical: Math.floor(Math.random() * 10) + 2,
        high: Math.floor(Math.random() * 20) + 8,
        medium: Math.floor(Math.random() * 30) + 15,
        low: Math.floor(Math.random() * 40) + 25,
        severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)]
      });
    }
    
    return data;
  }

  private generateComplianceData(query: DataQuery, parameters: Record<string, any>): any[] {
    const frameworks = ['NIST', 'ISO27001', 'SOC2', 'PCIDSS'];
    const statuses = ['compliant', 'partial', 'non-compliant'];
    const data = [];
    
    frameworks.forEach(framework => {
      for (let i = 1; i <= 20; i++) {
        data.push({
          framework,
          control_id: `${framework}-${i.toString().padStart(3, '0')}`,
          control_name: `Control ${i} for ${framework}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          last_assessment: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          score: Math.floor(Math.random() * 100) + 1
        });
      }
    });
    
    return data;
  }

  private generateIncidentData(query: DataQuery, parameters: Record<string, any>): any[] {
    const severities = ['critical', 'high', 'medium', 'low'];
    const statuses = ['open', 'investigating', 'resolved', 'closed'];
    const data = [];
    
    for (let i = 0; i < 100; i++) {
      const date = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000);
      data.push({
        id: `INC-${(1000 + i).toString()}`,
        title: `Security Incident ${i + 1}`,
        severity: severities[Math.floor(Math.random() * severities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_date: date.toISOString().split('T')[0],
        assigned_to: `analyst${Math.floor(Math.random() * 5) + 1}`,
        resolution_time: Math.floor(Math.random() * 480) + 60
      });
    }
    
    return data;
  }

  private generateThreatIntelData(query: DataQuery, parameters: Record<string, any>): any[] {
    const threatTypes = ['Malware', 'Phishing', 'Ransomware', 'Data Breach', 'DDoS'];
    const sources = ['Internal', 'Commercial Feed', 'Open Source', 'Government'];
    const data = [];
    
    for (let i = 0; i < 50; i++) {
      data.push({
        id: `TI-${(1000 + i).toString()}`,
        threat_type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        confidence: Math.floor(Math.random() * 100) + 1,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        first_seen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        ioc_count: Math.floor(Math.random() * 50) + 1
      });
    }
    
    return data;
  }

  private generateMockData(query: DataQuery, parameters: Record<string, any>): any[] {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      value: Math.floor(Math.random() * 1000),
      category: `Category ${(i % 5) + 1}`,
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));
  }

  private calculateAggregations(data: any[]): Record<string, number> {
    if (data.length === 0) return {};
    
    const aggregations: Record<string, number> = {};
    const numericFields = Object.keys(data[0]).filter(key => typeof data[0][key] === 'number');
    
    numericFields.forEach(field => {
      const values = data.map(item => item[field]).filter(val => typeof val === 'number');
      if (values.length > 0) {
        aggregations[`${field}_sum`] = values.reduce((sum, val) => sum + val, 0);
        aggregations[`${field}_avg`] = aggregations[`${field}_sum`] / values.length;
        aggregations[`${field}_min`] = Math.min(...values);
        aggregations[`${field}_max`] = Math.max(...values);
      }
    });
    
    return aggregations;
  }

  private generateVisualizations(sections: any[], results: any[]): any[] {
    return sections.map((section, index) => ({
      sectionId: section.id,
      type: section.visualization?.chartType || 'table',
      config: section.visualization,
      data: results[index]?.data || [],
      imageUrl: `/api/charts/${section.id}.png`
    }));
  }

  async getExecution(id: string): Promise<ReportExecution | null> {
    return this.executions.get(id) || null;
  }

  async listExecutions(templateId?: string): Promise<ReportExecution[]> {
    const executions = Array.from(this.executions.values());
    
    if (templateId) {
      return executions.filter(exec => exec.templateId === templateId);
    }
    
    return executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async exportReport(executionId: string, format: ExportFormat): Promise<Blob> {
    const execution = this.executions.get(executionId);
    if (!execution || !execution.result) {
      throw new Error('Execution not found or not completed');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (format.type) {
      case 'json':
        return new Blob([JSON.stringify(execution.result, null, 2)], { type: 'application/json' });
      case 'csv':
        const csvData = this.convertToCSV(execution.result.data);
        return new Blob([csvData], { type: 'text/csv' });
      case 'excel':
        return new Blob(['Excel export not implemented'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      case 'pdf':
        return new Blob(['PDF export not implemented'], { type: 'application/pdf' });
      default:
        throw new Error(`Unsupported export format: ${format.type}`);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const allData = data.flatMap(section => section.data);
    if (allData.length === 0) return '';
    
    const headers = Object.keys(allData[0]);
    const csvRows = [
      headers.join(','),
      ...allData.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }

  async scheduleReport(templateId: string, schedule: any): Promise<string> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.emit('reportScheduled', { scheduleId, templateId, schedule });
    return scheduleId;
  }

  async createDashboard(dashboard: Omit<ReportDashboard, 'id'>): Promise<string> {
    const id = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newDashboard: ReportDashboard = { ...dashboard, id };
    
    this.dashboards.set(id, newDashboard);
    this.emit('dashboardCreated', newDashboard);
    return id;
  }

  async getDashboard(id: string): Promise<ReportDashboard | null> {
    return this.dashboards.get(id) || null;
  }

  async listDashboards(): Promise<ReportDashboard[]> {
    return Array.from(this.dashboards.values());
  }

  dispose(): void {
    this.dataCache.clear();
    this.removeAllListeners();
  }
}