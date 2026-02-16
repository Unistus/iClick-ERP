
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
  BellRing,
  Command,
  Box,
  Truck,
  Layers,
  History,
  UserCheck,
  CreditCard,
  FileText,
  PieChart,
  UserPlus
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
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  icon: any
  url: string
  pattern: RegExp
  submenus?: { title: string; icon: any; url: string }[]
}

const navConfig: NavItem[] = [
  { 
    title: "Command Center", 
    icon: LayoutDashboard, 
    url: "/", 
    pattern: /^\/$/ 
  },
  { 
    title: "iClick POS", 
    icon: ShoppingCart, 
    url: "/pos", 
    pattern: /^\/pos/ 
  },
  { 
    title: "Stock Vault", 
    icon: Package, 
    url: "/inventory", 
    pattern: /^\/inventory/,
    submenus: [
      { title: "Products", icon: Box, url: "/inventory" },
      { title: "Stock Transfers", icon: Truck, url: "/inventory/transfers" },
      { title: "Adjustments", icon: Layers, url: "/inventory/adjustments" },
      { title: "Categories", icon: Hash, url: "/inventory/categories" },
    ]
  },
  { 
    title: "Financial Suite", 
    icon: Calculator, 
    url: "/accounting", 
    pattern: /^\/accounting/,
    submenus: [
      { title: "General Ledger", icon: History, url: "/accounting" },
      { title: "Chart of Accounts", icon: Layers, url: "/accounting/coa" },
      { title: "Budgets", icon: PieChart, url: "/accounting/budgets" },
      { title: "Tax Returns", icon: FileText, url: "/accounting/tax" },
    ]
  },
  { 
    title: "People Hub", 
    icon: Users, 
    url: "/hr", 
    pattern: /^\/hr/,
    submenus: [
      { title: "Employee List", icon: Users, url: "/hr" },
      { title: "Payroll Runs", icon: CreditCard, url: "/hr/payroll" },
      { title: "Leave Requests", icon: CalendarDays, url: "/hr/leave" },
      { title: "Recruitment", icon: UserPlus, url: "/hr/recruitment" },
    ]
  },
  { 
    title: "Client Care", 
    icon: HeartHandshake, 
    url: "/crm", 
    pattern: /^\/crm/ 
  },
  { 
    title: "AI Analysis", 
    icon: Sparkles, 
    url: "/ai-insights", 
    pattern: /^\/ai-insights/ 
  },
  { 
    title: "Administration", 
    icon: Settings, 
    url: "/admin/institutions", 
    pattern: /^\/admin/,
    submenus: [
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
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const { setOpen } = useSidebar()
  
  // Find the active main module based on URL pattern
  const activeModule = navConfig.find(item => item.pattern.test(pathname))
  const hasSubmenus = activeModule && activeModule.submenus && activeModule.submenus.length > 0

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex h-full">
      {/* PERSISTENT ICON SIDEBAR (Primary) */}
      <Sidebar 
        collapsible="icon" 
        className="z-30 !w-[var(--sidebar-width-icon)] border-r border-border/50 shrink-0"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <SidebarHeader className="h-16 flex items-center justify-center p-0">
          <div className="size-9 rounded-lg bg-primary flex items-center justify-center text-white">
            <Command className="size-5" />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2 gap-4">
          <SidebarMenu>
            {navConfig.map((item) => {
              const isActive = item.pattern.test(pathname)
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive} 
                    tooltip={item.title}
                    className={cn(
                      "transition-all duration-200",
                      isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110" : "hover:bg-secondary"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-border/50 gap-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout} 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                tooltip="Logout"
              >
                <LogOut className="size-5" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* DYNAMIC SECONDARY SIDEBAR (Submenus) */}
      {hasSubmenus && (
        <Sidebar 
          collapsible="none" 
          className="z-20 !w-64 border-r border-border/50 bg-sidebar/50 backdrop-blur-md animate-in slide-in-from-left duration-300 shrink-0"
        >
          <SidebarHeader className="h-16 flex items-center px-6 border-b border-border/50">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {activeModule.title}
            </h2>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 mb-2">Module Navigation</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {activeModule.submenus?.map((sub) => (
                  <SidebarMenuItem key={sub.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === sub.url}
                      className={cn(
                        "h-10 px-3 rounded-lg transition-colors",
                        pathname === sub.url ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary/50"
                      )}
                    >
                      <Link href={sub.url} className="flex items-center gap-3">
                        <sub.icon className={cn("size-4", pathname === sub.url ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-sm">{sub.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t border-border/50">
            {user && (
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-xs">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{user.email?.split('@')[0]}</span>
                  <span className="text-[10px] text-muted-foreground">Operator</span>
                </div>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>
      )}
    </div>
  )
}
