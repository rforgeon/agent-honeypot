"use client";

import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from "@/components/theme-provider"
import Link from 'next/link'
import { Home, PlayCircle, Settings, Shield, PlusCircle, MousePointerClick } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  
  return (
    <html lang="en">
      <head>
        <title>Agent Honeypot</title>
        <meta name="description" content="A platform for testing LLM alignment with synthetic adversarial inputs" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center ml-4">
                  <Link href="/" className="flex items-center space-x-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <span className="font-bold text-lg">Agent Honeypot</span>
                  </Link>
                </div>
                <div className="flex items-center">
                  <Link href="/runs/new">
                    <Button size="sm" className="gap-1">
                      <PlusCircle className="h-4 w-4" />
                      Start New Run
                    </Button>
                  </Link>
                </div>
              </div>
            </header>
            <div className="flex-1">
              <div className="grid lg:grid-cols-5">
                <aside className="lg:col-span-1 hidden lg:block border-r min-h-screen bg-sidebar text-sidebar-foreground">
                  <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto p-4">
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-3 mb-4">Dashboard</h2>
                        <div className="space-y-1">
                          <Link 
                            href="/" 
                            className={cn(
                              "flex items-center px-3 py-2 rounded-md transition-colors",
                              pathname === '/' 
                                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium shadow-sm" 
                                : "hover:bg-sidebar-accent/20 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <Home className="h-4 w-4 mr-2" />
                            <span>Home</span>
                          </Link>
                          <Link 
                            href="/runs" 
                            className={cn(
                              "flex items-center px-3 py-2 rounded-md transition-colors",
                              pathname === '/runs' || pathname.startsWith('/runs/') 
                                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium shadow-sm" 
                                : "hover:bg-sidebar-accent/20 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            <span>Runs</span>
                          </Link>
                          <Link 
                            href="/config" 
                            className={cn(
                              "flex items-center px-3 py-2 rounded-md transition-colors",
                              pathname === '/config' 
                                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium shadow-sm" 
                                : "hover:bg-sidebar-accent/20 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            <span>Configuration</span>
                          </Link>
                          <Link 
                            href="/browser-use" 
                            className={cn(
                              "flex items-center px-3 py-2 rounded-md transition-colors",
                              pathname === '/browser-use' 
                                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground font-medium shadow-sm" 
                                : "hover:bg-sidebar-accent/20 hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <MousePointerClick className="h-4 w-4 mr-2" />
                            <span>Browser Use</span>
                          </Link>
                        </div>
                      </div>
                      
                      <div className="border-t border-sidebar-border pt-4">
                        <div className="rounded-md p-3 bg-sidebar-accent/10">
                          <h3 className="font-medium text-sm mb-1">Need help?</h3>
                          <p className="text-xs text-muted-foreground mb-2">
                            Check our documentation for help with using the platform.
                          </p>
                          <a href="https://github.com/rforgeon/agent-honeypot" target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="w-full text-xs">
                              View Documentation
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </aside>
                <main className="lg:col-span-4 p-4 md:p-6 lg:p-8">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
