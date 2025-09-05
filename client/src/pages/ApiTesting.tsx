import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Tabs,
  Tab,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Send as SendIcon,
  PlayArrow as PlayArrowIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as ContentCopyIcon,
  AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from 'react-query';
import toast from 'react-hot-toast';
import JsonView from '@uiw/react-json-view';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import * as api from '../services/api.ts';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ApiTesting: React.FC = () => {
  const [selectedSpec, setSelectedSpec] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState('');
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestPath, setRequestPath] = useState('');
  const [requestBody, setRequestBody] = useState('{}');
  const [requestParams, setRequestParams] = useState('{}');
  const [response, setResponse] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<number>(0);
  const [tabValue, setTabValue] = useState(0);
  const [generationMode, setGenerationMode] = useState('advanced');

  const { data: specs } = useQuery('specs', apiService.getSpecs);
  const { data: specDetails } = useQuery(
    ['spec', selectedSpec],
    () => apiService.getSpec(selectedSpec),
    { enabled: !!selectedSpec }
  );
  const { data: generationModes } = useQuery('generation-modes', apiService.getGenerationModes);

  const testMutation = useMutation(
    ({ method, path, data }: { method: string; path: string; data?: any }) =>
      apiService.callMockEndpoint(method, path, data),
    {
      onSuccess: (data) => {
        setResponse(data);
        toast.success('API call successful!');
      },
      onError: (error: any) => {
        setResponse(error.response?.data || { error: error.message });
        toast.error('API call failed');
      },
    }
  );

  const generateDataMutation = useMutation(
    ({ schema, context, generationMode }: { schema: any; context?: any; generationMode?: string }) =>
      apiService.generateData(schema, context, generationMode),
    {
      onSuccess: (data) => {
        setRequestBody(JSON.stringify(data.data, null, 2));
        toast.success(`Data generated using ${data.generationMode || 'advanced'} mode!`);
      },
      onError: (error: any) => {
        toast.error('Failed to generate data');
      },
    }
  );

  const handleSpecChange = (specId: string) => {
    setSelectedSpec(specId);
    setSelectedEndpoint('');
    setRequestPath('');
  };

  const handleEndpointChange = (endpointId: string) => {
    setSelectedEndpoint(endpointId);
    const endpoint = specDetails?.endpoints.find(e => e.id === endpointId);
    if (endpoint) {
      setRequestMethod(endpoint.method);
      setRequestPath(endpoint.path);
      
      // Set default response body if it's a POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        try {
          const responseData = JSON.parse(endpoint.response_data);
          setRequestBody(JSON.stringify(responseData, null, 2));
        } catch (error) {
          setRequestBody('{}');
        }
      }
    }
  };

  const handleSendRequest = () => {
    if (!requestPath) {
      toast.error('Please select an endpoint');
      return;
    }

    const startTime = Date.now();
    let data: any = undefined;

    try {
      if (['POST', 'PUT', 'PATCH'].includes(requestMethod) && requestBody.trim()) {
        data = JSON.parse(requestBody);
      } else if (requestMethod === 'GET' && requestParams.trim()) {
        data = JSON.parse(requestParams);
      }
    } catch (error) {
      toast.error('Invalid JSON format');
      return;
    }

    testMutation.mutate(
      { method: requestMethod, path: requestPath, data },
      {
        onSettled: () => {
          setResponseTime(Date.now() - startTime);
        },
      }
    );
  };

  const handleGenerateSmartData = () => {
    const endpoint = specDetails?.endpoints.find(e => e.id === selectedEndpoint);
    if (!endpoint || !endpoint.response_schema) {
      toast.error('No schema available for smart data generation');
      return;
    }

    try {
      const schema = JSON.parse(endpoint.response_schema);
      generateDataMutation.mutate({
        schema,
        context: {
          method: requestMethod,
          endpoint: requestPath,
          useAI: generationMode === 'ai',
        },
        generationMode,
      });
    } catch (error) {
      toast.error('Invalid response schema');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'info';
      case 'POST': return 'success';
      case 'PUT': return 'warning';
      case 'PATCH': return 'secondary';
      case 'DELETE': return 'error';
      default: return 'default';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mb: 3 }}>
          API Testing
        </Typography>

        <Grid container spacing={3}>
          {/* Request Configuration */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 'fit-content' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Request Configuration
                </Typography>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>API Specification</InputLabel>
                  <Select
                    value={selectedSpec}
                    onChange={(e) => handleSpecChange(e.target.value)}
                    label="API Specification"
                  >
                    {specs?.map((spec) => (
                      <MenuItem key={spec.id} value={spec.id}>
                        {spec.name} (v{spec.version})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {selectedSpec && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Endpoint</InputLabel>
                    <Select
                      value={selectedEndpoint}
                      onChange={(e) => handleEndpointChange(e.target.value)}
                      label="Endpoint"
                    >
                      {specDetails?.endpoints.map((endpoint) => (
                        <MenuItem key={endpoint.id} value={endpoint.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={endpoint.method}
                              size="small"
                              color={getMethodColor(endpoint.method) as any}
                            />
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {endpoint.path}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Method</InputLabel>
                    <Select
                      value={requestMethod}
                      onChange={(e) => setRequestMethod(e.target.value)}
                      label="Method"
                    >
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => (
                        <MenuItem key={method} value={method}>
                          {method}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    fullWidth
                    label="Path"
                    value={requestPath}
                    onChange={(e) => setRequestPath(e.target.value)}
                    placeholder="/api/users"
                  />
                </Box>

                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 2 }}>
                  <Tab label="Body" />
                  <Tab label="Query Params" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2">Request Body (JSON)</Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 140 }}>
                        <InputLabel>Generation Mode</InputLabel>
                        <Select
                          value={generationMode}
                          onChange={(e) => setGenerationMode(e.target.value)}
                          label="Generation Mode"
                        >
                          {generationModes && Object.entries(generationModes).map(([key, mode]: [string, any]) => (
                            <MenuItem key={key} value={key} disabled={!mode.available}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: mode.available ? 'normal' : 'lighter' }}>
                                  {mode.name} {!mode.available && '(Unavailable)'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {mode.description}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Button
                        size="small"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={handleGenerateSmartData}
                        disabled={!selectedEndpoint || generateDataMutation.isLoading}
                        variant={generationMode === 'ai' ? 'contained' : 'outlined'}
                        color={generationMode === 'ai' ? 'primary' : generationMode === 'advanced' ? 'secondary' : 'inherit'}
                      >
                        {generateDataMutation.isLoading ? 'Generating...' : 'Generate Data'}
                      </Button>
                    </Box>
                  </Box>
                  
                  {/* Generation Mode Info */}
                  {generationModes && generationModes[generationMode] && (
                    <Box sx={{ mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {generationModes[generationMode].name} Features:
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {generationModes[generationMode].features?.map((feature: string, index: number) => (
                          <Chip
                            key={index}
                            label={feature}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <TextField
                    fullWidth
                    multiline
                    rows={8}
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    sx={{ fontFamily: 'monospace' }}
                  />
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Query Parameters (JSON)</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={requestParams}
                    onChange={(e) => setRequestParams(e.target.value)}
                    placeholder='{"limit": 10, "offset": 0}'
                    sx={{ fontFamily: 'monospace' }}
                  />
                </TabPanel>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<SendIcon />}
                  onClick={handleSendRequest}
                  disabled={testMutation.isLoading}
                  sx={{ mt: 2 }}
                >
                  {testMutation.isLoading ? 'Sending...' : 'Send Request'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Response */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: 'fit-content' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Response
                  </Typography>
                  {response && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Chip
                        label={`${responseTime}ms`}
                        size="small"
                        color="info"
                      />
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                      >
                        <ContentCopyIcon />
                      </IconButton>
                    </Box>
                  )}
                </Box>

                {response ? (
                  <Box sx={{ maxHeight: 500, overflow: 'auto' }}>
                    <JsonView
                      value={response}
                      style={{
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      height: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(148, 163, 184, 0.05)',
                      borderRadius: 1,
                      border: '1px dashed rgba(148, 163, 184, 0.3)',
                    }}
                  >
                    <Typography color="text.secondary">
                      Send a request to see the response
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Available Endpoints */}
          {specDetails && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Available Endpoints
                  </Typography>
                  
                  {specDetails.endpoints.map((endpoint) => (
                    <Accordion key={endpoint.id} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Chip
                            label={endpoint.method}
                            size="small"
                            color={getMethodColor(endpoint.method) as any}
                          />
                          <Typography sx={{ fontFamily: 'monospace', flexGrow: 1 }}>
                            {endpoint.path}
                          </Typography>
                          <Button
                            size="small"
                            startIcon={<PlayArrowIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEndpointChange(endpoint.id);
                            }}
                          >
                            Test
                          </Button>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                              Sample Response:
                            </Typography>
                            <SyntaxHighlighter
                              language="json"
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                borderRadius: 4,
                                fontSize: '12px',
                              }}
                            >
                              {endpoint.response_data}
                            </SyntaxHighlighter>
                          </Grid>
                          {endpoint.response_schema && (
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Response Schema:
                              </Typography>
                              <SyntaxHighlighter
                                language="json"
                                style={vscDarkPlus}
                                customStyle={{
                                  margin: 0,
                                  borderRadius: 4,
                                  fontSize: '12px',
                                }}
                              >
                                {endpoint.response_schema}
                              </SyntaxHighlighter>
                            </Grid>
                          )}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>
    </motion.div>
  );
};

export default ApiTesting;
