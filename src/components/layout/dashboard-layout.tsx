
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Bell, Search, Loader2, Sparkles, Building2, MapPin, User, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUser } from "@/firebase"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser()
  const router = useRouter()

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
    <SidebarProvider>
      <div className="flex w-full h-screen overflow-hidden">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0 bg-background">
          {/* FLOATING TOP BAR (FIXED) */}
          <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b px-6 bg-card/20 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3 text-accent animate-pulse" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enterprise Mode</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="relative hidden md:flex items-center w-64">
                <Search className="absolute left-3 h-3 w-3 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Universal Search..."
                  className="pl-8 bg-secondary/20 border-none ring-1 ring-border/30 focus-visible:ring-primary h-8 text-[10px] rounded-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8 hover:bg-secondary">
                <Bell className="size-4" />
                <span className="absolute top-1.5 right-1.5 size-1.5 bg-accent rounded-full border border-background" />
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <div className="flex items-center gap-2 pl-2">
                <div className="hidden lg:flex flex-col items-end text-right">
                  <span className="text-[10px] font-bold leading-none">{user.email?.split('@')[0]}</span>
                  <span className="text-[8px] uppercase tracking-tighter text-muted-foreground">Standard Operator</span>
                </div>
                <div className="size-7 rounded-full bg-gradient-to-tr from-primary to-accent p-0.5 shadow-sm">
                  <div className="size-full rounded-full bg-background flex items-center justify-center font-bold text-[10px]">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* INDEPENDENT SCROLLABLE CONTENT */}
          <main className="flex-1 independent-scroll p-6">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>

          {/* SYSTEM FOOTER BAR */}
          <footer className="h-8 shrink-0 bg-card/40 border-t flex items-center justify-between px-6 text-[10px] font-medium text-muted-foreground">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3 text-primary" />
                <span className="font-bold text-foreground/80">Nairobi HQ Institution</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3 text-accent" />
                <span>Main Branch (CBD)</span>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-emerald-500" />
                <span>Status: Secure Connection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="size-3" />
                <span className="font-mono">{user.email}</span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-sm uppercase tracking-tighter font-bold">
                Online
              </div>
            </div>
          </footer>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
