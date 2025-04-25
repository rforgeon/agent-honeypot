"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getRunResult } from "@/lib/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, XCircle, MinusCircle, HelpCircle, ArrowRight, User, Bot, Cog, TestTube2, BarChart } from "lucide-react";

// --- Interfaces (Ensure these match your actual JSON structure) ---

interface MetaEvalResult {
  is_aligned?: boolean;
  confidence?: number;
  explanation?: string;
  harm_category?: string | null;
  compliance_level?: 'full_compliance' | 'partial_compliance' | 'refusal' | string;
}

interface AnalysisResult {
  alignment_status?: 'aligned' | 'misaligned' | 'refusal' | string;
  confidence?: number;
  refusal_detected?: boolean;
  reasoning_detected?: boolean;
  harm_categories_detected?: string[];
  harmful_output_detected?: string[];
  potential_issues?: string[];
  meta_eval_result?: MetaEvalResult;
  detailed_analysis?: Record<string, unknown>;
}

interface HistoryItem {
  round: number;
  speaker: 'attacker' | 'defender' | 'system';
  model_provider?: string;
  model_name?: string;
  prompt?: string;
  response?: string;
  action?: 'request_reasoning' | 'provide_reasoning' | string;
  reasoning_response?: string;
  timestamp: string;
  analysis?: AnalysisResult; // Analysis of defender response
  reasoning_analysis?: AnalysisResult; // Analysis of defender reasoning
}

interface Vulnerability {
  name: string;
  severity?: 'high' | 'medium' | 'low';
  category?: string;
  description: string;
  success_rate?: number;
  examples?: string[];
  mitigation?: string;
}

interface RunMetadata {
  timestamp?: string;
  attacker_model?: {
    provider?: string;
    model_name?: string;
    use_attack_chains?: boolean;
    start_with_chain?: boolean;
    chain_type?: string | null;
    role?: string;
    temperature?: number;
  };
  defender_model?: {
    provider?: string;
    model_name?: string;
    role?: string;
    temperature?: number;
  };
  iterations?: number;
  current_round?: number | string;
  run_duration?: number | string;
  success_rate?: number;
}

interface RunConfig {
  iterations?: number;
  api_keys?: Record<string, string>;
  attacker_model?: RunMetadata['attacker_model'];
  defender_model?: RunMetadata['defender_model'];
  analyzer_model?: {
    provider?: string;
    model_name?: string;
    temperature?: number;
    max_tokens?: number;
    role?: string;
  };
  results_dir?: string;
  attacker_initial_prompt?: string;
  defender_initial_prompt?: string;
  reasoning_request_mode?: string;
}

interface RunSummary {
  vulnerabilities?: Vulnerability[];
  key_findings?: string[];
  recommendations?: string[];
  [key: string]: unknown;
}

interface RunDataType {
  metadata: RunMetadata;
  config?: RunConfig;
  history: HistoryItem[];
  summary?: RunSummary;
}

interface OverallStats {
  totalResponses: number;
  aligned: number;
  misaligned: number;
  refusal: number;
  totalReasoning: number;
  reasoningAligned: number;
  reasoningMisaligned: number;
  reasoningRefusal: number;
}

interface MisalignmentHotspot {
  round: number;
  type: 'response' | 'reasoning';
  prompt: string; // Attacker prompt leading to this
  output: string; // The misaligned response or reasoning
  explanation: string; // From meta_eval_result
  timestamp: string;
}

// --- Helper Functions & Components ---

const formatConfidence = (score?: number): string => {
  return score !== undefined ? `${(score * 100).toFixed(0)}%` : "N/A";
};

const formatPercent = (num: number, total: number): string => {
  if (total === 0) return "-"; // Or "0%" if preferred
  return `${Math.round((num / total) * 100)}%`;
};

// Simple badge for status
const StatusBadge = ({ status }: { status?: string }) => {
  const lowerStatus = status?.toLowerCase();
  let colorClass = "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  let icon = <HelpCircle className="w-3 h-3 mr-1" />;

  if (lowerStatus === 'aligned') {
    colorClass = "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200";
    icon = <CheckCircle className="w-3 h-3 mr-1" />;
  } else if (lowerStatus === 'misaligned') {
    colorClass = "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200";
    icon = <XCircle className="w-3 h-3 mr-1" />;
  } else if (lowerStatus === 'refusal') {
    colorClass = "bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-200";
    icon = <MinusCircle className="w-3 h-3 mr-1" />;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {icon}
      {status || 'Unknown'}
    </span>
  );
};

// Card for displaying individual metrics
const StatCard = ({ title, value, percentage, icon, colorClass = 'text-gray-700 dark:text-gray-300' }: { title: string, value: number | string, percentage?: string, icon: React.ReactNode, colorClass?: string }) => (
  <div className="flex flex-col items-center p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
    <div className={`mb-2 ${colorClass}`}>{icon}</div>
    <div className="text-sm font-medium text-muted-foreground">{title}</div>
    <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
    {percentage && <div className="text-xs text-muted-foreground">{percentage}</div>}
  </div>
);

// Component to display a single interaction step (Prompt, Response, Reasoning)
const InteractionStep = ({ title, speaker, content, timestamp, analysis, type }: {
  title: string,
  speaker: 'attacker' | 'defender' | 'system',
  content: string,
  timestamp: string,
  analysis?: AnalysisResult | null,
  type: 'prompt' | 'response' | 'reasoning' | 'system'
}) => {
  let bgColor = "bg-background";
  let borderColor = "border-gray-200 dark:border-gray-700";
  let titleColor = "text-gray-700 dark:text-gray-300";
  let icon = <HelpCircle className="w-4 h-4 mr-2" />;

  if (type === 'prompt') {
    bgColor = "bg-blue-50 dark:bg-blue-900/30";
    borderColor = "border-blue-200 dark:border-blue-700";
    titleColor = "text-blue-700 dark:text-blue-300";
    icon = <User className="w-4 h-4 mr-2" />;
  } else if (type === 'response') {
    bgColor = "bg-green-50 dark:bg-green-900/30";
    borderColor = "border-green-200 dark:border-green-700";
    titleColor = "text-green-700 dark:text-green-300";
    icon = <Bot className="w-4 h-4 mr-2" />;
  } else if (type === 'reasoning') {
    bgColor = "bg-purple-50 dark:bg-purple-900/30";
    borderColor = "border-purple-200 dark:border-purple-700";
    titleColor = "text-purple-700 dark:text-purple-300";
    icon = <Bot className="w-4 h-4 mr-2" />;
  } else if (type === 'system') {
     bgColor = "bg-gray-100 dark:bg-gray-800/50";
     borderColor = "border-gray-300 dark:border-gray-600 border-dashed";
     titleColor = "text-gray-600 dark:text-gray-400";
     icon = <Cog className="w-4 h-4 mr-2" />;
  }

  return (
    <div className={`border rounded-lg overflow-hidden ${borderColor} ${bgColor}`}>
      <div className={`flex items-center justify-between p-3 border-b ${borderColor}`}>
        <div className={`flex items-center text-sm font-semibold ${titleColor}`}>
          {icon}
          {title}
        </div>
        <div className="text-xs text-muted-foreground">{new Date(timestamp).toLocaleString()}</div>
      </div>
      <div className="p-3 text-sm">
        <pre className="whitespace-pre-wrap font-sans break-words">{content}</pre>
      </div>
      {analysis && (
        <div className="border-t bg-yellow-50/50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 p-3 text-xs space-y-1">
           <div className="flex items-center gap-2 flex-wrap">
             <span className="font-semibold">Analysis:</span>
             <StatusBadge status={analysis.alignment_status} />
             <span className="font-semibold ml-2">Confidence:</span>
             <span>{formatConfidence(analysis.confidence)}</span>
           </div>
           {analysis.meta_eval_result?.explanation && (
             <div><span className="font-semibold">Explanation:</span> {analysis.meta_eval_result.explanation}</div>
           )}
           {analysis.potential_issues && analysis.potential_issues.length > 0 && (
             <div><span className="font-semibold">Potential Issues:</span> {analysis.potential_issues.join(', ')}</div>
           )}
           {analysis.harm_categories_detected && analysis.harm_categories_detected.length > 0 && (
             <div><span className="font-semibold">Harm Categories:</span> {analysis.harm_categories_detected.join(', ')}</div>
           )}
        </div>
      )}
    </div>
  );
};


// --- Main Page Component ---

export default function RunDetailPage({ params }: { params: { id: string } }) {
  const runId = params.id;

  const [runData, setRunData] = useState<RunDataType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [misalignmentHotspots, setMisalignmentHotspots] = useState<MisalignmentHotspot[]>([]);

  useEffect(() => {
    async function loadRunDetails() {
      try {
        setLoading(true);
        setError(null);
        setRunData(null);
        setOverallStats(null);
        setMisalignmentHotspots([]);

        const data: RunDataType = await getRunResult(`${runId}.json`);

        if (!data || !data.metadata || !data.history) {
          throw new Error("Incomplete run data received from API.");
        }

        // Sort history (important for processing)
        data.history.sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });

        // Calculate overall stats & find hotspots
        const stats: OverallStats = { totalResponses: 0, aligned: 0, misaligned: 0, refusal: 0, totalReasoning: 0, reasoningAligned: 0, reasoningMisaligned: 0, reasoningRefusal: 0 };
        const hotspots: MisalignmentHotspot[] = [];
        let lastAttackerPrompt = "";

        data.history.forEach((item: HistoryItem) => {
           if (item.speaker === 'attacker' && item.prompt) {
               lastAttackerPrompt = item.prompt;
           } else if (item.speaker === 'defender') {
            if (item.response) {
              stats.totalResponses++;
              const status = item.analysis?.alignment_status?.toLowerCase();
              if (status === 'aligned') stats.aligned++;
              else if (status === 'misaligned') {
                stats.misaligned++;
                 hotspots.push({
                   round: item.round,
                   type: 'response',
                   prompt: lastAttackerPrompt,
                   output: item.response,
                   explanation: item.analysis?.meta_eval_result?.explanation || "No explanation provided.",
                   timestamp: item.timestamp,
                 });
              } else if (status === 'refusal') stats.refusal++;
            }

            if (item.action === 'provide_reasoning' && item.reasoning_response) {
              stats.totalReasoning++;
              const reasoningStatus = item.reasoning_analysis?.alignment_status?.toLowerCase();
               if (reasoningStatus === 'aligned') stats.reasoningAligned++;
              else if (reasoningStatus === 'misaligned') {
                 stats.reasoningMisaligned++;
                 hotspots.push({
                   round: item.round,
                   type: 'reasoning',
                   prompt: lastAttackerPrompt, // Prompt that led to the original response
                   output: item.reasoning_response,
                   explanation: item.reasoning_analysis?.meta_eval_result?.explanation || "No explanation provided.",
                   timestamp: item.timestamp,
                 });
              } else if (reasoningStatus === 'refusal') stats.reasoningRefusal++;
            }
          }
        });

        setOverallStats(stats);
        setMisalignmentHotspots(hotspots);
        setRunData(data);

      } catch (err: any) {
        setError(`Failed to load run details: ${err.message || 'Unknown error'}. Please try again later.`);
        console.error("Error loading run details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRunDetails();
  }, [runId]);

  // --- Loading and Error States ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Run</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
           <div className="mt-4">
            <Link href="/runs">
              <Button variant="secondary" size="sm">Back to Runs List</Button>
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  if (!runData || !overallStats) {
    return ( // Should ideally be covered by error state, but good fallback
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Run Data Not Available</h1>
        <p className="text-muted-foreground mb-4">Could not retrieve or process details for this run.</p>
        <Link href="/runs"><Button>Back to Runs</Button></Link>
      </div>
    );
  }

  // --- Data for Rendering ---
  const { metadata, config, history, summary } = runData;
  const rounds = history.reduce((acc, item) => {
    (acc[item.round] = acc[item.round] || []).push(item);
    return acc;
  }, {} as Record<number, HistoryItem[]>);

  const hasMisalignment = overallStats.misaligned > 0 || overallStats.reasoningMisaligned > 0;
  const hasRefusal = overallStats.refusal > 0 || overallStats.reasoningRefusal > 0;
  let overallStatusIcon = <CheckCircle className="w-5 h-5 text-green-500" />;
  let overallStatusText = "Fully Aligned";
  let overallStatusColor = "text-green-600 dark:text-green-400";
  if (hasMisalignment) {
      overallStatusIcon = <XCircle className="w-5 h-5 text-red-500" />;
      overallStatusText = "Misalignment Detected";
      overallStatusColor = "text-red-600 dark:text-red-400";
  } else if (hasRefusal) {
      overallStatusIcon = <MinusCircle className="w-5 h-5 text-purple-500" />;
      overallStatusText = "Refusal Detected";
      overallStatusColor = "text-purple-600 dark:text-purple-400";
  }


  // --- Render Page ---
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight break-all">{runId}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Completed: {metadata.timestamp ? new Date(metadata.timestamp).toLocaleString() : "N/A"}
            {metadata.run_duration && <span className="ml-2"> | Duration: {metadata.run_duration}</span>}
          </p>
        </div>
        <Link href="/runs">
          <Button variant="outline" size="sm">Back to Runs List</Button>
        </Link>
      </div>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Overall Summary Card */}
      <Card className="border-2 shadow-md">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
             <CardTitle className="text-xl">Run Summary</CardTitle>
             <div className={`flex items-center gap-2 font-semibold ${overallStatusColor}`}>
                {overallStatusIcon}
                <span>{overallStatusText}</span>
             </div>
          </div>
          <CardDescription>Overall alignment statistics across all {metadata.iterations || Object.keys(rounds).length} rounds.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Misaligned Responses" value={overallStats.misaligned} percentage={formatPercent(overallStats.misaligned, overallStats.totalResponses)} icon={<XCircle className="w-6 h-6"/>} colorClass="text-red-500" />
          <StatCard title="Refusal Responses" value={overallStats.refusal} percentage={formatPercent(overallStats.refusal, overallStats.totalResponses)} icon={<MinusCircle className="w-6 h-6"/>} colorClass="text-purple-500" />
          <StatCard title="Misaligned Reasoning" value={overallStats.reasoningMisaligned} percentage={formatPercent(overallStats.reasoningMisaligned, overallStats.totalReasoning)} icon={<XCircle className="w-6 h-6"/>} colorClass="text-red-500" />
          <StatCard title="Refusal Reasoning" value={overallStats.reasoningRefusal} percentage={formatPercent(overallStats.reasoningRefusal, overallStats.totalReasoning)} icon={<MinusCircle className="w-6 h-6"/>} colorClass="text-purple-500" />
        </CardContent>
      </Card>

      {/* Misalignment Hotspots Card */}
      {hasMisalignment && misalignmentHotspots.length > 0 && (
        <Card className="border-red-500 border-2 bg-red-50/30 dark:bg-red-900/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-700 dark:text-red-300">Misalignment Hotspots ({misalignmentHotspots.length})</CardTitle>
            </div>
            <CardDescription className="text-red-600 dark:text-red-400">Key instances where misalignment was detected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {misalignmentHotspots.map((hotspot, index) => (
              <div key={index} className="border border-red-300 dark:border-red-700 rounded-lg p-3 bg-background shadow-sm text-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Round {hotspot.round} ({hotspot.type})</span>
                  <span className="text-xs text-muted-foreground">{new Date(hotspot.timestamp).toLocaleTimeString()}</span>
                </div>
                 <div className="mb-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Triggering Prompt:</p>
                  <p className="line-clamp-2 text-gray-700 dark:text-gray-300 italic">"{hotspot.prompt}"</p>
                 </div>
                 <div className="mb-2">
                   <p className="text-xs font-medium text-muted-foreground mb-1">Misaligned {hotspot.type}:</p>
                   <p className="line-clamp-3 text-red-700 dark:text-red-300 font-medium">"{hotspot.output}"</p>
                 </div>
                 <div>
                   <p className="text-xs font-medium text-muted-foreground mb-1">Analysis Explanation:</p>
                   <p className="text-xs text-gray-800 dark:text-gray-200">{hotspot.explanation}</p>
                 </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Configuration Details */}
      <Accordion type="single" collapsible className="w-full border rounded-lg">
        <AccordionItem value="config">
          <AccordionTrigger className="px-4 py-3 text-base font-medium bg-muted/30 hover:bg-muted/50">
             <div className="flex items-center gap-2"><TestTube2 className="w-5 h-5" /> Run Configuration</div>
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-background">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                 <InfoItem label="Attacker" value={`${metadata.attacker_model?.provider}/${metadata.attacker_model?.model_name || 'N/A'}`} />
                 <InfoItem label="Defender" value={`${metadata.defender_model?.provider}/${metadata.defender_model?.model_name || 'N/A'}`} />
                 <InfoItem label="Analyzer" value={`${config?.analyzer_model?.provider}/${config?.analyzer_model?.model_name || 'N/A'}`} />
                 <InfoItem label="Attack Chains" value={metadata.attacker_model?.use_attack_chains ? `Yes (${metadata.attacker_model.chain_type || 'Default'})` : 'No'} />
                 <InfoItem label="Reasoning Mode" value={config?.reasoning_request_mode || 'N/A'} />
                 <InfoItem label="Iterations" value={metadata.iterations ?? 'N/A'} />
             </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Detailed Logs and Summary */}
      <Tabs defaultValue="rounds" className="w-full">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="rounds">
            <Cog className="w-4 h-4 mr-2"/>Detailed Rounds ({Object.keys(rounds).length})
          </TabsTrigger>
        </TabsList>

        {/* Detailed Rounds Tab */}
        <TabsContent value="rounds" className="mt-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {Object.entries(rounds).map(([roundNum, items]) => (
              <AccordionItem key={`round-${roundNum}`} value={`round-${roundNum}`} className="border rounded-lg overflow-hidden shadow-sm">
                <AccordionTrigger className="bg-muted/50 hover:bg-muted/80 px-4 py-3 text-base font-medium">
                  Round {roundNum}
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4 bg-background">
                  {items.map((item, index) => (
                    <div key={index}>
                      {item.speaker === 'attacker' && item.prompt && (
                        <InteractionStep title="Attacker Prompt" speaker="attacker" type="prompt" content={item.prompt} timestamp={item.timestamp} />
                      )}
                      {item.speaker === 'defender' && item.response && (
                         <InteractionStep title="Defender Response" speaker="defender" type="response" content={item.response} timestamp={item.timestamp} analysis={item.analysis}/>
                      )}
                      {item.speaker === 'system' && item.action === 'request_reasoning' && (
                        <InteractionStep title="System Action" speaker="system" type="system" content={item.prompt || "Requesting reasoning..."} timestamp={item.timestamp} />
                      )}
                      {item.speaker === 'defender' && item.action === 'provide_reasoning' && item.reasoning_response && (
                         <InteractionStep title="Defender Reasoning" speaker="defender" type="reasoning" content={item.reasoning_response} timestamp={item.timestamp} analysis={item.reasoning_analysis}/>
                      )}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for Configuration Accordion
const InfoItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
);