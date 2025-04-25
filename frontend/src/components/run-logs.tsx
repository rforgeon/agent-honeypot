"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { getRunLogs, getRunStatus } from "@/lib/api";

// Assuming RunLogsResponse now includes current_line_count
interface RunLogsResponse {
  logs: string[];
  is_running: boolean;
  current_line_count: number;
}

interface RunLogsProps {
  runId: string;
  isRunning: boolean;
  onComplete?: () => void;
}

export function RunLogs({ runId, isRunning: initialIsRunning, onComplete }: RunLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(initialIsRunning);
  const [lastLineRead, setLastLineRead] = useState<number>(0); // Track last read line
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const shouldScroll = useRef(true); // Ref to manage auto-scrolling state

  // Handle scroll event to pause auto-scrolling if user scrolls up
  const handleScroll = useCallback(() => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
      // Check if scrolled to the bottom (with a small tolerance)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 5;
      shouldScroll.current = isAtBottom;
    }
  }, []);

  // Auto-scroll to bottom whenever logs change, if enabled
  useEffect(() => {
    if (shouldScroll.current && scrollAreaRef.current && logs.length > 0) {
      const scrollContainer = scrollAreaRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [logs]); // Only depends on logs

  // Check run status
  useEffect(() => {
    if (!runId || !initialIsRunning) return;

    let isMounted = true; // Track mount status
    const checkStatus = async () => {
      try {
        const status = await getRunStatus(runId);
        if (isMounted && typeof status.is_running === 'boolean') {
          setIsRunning(status.is_running);
          if (!status.is_running && onComplete) {
            onComplete();
          }
        }
      } catch (err) {
        if (isMounted) {
           console.error("Failed to check run status:", err);
           // Optionally set an error state here if needed
        }
      }
    };

    // Check status every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    return () => {
      isMounted = false; // Cleanup on unmount
      clearInterval(interval);
    };
  }, [runId, initialIsRunning, onComplete]);

  // Fetch logs periodically
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const fetchLogs = async () => {
      try {
        if (!runId) return;

        console.log(`Fetching logs for ${runId} since line ${lastLineRead}`);
        const logData: RunLogsResponse = await getRunLogs(runId, lastLineRead); // Pass lastLineRead
        console.log(`Received ${logData.logs?.length || 0} new log lines. Current total: ${logData.current_line_count}`);

        if (isMounted) {
          if (logData.logs && logData.logs.length > 0) {
            setLogs(prevLogs => [...prevLogs, ...logData.logs]); // Append new logs
            // Auto-scroll *after* state update if needed (handled by separate useEffect)
          }
          setLastLineRead(logData.current_line_count); // Update last read line count

          if (typeof logData.is_running === 'boolean') {
             setIsRunning(logData.is_running);
             if (!logData.is_running) {
                 if (onComplete) onComplete();
                 if (interval) clearInterval(interval); // Stop polling if run finished
                 interval = null;
             }
          }
          setLoading(false); // Set loading false after first successful fetch
          setError(null); // Clear previous errors
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to fetch logs:", err);
          setError(err.message || "Failed to fetch logs");
          setLoading(false);
          if (interval) clearInterval(interval); // Stop polling on error
          interval = null;
        }
      }
    };

    // Initial fetch immediately
    fetchLogs();

    // Set up polling if run is still in progress
    if (initialIsRunning) {
      interval = setInterval(fetchLogs, 1500); // Poll slightly faster (e.g., 1.5 seconds)
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  // Rerun effect only if runId changes or the run *starts* as running
  // We manage polling interval based on the isRunning state *inside* the effect
  }, [runId, initialIsRunning, onComplete, lastLineRead]);

  // --- Render --- 

  if (loading && logs.length === 0) { // Show loading state only on initial load
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Run Logs...
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            Fetching initial run logs...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && logs.length === 0) { // Show error only if we couldn't load initial logs
    return (
      <Card>
        <CardHeader>
          <CardTitle>Run Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {/* Show spinner only if actively running */}
          {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
          Run Logs {isRunning ? "(Live)" : "(Completed)"}
          {error && <span className="ml-2 text-xs text-destructive">(Error fetching updates)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea 
          className="h-80 bg-black/90 rounded-md p-4 font-mono text-xs text-white whitespace-pre-wrap overflow-auto"
          ref={scrollAreaRef}
          onScroll={handleScroll} // Attach scroll handler
        >
          {logs.length > 0 ? (
            logs.map((log, index) => (
              // Use a more stable key if possible, but index is fallback
              <div key={`${runId}-log-${index}`} className="mb-1 min-h-[1em]"> 
                {log.replace(/\n$/, '')} {/* Remove trailing newline often added by readlines */} 
              </div>
            ))
          ) : (
            <div className="text-gray-400">No logs available yet...</div>
          )}
          
          {/* Blinking cursor only if actively running */}
          {isRunning && (
            <div className="h-4 mb-2">
              <span className="inline-block w-2 h-4 bg-green-500 animate-pulse"></span>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 