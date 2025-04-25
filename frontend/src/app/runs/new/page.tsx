"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startRun, getConfig, Config } from "@/lib/api";
import { RunLogs } from "@/components/run-logs";
import { Loader2 } from "lucide-react";

export default function NewRunPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("config");
  const [runId, setRunId] = useState<string>("");
  const [runInProgress, setRunInProgress] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadConfig() {
      try {
        setConfigLoading(true);
        setConfigError(null);
        const fetchedConfig = await getConfig();
        setConfig(fetchedConfig);
      } catch (err: any) {
        setConfigError(err.message || "Failed to load configuration.");
        console.error("Config fetch error:", err);
      } finally {
        setConfigLoading(false);
      }
    }
    loadConfig();
  }, []);
  
  async function handleStartRun() {
    try {
      setIsStarting(true);
      setError(null);
      
      // Start the run
      const result = await startRun();
      
      // Use the actual run ID returned by the backend
      setRunId(result.run_id);
      setRunInProgress(true);
      setActiveTab("logs");
      setIsStarting(false);
    } catch (err: any) {
      setError(err.message || "Failed to start run. Please try again later.");
      console.error(err);
      setIsStarting(false);
    }
  }
  
  // Handle completion of the run
  const handleRunComplete = () => {
    setRunInProgress(false);
  }
  
  // Navigate to the run details once completed
  const handleViewResults = () => {
    if (runId) {
      router.push(`/runs/${runId}`);
    }
  }

  // Helper to display config values or loading/error state
  const renderConfigValue = (value: React.ReactNode | undefined, defaultValue: string = "Loading...") => {
    if (configLoading) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (configError) return <span className="text-destructive text-xs">Error</span>;
    return value ?? defaultValue;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Start New Run</h1>
        <Link href="/runs">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Display config loading error prominently if it occurs */}
      {configError && !configLoading && (
        <Alert variant="destructive">
          <AlertDescription>Could not load run configuration: {configError}</AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          {runInProgress && <TabsTrigger value="logs">Run Logs</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Run Configuration</CardTitle>
              <CardDescription>
                Current settings based on config.yaml. Use the 'Start Run' button below or 
                <Link href="/config" className="underline text-primary mx-1">modify configuration</Link> 
                first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8"> {/* Main content spacing */} 
                {/* Attacker/Defender Model Section */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Attacker */} 
                  <div> 
                    <h3 className="text-lg font-medium mb-4">Attacker Model</h3>
                    <div className="space-y-2">
                      <div className="rounded-md bg-muted p-4">
                        <div className="text-sm font-medium">Provider</div>
                        <div className="text-2xl">
                          {renderConfigValue(config?.attacker_model?.provider)}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted p-4">
                        <div className="text-sm font-medium">Model</div>
                         <div className="text-2xl">
                          {renderConfigValue(config?.attacker_model?.model_name)}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Defender */}
                  <div> 
                    <h3 className="text-lg font-medium mb-4">Defender Model</h3>
                    <div className="space-y-2">
                      <div className="rounded-md bg-muted p-4">
                        <div className="text-sm font-medium">Provider</div>
                        <div className="text-2xl">
                          {renderConfigValue(config?.defender_model?.provider)}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted p-4">
                        <div className="text-sm font-medium">Model</div>
                        <div className="text-2xl">
                           {renderConfigValue(config?.defender_model?.model_name)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div> {/* End Attacker/Defender Grid */} 
                
                {/* Run Settings Section */}
                <div> 
                  <h3 className="text-lg font-medium mb-4">Run Settings</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-md bg-muted p-4">
                      <div className="text-sm font-medium">Iterations</div>
                       <div className="text-2xl">
                         {renderConfigValue(config?.iterations)}
                       </div>
                    </div>
                    <div className="rounded-md bg-muted p-4">
                      <div className="text-sm font-medium">Attack Chains</div>
                      <div className="text-2xl capitalize">
                        {renderConfigValue(config?.attacker_model?.use_attack_chains ? "Enabled" : "Disabled")}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted p-4">
                      <div className="text-sm font-medium">Reasoning Request</div>
                      <div className="text-2xl capitalize">
                        {renderConfigValue(config?.reasoning_request_mode)}
                      </div>
                    </div>
                  </div>
                </div> {/* End Run Settings Section */} 
                
                {/* Action Button Section */}
                <div className="pt-4 flex justify-end"> 
                   <Button 
                     disabled={isStarting || runInProgress || configLoading || !!configError} // Disable if loading/error
                     onClick={handleStartRun}
                     className="w-40"
                     title={configError ? "Cannot start run: Configuration failed to load" : ""}
                   >
                     {isStarting ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Starting...
                       </>
                     ) : "Start Run"}
                   </Button>
                </div> {/* End Action Button Section */} 
              </div> {/* End Main content spacing */} 
            </CardContent>
          </Card> 
        </TabsContent>
        
        {/* Logs Tab Content */} 
        <TabsContent value="logs">
           <div className="space-y-4">
            <RunLogs 
              runId={runId} 
              isRunning={runInProgress} 
              onComplete={handleRunComplete} 
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleViewResults} 
                disabled={runInProgress}
                className="w-40"
              >
                View Results
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs> 
    </div> // Closing div for space-y-6 at root
  );
} 