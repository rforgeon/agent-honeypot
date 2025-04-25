"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRuns } from "@/lib/api";

export default function RunsPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoading(true);
        const runsData = await getRuns();
        
        // Filter out round-specific runs to only show high-level runs
        const highLevelRuns = runsData.filter(run => !run.includes('_round'));
        
        setRuns(highLevelRuns);
        setError(null);
      } catch (err) {
        setError("Failed to load runs. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadRuns();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Runs</h1>
        <Link href="/runs/new">
          <Button>Start New Run</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Test Runs</CardTitle>
          <CardDescription>
            View all previous LLM honeypot testing sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-500 p-4 rounded-md">
              {error}
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-muted-foreground mb-4">No runs found</p>
              <Link href="/runs/new">
                <Button>Start First Run</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Run ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Models</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((runId) => {
                  // Extract timestamp from filename (assuming format like "run_20230422_123456.json")
                  const matches = runId.match(/(\d{8})_(\d{6})/);
                  const formattedDate = matches 
                    ? `${matches[1].slice(0, 4)}-${matches[1].slice(4, 6)}-${matches[1].slice(6, 8)} ${matches[2].slice(0, 2)}:${matches[2].slice(2, 4)}:${matches[2].slice(4, 6)}`
                    : "Unknown date";
                  
                  // Extract model information if available
                  const modelInfo = runId.includes('_vs_') 
                    ? runId.split('_vs_')[0].split('honeypot_')[1] + ' vs ' + runId.split('_vs_')[1].split('_')[0]
                    : "Unknown models";
                    
                  return (
                    <TableRow key={runId}>
                      <TableCell className="font-medium">{runId.replace(".json", "")}</TableCell>
                      <TableCell>{formattedDate}</TableCell>
                      <TableCell>{modelInfo}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/runs/${runId.replace(".json", "")}`}>
                          <Button variant="outline" size="sm">View Details</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 