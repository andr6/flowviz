import {
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Launch as LaunchIcon,
  ContentCopy as CopyIcon,
  Home as HomeIcon,
  TravelExplore as VirusTotalIcon
} from '@mui/icons-material';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert
} from '@mui/material';
import React, { useState } from 'react';

import { IOC, IOA, IOCIOAAnalysisResult, IOCExportFormat } from '../types/IOC';

interface IOCDisplayPanelProps {
  analysisResult?: IOCIOAAnalysisResult;
  onExport?: (format: IOCExportFormat) => void;
  onClose?: () => void;
  loading?: boolean;
}

export const IOCDisplayPanel: React.FC<IOCDisplayPanelProps> = ({
  analysisResult,
  onExport,
  onClose,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIOC, setSelectedIOC] = useState<IOC | null>(null);
  const [selectedIOA, setSelectedIOA] = useState<IOA | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    confidence: '',
    type: '',
    malicious: '',
    category: ''
  });

  if (!analysisResult && !loading) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <SecurityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No IOC/IOA analysis available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Run an analysis to see extracted indicators of compromise and attack patterns
        </Typography>
      </Paper>
    );
  }

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6">Extracting IOCs and IOAs...</Typography>
          <LinearProgress sx={{ mt: 1 }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          Analyzing content for indicators of compromise and attack patterns
        </Typography>
      </Paper>
    );
  }

  const { iocs = [], ioas = [], summary } = analysisResult!;

  // Filter IOCs and IOAs based on search and filters
  const filteredIOCs = iocs.filter(ioc => {
    const matchesSearch = !searchTerm || 
      ioc.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ioc.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilters = 
      (!filters.confidence || ioc.confidence === filters.confidence) &&
      (!filters.type || ioc.type === filters.type) &&
      (!filters.malicious || String(ioc.malicious) === filters.malicious);

    return matchesSearch && matchesFilters;
  });

  const filteredIOAs = ioas.filter(ioa => {
    const matchesSearch = !searchTerm || 
      ioa.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ioa.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilters = 
      (!filters.confidence || ioa.confidence === filters.confidence) &&
      (!filters.category || ioa.category === filters.category);

    return matchesSearch && matchesFilters;
  });

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'error';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getMaliciousIcon = (malicious?: boolean | null) => {
    if (malicious === true) {return <ErrorIcon color="error" />;}
    if (malicious === false) {return <CheckCircleIcon color="success" />;}
    return <WarningIcon color="warning" />;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const enrichIOC = (ioc: IOC) => {
    // Open enrichment options in a new tab
    const encodedValue = encodeURIComponent(ioc.value);
    
    // Default to VirusTotal for most IOC types
    let enrichmentUrl = '';
    
    switch (ioc.type.toLowerCase()) {
      case 'ip':
      case 'ipv4':
      case 'ipv6':
        enrichmentUrl = `https://www.virustotal.com/gui/ip-address/${encodedValue}`;
        break;
      case 'domain':
      case 'fqdn':
      case 'hostname':
        enrichmentUrl = `https://www.virustotal.com/gui/domain/${encodedValue}`;
        break;
      case 'url':
        enrichmentUrl = `https://www.virustotal.com/gui/url/${btoa(ioc.value)}`;
        break;
      case 'hash':
      case 'md5':
      case 'sha1':
      case 'sha256':
      case 'sha512':
        enrichmentUrl = `https://www.virustotal.com/gui/file/${encodedValue}`;
        break;
      case 'email':
        enrichmentUrl = `https://www.virustotal.com/gui/search/${encodedValue}`;
        break;
      default:
        enrichmentUrl = `https://www.virustotal.com/gui/search/${encodedValue}`;
    }
    
    window.open(enrichmentUrl, '_blank');
  };

  const handleExport = (format: string) => {
    if (onExport) {
      const exportFormat: IOCExportFormat = {
        format: format as any,
        includeIOCs: true,
        includeIOAs: true,
        includeRelationships: true,
        includeTimeline: true,
        confidenceThreshold: 'low'
      };
      onExport(exportFormat);
    }
    setExportMenuAnchor(null);
  };

  const renderSummaryCards = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="primary">
              {summary.totalIOCs}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total IOCs
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="secondary">
              {summary.totalIOAs}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total IOAs
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="success.main">
              {summary.confidenceDistribution.high || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High Confidence
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="error.main">
              {iocs.filter(ioc => ioc.malicious === true).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Malicious IOCs
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderIOCsTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Type</TableCell>
            <TableCell>Value</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Source</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredIOCs.map((ioc) => (
            <TableRow key={ioc.id}>
              <TableCell>
                <Chip 
                  label={ioc.type.toUpperCase()} 
                  size="small" 
                  variant="outlined" 
                />
              </TableCell>
              <TableCell>
                <Typography 
                  variant="body2" 
                  sx={{ fontFamily: 'monospace', maxWidth: 200, wordBreak: 'break-all' }}
                >
                  {ioc.value}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={ioc.confidence} 
                  size="small" 
                  color={getConfidenceColor(ioc.confidence) as any}
                />
              </TableCell>
              <TableCell>
                <Tooltip title={ioc.malicious === true ? 'Malicious' : ioc.malicious === false ? 'Benign' : 'Unknown'}>
                  {getMaliciousIcon(ioc.malicious)}
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip label={ioc.source} size="small" variant="filled" />
              </TableCell>
              <TableCell>
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(ioc.value)}
                  title="Copy IOC"
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => enrichIOC(ioc)}
                  title="Enrich with VirusTotal"
                  color="primary"
                >
                  <VirusTotalIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => setSelectedIOC(ioc)}
                  title="View Details"
                >
                  <InfoIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderIOAsTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Category</TableCell>
            <TableCell>MITRE ATT&CK</TableCell>
            <TableCell>Confidence</TableCell>
            <TableCell>Severity</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredIOAs.map((ioa) => (
            <TableRow key={ioa.id}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  {ioa.name}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={ioa.category.replace('-', ' ')} 
                  size="small" 
                  variant="outlined" 
                />
              </TableCell>
              <TableCell>
                {ioa.mitreAttackId && (
                  <Chip 
                    label={ioa.mitreAttackId} 
                    size="small" 
                    clickable
                    onClick={() => window.open(`https://attack.mitre.org/techniques/${ioa.mitreAttackId}`, '_blank')}
                    icon={<LaunchIcon fontSize="small" />}
                  />
                )}
              </TableCell>
              <TableCell>
                <Chip 
                  label={ioa.confidence} 
                  size="small" 
                  color={getConfidenceColor(ioa.confidence) as any}
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={ioa.severity} 
                  size="small" 
                  color={getSeverityColor(ioa.severity) as any}
                />
              </TableCell>
              <TableCell>
                <IconButton 
                  size="small" 
                  onClick={() => setSelectedIOA(ioa)}
                  title="View Details"
                >
                  <InfoIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Paper sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon />
            IOC/IOA Analysis Results
          </Typography>
          
          {onClose && (
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={onClose}
              sx={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.6) 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.7) 100%)',
                },
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Back to Main
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search IOCs/IOAs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
          />
          
          <IconButton onClick={() => setFilterDialogOpen(true)} title="Filter">
            <FilterIcon />
          </IconButton>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={(e) => setExportMenuAnchor(e.currentTarget)}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
          <Tab 
            label={
              <Badge badgeContent={filteredIOCs.length} color="primary">
                IOCs
              </Badge>
            } 
          />
          <Tab 
            label={
              <Badge badgeContent={filteredIOAs.length} color="secondary">
                IOAs
              </Badge>
            } 
          />
          <Tab label="Summary" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {filteredIOCs.length === 0 ? (
            <Alert severity="info">No IOCs found matching current filters.</Alert>
          ) : (
            renderIOCsTable()
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {filteredIOAs.length === 0 ? (
            <Alert severity="info">No IOAs found matching current filters.</Alert>
          ) : (
            renderIOAsTable()
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Analysis Summary</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">IOCs by Type</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(summary.iocsByType)
                    .sort(([,a], [,b]) => b - a) // Sort by count descending
                    .map(([type, count]) => (
                    <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: ['sha1', 'sha256', 'md5'].includes(type) ? 'bold' : 'normal',
                          color: ['sha1', 'sha256', 'md5'].includes(type) ? 'primary.main' : 'text.primary'
                        }}
                      >
                        {type.toUpperCase()}
                        {['sha1', 'sha256', 'md5'].includes(type) && ' (Hash)'}
                      </Typography>
                      <Chip 
                        label={count} 
                        size="small" 
                        color={['sha1', 'sha256', 'md5'].includes(type) ? 'primary' : 'default'}
                      />
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">IOAs by Category</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {Object.entries(summary.ioasByCategory).map(([category, count]) => (
                    <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">{category.replace('-', ' ').toUpperCase()}</Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Export Menu */}
      <Menu
        anchorEl={exportMenuAnchor}
        open={Boolean(exportMenuAnchor)}
        onClose={() => setExportMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleExport('json')}>JSON</MenuItem>
        <MenuItem onClick={() => handleExport('csv')}>CSV</MenuItem>
        <MenuItem onClick={() => handleExport('stix')}>STIX 2.1</MenuItem>
        <MenuItem onClick={() => handleExport('misp')}>MISP</MenuItem>
        <MenuItem onClick={() => handleExport('yara')}>YARA Rules</MenuItem>
        <MenuItem onClick={() => handleExport('suricata')}>Suricata Rules</MenuItem>
      </Menu>

      {/* IOC Details Dialog */}
      <Dialog 
        open={Boolean(selectedIOC)} 
        onClose={() => setSelectedIOC(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedIOC && (
          <>
            <DialogTitle>IOC Details: {selectedIOC.value}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Type</Typography>
                  <Typography variant="body2">{selectedIOC.type}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Confidence</Typography>
                  <Chip label={selectedIOC.confidence} size="small" color={getConfidenceColor(selectedIOC.confidence) as any} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Context</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                    {selectedIOC.context || 'No context available'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Tags</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {selectedIOC.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button 
                onClick={() => copyToClipboard(selectedIOC.value)}
                startIcon={<CopyIcon />}
              >
                Copy IOC
              </Button>
              <Button 
                onClick={() => enrichIOC(selectedIOC)}
                startIcon={<VirusTotalIcon />}
                color="primary"
              >
                Enrich with VirusTotal
              </Button>
              <Button onClick={() => setSelectedIOC(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* IOA Details Dialog */}
      <Dialog 
        open={Boolean(selectedIOA)} 
        onClose={() => setSelectedIOA(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedIOA && (
          <>
            <DialogTitle>IOA Details: {selectedIOA.name}</DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Category</Typography>
                  <Typography variant="body2">{selectedIOA.category}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Severity</Typography>
                  <Chip label={selectedIOA.severity} size="small" color={getSeverityColor(selectedIOA.severity) as any} />
                </Grid>
                {selectedIOA.mitreAttackId && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">MITRE ATT&CK</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={selectedIOA.mitreAttackId} />
                      {selectedIOA.mitreTechnique && <Typography variant="body2">{selectedIOA.mitreTechnique}</Typography>}
                    </Box>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Description</Typography>
                  <Typography variant="body2">{selectedIOA.description}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Context</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1 }}>
                    {selectedIOA.context || 'No context available'}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedIOA(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Filter Dialog - Simple implementation */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)}>
        <DialogTitle>Filter IOCs/IOAs</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confidence"
                select
                value={filters.confidence}
                onChange={(e) => setFilters({...filters, confidence: e.target.value})}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Malicious Status"
                select
                value={filters.malicious}
                onChange={(e) => setFilters({...filters, malicious: e.target.value})}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Malicious</MenuItem>
                <MenuItem value="false">Benign</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setFilters({ confidence: '', type: '', malicious: '', category: '' });
            setFilterDialogOpen(false);
          }}>
            Clear
          </Button>
          <Button onClick={() => setFilterDialogOpen(false)}>Apply</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};