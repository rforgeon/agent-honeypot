import { NextRequest, NextResponse } from 'next/server';

// Define the API base URL - can be changed based on environment
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, prompt } = body;

    if (!url || !prompt) {
      return NextResponse.json({ error: 'URL and prompt are required' }, { status: 400 });
    }

    console.log('API received URL:', url);
    console.log('API received Prompt:', prompt);

    // Select API provider based on available keys
    let provider = 'openai'; // Default to OpenAI
    if (!process.env.OPENAI_API_KEY && process.env.ANTHROPIC_API_KEY) {
      provider = 'anthropic';
    }

    console.log(`Initiating Browser Use interaction via backend for: ${url} using ${provider}`);
    
    // Call the Python backend
    const response = await fetch(`${API_BASE_URL}/api/browser-use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        prompt,
        provider,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API Error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Browser Use Backend Response:', data);

    // Return the data from the backend
    return NextResponse.json(data.data);

  } catch (error) {
    console.error('Error in /api/browser-use:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: 'Failed to process browser interaction', 
      details: errorMessage
    }, { status: 500 });
  }
} 