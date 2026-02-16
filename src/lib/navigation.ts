
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Calculator,
  Users,
  HeartHandshake,
  Settings,
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
  CreditCard
} from "lucide-react"

export interface NavSubmenu {
  title: string
  icon: any
  url: string
  id: string // Used for permission matching
}

export interface NavItem {
  title: string
  icon: any
  url: string
  pattern: RegExp
  id: string // Used for permission matching
  submenus?: NavSubmenu[]
}

export const navConfig: NavItem[] = [
  { 
    title: "Command Center", 
    icon: LayoutDashboard, 
    url: "/", 
    pattern: /^\/$/,
    id: "dashboard"
  },
  { 
    title: "iClick POS", 
    icon: ShoppingCart, 
    url: "/pos", 
    pattern: /^\/pos/,
    id: "pos"
  },
  { 
    title: "Stock Vault", 
    icon: Package, 
    url: "/inventory", 
    pattern: /^\/inventory/,
    id: "inventory",
    submenus: [
      { title: "Products", icon: Box, url: "/inventory", id: "products" },
      { title: "Stock Transfers", icon: Truck, url: "/inventory/transfers", id: "transfers" },
      { title: "Adjustments", icon: Layers, url: "/inventory/adjustments", id: "adjustments" },
      { title: "Categories", icon: Hash, url: "/inventory/categories", id: "categories" },
    ]
  },
  { 
    title: "Financial Suite", 
    icon: Calculator, 
    url: "/accounting", 
    pattern: /^\/accounting/,
    id: "accounting",
    submenus: [
      { title: "General Ledger", icon: History, url: "/accounting", id: "ledger" },
      { title: "Chart of Accounts", icon: Layers, url: "/accounting/coa", id: "coa" },
      { title: "Budgets", icon: PieChart, url: "/accounting/budgets", id: "budgets" },
      { title: "Tax Returns", icon: FileText, url: "/accounting/tax", id: "tax_returns" },
    ]
  },
  { 
    title: "People Hub", 
    icon: Users, 
    url: "/hr", 
    pattern: /^\/hr/,
    id: "hr",
    submenus: [
      { title: "Employee List", icon: Users, url: "/hr", id: "employees" },
      { title: "Payroll Runs", icon: CreditCard, url: "/hr/payroll", id: "payroll" },
      { title: "Leave Requests", icon: CalendarDays, url: "/hr/leave", id: "leave" },
      { title: "Recruitment", icon: UserPlus, url: "/hr/recruitment", id: "recruitment" },
    ]
  },
  { 
    title: "Client Care", 
    icon: HeartHandshake, 
    url: "/crm", 
    pattern: /^\/crm/,
    id: "crm"
  },
  { 
    title: "Administration", 
    icon: Settings, 
    url: "/admin/institutions", 
    pattern: /^\/admin/,
    id: "admin",
    submenus: [
      { title: "Institutions", icon: Store, url: "/admin/institutions", id: "institutions" },
      { title: "Branches", icon: MapPin, url: "/admin/branches", id: "branches" },
      { title: "Departments", icon: Briefcase, url: "/admin/departments", id: "departments" },
      { title: "Roles & Permissions", icon: Shield, url: "/admin/roles", id: "roles" },
      { title: "Approval Workflows", icon: GitPullRequest, url: "/admin/approval-workflows", id: "workflows" },
      { title: "Tax Config", icon: Percent, url: "/admin/tax", id: "tax_config" },
      { title: "Currencies", icon: Coins, url: "/admin/currencies", id: "currencies" },
      { title: "Fiscal Periods", icon: CalendarDays, url: "/admin/fiscal-periods", id: "fiscal" },
      { title: "Doc Numbering", icon: Hash, url: "/admin/document-numbering", id: "numbering" },
      { title: "Audit Logs", icon: FileClock, url: "/admin/audit-logs", id: "audit" },
      { title: "Notification Templates", icon: BellRing, url: "/admin/notifications", id: "notifications" },
      { title: "System Health", icon: Activity, url: "/admin/system-health", id: "health" },
      { title: "API Management", icon: Key, url: "/admin/api-management", id: "api" },
    ]
  },
]
