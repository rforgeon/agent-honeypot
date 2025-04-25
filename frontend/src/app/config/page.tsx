"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getConfig, updateConfig, Config } from "@/lib/api";

export default function ConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const configData = await getConfig();
        setConfig(configData);
        setError(null);
      } catch (err) {
        setError("Failed to load configuration. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, []);

  const handleChange = (section: keyof Config, field: string, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [section]: {
        ...config[section as keyof typeof config],
        [field]: value
      }
    });
  };

  const handleNestedChange = (section: keyof Config, subSection: string, field: string, value: any) => {
    if (!config) return;
    
    if (section === 'api_keys') {
      setConfig({
        ...config,
        api_keys: {
          ...config.api_keys,
          [subSection]: value
        }
      });
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);
      
      await updateConfig(config);
      
      setSaveSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save configuration. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Configuration could not be loaded</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
        <div className="flex space-x-2">
          <Link href="/">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saveSuccess && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Configuration has been saved successfully</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="attacker">Attacker Model</TabsTrigger>
          <TabsTrigger value="defender">Defender Model</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure the basic parameters for honeypot testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="iterations">Iterations</Label>
                  <Input 
                    id="iterations" 
                    type="number" 
                    min="1" 
                    max="20" 
                    value={config.iterations} 
                    onChange={(e) => setConfig({...config, iterations: parseInt(e.target.value)})}
                  />
                  <p className="text-sm text-muted-foreground">Number of interaction rounds</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="results-dir">Results Directory</Label>
                  <Input 
                    id="results-dir" 
                    value={config.results_dir} 
                    onChange={(e) => setConfig({...config, results_dir: e.target.value})}
                  />
                  <p className="text-sm text-muted-foreground">Directory to save run results</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reasoning-mode">Reasoning Request Mode</Label>
                <Select 
                  value={config.reasoning_request_mode || "always"} 
                  onValueChange={(value: 'always' | 'detected' | 'never') => 
                    setConfig({...config, reasoning_request_mode: value})
                  }
                >
                  <SelectTrigger id="reasoning-mode">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="always">Always</SelectItem>
                    <SelectItem value="detected">Only on detected misalignment</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">When to request reasoning from the defender model</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="attacker">
          <Card>
            <CardHeader>
              <CardTitle>Attacker Model Settings</CardTitle>
              <CardDescription>
                Configure the model that generates honeypot prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="attacker-provider">Provider</Label>
                  <Select 
                    value={config.attacker_model.provider} 
                    onValueChange={(value) => handleChange('attacker_model', 'provider', value)}
                  >
                    <SelectTrigger id="attacker-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="attacker-model">Model Name</Label>
                  <Input 
                    id="attacker-model" 
                    value={config.attacker_model.model_name} 
                    onChange={(e) => handleChange('attacker_model', 'model_name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="attacker-temperature">Temperature</Label>
                  <Input 
                    id="attacker-temperature" 
                    type="number" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={config.attacker_model.temperature || 0.7} 
                    onChange={(e) => handleChange('attacker_model', 'temperature', parseFloat(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground">Controls randomness (0.0-1.0)</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="use-attack-chains">Attack Chains</Label>
                  <Select 
                    value={config.attacker_model.use_attack_chains ? "true" : "false"} 
                    onValueChange={(value) => handleChange('attacker_model', 'use_attack_chains', value === "true")}
                  >
                    <SelectTrigger id="use-attack-chains">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Enabled</SelectItem>
                      <SelectItem value="false">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">Use multi-turn attack chains</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="defender">
          <Card>
            <CardHeader>
              <CardTitle>Defender Model Settings</CardTitle>
              <CardDescription>
                Configure the model being tested for alignment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="defender-provider">Provider</Label>
                  <Select 
                    value={config.defender_model.provider} 
                    onValueChange={(value) => handleChange('defender_model', 'provider', value)}
                  >
                    <SelectTrigger id="defender-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defender-model">Model Name</Label>
                  <Input 
                    id="defender-model" 
                    value={config.defender_model.model_name} 
                    onChange={(e) => handleChange('defender_model', 'model_name', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="defender-temperature">Temperature</Label>
                <Input 
                  id="defender-temperature" 
                  type="number" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={config.defender_model.temperature || 0.5} 
                  onChange={(e) => handleChange('defender_model', 'temperature', parseFloat(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">Controls randomness (0.0-1.0)</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api-keys">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Configure API keys for different LLM providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input 
                    id="openai-key" 
                    type="password" 
                    value={config.api_keys.openai || ""} 
                    onChange={(e) => handleNestedChange('api_keys', 'openai', '', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                  <Input 
                    id="anthropic-key" 
                    type="password" 
                    value={config.api_keys.anthropic || ""} 
                    onChange={(e) => handleNestedChange('api_keys', 'anthropic', '', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="google-key">Google API Key</Label>
                  <Input 
                    id="google-key" 
                    type="password" 
                    value={config.api_keys.google || ""} 
                    onChange={(e) => handleNestedChange('api_keys', 'google', '', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                API keys are required for accessing LLM providers. These keys are stored locally in your configuration file.
              </p>
            </CardContent>
            <CardFooter className="bg-muted/50 border-t px-6 py-3">
              <p className="text-xs text-muted-foreground">
                <strong>Security Note:</strong> Keep your API keys confidential and never share them with others.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 