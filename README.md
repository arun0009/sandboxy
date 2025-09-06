# Sandboxy

A smart, stateful API sandbox that turns your OpenAPI specs into realistic mock endpoints — with optional AI-powered data generation and persistent responses. Perfect for frontend development, testing, and rapid API prototyping.


## Features

- **Multi-API Integration**: Import and connect multiple OpenAPI specifications
- **Smart Data**: Intelligent fake data generation with realistic context
- **Stateful Mocking**: Persistent data storage - POST data is retrievable via GET
- **Modern UI**: Interface for API testing
- **Live Testing**: Real-time API endpoint testing
- **Mock Management**: Easy mock server status and log monitoring
- **Quick Testing**: Built-in API tester for immediate validation

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   # Add your OpenAI API key for AI features (optional)
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:3001`

## Architecture

- **Backend**: Node.js + Express with Mockoon CLI for stateful mocking
- **Frontend**: Modern UI (lightweight, responsive)
- **Mock Engine**: Mockoon-powered stateful mocking with OpenAPI spec support
- **Data Generation**: Smart realistic data generation for testing

## Usage

1. Import your OpenAPI specifications
2. Get instant mock endpoints with stateful data
3. Test your APIs with the built-in tester
4. Monitor mock server status and logs
5. Use realistic generated data for testing

## API Endpoints

### Spec Management
- `POST /api/specs` - Import OpenAPI specification
- `GET /api/specs` - List all imported specs

### Mock API Access
- `GET /api/mock/*` - Dynamic mock endpoints (returns arrays for collections)
- `POST /api/mock/*` - Create resources with realistic generated data
- `PUT /api/mock/*` - Update existing resources
- `DELETE /api/mock/*` - Delete resources
- `GET /api/mock/{resource}/{id}` - Get specific resource by ID

### Server Management
- `GET /api/mockoon/*` - Check mock server status and logs
- `GET /health` - Server health check

## Using Mock APIs via cURL

### 1. Load an OpenAPI Specification
```bash
# Load Pet Store API spec
curl -X POST "http://localhost:3001/api/specs" \
  -H "Content-Type: application/json" \
  -d @sample-specs/petstore-api.json
```

### 2. Access Mock Endpoints
```bash
# POST new pet
curl -X POST "http://localhost:3001/api/mock/pet" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cooper Jaiswal",
    "status": "unavailable"
  }'

# GET specific pet by ID
curl -X GET "http://localhost:3001/api/mock/pet/19498" \
  -H "Content-Type: application/json"

# PUT update pet
curl -X PUT "http://localhost:3001/api/mock/pet/27678" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cosmo Backer",
    "status": "sold"
  }'
```

### 3. Mock Data Features
- **Schema-aware**: Generates data matching OpenAPI schema constraints
- **Stateful**: POST data persists and is returned by GET requests
- **Realistic**: Uses contextual data generation (pet names, realistic IDs, etc.)
- **Constraint-compliant**: Respects minLength, maxLength, enums, patterns, etc.
- **Generic**: Works with any OpenAPI specification, not just Pet Store

## Contributing

Sandboxy makes API development faster by providing instant, stateful mock endpoints from your OpenAPI specs. Perfect for frontend development, testing, and API prototyping.
