import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import * as api from '../services/api';

const Analytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState('24h');

  const { data: analytics, isLoading } = useQuery(
    ['analytics', timeframe],
    () => apiService.getAnalytics(timeframe),
    { refetchInterval: 30000 }
  );

  const { data: logs } = useQuery(
    'recent-logs-analytics',
    () => apiService.getLogs({ limit: 50 }),
    { refetchInterval: 10000 }
  );

  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

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

  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (statusCode: number) => {
    if (statusCode < 300) return 'success';
    if (statusCode < 400) return 'info';
    if (statusCode < 500) return 'warning';
    return 'error';
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
            Analytics & Insights
          </Typography>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              label="Timeframe"
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {isLoading ? (
          <LinearProgress sx={{ mb: 2 }} />
        ) : (
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card sx={{ background: 'linear-gradient(135deg, #6366f115 0%, #6366f105 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Total Requests
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {analytics?.summary?.totalRequests || 0}
                        </Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card sx={{ background: 'linear-gradient(135deg, #10b98115 0%, #10b98105 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Avg Response Time
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {formatResponseTime(analytics?.summary?.avgResponseTime || 0)}
                        </Typography>
                      </Box>
                      <SpeedIcon sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card sx={{ background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b05 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Success Rate
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {analytics?.statusDistribution ? 
                            Math.round((analytics.statusDistribution.filter(s => s.status_code < 400).reduce((sum, s) => sum + s.count, 0) / 
                            analytics.statusDistribution.reduce((sum, s) => sum + s.count, 0)) * 100) : 0}%
                        </Typography>
                      </Box>
                      <CheckCircleIcon sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <motion.div variants={itemVariants}>
                <Card sx={{ background: 'linear-gradient(135deg, #ef444415 0%, #ef444405 100%)' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography color="text.secondary" gutterBottom variant="body2">
                          Error Rate
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {analytics?.statusDistribution ? 
                            Math.round((analytics.statusDistribution.filter(s => s.status_code >= 400).reduce((sum, s) => sum + s.count, 0) / 
                            analytics.statusDistribution.reduce((sum, s) => sum + s.count, 0)) * 100) : 0}%
                        </Typography>
                      </Box>
                      <ErrorIcon sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Request Timeline */}
            <Grid item xs={12} md={8}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Request Timeline
                    </Typography>
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
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Status Code Distribution */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Status Codes
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics?.statusDistribution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status_code, percent }) => `${status_code} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {analytics?.statusDistribution?.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* HTTP Methods Distribution */}
            <Grid item xs={12} md={6}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      HTTP Methods
                    </Typography>
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
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Popular Endpoints */}
            <Grid item xs={12} md={6}>
              <motion.div variants={itemVariants}>
                <Card sx={{ height: 400 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Popular Endpoints
                    </Typography>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {analytics?.popularEndpoints?.length === 0 ? (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                          No endpoint usage data available
                        </Typography>
                      ) : (
                        analytics?.popularEndpoints?.map((endpoint, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1.5,
                              borderBottom: index < (analytics.popularEndpoints?.length || 0) - 1 ? 
                                '1px solid rgba(148, 163, 184, 0.1)' : 'none',
                            }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {endpoint.endpoint}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Avg: {formatResponseTime(endpoint.avg_response_time)}
                              </Typography>
                            </Box>
                            <Chip
                              label={`${endpoint.count} calls`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          </Box>
                        ))
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Recent API Calls Table */}
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Recent API Calls
                    </Typography>
                    <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Method</TableCell>
                            <TableCell>Path</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Response Time</TableCell>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Spec</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {logs?.slice(0, 10).map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Chip
                                  label={log.method}
                                  size="small"
                                  color={
                                    log.method === 'GET' ? 'info' :
                                    log.method === 'POST' ? 'success' :
                                    log.method === 'PUT' ? 'warning' :
                                    log.method === 'DELETE' ? 'error' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                {log.path}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={log.statusCode}
                                  size="small"
                                  color={getStatusColor(log.statusCode) as any}
                                />
                              </TableCell>
                              <TableCell>{formatResponseTime(log.responseTime)}</TableCell>
                              <TableCell>
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>{log.specName || 'Unknown'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {logs?.length === 0 && (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">
                          No API calls recorded yet
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        )}
      </Box>
    </motion.div>
  );
};

export default Analytics;
