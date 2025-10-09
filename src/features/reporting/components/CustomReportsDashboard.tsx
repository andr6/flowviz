import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Alert,
  Tooltip,
  Menu,
  Divider
} from '@mui/material';
import {
  Add,
  PlayArrow,
  Edit,
  Delete,
  Download,
  Schedule,
  Visibility,
  MoreVert,
  Assessment,
  Dashboard as DashboardIcon,
  TableChart,
  BarChart,
  PieChart,
  Timeline,
  Settings,
  Share,
  FileCopy
} from '@mui/icons-material';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { CustomReportsService } from '../services/CustomReportsService';
import type { ReportTemplate, ReportExecution, ReportDashboard } from '../types/CustomReports';

const COLORS = ['#1976d2', '#dc004e', '#ed6c02', '#2e7d32', '#9c27b0', '#00695c'];

interface CustomReportsDashboardProps {
  reportsService: CustomReportsService;
}

export const CustomReportsDashboard: React.FC<CustomReportsDashboardProps> = ({ reportsService }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [executions, setExecutions] = useState<ReportExecution[]>([]);
  const [dashboards, setDashboards] = useState<ReportDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ReportExecution | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [executionParameters, setExecutionParameters] = useState<Record<string, any>>({});
  const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    loadData();
    
    const handleExecutionUpdate = (execution: ReportExecution) => {
      setExecutions(prev => {
        const index = prev.findIndex(e => e.id === execution.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = execution;
          return updated;
        }
        return [execution, ...prev];
      });
    };

    reportsService.on('executionStarted', handleExecutionUpdate);
    reportsService.on('executionProgress', handleExecutionUpdate);
    reportsService.on('executionCompleted', handleExecutionUpdate);
    reportsService.on('executionFailed', handleExecutionUpdate);

    return () => {
      reportsService.off('executionStarted', handleExecutionUpdate);
      reportsService.off('executionProgress', handleExecutionUpdate);
      reportsService.off('executionCompleted', handleExecutionUpdate);
      reportsService.off('executionFailed', handleExecutionUpdate);
    };
  }, [reportsService]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, executionsData, dashboardsData] = await Promise.all([
        reportsService.listTemplates(),
        reportsService.listExecutions(),
        reportsService.listDashboards()
      ]);
      
      setTemplates(templatesData);
      setExecutions(executionsData.slice(0, 50));
      setDashboards(dashboardsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteReport = async (template: ReportTemplate) => {
    try {
      const parameters: Record<string, any> = {};
      
      template.parameters.forEach(param => {
        parameters[param.name] = executionParameters[param.name] || param.defaultValue;
      });

      await reportsService.executeReport(template.id, parameters);
      setExecuteDialogOpen(false);
      setExecutionParameters({});
    } catch (error) {
      console.error('Failed to execute report:', error);
    }
  };

  const handleExportExecution = async (execution: ReportExecution, format: 'pdf' | 'excel' | 'csv' | 'json') => {
    try {
      const blob = await reportsService.exportReport(execution.id, {
        type: format,
        options: { pageSize: 'A4', orientation: 'landscape' }
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${execution.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'info';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Assessment />;
      case 'compliance':
        return <TableChart />;
      case 'performance':
        return <Timeline />;
      case 'incident':
        return <BarChart />;
      default:
        return <DashboardIcon />;
    }
  };

  const ReportTemplateCard: React.FC<{ template: ReportTemplate }> = ({ template }) => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center">
            {getCategoryIcon(template.category)}
            <Typography variant="h6" sx={{ ml: 1, fontSize: '1rem' }}>
              {template.name}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => setMenuAnchor({ ...menuAnchor, [template.id]: e.currentTarget })}
          >
            <MoreVert />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {template.description}
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
          <Chip size="small" label={template.category} color="primary" />
          <Chip size="small" label={template.type} variant="outlined" />
          {template.tags.slice(0, 2).map(tag => (
            <Chip key={tag} size="small" label={tag} variant="outlined" />
          ))}
        </Box>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {template.dataSources.length} data source(s)
          </Typography>
          <Button
            size="small"
            startIcon={<PlayArrow />}
            variant="contained"
            onClick={() => {
              setSelectedTemplate(template);
              setExecuteDialogOpen(true);
            }}
          >
            Execute
          </Button>
        </Box>
      </CardContent>

      <Menu
        anchorEl={menuAnchor[template.id]}
        open={Boolean(menuAnchor[template.id])}
        onClose={() => setMenuAnchor({ ...menuAnchor, [template.id]: null })}
      >
        <MenuItem onClick={() => {
          setSelectedTemplate(template);
          // Open edit dialog
          setMenuAnchor({ ...menuAnchor, [template.id]: null });
        }}>
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => {
          // Copy template
          setMenuAnchor({ ...menuAnchor, [template.id]: null });
        }}>
          <FileCopy sx={{ mr: 1 }} /> Duplicate
        </MenuItem>
        <MenuItem onClick={() => {
          // Schedule template
          setMenuAnchor({ ...menuAnchor, [template.id]: null });
        }}>
          <Schedule sx={{ mr: 1 }} /> Schedule
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          // Delete template
          setMenuAnchor({ ...menuAnchor, [template.id]: null });
        }}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Card>
  );

  const ExecutionRow: React.FC<{ execution: ReportExecution }> = ({ execution }) => {
    const template = templates.find(t => t.id === execution.templateId);
    
    return (
      <TableRow>
        <TableCell>
          <Typography variant="body2" fontWeight="medium">
            {template?.name || execution.templateId}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {execution.id}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip 
            size="small" 
            label={execution.status} 
            color={getStatusColor(execution.status) as any}
          />
        </TableCell>
        <TableCell>
          {execution.status === 'running' ? (
            <Box sx={{ width: '100%' }}>
              <LinearProgress variant="determinate" value={execution.progress} />
              <Typography variant="caption" color="text.secondary">
                {execution.progress.toFixed(0)}%
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2">
              {execution.progress.toFixed(0)}%
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {execution.startTime.toLocaleString()}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {execution.endTime ? `${Math.round((execution.endTime.getTime() - execution.startTime.getTime()) / 1000)}s` : '-'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">
            {execution.executedBy}
          </Typography>
        </TableCell>
        <TableCell>
          <Box display="flex" gap={0.5}>
            {execution.status === 'completed' && (
              <>
                <Tooltip title="View Results">
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setSelectedExecution(execution);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Visibility />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Export">
                  <IconButton 
                    size="small"
                    onClick={() => handleExportExecution(execution, 'pdf')}
                  >
                    <Download />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>Custom Reports</Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Custom Reports & Analytics
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Report
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Templates" />
          <Tab label="Executions" />
          <Tab label="Dashboards" />
          <Tab label="Scheduled" />
        </Tabs>
      </Box>

      {/* Templates Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {templates.map((template) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <ReportTemplateCard template={template} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Executions Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Started</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Executed By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {executions.map((execution) => (
                <ExecutionRow key={execution.id} execution={execution} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dashboards Tab */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          {dashboards.map((dashboard) => (
            <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {dashboard.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {dashboard.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dashboard.reports.length} report(s)
                  </Typography>
                  <Box mt={2} display="flex" gap={1}>
                    <Button size="small" startIcon={<Visibility />}>
                      View
                    </Button>
                    <Button size="small" startIcon={<Edit />}>
                      Edit
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Scheduled Tab */}
      {activeTab === 3 && (
        <Alert severity="info">
          Scheduled reports feature coming soon. You'll be able to set up automatic report generation and delivery.
        </Alert>
      )}

      {/* Execute Report Dialog */}
      <Dialog 
        open={executeDialogOpen} 
        onClose={() => setExecuteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Execute Report: {selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedTemplate.description}
              </Typography>
              
              {selectedTemplate.parameters.map((param) => (
                <Box key={param.id} mb={2}>
                  {param.type === 'dropdown' && (
                    <FormControl fullWidth>
                      <InputLabel>{param.label}</InputLabel>
                      <Select
                        value={executionParameters[param.name] || param.defaultValue || ''}
                        label={param.label}
                        onChange={(e) => setExecutionParameters({
                          ...executionParameters,
                          [param.name]: e.target.value
                        })}
                      >
                        {param.options?.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  
                  {param.type === 'text' && (
                    <TextField
                      fullWidth
                      label={param.label}
                      value={executionParameters[param.name] || param.defaultValue || ''}
                      onChange={(e) => setExecutionParameters({
                        ...executionParameters,
                        [param.name]: e.target.value
                      })}
                      required={param.required}
                      helperText={param.description}
                    />
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => selectedTemplate && handleExecuteReport(selectedTemplate)}
          >
            Execute Report
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Results Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Report Results: {selectedExecution?.id}
          <IconButton
            sx={{ position: 'absolute', right: 8, top: 8 }}
            onClick={() => setViewDialogOpen(false)}
          >
            <Delete />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {selectedExecution?.result && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Execution Summary
              </Typography>
              <Grid container spacing={2} mb={3}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Records</Typography>
                  <Typography variant="h6">{selectedExecution.result.metadata.recordCount}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Execution Time</Typography>
                  <Typography variant="h6">{selectedExecution.result.metadata.executionTime}ms</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Generated</Typography>
                  <Typography variant="h6">{selectedExecution.result.metadata.generatedAt.toLocaleString()}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Sections</Typography>
                  <Typography variant="h6">{selectedExecution.result.data.length}</Typography>
                </Grid>
              </Grid>

              {selectedExecution.result.data.map((section) => (
                <Card key={section.sectionId} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {section.sectionId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {section.data.length} records
                    </Typography>
                    
                    {section.data.length > 0 && (
                      <TableContainer sx={{ maxHeight: 300 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              {Object.keys(section.data[0]).map((key) => (
                                <TableCell key={key}>{key}</TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {section.data.slice(0, 10).map((row, index) => (
                              <TableRow key={index}>
                                {Object.values(row).map((value, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {String(value)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          {selectedExecution && (
            <>
              <Button onClick={() => handleExportExecution(selectedExecution, 'json')}>
                Export JSON
              </Button>
              <Button onClick={() => handleExportExecution(selectedExecution, 'csv')}>
                Export CSV
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};