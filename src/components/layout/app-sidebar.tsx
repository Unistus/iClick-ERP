
"use client"

import * as React from "react"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Calculator,
  Users,
  HeartHandshake,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Building2,
  Store,
  Shield,
  Briefcase,
  MapPin,
  Percent,
  Coins,
  FileClock,
  LogOut,
  GitPullRequest,
  CalendarDays,
  Hash,
  Activity,
  Key,
  BellRing
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser } from "@/firebase"

const modules = [
  { title: "Command Center", icon: LayoutDashboard, url: "/" },
  { title: "iClick POS", icon: ShoppingCart, url: "/pos" },
  { title: "Stock Vault", icon: Package, url: "/inventory" },
  { title: "Financial Suite", icon: Calculator, url: "/accounting" },
  { title: "People Hub", icon: Users, url: "/hr" },
  { title: "Client Care", icon: HeartHandshake, url: "/crm" },
  { title: "AI Analysis", icon: Sparkles, url: "/ai-insights" },
]

const adminLinks = [
  { title: "Institutions", icon: Store, url: "/admin/institutions" },
  { title: "Branches", icon: MapPin, url: "/admin/branches" },
  { title: "Departments", icon: Briefcase, url: "/admin/departments" },
  { title: "Roles & Permissions", icon: Shield, url: "/admin/roles" },
  { title: "Approval Workflows", icon: GitPullRequest, url: "/admin/approval-workflows" },
  { title: "Tax Config", icon: Percent, url: "/admin/tax" },
  { title: "Currencies", icon: Coins, url: "/admin/currencies" },
  { title: "Fiscal Periods", icon: CalendarDays, url: "/admin/fiscal-periods" },
  { title: "Doc Numbering", icon: Hash, url: "/admin/document-numbering" },
  { title: "Audit Logs", icon: FileClock, url: "/admin/audit-logs" },
  { title: "Notification Templates", icon: BellRing, url: "/admin/notifications" },
  { title: "System Health", icon: Activity, url: "/admin/system-health" },
  { title: "API Management", icon: Key, url: "/admin/api-management" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login')
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 flex items-center justify-between px-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
            <Store className="size-5" />
          </div>
          <span className="font-headline font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden whitespace-nowrap">
            iClick <span className="text-accent">ERP</span>
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Modules</SidebarGroupLabel>
          <SidebarMenu>
            {modules.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarMenu>
            {adminLinks.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden mb-4">
            <div className="size-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs uppercase">
              {user.email?.[0] || 'U'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{user.email}</span>
              <span className="text-xs text-muted-foreground">Authenticated</span>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
