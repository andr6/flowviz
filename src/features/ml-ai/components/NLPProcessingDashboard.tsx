import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Chip,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Article as ArticleIcon,
  Analytics as AnalyticsIcon,
  Timeline as TimelineIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  AutoFixHigh as AutoFixHighIcon,
  FindInPage as FindInPageIcon
} from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ScatterChart, Scatter } from 'recharts';
import { MachineLearningService } from '../services/MachineLearningService';
import type { 
  NLPAnalysis, 
  NLPEntity, 
  NLPRelation, 
  NLPSentiment,
  NLPSummary,
  NLPClassification,
  NLPFilters
} from '../types/MachineLearning';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const NLPProcessingDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [inputText, setInputText] = useState('');
  const [nlpAnalysis, setNlpAnalysis] = useState<NLPAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<NLPFilters>({
    entityTypes: [],
    relationTypes: [],
    confidenceThreshold: 0.7,
    documentTypes: [],
    languages: ['en']
  });
  const [selectedEntity, setSelectedEntity] = useState<NLPEntity | null>(null);
  const [selectedRelation, setSelectedRelation] = useState<NLPRelation | null>(null);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [relationDialogOpen, setRelationDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [processingModel, setProcessingModel] = useState('transformer-large');

  const mlService = new MachineLearningService();

  const entityTypeColors: Record<string, string> = {
    'PERSON': '#FF6B6B',
    'ORGANIZATION': '#4ECDC4',
    'LOCATION': '#45B7D1',
    'MALWARE': '#FFA726',
    'VULNERABILITY': '#EF5350',
    'TECHNIQUE': '#AB47BC',
    'TOOL': '#66BB6A',
    'INDICATOR': '#FFCA28',
    'CAMPAIGN': '#8D6E63',
    'GROUP': '#78909C'
  };

  const relationTypeColors: Record<string, string> = {
    'USES': '#FF8A65',
    'TARGETS': '#F06292',
    'EXPLOITS': '#BA68C8',
    'DELIVERS': '#64B5F6',
    'COMMUNICATES_WITH': '#4DB6AC',
    'ATTRIBUTED_TO': '#FFB74D',
    'SIMILAR_TO': '#AED581',
    'PART_OF': '#A1887F'
  };

  const sampleText = `APT29, also known as Cozy Bear, has been observed using sophisticated spear-phishing campaigns targeting government organizations in North America and Europe. The group employs advanced persistent threat techniques, utilizing custom malware including HAMMERTOSS and POWERHAMMER to maintain persistence in compromised networks. Recent analysis indicates they have been exploiting CVE-2021-44228 (Log4Shell) vulnerability to gain initial access. The attackers use PowerShell scripts for lateral movement and data exfiltration, often communicating with command and control servers hosted in Eastern European countries. Intelligence suggests this campaign is part of a broader intelligence collection operation attributed to state-sponsored actors.`;

  useEffect(() => {
    if (autoAnalysis && inputText.length > 100) {
      handleAnalyzeText();
    }
  }, [inputText, autoAnalysis]);

  const handleAnalyzeText = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const analysis = await mlService.analyzeTextNLP(inputText, {
        extractEntities: true,
        extractRelations: true,
        analyzeSentiment: true,
        generateSummary: true,
        classifyDocument: true,
        language: 'en',
        model: processingModel
      });
      setNlpAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing text:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEntityClick = (entity: NLPEntity) => {
    setSelectedEntity(entity);
    setEntityDialogOpen(true);
  };

  const handleRelationClick = (relation: NLPRelation) => {
    setSelectedRelation(relation);
    setRelationDialogOpen(true);
  };

  const getHighConfidenceEntities = () => {
    if (!nlpAnalysis) return [];
    return nlpAnalysis.entities.filter(e => e.confidence >= filters.confidenceThreshold);
  };

  const getHighConfidenceRelations = () => {
    if (!nlpAnalysis) return [];
    return nlpAnalysis.relations.filter(r => r.confidence >= filters.confidenceThreshold);
  };

  const getEntityTypeDistribution = () => {
    const entities = getHighConfidenceEntities();
    const distribution: Record<string, number> = {};
    entities.forEach(entity => {
      distribution[entity.type] = (distribution[entity.type] || 0) + 1;
    });
    return Object.entries(distribution).map(([type, count]) => ({
      type,
      count,
      fill: entityTypeColors[type] || '#9E9E9E'
    }));
  };

  const getRelationTypeDistribution = () => {
    const relations = getHighConfidenceRelations();
    const distribution: Record<string, number> = {};
    relations.forEach(relation => {
      distribution[relation.type] = (distribution[relation.type] || 0) + 1;
    });
    return Object.entries(distribution).map(([type, count]) => ({
      type,
      count,
      fill: relationTypeColors[type] || '#9E9E9E'
    }));
  };

  const getConfidenceDistribution = () => {
    if (!nlpAnalysis) return [];
    const entities = nlpAnalysis.entities;
    const ranges = [
      { range: '0.9-1.0', min: 0.9, max: 1.0 },
      { range: '0.8-0.9', min: 0.8, max: 0.9 },
      { range: '0.7-0.8', min: 0.7, max: 0.8 },
      { range: '0.6-0.7', min: 0.6, max: 0.7 },
      { range: '0.5-0.6', min: 0.5, max: 0.6 },
      { range: '<0.5', min: 0, max: 0.5 }
    ];

    return ranges.map(range => ({
      range: range.range,
      count: entities.filter(e => e.confidence >= range.min && e.confidence < range.max).length
    }));
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#F44336';
      case 'neutral': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Text Analysis Input
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text for NLP analysis..."
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => setInputText(sampleText)}
                startIcon={<ArticleIcon />}
              >
                Load Sample
              </Button>
              <Button
                variant="outlined"
                onClick={() => setInputText('')}
              >
                Clear
              </Button>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={autoAnalysis}
                  onChange={(e) => setAutoAnalysis(e.target.checked)}
                />
              }
              label="Auto-analyze on input"
            />
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              onClick={handleAnalyzeText}
              disabled={!inputText.trim() || loading}
              startIcon={loading ? <CircularProgress size={20} /> : <AnalyticsIcon />}
              fullWidth
            >
              {loading ? 'Analyzing...' : 'Analyze Text'}
            </Button>
          </CardActions>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Processing Configuration
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Processing Model</InputLabel>
              <Select
                value={processingModel}
                onChange={(e) => setProcessingModel(e.target.value)}
                label="Processing Model"
              >
                <MenuItem value="transformer-large">Transformer Large</MenuItem>
                <MenuItem value="transformer-base">Transformer Base</MenuItem>
                <MenuItem value="bert-base">BERT Base</MenuItem>
                <MenuItem value="spacy-large">SpaCy Large</MenuItem>
                <MenuItem value="custom-security">Custom Security Model</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="number"
              label="Confidence Threshold"
              value={filters.confidenceThreshold}
              onChange={(e) => setFilters({
                ...filters,
                confidenceThreshold: parseFloat(e.target.value)
              })}
              inputProps={{ min: 0, max: 1, step: 0.1 }}
              sx={{ mb: 2 }}
            />
            {nlpAnalysis && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Analysis Results
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${nlpAnalysis.entities.length} Entities`}
                    color="primary"
                    size="small"
                  />
                  <Chip 
                    label={`${nlpAnalysis.relations.length} Relations`}
                    color="secondary"
                    size="small"
                  />
                  <Chip 
                    label={`${nlpAnalysis.sentiment.label} Sentiment`}
                    sx={{ backgroundColor: getSentimentColor(nlpAnalysis.sentiment.label), color: 'white' }}
                    size="small"
                  />
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {nlpAnalysis && (
        <>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Entity Types</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getEntityTypeDistribution()}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {getEntityTypeDistribution().map((entry, index) => (
                        <Cell key={`entity-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Relation Types</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={getRelationTypeDistribution()}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {getRelationTypeDistribution().map((entry, index) => (
                        <Cell key={`relation-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Confidence Distribution</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={getConfidenceDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  );

  const renderEntitiesTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FindInPageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Named Entity Recognition
            </Typography>
            {nlpAnalysis ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {getHighConfidenceEntities().length} entities above {filters.confidenceThreshold} confidence threshold
                </Typography>
                <List>
                  {getHighConfidenceEntities().map((entity, index) => (
                    <React.Fragment key={index}>
                      <ListItem
                        button
                        onClick={() => handleEntityClick(entity)}
                        sx={{
                          borderLeft: `4px solid ${entityTypeColors[entity.type] || '#9E9E9E'}`,
                          mb: 1,
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1" component="span">
                                {entity.text}
                              </Typography>
                              <Chip
                                label={entity.type}
                                size="small"
                                sx={{
                                  backgroundColor: entityTypeColors[entity.type] || '#9E9E9E',
                                  color: 'white'
                                }}
                              />
                              <Chip
                                label={`${(entity.confidence * 100).toFixed(1)}%`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                Position: {entity.start}-{entity.end}
                              </Typography>
                              {entity.metadata && Object.keys(entity.metadata).length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  {Object.entries(entity.metadata).map(([key, value]) => (
                                    <Chip
                                      key={key}
                                      label={`${key}: ${value}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < getHighConfidenceEntities().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            ) : (
              <Alert severity="info">
                Analyze text to view extracted entities
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderRelationsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <TimelineIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Relation Extraction
            </Typography>
            {nlpAnalysis ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Showing {getHighConfidenceRelations().length} relations above {filters.confidenceThreshold} confidence threshold
                </Typography>
                <List>
                  {getHighConfidenceRelations().map((relation, index) => (
                    <React.Fragment key={index}>
                      <ListItem
                        button
                        onClick={() => handleRelationClick(relation)}
                        sx={{
                          borderLeft: `4px solid ${relationTypeColors[relation.type] || '#9E9E9E'}`,
                          mb: 1,
                          backgroundColor: 'rgba(0,0,0,0.02)'
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold' }}>
                                {relation.subject}
                              </Typography>
                              <Chip
                                label={relation.type}
                                size="small"
                                sx={{
                                  backgroundColor: relationTypeColors[relation.type] || '#9E9E9E',
                                  color: 'white'
                                }}
                              />
                              <Typography variant="subtitle1" component="span" sx={{ fontWeight: 'bold' }}>
                                {relation.object}
                              </Typography>
                              <Chip
                                label={`${(relation.confidence * 100).toFixed(1)}%`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              {relation.context && (
                                <Typography variant="body2" color="text.secondary">
                                  Context: "{relation.context}"
                                </Typography>
                              )}
                              {relation.metadata && Object.keys(relation.metadata).length > 0 && (
                                <Box sx={{ mt: 1 }}>
                                  {Object.entries(relation.metadata).map(([key, value]) => (
                                    <Chip
                                      key={key}
                                      label={`${key}: ${value}`}
                                      size="small"
                                      variant="outlined"
                                      sx={{ mr: 0.5, mb: 0.5 }}
                                    />
                                  ))}
                                </Box>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < getHighConfidenceRelations().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Box>
            ) : (
              <Alert severity="info">
                Analyze text to view extracted relations
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSentimentTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sentiment Analysis
            </Typography>
            {nlpAnalysis ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Typography variant="h4" sx={{ color: getSentimentColor(nlpAnalysis.sentiment.label) }}>
                    {nlpAnalysis.sentiment.label.toUpperCase()}
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {(nlpAnalysis.sentiment.confidence * 100).toFixed(1)}% confidence
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Positive Score</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={nlpAnalysis.sentiment.scores.positive * 100}
                    sx={{ height: 10, borderRadius: 5, backgroundColor: '#f0f0f0' }}
                    style={{ color: '#4CAF50' }}
                  />
                  <Typography variant="caption">{(nlpAnalysis.sentiment.scores.positive * 100).toFixed(1)}%</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Negative Score</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={nlpAnalysis.sentiment.scores.negative * 100}
                    sx={{ height: 10, borderRadius: 5, backgroundColor: '#f0f0f0' }}
                    style={{ color: '#F44336' }}
                  />
                  <Typography variant="caption">{(nlpAnalysis.sentiment.scores.negative * 100).toFixed(1)}%</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>Neutral Score</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={nlpAnalysis.sentiment.scores.neutral * 100}
                    sx={{ height: 10, borderRadius: 5, backgroundColor: '#f0f0f0' }}
                    style={{ color: '#9E9E9E' }}
                  />
                  <Typography variant="caption">{(nlpAnalysis.sentiment.scores.neutral * 100).toFixed(1)}%</Typography>
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                Analyze text to view sentiment analysis
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Document Classification
            </Typography>
            {nlpAnalysis && nlpAnalysis.classification ? (
              <Box>
                <Typography variant="h5" gutterBottom>
                  {nlpAnalysis.classification.category}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Confidence: {(nlpAnalysis.classification.confidence * 100).toFixed(1)}%
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>All Predictions:</Typography>
                  {nlpAnalysis.classification.predictions.map((pred, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">{pred.category}</Typography>
                        <Typography variant="caption">{(pred.probability * 100).toFixed(1)}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={pred.probability * 100}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                Analyze text to view document classification
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Text Summary
            </Typography>
            {nlpAnalysis && nlpAnalysis.summary ? (
              <Box>
                <Typography variant="body1" paragraph>
                  {nlpAnalysis.summary.text}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip label={`${nlpAnalysis.summary.sentences.length} key sentences`} size="small" />
                  <Chip 
                    label={`${((1 - nlpAnalysis.summary.compressionRatio) * 100).toFixed(1)}% compression`} 
                    size="small" 
                    color="primary" 
                  />
                  <Button
                    size="small"
                    onClick={() => setSummaryDialogOpen(true)}
                    startIcon={<VisibilityIcon />}
                  >
                    View Details
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert severity="info">
                Analyze text to view summary
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <AutoFixHighIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        Natural Language Processing
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Enhanced extraction and analysis from unstructured security reports
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label="Overview" />
          <Tab label="Entities" />
          <Tab label="Relations" />
          <Tab label="Sentiment & Classification" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderOverviewTab()}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        {renderEntitiesTab()}
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        {renderRelationsTab()}
      </TabPanel>
      <TabPanel value={tabValue} index={3}>
        {renderSentimentTab()}
      </TabPanel>

      {/* Entity Details Dialog */}
      <Dialog
        open={entityDialogOpen}
        onClose={() => setEntityDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Entity Details</DialogTitle>
        <DialogContent>
          {selectedEntity && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedEntity.text}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={selectedEntity.type}
                  sx={{
                    backgroundColor: entityTypeColors[selectedEntity.type] || '#9E9E9E',
                    color: 'white'
                  }}
                />
                <Chip
                  label={`${(selectedEntity.confidence * 100).toFixed(1)}% confidence`}
                  variant="outlined"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Position: {selectedEntity.start}-{selectedEntity.end}
              </Typography>
              {selectedEntity.metadata && Object.keys(selectedEntity.metadata).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Metadata:</Typography>
                  {Object.entries(selectedEntity.metadata).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      <strong>{key}:</strong> {String(value)}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEntityDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Relation Details Dialog */}
      <Dialog
        open={relationDialogOpen}
        onClose={() => setRelationDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Relation Details</DialogTitle>
        <DialogContent>
          {selectedRelation && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedRelation.subject} → {selectedRelation.object}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={selectedRelation.type}
                  sx={{
                    backgroundColor: relationTypeColors[selectedRelation.type] || '#9E9E9E',
                    color: 'white'
                  }}
                />
                <Chip
                  label={`${(selectedRelation.confidence * 100).toFixed(1)}% confidence`}
                  variant="outlined"
                />
              </Box>
              {selectedRelation.context && (
                <Typography variant="body1" paragraph>
                  <strong>Context:</strong> "{selectedRelation.context}"
                </Typography>
              )}
              {selectedRelation.metadata && Object.keys(selectedRelation.metadata).length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Metadata:</Typography>
                  {Object.entries(selectedRelation.metadata).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      <strong>{key}:</strong> {String(value)}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRelationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Summary Details Dialog */}
      <Dialog
        open={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Summary Details</DialogTitle>
        <DialogContent>
          {nlpAnalysis && nlpAnalysis.summary && (
            <Box>
              <Typography variant="h6" gutterBottom>Generated Summary</Typography>
              <Typography variant="body1" paragraph>
                {nlpAnalysis.summary.text}
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Key Sentences</Typography>
              <List>
                {nlpAnalysis.summary.sentences.map((sentence, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={sentence.text}
                      secondary={`Importance: ${sentence.importance.toFixed(3)} | Position: ${sentence.position}`}
                    />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Summary Statistics</Typography>
                <Typography variant="body2">
                  Compression Ratio: {nlpAnalysis.summary.compressionRatio.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NLPProcessingDashboard;