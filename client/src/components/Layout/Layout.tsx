import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Api as ApiIcon,
  PlayArrow as PlayArrowIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  CloudUpload as CloudUploadIcon,
  WifiTethering as WifiTetheringIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../contexts/WebSocketContext';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isConnected } = useWebSocket();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'API Specifications', icon: <ApiIcon />, path: '/specifications' },
    { text: 'API Testing', icon: <PlayArrowIcon />, path: '/testing' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
              API Sandbox
            </Typography>
          </Box>
        </motion.div>
      </Toolbar>
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Chip
          icon={<WifiTetheringIcon />}
          label={isConnected ? 'Connected' : 'Disconnected'}
          color={isConnected ? 'success' : 'error'}
          variant="outlined"
          size="small"
          sx={{ width: '100%' }}
        />
      </Box>
      
      <List>
        {menuItems.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ListItem disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: location.pathname === item.path ? 'white' : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          </motion.div>
        ))}
      </List>
      
      <Divider sx={{ mt: 2 }} />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Smart API Sandbox v1.0.0
        </Typography>
        <br />
        <Typography variant="caption" color="text.secondary">
          AI-Powered API Testing
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        }}
        elevation={0}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {menuItems.find(item => item.path === location.pathname)?.text || 'Dashboard'}
          </Typography>
          <Badge
            color={isConnected ? 'success' : 'error'}
            variant="dot"
            sx={{ mr: 2 }}
          >
            <WifiTetheringIcon />
          </Badge>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'background.paper',
              borderRight: '1px solid rgba(148, 163, 184, 0.1)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'background.paper',
              borderRight: '1px solid rgba(148, 163, 184, 0.1)',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
