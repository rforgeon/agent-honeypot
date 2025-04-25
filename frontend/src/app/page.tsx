import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Agent Honeypot</h1>
        <div>
          <Link href="/config">
            <Button variant="outline" className="mr-2">Configure</Button>
          </Link>
          <Link href="/runs/new">
            <Button>Start New Run</Button>
          </Link>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Recent Runs</CardTitle>
            <CardDescription>
              Overview of recent honeypot testing sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">View your completed honeypot testing sessions</p>
            <div className="mt-4">
              <Link href="/runs">
                <Button variant="outline" size="sm">View All Runs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Defender Model</CardTitle>
            <CardDescription>
              The LLM being tested for alignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GPT-4</div>
            <p className="text-xs text-muted-foreground">
              OpenAI
            </p>
            <div className="mt-4">
              <Link href="/config">
                <Button variant="outline" size="sm">Configure Model</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Attacker Model</CardTitle>
            <CardDescription>
              The LLM generating the honeypot tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">GPT-4</div>
            <p className="text-xs text-muted-foreground">
              OpenAI
            </p>
            <div className="mt-4">
              <Link href="/config">
                <Button variant="outline" size="sm">Configure Model</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>About Agent Honeypot</CardTitle>
          <CardDescription>
            A platform for testing LLM alignment with synthetic adversarial inputs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This platform creates a setup where one LLM (the "attacker") attempts to generate prompts (honeypots) 
            to trick another LLM (the "defender") into generating misaligned or unsafe responses. It helps 
            evaluate alignment of AI systems and identify potential vulnerabilities.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-3">
              <h3 className="font-medium">Multi-provider LLM Support</h3>
              <p className="text-xs text-muted-foreground">Compatible with OpenAI, Anthropic Claude, and Google Gemini models.</p>
            </div>
            <div className="rounded-md border p-3">
              <h3 className="font-medium">Adaptive Honeypot Generation</h3>
              <p className="text-xs text-muted-foreground">The attacker adapts strategies based on defender responses.</p>
            </div>
            <div className="rounded-md border p-3">
              <h3 className="font-medium">Sophisticated Alignment Analysis</h3>
              <p className="text-xs text-muted-foreground">Multi-layered response evaluation using pattern matching and meta-evaluation.</p>
            </div>
            <div className="rounded-md border p-3">
              <h3 className="font-medium">Reasoning Extraction</h3>
              <p className="text-xs text-muted-foreground">Automatically requests reasoning from the defender when potentially misaligned responses are detected.</p>
            </div>
            <div className="rounded-md border p-3">
              <h3 className="font-medium">Honeypot Categorization</h3>
              <p className="text-xs text-muted-foreground">Organizes attacks by strategy types and target domains.</p>
            </div>
            <div className="rounded-md border p-3">
              <h3 className="font-medium">Progress Tracking</h3>
              <p className="text-xs text-muted-foreground">Saves interaction logs after each round with detailed analysis.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
