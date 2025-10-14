/**
 * Threat Intelligence Enrichment Component
 *
 * React UI for enriching IOCs with consensus-based threat intelligence
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Paper,
  LinearProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface EnrichmentResult {
  ioc: string;
  iocType: string;
  consensus: {
    reputation: {
      score: number;
      verdict: 'benign' | 'suspicious' | 'malicious' | 'unknown';
      confidence: number;
      distribution: {
        benign: number;
        suspicious: number;
        malicious: number;
        unknown: number;
      };
    };
    agreement: number;
    providerCount: number;
  };
  metadata: {
    geolocation?: {
      country: string;
      city?: string;
      confidence: number;
    };
    network?: {
      asn?: string;
      organization?: string;
      isp?: string;
    };
    threats: Array<{
      type: string;
      name: string;
      confidence: number;
      sources: string[];
    }>;
  };
  relatedIndicators: Array<{
    type: string;
    value: string;
    relationship: string;
    confidence: number;
    sources: string[];
  }>;
  tags: Array<{
    tag: string;
    count: number;
    sources: string[];
  }>;
  providerResults: Array<{
    provider: string;
    success: boolean;
    verdict?: string;
    score?: number;
    confidence?: number;
    responseTime: number;
    cached: boolean;
  }>;
  mlScoring: {
    confidenceScore: number;
    reliabilityScore: number;
    recommendedAction: 'accept' | 'review' | 're-enrich';
    reasoning: string[];
  } | null;
  stats: {
    totalProviders: number;
    successfulProviders: number;
    failedProviders: number;
    cachedResult: boolean;
    processingTime: number;
  };
}

export const ThreatIntelligenceEnrichment: React.FC = () => {
  const [ioc, setIoc] = useState('');
  const [iocType, setIocType] = useState<string>('ip');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnrich = async () => {
    if (!ioc.trim()) {
      setError('Please enter an IOC value');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/threat-intelligence/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ioc: ioc.trim(),
          iocType,
          mlScoring: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Enrichment failed');
      }

      setResult(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'benign':
        return 'success';
      case 'suspicious':
        return 'warning';
      case 'malicious':
        return 'error';
      default:
        return 'default';
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'benign':
        return <CheckCircleIcon />;
      case 'suspicious':
        return <WarningIcon />;
      case 'malicious':
        return <ErrorIcon />;
      default:
        return <InfoIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Threat Intelligence Enrichment
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Enrich IOCs with consensus-based intelligence from multiple providers
      </Typography>

      {/* Input Form */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="IOC Value"
                value={ioc}
                onChange={(e) => setIoc(e.target.value)}
                placeholder="e.g., 1.2.3.4, evil.com, hash..."
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>IOC Type</InputLabel>
                <Select
                  value={iocType}
                  label="IOC Type"
                  onChange={(e) => setIocType(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="ip">IP Address</MenuItem>
                  <MenuItem value="domain">Domain</MenuItem>
                  <MenuItem value="url">URL</MenuItem>
                  <MenuItem value="hash">File Hash</MenuItem>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="cve">CVE</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                onClick={handleEnrich}
                disabled={loading}
                sx={{ height: '56px' }}
              >
                {loading ? 'Enriching...' : 'Enrich'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results Display */}
      {result && (
        <Box>
          {/* Consensus Summary */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consensus Verdict
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Chip
                      icon={getVerdictIcon(result.consensus.reputation.verdict)}
                      label={result.consensus.reputation.verdict.toUpperCase()}
                      color={getVerdictColor(result.consensus.reputation.verdict)}
                      size="large"
                      sx={{ fontSize: '1.2rem', py: 3, px: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={9}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Threat Score
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ flexGrow: 1, mr: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={result.consensus.reputation.score}
                          color={
                            result.consensus.reputation.score > 70
                              ? 'error'
                              : result.consensus.reputation.score > 40
                              ? 'warning'
                              : 'success'
                          }
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight="bold">
                        {result.consensus.reputation.score}/100
                      </Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Confidence
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {(result.consensus.reputation.confidence * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Agreement
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          {(result.consensus.agreement * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>

              {/* ML Scoring */}
              {result.mlScoring && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    ML Analysis
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Reliability Score
                        </Typography>
                        <Typography variant="h5">
                          {(result.mlScoring.reliabilityScore * 100).toFixed(1)}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Recommended Action
                        </Typography>
                        <Chip
                          label={result.mlScoring.recommendedAction.toUpperCase()}
                          color={
                            result.mlScoring.recommendedAction === 'accept'
                              ? 'success'
                              : result.mlScoring.recommendedAction === 'review'
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ mt: 0.5 }}
                        />
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Processing Time
                        </Typography>
                        <Typography variant="h5">{result.stats.processingTime}ms</Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                  {result.mlScoring.reasoning.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Analysis Reasoning:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                        {result.mlScoring.reasoning.map((reason, idx) => (
                          <Typography key={idx} component="li" variant="body2">
                            {reason}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Provider Results */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Provider Results ({result.stats.successfulProviders}/
                {result.stats.totalProviders})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Provider</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Verdict</TableCell>
                      <TableCell align="right">Score</TableCell>
                      <TableCell align="right">Confidence</TableCell>
                      <TableCell align="right">Response Time</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.providerResults.map((pr) => (
                      <TableRow key={pr.provider}>
                        <TableCell>{pr.provider}</TableCell>
                        <TableCell>
                          {pr.success ? (
                            <Chip
                              label={pr.cached ? 'Cached' : 'Success'}
                              color="success"
                              size="small"
                            />
                          ) : (
                            <Chip label="Failed" color="error" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {pr.verdict && (
                            <Chip
                              label={pr.verdict}
                              color={getVerdictColor(pr.verdict)}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">{pr.score || '-'}</TableCell>
                        <TableCell align="right">
                          {pr.confidence ? `${(pr.confidence * 100).toFixed(0)}%` : '-'}
                        </TableCell>
                        <TableCell align="right">{pr.responseTime}ms</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* Threats */}
          {result.metadata.threats.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Threats Detected ({result.metadata.threats.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  {result.metadata.threats.map((threat, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {threat.type.toUpperCase()}
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {threat.name}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Confidence
                          </Typography>
                          <Typography variant="body1">
                            {(threat.confidence * 100).toFixed(0)}%
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" color="text.secondary">
                            Sources
                          </Typography>
                          <Box sx={{ mt: 0.5 }}>
                            {threat.sources.map((source) => (
                              <Chip key={source} label={source} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Related Indicators */}
          {result.relatedIndicators.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Related Indicators ({result.relatedIndicators.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Relationship</TableCell>
                        <TableCell>Sources</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {result.relatedIndicators.slice(0, 10).map((indicator, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Chip label={indicator.type} size="small" />
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontFamily: 'monospace',
                                maxWidth: 300,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {indicator.value}
                            </Typography>
                          </TableCell>
                          <TableCell>{indicator.relationship}</TableCell>
                          <TableCell>
                            {indicator.sources.map((source) => (
                              <Chip key={source} label={source} size="small" sx={{ mr: 0.5 }} />
                            ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Tags */}
          {result.tags.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Tags ({result.tags.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {result.tags.slice(0, 30).map((tag) => (
                    <Chip
                      key={tag.tag}
                      label={`${tag.tag} (${tag.count})`}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Metadata */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Metadata</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {result.metadata.geolocation && (
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Geolocation
                      </Typography>
                      <Typography variant="body2">
                        Country: {result.metadata.geolocation.country}
                      </Typography>
                      {result.metadata.geolocation.city && (
                        <Typography variant="body2">
                          City: {result.metadata.geolocation.city}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        Confidence: {(result.metadata.geolocation.confidence * 100).toFixed(0)}%
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {result.metadata.network && (
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Network
                      </Typography>
                      {result.metadata.network.asn && (
                        <Typography variant="body2">ASN: {result.metadata.network.asn}</Typography>
                      )}
                      {result.metadata.network.organization && (
                        <Typography variant="body2">
                          Organization: {result.metadata.network.organization}
                        </Typography>
                      )}
                      {result.metadata.network.isp && (
                        <Typography variant="body2">
                          ISP: {result.metadata.network.isp}
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  );
};
