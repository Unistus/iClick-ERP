
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Bell, Search, Loader2, Sparkles, Building2, MapPin, User, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/firebase"
import { useIsMobile } from "@/hooks/use-mobile"
import { AIStrategistFab } from "@/components/ai/ai-strategist-fab"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login')
    }
  }, [user, isUserLoading, router])

  if (isUserLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex w-full h-screen overflow-hidden bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* FLOATING TOP BAR - Medium Height (h-12) */}
          <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4 md:px-6 bg-card/40 backdrop-blur-xl sticky top-0 z-10 w-full shadow-sm">
            <div className="flex items-center gap-2 md:gap-4">
              {/* SidebarTrigger only visible on mobile (hidden on md and up) */}
              <SidebarTrigger className="text-primary hover:bg-primary/10 md:hidden" />
              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-accent animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:inline">Enterprise Mode</span>
              </div>
              <div className="h-4 w-px bg-border/50 hidden sm:block" />
              <div className="relative hidden md:flex items-center w-64">
                <Search className="absolute left-3 h-3 w-3 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Universal Search..."
                  className="pl-8 bg-secondary/30 border-none ring-1 ring-border/20 focus-visible:ring-primary h-7 text-[10px] rounded-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <Button variant="ghost" size="icon" className="relative rounded-full h-7 w-7 hover:bg-secondary">
                <Bell className="size-4" />
                <span className="absolute top-1 right-1 size-1.5 bg-accent rounded-full border border-background" />
              </Button>
              <div className="h-6 w-px bg-border/50 mx-1" />
              <div className="flex items-center gap-2 pl-1 md:pl-2">
                <div className="hidden lg:flex flex-col items-end text-right">
                  <span className="text-[10px] font-bold leading-none">{user.email?.split('@')[0]}</span>
                </div>
                <div className="size-6 rounded-full bg-gradient-to-tr from-primary to-accent p-0.5 shadow-sm">
                  <div className="size-full rounded-full bg-background flex items-center justify-center font-bold text-[9px]">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* INDEPENDENT SCROLLABLE CONTENT */}
          <main className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4">
            <div className="max-w-[1600px] mx-auto min-h-full pb-8">
              {children}
            </div>
          </main>

          {/* SYSTEM FOOTER BAR - Compact Height (h-7) */}
          <footer className="h-auto md:h-7 shrink-0 bg-card/60 border-t flex flex-col md:flex-row items-center justify-between px-4 md:px-6 py-1.5 md:py-0 text-[9px] font-medium text-muted-foreground backdrop-blur-md z-10 gap-2 md:gap-6">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3 text-primary" />
                <span className="font-bold text-foreground/80 truncate max-w-[120px] md:max-w-none">Nairobi HQ Institution</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 text-accent" />
                <span className="truncate max-w-[100px] md:max-w-none">Main Branch (CBD)</span>
              </div>
            </div>
            <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="hidden sm:flex items-center gap-1.5">
                  <ShieldCheck className="size-3 text-emerald-500" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="size-3" />
                  <span className="font-mono hidden sm:inline">{user.email}</span>
                  <span className="font-mono sm:hidden">{user.email?.split('@')[0]}</span>
                </div>
              </div>
              <div className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-sm uppercase tracking-tighter font-bold border border-emerald-500/20">
                Online
              </div>
            </div>
          </footer>
        </div>
      </div>
      <AIStrategistFab />
    </SidebarProvider>
  )
}
