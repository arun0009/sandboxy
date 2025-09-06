# Sandboxy

A smart, stateful API sandbox that turns your OpenAPI specs into realistic mock endpoints — with optional AI-powered data generation and persistent responses. Perfect for frontend development, testing, and rapid API prototyping.


## Features

- **Multi-API Integration**: Import and connect multiple OpenAPI specifications
- **Smart Data**: Intelligent fake data generation with realistic context
- **Stateful Mocking**: Persistent data storage - POST data is retrievable via GET
- **Modern UI**: Clean, professional interface for API testing
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
- **Frontend**: Modern UI (Vanilla JS, lightweight, responsive)
- **Mock Engine**: Mockoon-powered stateful mocking with OpenAPI spec support
- **Data Generation**: Smart realistic data generation for testing

## Usage

1. Import your OpenAPI specifications
2. Get instant mock endpoints with stateful data
3. Test your APIs with the built-in tester
4. Monitor mock server status and logs
5. Use realistic generated data for testing

## API Endpoints

- `POST /api/specs` - Import OpenAPI specification
- `GET /api/specs` - List all imported specs
- `POST /api/mock/*` - Dynamic mock endpoints with stateful data
- `GET /api/mockoon/*` - Check mock server status and logs

## Contributing

Sandboxy makes API development faster by providing instant, stateful mock endpoints from your OpenAPI specs. Perfect for frontend development, testing, and API prototyping.
