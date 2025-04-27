'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have a Textarea component

export default function BrowserUseForm() {
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    console.log('Sending to API - URL:', url);
    console.log('Sending to API - Prompt:', prompt);

    try {
      const response = await fetch('/api/browser-use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.statusText}`);
      }

      setResult(JSON.stringify(data, null, 2)); // Pretty print the JSON result
    } catch (err) {
      console.error('Error interacting with browser API:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(`Failed to start interaction: ${message}`);
      setResult(null); // Clear any previous successful result
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="prompt">Prompt</Label>
        <Textarea
          id="prompt"
          placeholder="Enter instructions for the AI defender...\ne.g., Find the login button and click it."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          required
          className="mt-1 h-32"
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Interacting...' : 'Start Interaction'}
      </Button>

      {error && (
        <div className="mt-6 p-4 border rounded bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700">
          <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">Error:</h3>
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-50 dark:bg-gray-800">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm whitespace-pre-wrap bg-white dark:bg-gray-900 p-2 rounded">{result}</pre>
        </div>
      )}
    </form>
  );
} 