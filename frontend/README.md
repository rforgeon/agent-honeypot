# LLM Honeypot Platform - Frontend

This is the frontend interface for the LLM Honeypot Platform, a tool that creates a testing environment where one LLM (the "attacker") attempts to generate prompts (honeypots) to trick another LLM (the "defender") into generating misaligned or unsafe responses.

## Tech Stack

- **Next.js**: React framework for the application
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: A set of accessible and customizable UI components
- **TypeScript**: For type-safe code

## Features

- **Dashboard**: Overview of the platform with key metrics
- **Run Management**: Start, monitor, and review test runs
- **Run Details**: Detailed view of test interactions with analysis
- **Configuration**: Configure models, API keys, and test parameters

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- Running backend API (see main project README)

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
```

## Backend API

The frontend connects to a Flask backend API running on port 8000. Make sure the backend server is running before using the frontend.

## Pages

- `/`: Dashboard with overview
- `/runs`: List of all test runs
- `/runs/[id]`: Detailed information about a specific run
- `/runs/new`: Start a new run
- `/config`: Configure the application settings

## API Integration

The frontend integrates with the following backend API endpoints:

- `GET /api/runs`: Get list of all runs
- `GET /api/runs/{run_id}`: Get details of a specific run
- `GET /api/config`: Get current configuration
- `POST /api/config`: Update configuration
- `POST /api/run/start`: Start a new run
- `GET /api/run/{run_id}/status`: Get status of a run
- `POST /api/run/{run_id}/stop`: Stop a running run

## Contributing

Please follow the shadcn/ui component architecture and maintain the existing coding style.
