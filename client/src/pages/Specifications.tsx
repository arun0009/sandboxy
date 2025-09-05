import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Api as ApiIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import * as api from '../services/api.ts';

const Specifications: React.FC = () => {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importType, setImportType] = useState<'url' | 'file'>('url');
  const [specName, setSpecName] = useState('');
  const [specUrl, setSpecUrl] = useState('');
  const [specFile, setSpecFile] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: specs, isLoading, error } = useQuery('specs', apiService.getSpecs);

  const importMutation = useMutation(apiService.importSpec, {
    onSuccess: () => {
      queryClient.invalidateQueries('specs');
      setImportDialogOpen(false);
      resetForm();
      toast.success('API specification imported successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to import specification');
    },
  });

  const deleteMutation = useMutation(apiService.deleteSpec, {
    onSuccess: () => {
      queryClient.invalidateQueries('specs');
      toast.success('Specification deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete specification');
    },
  });

  const generateScenariosMutation = useMutation(apiService.generateScenarios, {
    onSuccess: (data) => {
      toast.success(`Generated ${data.scenarios.length} test scenarios`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate scenarios');
    },
  });

  const resetForm = () => {
    setSpecName('');
    setSpecUrl('');
    setSpecFile('');
  };

  const handleImport = () => {
    if (!specName.trim()) {
      toast.error('Please enter a specification name');
      return;
    }

    if (importType === 'url' && !specUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    if (importType === 'file' && !specFile.trim()) {
      toast.error('Please provide the specification content');
      return;
    }

    const importData: any = { name: specName.trim() };
    
    if (importType === 'url') {
      importData.url = specUrl.trim();
    } else {
      try {
        importData.spec = JSON.parse(specFile);
      } catch (error) {
        toast.error('Invalid JSON format');
        return;
      }
    }

    importMutation.mutate(importData);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, specId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedSpec(specId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSpec(null);
  };

  const handleDelete = () => {
    if (selectedSpec) {
      deleteMutation.mutate(selectedSpec);
    }
    handleMenuClose();
  };

  const handleGenerateScenarios = () => {
    if (selectedSpec) {
      generateScenariosMutation.mutate(selectedSpec);
    }
    handleMenuClose();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Failed to load specifications. Please check your connection and try again.
      </Alert>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            API Specifications
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setImportDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Import Specification
          </Button>
        </Box>

        {isLoading ? (
          <LinearProgress sx={{ mb: 2 }} />
        ) : (
          <Grid container spacing={3}>
            <AnimatePresence>
              {specs?.map((spec: ApiSpec) => (
                <Grid item xs={12} sm={6} md={4} key={spec.id}>
                  <motion.div
                    variants={itemVariants}
                    layout
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)',
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ApiIcon sx={{ color: 'primary.main' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {spec.name}
                            </Typography>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, spec.id)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>

                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {spec.description || 'No description available'}
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                          <Chip
                            label={`v${spec.version}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={`${spec.endpoint_count} endpoints`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        </Box>

                        <Typography variant="caption" color="text.secondary">
                          Imported {new Date(spec.created_at).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>

            {specs?.length === 0 && (
              <Grid item xs={12}>
                <motion.div variants={itemVariants}>
                  <Card sx={{ textAlign: 'center', py: 6 }}>
                    <CardContent>
                      <CloudUploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        No API Specifications Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Import your first OpenAPI specification to get started with smart mocking
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setImportDialogOpen(true)}
                      >
                        Import Your First Spec
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )}
          </Grid>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleMenuClose}>
            <VisibilityIcon sx={{ mr: 1 }} />
            View Details
          </MenuItem>
          <MenuItem 
            onClick={handleGenerateScenarios}
            disabled={generateScenariosMutation.isLoading}
          >
            <PsychologyIcon sx={{ mr: 1 }} />
            Generate AI Scenarios
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Import Dialog */}
        <Dialog
          open={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Import API Specification
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Import an OpenAPI/Swagger specification from a URL or by pasting the JSON/YAML content
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Button
                variant={importType === 'url' ? 'contained' : 'outlined'}
                onClick={() => setImportType('url')}
                size="small"
              >
                From URL
              </Button>
              <Button
                variant={importType === 'file' ? 'contained' : 'outlined'}
                onClick={() => setImportType('file')}
                size="small"
              >
                Paste Content
              </Button>
            </Box>

            <TextField
              fullWidth
              label="Specification Name"
              value={specName}
              onChange={(e) => setSpecName(e.target.value)}
              sx={{ mb: 2 }}
              placeholder="e.g., Petstore API, User Management API"
            />

            {importType === 'url' ? (
              <TextField
                fullWidth
                label="OpenAPI Specification URL"
                value={specUrl}
                onChange={(e) => setSpecUrl(e.target.value)}
                placeholder="https://petstore.swagger.io/v2/swagger.json"
                helperText="Enter the URL to your OpenAPI/Swagger specification"
              />
            ) : (
              <TextField
                fullWidth
                label="Specification Content"
                value={specFile}
                onChange={(e) => setSpecFile(e.target.value)}
                multiline
                rows={10}
                placeholder="Paste your OpenAPI/Swagger JSON or YAML content here..."
                helperText="Paste the complete OpenAPI specification content"
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              disabled={importMutation.isLoading}
            >
              {importMutation.isLoading ? 'Importing...' : 'Import'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default Specifications;
