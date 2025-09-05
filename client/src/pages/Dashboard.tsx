import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Button,
} from '@mui/material';
import {
  Api as ApiIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api.ts';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: specs, isLoading: specsLoading } = useQuery('specs', api.getSpecs);
  const { data: analytics, isLoading: analyticsLoading } = useQuery('analytics', () => 
    apiService.getAnalytics('24h')
  );
  const { data: logs, isLoading: logsLoading } = useQuery('recent-logs', () =>
    apiService.getLogs({ limit: 10 })
  );

  const statsCards = [
    {
      title: 'API Specifications',
      value: specs?.length || 0,
      icon: <ApiIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      change: '+2 this week',
    },
    {
      title: 'Total Requests',
      value: analytics?.summary?.totalRequests || 0,
      icon: <TrendingUpIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
      change: `${analytics?.summary?.totalRequests || 0} today`,
    },
    {
      title: 'Avg Response Time',
      value: `${analytics?.summary?.avgResponseTime || 0}ms`,
      icon: <SpeedIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      change: analytics?.summary?.avgResponseTime < 500 ? 'Excellent' : 'Good',
    },
    {
      title: 'Stored Records',
      value: '0', // Will be updated with actual data
      icon: <StorageIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
      change: 'Stateful mocking',
    },
  ];

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
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Dashboard
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/specifications')}
            >
              Import API Spec
            </Button>
            <IconButton>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Stats Cards */}
          {statsCards.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={stat.title}>
              <motion.div variants={itemVariants}>
                <Card
                  sx={{
                    height: '100%',
                    background: `linear-gradient(135deg, ${stat.color}15 0%, ${stat.color}05 100%)`,
                    border: `1px solid ${stat.color}30`,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          {stat.title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                          {stat.value}
                        </Typography>
                        <Chip
                          label={stat.change}
                          size="small"
                          sx={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                        />
                      </Box>
                      <Box sx={{ color: stat.color, opacity: 0.7 }}>
                        {stat.icon}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}

          {/* Request Timeline Chart */}
          <Grid item xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Request Timeline
                  </Typography>
                  {analyticsLoading ? (
                    <LinearProgress />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics?.hourlyDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis 
                          dataKey="hour" 
                          stroke="rgba(148, 163, 184, 0.5)"
                          fontSize={12}
                        />
                        <YAxis stroke="rgba(148, 163, 184, 0.5)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 8,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#6366f1"
                          strokeWidth={3}
                          dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Method Distribution */}
          <Grid item xs={12} md={4}>
            <motion.div variants={itemVariants}>
              <Card sx={{ height: 400 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    HTTP Methods
                  </Typography>
                  {analyticsLoading ? (
                    <LinearProgress />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics?.methodDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                        <XAxis 
                          dataKey="method" 
                          stroke="rgba(148, 163, 184, 0.5)"
                          fontSize={12}
                        />
                        <YAxis stroke="rgba(148, 163, 184, 0.5)" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 8,
                          }}
                        />
                        <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Recent API Calls */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Recent API Calls
                  </Typography>
                  {logsLoading ? (
                    <LinearProgress />
                  ) : (
                    <Box>
                      {logs?.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography color="text.secondary">
                            No API calls yet. Import a specification and start testing!
                          </Typography>
                          <Button
                            variant="contained"
                            sx={{ mt: 2 }}
                            onClick={() => navigate('/specifications')}
                          >
                            Get Started
                          </Button>
                        </Box>
                      ) : (
                        logs?.map((log: any, index: number) => (
                          <Box
                            key={log.id}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              py: 2,
                              borderBottom: index < logs.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Chip
                                label={log.method}
                                size="small"
                                color={log.method === 'GET' ? 'info' : log.method === 'POST' ? 'success' : 'warning'}
                              />
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {log.path}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Chip
                                label={log.statusCode}
                                size="small"
                                color={log.statusCode < 400 ? 'success' : 'error'}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {log.responseTime}ms
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </Typography>
                            </Box>
                          </Box>
                        ))
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default Dashboard;
