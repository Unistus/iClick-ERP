
"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { Bell, Search, User, Loader2, Sparkles } from "lucide-react"
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
      <div className="flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-6 bg-card/30 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent animate-pulse" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Enterprise Mode</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="relative hidden md:flex items-center w-80">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Universal Search (Ctrl + K)"
                  className="pl-9 bg-secondary/20 border-none ring-1 ring-border/50 focus-visible:ring-primary h-9 text-xs rounded-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-secondary">
                <Bell className="size-5" />
                <span className="absolute top-2 right-2 size-2 bg-accent rounded-full border-2 border-background" />
              </Button>
              <div className="h-8 w-px bg-border mx-1" />
              <div className="flex items-center gap-3 pl-2">
                <div className="hidden lg:flex flex-col items-end text-right">
                  <span className="text-xs font-bold leading-none">{user.email?.split('@')[0]}</span>
                  <span className="text-[10px] text-muted-foreground">Standard Operator</span>
                </div>
                <div className="size-9 rounded-full bg-gradient-to-tr from-primary to-accent p-0.5 shadow-md">
                  <div className="size-full rounded-full bg-background flex items-center justify-center font-bold text-xs">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </div>
              </div>
            </div>
          </header>
          <main className="p-6 h-[calc(100vh-4rem)] overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
