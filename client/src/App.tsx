import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import Layout from './components/Layout/Layout.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Specifications from './pages/Specifications.tsx';
import ApiTesting from './pages/ApiTesting.tsx';
import Analytics from './pages/Analytics.tsx';
import Settings from './pages/Settings.tsx';
import { WebSocketProvider } from './contexts/WebSocketContext.tsx';

function App() {
  return (
    <WebSocketProvider>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Layout>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ width: '100%' }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/specifications" element={<Specifications />} />
              <Route path="/testing" element={<ApiTesting />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </motion.div>
        </Layout>
      </Box>
    </WebSocketProvider>
  );
}

export default App;
