
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
  LogOut,
  Command,
  Box,
  Truck,
  Layers,
  History,
  PieChart,
  FileText,
  UserPlus,
  CalendarDays,
  Hash,
  Activity,
  Key,
  BellRing,
  Percent,
  Coins,
  FileClock,
  Shield,
  Briefcase,
  MapPin,
  Store,
  GitPullRequest,
  UserCheck,
  CreditCard
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
  const { setOpen, state } = useSidebar()
  
  const activeModule = navConfig.find(item => item.pattern.test(pathname))
  const hasSubmenus = activeModule && activeModule.submenus && activeModule.submenus.length > 0

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login')
  }

  const handleItemClick = () => {
    setOpen(false) // Collapse main menu on item click
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* PERSISTENT ICON SIDEBAR (Primary) */}
      <Sidebar 
        collapsible="icon" 
        className="z-30 !w-[var(--sidebar-width-icon)] border-r border-border/50 shrink-0"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <SidebarHeader className="h-14 flex items-center justify-center p-0">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <Command className="size-4" />
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
                    onClick={handleItemClick}
                    className={cn(
                      "transition-all duration-200",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary"
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
        <SidebarFooter className="p-2 border-t border-border/50">
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
          className="z-20 !w-64 border-r border-border/50 bg-sidebar/30 backdrop-blur-md shrink-0 h-screen"
        >
          <SidebarHeader className="h-14 flex items-center px-6 border-b border-border/50">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary/80">
              {activeModule.title}
            </h2>
          </SidebarHeader>
          <SidebarContent className="p-4 independent-scroll">
            <SidebarGroup>
              <SidebarGroupLabel className="px-2 mb-2 text-[10px] font-bold uppercase text-muted-foreground/50">Navigation</SidebarGroupLabel>
              <SidebarMenu className="gap-1">
                {activeModule.submenus?.map((sub) => (
                  <SidebarMenuItem key={sub.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === sub.url}
                      className={cn(
                        "h-9 px-3 rounded-lg transition-colors",
                        pathname === sub.url ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary/50"
                      )}
                    >
                      <Link href={sub.url} className="flex items-center gap-3">
                        <sub.icon className={cn("size-4", pathname === sub.url ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-xs">{sub.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      )}
    </div>
  )
}
