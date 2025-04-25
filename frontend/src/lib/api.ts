const API_BASE_URL = 'http://localhost:8000/api';

export interface Run {
  id: string;
  timestamp: string;
  status: 'completed' | 'running' | 'failed';
  iterations: number;
  interactions: any[];
}

export interface Config {
  iterations: number;
  api_keys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
  attacker_model: {
    provider: string;
    model_name: string;
    temperature?: number;
    use_attack_chains?: boolean;
  };
  defender_model: {
    provider: string;
    model_name: string;
    temperature?: number;
  };
  results_dir: string;
  reasoning_request_mode?: 'always' | 'detected' | 'never';
}

interface RunLogsResponse {
  logs: string[];
  is_running: boolean;
  current_line_count: number;
}

// API Functions
export async function getRuns(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/runs`);
  if (!response.ok) {
    throw new Error('Failed to fetch runs');
  }
  const data = await response.json();
  return data.data.runs;
}

export async function getRunResult(runId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/runs/${runId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch run ${runId}`);
  }
  const data = await response.json();
  return data.data;
}

export async function getConfig(): Promise<Config> {
  const response = await fetch(`${API_BASE_URL}/config`);
  if (!response.ok) {
    throw new Error('Failed to fetch config');
  }
  const data = await response.json();
  return data.data;
}

export async function updateConfig(config: Config): Promise<Config> {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to update config');
  }
  const data = await response.json();
  return data.data;
}

export async function startRun(): Promise<{ run_id: string }> {
  const response = await fetch(`${API_BASE_URL}/run/start`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to start run');
  }
  const data = await response.json();
  
  // Handle the placeholder run ID
  const runId = data.data.run_id;
  if (runId === 'new_run_placeholder') {
    // If we got a placeholder, wait a moment for the backend to set up the actual run
    // Then redirect to the runs list instead of a specific run
    return { run_id: '' };
  }
  
  return data.data;
}

export async function getRunStatus(runId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/run/${runId}/status`);
  if (!response.ok) {
    throw new Error(`Failed to fetch status for run ${runId}`);
  }
  const data = await response.json();
  return data.data;
}

export async function stopRun(runId: string): Promise<{ stopped: boolean }> {
  const response = await fetch(`${API_BASE_URL}/run/${runId}/stop`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to stop run ${runId}`);
  }
  const data = await response.json();
  return data.data;
}

export async function getRunLogs(runId: string, sinceLine: number = 0): Promise<RunLogsResponse> {
  const response = await fetch(`${API_BASE_URL}/run/${runId}/logs?since_line=${sinceLine}`);
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(`Failed to fetch logs for run ${runId}. Status: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || `API returned success=false for run ${runId} logs.`);
  }
  return {
    logs: data.data.logs || [],
    is_running: data.data.is_running ?? false,
    current_line_count: data.data.current_line_count ?? 0
  };
} 