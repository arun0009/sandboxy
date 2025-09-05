import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState({
    openaiApiKey: '',
    defaultResponseDelay: 0,
    enableAiGeneration: true,
    enableRealTimeUpdates: true,
    maxLogRetention: 30,
    enableCors: true,
    corsOrigins: 'http://localhost:3000',
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    // In a real app, this would save to backend
    localStorage.setItem('sandboxSettings', JSON.stringify(settings));
    setUnsavedChanges(false);
    toast.success('Settings saved successfully!');
  };

  const handleReset = () => {
    const defaultSettings = {
      openaiApiKey: '',
      defaultResponseDelay: 0,
      enableAiGeneration: true,
      enableRealTimeUpdates: true,
      maxLogRetention: 30,
      enableCors: true,
      corsOrigins: 'http://localhost:3000',
    };
    setSettings(defaultSettings);
    setUnsavedChanges(true);
    toast.success('Settings reset to defaults');
  };

  const handleExportConfig = () => {
    const config = {
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sandbox-config.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Configuration exported!');
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportConfig}
            >
              Export Config
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!unsavedChanges}
            >
              Save Changes
            </Button>
          </Box>
        </Box>

        {unsavedChanges && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have unsaved changes. Don't forget to save your settings.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* AI Configuration */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    AI Configuration
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableAiGeneration}
                        onChange={(e) => handleSettingChange('enableAiGeneration', e.target.checked)}
                      />
                    }
                    label="Enable AI-powered data generation"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="OpenAI API Key"
                    type="password"
                    value={settings.openaiApiKey}
                    onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                    helperText="Required for AI-powered features. Your key is stored locally."
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ p: 2, backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>AI Features:</strong> Smart data generation, contextual responses, 
                      test scenario creation, and API usage insights.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Mock Server Configuration */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Mock Server
                  </Typography>

                  <TextField
                    fullWidth
                    label="Default Response Delay (ms)"
                    type="number"
                    value={settings.defaultResponseDelay}
                    onChange={(e) => handleSettingChange('defaultResponseDelay', parseInt(e.target.value) || 0)}
                    helperText="Add artificial delay to simulate real API response times"
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableCors}
                        onChange={(e) => handleSettingChange('enableCors', e.target.checked)}
                      />
                    }
                    label="Enable CORS"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="CORS Origins"
                    value={settings.corsOrigins}
                    onChange={(e) => handleSettingChange('corsOrigins', e.target.value)}
                    helperText="Comma-separated list of allowed origins"
                    disabled={!settings.enableCors}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Real-time Features */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Real-time Features
                  </Typography>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableRealTimeUpdates}
                        onChange={(e) => handleSettingChange('enableRealTimeUpdates', e.target.checked)}
                      />
                    }
                    label="Enable WebSocket updates"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ p: 2, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Real-time updates provide live notifications for API calls, 
                      data changes, and system events.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Data Management */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Data Management
                  </Typography>

                  <TextField
                    fullWidth
                    label="Log Retention (days)"
                    type="number"
                    value={settings.maxLogRetention}
                    onChange={(e) => handleSettingChange('maxLogRetention', parseInt(e.target.value) || 30)}
                    helperText="How long to keep API call logs and analytics data"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                    >
                      Clear All Logs
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<DeleteIcon />}
                    >
                      Clear Mock Data
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* System Information */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    System Information
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          1.0.0
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Version
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                          Online
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                          5000
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Server Port
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                          SQLite
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Database
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip label="Node.js Backend" color="success" variant="outlined" />
                    <Chip label="React Frontend" color="info" variant="outlined" />
                    <Chip label="WebSocket Support" color="primary" variant="outlined" />
                    <Chip label="AI Integration" color="secondary" variant="outlined" />
                    <Chip label="OpenAPI Compatible" color="warning" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default Settings;
