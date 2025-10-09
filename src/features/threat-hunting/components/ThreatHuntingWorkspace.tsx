import {
  Search,
  PlayArrow,
  ExpandMore,
  Edit,
  Visibility,
  Code,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { threatFlowTheme } from '../../../shared/theme/threatflow-theme';
import { useAuth } from '../../auth/context/AuthContext';

interface ThreatHuntQuery {
  id: string;
  name: string;
  description: string;
  queryType: 'kql' | 'spl' | 'sql' | 'yara' | 'sigma';
  queryContent: string;
  dataSources: string[];
  mitreTechniques: string[];
  tags: string[];
  isScheduled: boolean;
  scheduleCron?: string;
  lastExecuted?: string;
  executionCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface QueryResult {
  id: string;
  queryId: string;
  executedBy: string;
  resultCount: number;
  executionTimeMs: number;
  resultsData: any;
  findingsSummary: {
    totalFindings: number;
    criticalFindings: number;
    highRiskFindings: number;
    techniques: string[];
    affectedAssets: string[];
  };
  status: 'running' | 'completed' | 'failed' | 'timeout';
  errorMessage?: string;
  executedAt: string;
}

const QUERY_TYPES = [
  { value: 'kql', label: 'KQL (Kusto Query Language)', description: 'Microsoft Sentinel, Log Analytics' },
  { value: 'spl', label: 'SPL (Search Processing Language)', description: 'Splunk' },
  { value: 'sql', label: 'SQL', description: 'Database queries' },
  { value: 'yara', label: 'YARA', description: 'Malware detection rules' },
  { value: 'sigma', label: 'Sigma', description: 'Generic signature format' },
];

const DATA_SOURCES = [
  'Windows Security Logs',
  'Linux Syslogs',
  'Network Traffic',
  'DNS Logs',
  'Proxy Logs',
  'Endpoint Detection',
  'Email Security',
  'Cloud Trail',
  'Active Directory',
  'File Integrity Monitoring'
];

const MITRE_TECHNIQUES = [
  'T1003 - OS Credential Dumping',
  'T1055 - Process Injection',
  'T1059 - Command and Scripting',
  'T1078 - Valid Accounts',
  'T1190 - Exploit Public-Facing Application',
  'T1566 - Phishing',
  'T1070 - Indicator Removal on Host',
  'T1021 - Remote Services',
  'T1036 - Masquerading',
  'T1046 - Network Service Scanning'
];

export const ThreatHuntingWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [queries, setQueries] = useState<ThreatHuntQuery[]>([]);
  const [queryResults, setQueryResults] = useState<QueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState<ThreatHuntQuery | null>(null);
  const [queryDialogOpen, setQueryDialogOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  // New query form state
  const [newQuery, setNewQuery] = useState<Partial<ThreatHuntQuery>>({
    name: '',
    description: '',
    queryType: 'kql',
    queryContent: '',
    dataSources: [],
    mitreTechniques: [],
    tags: [],
    isScheduled: false,
  });

  useEffect(() => {
    loadQueries();
    loadQueryResults();
  }, []);

  const loadQueries = async () => {
    // Mock data - replace with actual API call
    const mockQueries: ThreatHuntQuery[] = [
      {
        id: 'query-1',
        name: 'Suspicious PowerShell Activity',
        description: 'Detect potentially malicious PowerShell commands and encoded scripts',
        queryType: 'kql',
        queryContent: `SecurityEvent
| where EventID == 4688
| where CommandLine contains "powershell"
| where CommandLine contains_any("encoded", "bypass", "hidden", "invoke")
| project TimeGenerated, Computer, Account, CommandLine
| order by TimeGenerated desc`,
        dataSources: ['Windows Security Logs', 'Endpoint Detection'],
        mitreTechniques: ['T1059 - Command and Scripting', 'T1140 - Deobfuscate/Decode Files'],
        tags: ['powershell', 'suspicious', 'execution'],
        isScheduled: true,
        scheduleCron: '0 */6 * * *',
        lastExecuted: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        executionCount: 24,
        createdBy: user?.id || 'user-1',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'query-2',
        name: 'Lateral Movement Detection',
        description: 'Hunt for signs of lateral movement using WMI and remote execution',
        queryType: 'kql',
        queryContent: `SecurityEvent
| where EventID in (4648, 4624)
| where LogonType in (3, 9)
| summarize LoginCount = count() by Account, SourceNetworkAddress, Computer
| where LoginCount > 5
| order by LoginCount desc`,
        dataSources: ['Windows Security Logs', 'Active Directory'],
        mitreTechniques: ['T1021 - Remote Services', 'T1078 - Valid Accounts'],
        tags: ['lateral-movement', 'persistence', 'privilege-escalation'],
        isScheduled: false,
        lastExecuted: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        executionCount: 8,
        createdBy: user?.id || 'user-1',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];
    
    setQueries(mockQueries);
  };

  const loadQueryResults = async () => {
    // Mock results - replace with actual API call
    const mockResults: QueryResult[] = [
      {
        id: 'result-1',
        queryId: 'query-1',
        executedBy: user?.id || 'user-1',
        resultCount: 23,
        executionTimeMs: 1247,
        resultsData: {},
        findingsSummary: {
          totalFindings: 23,
          criticalFindings: 3,
          highRiskFindings: 8,
          techniques: ['T1059', 'T1140'],
          affectedAssets: ['WORKSTATION-01', 'SERVER-DC01', 'LAPTOP-HR02']
        },
        status: 'completed',
        executedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'result-2',
        queryId: 'query-2',
        executedBy: user?.id || 'user-1',
        resultCount: 156,
        executionTimeMs: 3421,
        resultsData: {},
        findingsSummary: {
          totalFindings: 156,
          criticalFindings: 12,
          highRiskFindings: 34,
          techniques: ['T1021', 'T1078'],
          affectedAssets: ['DC01', 'FILE-SERVER01', 'EXCHANGE01']
        },
        status: 'completed',
        executedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      }
    ];
    
    setQueryResults(mockResults);
  };

  const handleExecuteQuery = async (query: ThreatHuntQuery) => {
    setExecuting(query.id);
    
    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful execution
      const newResult: QueryResult = {
        id: `result-${Date.now()}`,
        queryId: query.id,
        executedBy: user?.id || 'user-1',
        resultCount: Math.floor(Math.random() * 200) + 10,
        executionTimeMs: Math.floor(Math.random() * 5000) + 500,
        resultsData: {},
        findingsSummary: {
          totalFindings: Math.floor(Math.random() * 200) + 10,
          criticalFindings: Math.floor(Math.random() * 5),
          highRiskFindings: Math.floor(Math.random() * 20),
          techniques: query.mitreTechniques.map(t => t.split(' ')[0]),
          affectedAssets: [`ASSET-${Math.floor(Math.random() * 100)}`]
        },
        status: 'completed',
        executedAt: new Date().toISOString(),
      };
      
      setQueryResults(prev => [newResult, ...prev]);
      
      // Update query execution stats
      setQueries(prev => prev.map(q => 
        q.id === query.id 
          ? { ...q, executionCount: q.executionCount + 1, lastExecuted: new Date().toISOString() }
          : q
      ));
      
    } catch (error) {
      console.error('Query execution failed:', error);
    } finally {
      setExecuting(null);
    }
  };

  const handleSaveQuery = () => {
    if (!newQuery.name || !newQuery.queryContent) {return;}
    
    const query: ThreatHuntQuery = {
      id: `query-${Date.now()}`,
      name: newQuery.name!,
      description: newQuery.description || '',
      queryType: newQuery.queryType!,
      queryContent: newQuery.queryContent!,
      dataSources: newQuery.dataSources || [],
      mitreTechniques: newQuery.mitreTechniques || [],
      tags: newQuery.tags || [],
      isScheduled: newQuery.isScheduled || false,
      scheduleCron: newQuery.scheduleCron,
      executionCount: 0,
      createdBy: user?.id || 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setQueries(prev => [query, ...prev]);
    setQueryDialogOpen(false);
    setNewQuery({
      name: '',
      description: '',
      queryType: 'kql',
      queryContent: '',
      dataSources: [],
      mitreTechniques: [],
      tags: [],
      isScheduled: false,
    });
  };

  const getStatusIcon = (status: QueryResult['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle sx={{ color: threatFlowTheme.colors.status.success }} />;
      case 'failed': return <Warning sx={{ color: threatFlowTheme.colors.status.error }} />;
      case 'running': return <LinearProgress sx={{ width: 20 }} />;
      case 'timeout': return <Warning sx={{ color: threatFlowTheme.colors.status.warning }} />;
      default: return null;
    }
  };

  const getSeverityColor = (count: number) => {
    if (count === 0) {return threatFlowTheme.colors.status.success;}
    if (count < 5) {return threatFlowTheme.colors.status.warning;}
    return threatFlowTheme.colors.status.error;
  };

  return (
    <Box sx={{ p: 3, minHeight: '100vh', bgcolor: threatFlowTheme.colors.background.primary }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            color: threatFlowTheme.colors.text.primary,
            fontWeight: threatFlowTheme.typography.fontWeight.bold,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            mb: 1,
          }}
        >
          <Search sx={{ fontSize: 32, color: threatFlowTheme.colors.brand.primary }} />
          Threat Hunting Workspace
        </Typography>
        <Typography sx={{ color: threatFlowTheme.colors.text.secondary }}>
          Proactive threat detection through custom queries and hunting expeditions
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, bgcolor: threatFlowTheme.colors.background.secondary }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ 
            '& .MuiTab-root': { color: threatFlowTheme.colors.text.tertiary },
            '& .Mui-selected': { color: threatFlowTheme.colors.brand.primary },
          }}
        >
          <Tab label="Hunt Queries" />
          <Tab label="Results & Findings" />
          <Tab label="Scheduled Hunts" />
          <Tab label="Query Library" />
        </Tabs>
      </Paper>

      {/* Hunt Queries Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, bgcolor: threatFlowTheme.colors.background.secondary }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary }}>
                  Active Hunt Queries
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Code />}
                  onClick={() => setQueryDialogOpen(true)}
                  sx={{
                    background: threatFlowTheme.effects.gradients.brand,
                    '&:hover': { background: threatFlowTheme.effects.gradients.brandHover },
                  }}
                >
                  Create Query
                </Button>
              </Box>

              <Grid container spacing={2}>
                {queries.map((query) => (
                  <Grid item xs={12} key={query.id}>
                    <Card
                      sx={{
                        bgcolor: threatFlowTheme.colors.background.primary,
                        border: `1px solid ${threatFlowTheme.colors.brand.primary}20`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 32px ${threatFlowTheme.colors.brand.primary}20`,
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 1 }}>
                              {query.name}
                            </Typography>
                            <Typography sx={{ color: threatFlowTheme.colors.text.secondary, mb: 2 }}>
                              {query.description}
                            </Typography>
                          </Box>
                          <Chip
                            label={query.queryType.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: `${threatFlowTheme.colors.brand.primary}20`,
                              color: threatFlowTheme.colors.brand.primary,
                            }}
                          />
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: threatFlowTheme.colors.text.tertiary, mb: 1 }}>
                            MITRE ATT&CK Techniques:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {query.mitreTechniques.map((technique, index) => (
                              <Chip
                                key={index}
                                label={technique}
                                size="small"
                                sx={{
                                  bgcolor: `${threatFlowTheme.colors.status.warning}20`,
                                  color: threatFlowTheme.colors.status.warning,
                                  fontSize: '0.75rem',
                                }}
                              />
                            ))}
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                          <Box sx={{ display: 'flex', gap: 1, fontSize: '0.875rem', color: threatFlowTheme.colors.text.tertiary }}>
                            <span>Executions: {query.executionCount}</span>
                            {query.lastExecuted && (
                              <span>• Last: {new Date(query.lastExecuted).toLocaleString()}</span>
                            )}
                            {query.isScheduled && <Chip label="Scheduled" size="small" color="primary" />}
                          </Box>
                        </Box>
                      </CardContent>

                      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => setSelectedQuery(query)}
                          sx={{ color: threatFlowTheme.colors.text.secondary }}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Edit />}
                          sx={{ color: threatFlowTheme.colors.text.secondary }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={executing === query.id ? <LinearProgress sx={{ width: 16 }} /> : <PlayArrow />}
                          onClick={() => handleExecuteQuery(query)}
                          disabled={executing === query.id}
                          sx={{
                            background: threatFlowTheme.effects.gradients.brand,
                            '&:hover': { background: threatFlowTheme.effects.gradients.brandHover },
                            minWidth: 100,
                          }}
                        >
                          {executing === query.id ? 'Running...' : 'Execute'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, bgcolor: threatFlowTheme.colors.background.secondary, mb: 3 }}>
              <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
                Hunt Statistics
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                    Active Queries
                  </Typography>
                  <Typography variant="h4" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                    {queries.length}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                    Scheduled Hunts
                  </Typography>
                  <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.success }}>
                    {queries.filter(q => q.isScheduled).length}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography sx={{ color: threatFlowTheme.colors.text.secondary, fontSize: '0.875rem' }}>
                    Total Executions
                  </Typography>
                  <Typography variant="h4" sx={{ color: threatFlowTheme.colors.status.info }}>
                    {queries.reduce((sum, q) => sum + q.executionCount, 0)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Paper sx={{ p: 3, bgcolor: threatFlowTheme.colors.background.secondary }}>
              <Typography variant="h6" sx={{ color: threatFlowTheme.colors.text.primary, mb: 2 }}>
                Recent Findings
              </Typography>
              
              {queryResults.slice(0, 3).map((result) => (
                <Box key={result.id} sx={{ mb: 2, p: 2, bgcolor: threatFlowTheme.colors.background.primary, borderRadius: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {getStatusIcon(result.status)}
                    <Typography sx={{ fontSize: '0.875rem', color: threatFlowTheme.colors.text.primary }}>
                      {queries.find(q => q.id === result.queryId)?.name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: threatFlowTheme.colors.text.tertiary }}>
                    <span>Findings: {result.findingsSummary.totalFindings}</span>
                    <span>Critical: {result.findingsSummary.criticalFindings}</span>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Results Tab */}
      {activeTab === 1 && (
        <TableContainer component={Paper} sx={{ bgcolor: threatFlowTheme.colors.background.secondary }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Query</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Status</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Total Findings</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Critical</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>High Risk</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Execution Time</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Executed At</TableCell>
                <TableCell sx={{ color: threatFlowTheme.colors.text.primary }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queryResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell sx={{ color: threatFlowTheme.colors.text.secondary }}>
                    {queries.find(q => q.id === result.queryId)?.name}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(result.status)}
                      <Typography sx={{ fontSize: '0.875rem', color: threatFlowTheme.colors.text.secondary }}>
                        {result.status}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: threatFlowTheme.colors.text.secondary }}>
                    {result.findingsSummary.totalFindings}
                  </TableCell>
                  <TableCell sx={{ color: getSeverityColor(result.findingsSummary.criticalFindings) }}>
                    {result.findingsSummary.criticalFindings}
                  </TableCell>
                  <TableCell sx={{ color: getSeverityColor(result.findingsSummary.highRiskFindings) }}>
                    {result.findingsSummary.highRiskFindings}
                  </TableCell>
                  <TableCell sx={{ color: threatFlowTheme.colors.text.secondary }}>
                    {result.executionTimeMs}ms
                  </TableCell>
                  <TableCell sx={{ color: threatFlowTheme.colors.text.secondary }}>
                    {new Date(result.executedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" sx={{ color: threatFlowTheme.colors.brand.primary }}>
                      <Visibility />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Query Dialog */}
      <Dialog 
        open={queryDialogOpen} 
        onClose={() => setQueryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: threatFlowTheme.colors.background.secondary, color: threatFlowTheme.colors.text.primary }}>
          Create New Hunt Query
        </DialogTitle>
        
        <DialogContent sx={{ bgcolor: threatFlowTheme.colors.background.secondary, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Query Name"
                value={newQuery.name || ''}
                onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: threatFlowTheme.colors.background.primary,
                    color: threatFlowTheme.colors.text.primary,
                  },
                  '& .MuiInputLabel-root': { color: threatFlowTheme.colors.text.tertiary },
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: threatFlowTheme.colors.text.tertiary }}>Query Type</InputLabel>
                <Select
                  value={newQuery.queryType || 'kql'}
                  label="Query Type"
                  onChange={(e) => setNewQuery({ ...newQuery, queryType: e.target.value as any })}
                  sx={{
                    bgcolor: threatFlowTheme.colors.background.primary,
                    color: threatFlowTheme.colors.text.primary,
                  }}
                >
                  {QUERY_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box>
                        <Typography>{type.label}</Typography>
                        <Typography variant="caption" sx={{ color: threatFlowTheme.colors.text.tertiary }}>
                          {type.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={newQuery.description || ''}
                onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: threatFlowTheme.colors.background.primary,
                    color: threatFlowTheme.colors.text.primary,
                  },
                  '& .MuiInputLabel-root': { color: threatFlowTheme.colors.text.tertiary },
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="Query Content"
                value={newQuery.queryContent || ''}
                onChange={(e) => setNewQuery({ ...newQuery, queryContent: e.target.value })}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: threatFlowTheme.colors.background.primary,
                    color: threatFlowTheme.colors.text.primary,
                    fontFamily: 'monospace',
                  },
                  '& .MuiInputLabel-root': { color: threatFlowTheme.colors.text.tertiary },
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ bgcolor: threatFlowTheme.colors.background.secondary, p: 2 }}>
          <Button onClick={() => setQueryDialogOpen(false)} sx={{ color: threatFlowTheme.colors.text.secondary }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveQuery}
            disabled={!newQuery.name || !newQuery.queryContent}
            sx={{
              background: threatFlowTheme.effects.gradients.brand,
              '&:hover': { background: threatFlowTheme.effects.gradients.brandHover },
            }}
          >
            Save Query
          </Button>
        </DialogActions>
      </Dialog>

      {/* Query Details Dialog */}
      {selectedQuery && (
        <Dialog
          open={!!selectedQuery}
          onClose={() => setSelectedQuery(null)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle sx={{ bgcolor: threatFlowTheme.colors.background.secondary, color: threatFlowTheme.colors.text.primary }}>
            {selectedQuery.name}
          </DialogTitle>
          
          <DialogContent sx={{ bgcolor: threatFlowTheme.colors.background.secondary }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: threatFlowTheme.colors.text.secondary, mb: 3 }}>
                {selectedQuery.description}
              </Typography>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography sx={{ color: threatFlowTheme.colors.text.primary }}>Query Content</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ 
                    bgcolor: threatFlowTheme.colors.background.primary,
                    p: 2,
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: threatFlowTheme.colors.text.primary,
                    whiteSpace: 'pre-wrap',
                    overflow: 'auto',
                  }}>
                    {selectedQuery.queryContent}
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ bgcolor: threatFlowTheme.colors.background.secondary }}>
            <Button onClick={() => setSelectedQuery(null)} sx={{ color: threatFlowTheme.colors.text.secondary }}>
              Close
            </Button>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={() => {
                handleExecuteQuery(selectedQuery);
                setSelectedQuery(null);
              }}
              sx={{
                background: threatFlowTheme.effects.gradients.brand,
                '&:hover': { background: threatFlowTheme.effects.gradients.brandHover },
              }}
            >
              Execute Query
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};