# Smart API Sandbox - Installation Guide

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)

## Installation Steps

### 1. Install Backend Dependencies

```bash
# Navigate to the project root
cd /Users/arun/development/workspace/github.com/arun0009/sandbox

# Install server dependencies
npm install

# If you encounter npm cache issues, try:
npm cache clean --force
npm install --legacy-peer-deps
```

### 2. Install Frontend Dependencies

```bash
# Navigate to client directory
cd client

# Install client dependencies
npm install --legacy-peer-deps

# If you encounter peer dependency issues, use:
npm install --force
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env file and add your OpenAI API key (optional for AI features)
# PORT=3001
# OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Start the Application

#### Option 1: Start both server and client together
```bash
# From project root
npm run dev
```

#### Option 2: Start separately
```bash
# Terminal 1 - Start server
npm run server

# Terminal 2 - Start client
cd client && npm start
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws

## Quick Start Demo

1. **Import Sample API Specs**:
   - Use the sample specs in `/sample-specs/` directory
   - Import via the UI: Specifications → Import Specification → Paste Content

2. **Test API Endpoints**:
   - Go to API Testing page
   - Select an imported specification
   - Choose an endpoint and send test requests

3. **View Analytics**:
   - Check the Analytics page for real-time insights
   - Monitor API call patterns and performance

## Troubleshooting

### NPM Cache Issues
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Port Conflicts
```bash
# Check if ports are in use
lsof -i :3000
lsof -i :3001

# Kill processes if needed
kill -9 <PID>
```

### Database Issues
```bash
# Remove database and restart
rm -rf data/
npm run server
```

## Features Overview

### Completed Features

- **OpenAPI Spec Import**: Import from URL or paste JSON/YAML
- **Stateful Mocking**: POST data persists and can be retrieved via GET
- **AI-Powered Data Generation**: Smart fake data based on schema context
- **Real-time Updates**: WebSocket notifications for API calls
- **Modern UI**: Dark theme with animations and responsive design
- **Analytics Dashboard**: Request patterns, response times, error rates
- **API Testing Interface**: Interactive testing with smart data generation

### Key Capabilities

1. **Smart Data Generation**:
   - Context-aware fake data based on field names
   - AI-enhanced responses with OpenAI integration
   - Realistic relationships between data fields

2. **Stateful Behavior**:
   - POST requests create persistent data
   - GET requests retrieve stored data
   - PUT/PATCH requests update existing records
   - DELETE requests remove data

3. **Real-time Monitoring**:
   - Live API call notifications
   - Response time tracking
   - Error rate monitoring
   - Usage analytics

4. **Developer Experience**:
   - Beautiful, modern interface
   - Syntax highlighting for JSON
   - Copy-to-clipboard functionality
   - Responsive design for all devices

## API Endpoints

### Specifications
- `POST /api/specs` - Import OpenAPI specification
- `GET /api/specs` - List all specifications
- `GET /api/specs/:id` - Get specification details
- `DELETE /api/specs/:id` - Delete specification

### Mock Endpoints
- `ALL /api/mock/*` - Dynamic mock endpoints based on imported specs

### Data & Analytics
- `GET /api/data` - Get stored mock data
- `GET /api/data/logs` - Get API call logs
- `GET /api/data/analytics` - Get usage analytics

### AI Services
- `POST /api/ai/generate-data` - Generate smart mock data
- `POST /api/ai/generate-scenarios` - Generate test scenarios
- `GET /api/ai/scenarios/:specId` - Get AI scenarios

## Sample API Specifications

The project includes sample OpenAPI specifications in `/sample-specs/`:

1. **Petstore API** (`petstore-api.json`):
   - Basic CRUD operations for pets
   - Demonstrates path parameters and request bodies

2. **User Management API** (`user-management-api.json`):
   - Comprehensive user management system
   - Authentication endpoints
   - Complex nested schemas

## Next Steps

1. Import one of the sample specifications
2. Test the endpoints using the API Testing interface
3. Observe real-time updates and analytics
4. Try the AI-powered data generation features
5. Explore the stateful mocking capabilities

For support or questions, check the README.md file or create an issue in the repository.
