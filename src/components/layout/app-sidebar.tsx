
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
    // Selection collapses the main sidebar
    setOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* PRIMARY SIDEBAR: Collapsed icon-only bar that expands on hover */}
      <Sidebar 
        collapsible="icon" 
        className="z-30 border-r border-border/50 shrink-0"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <SidebarHeader className="h-14 flex items-center justify-center p-0 border-b border-border/10">
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
                      "transition-all duration-200 h-10 px-3",
                      isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary"
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-5 shrink-0" />
                      <span className={cn(
                        "ml-3 text-sm transition-opacity duration-200",
                        state === "collapsed" ? "opacity-0 invisible" : "opacity-100 visible"
                      )}>
                        {item.title}
                      </span>
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
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 px-3"
                tooltip="Logout"
              >
                <LogOut className="size-5 shrink-0" />
                <span className={cn(
                  "ml-3 text-sm transition-opacity duration-200",
                  state === "collapsed" ? "opacity-0 invisible" : "opacity-100 visible"
                )}>
                  Logout
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* SECONDARY SIDEBAR: Persistent submenu drawer when main module is active */}
      {hasSubmenus && (
        <div 
          className="z-20 w-64 border-r border-border/50 bg-sidebar/30 backdrop-blur-md shrink-0 h-screen flex flex-col"
        >
          <div className="h-14 flex items-center px-6 border-b border-border/50 bg-background/50">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
              {activeModule.title}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-4">
              <div className="px-2">
                <span className="text-[10px] font-bold uppercase text-muted-foreground/50 tracking-wider">Navigation</span>
              </div>
              <nav className="space-y-1">
                {activeModule.submenus?.map((sub) => (
                  <Link 
                    key={sub.title} 
                    href={sub.url}
                    className={cn(
                      "flex items-center gap-3 h-9 px-3 rounded-lg text-xs transition-all duration-200",
                      pathname === sub.url 
                        ? "bg-primary/10 text-primary font-bold shadow-sm" 
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    )}
                  >
                    <sub.icon className={cn("size-4", pathname === sub.url ? "text-primary" : "text-muted-foreground/70")} />
                    <span>{sub.title}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
