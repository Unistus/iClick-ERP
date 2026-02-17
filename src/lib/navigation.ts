
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
  CreditCard,
  Sliders,
  BarChart3,
  TrendingUp,
  AlertCircle,
  BookOpen,
  Receipt,
  Wallet,
  Building,
  Gavel,
  Landmark,
  ArrowRightLeft,
  ClipboardCheck,
  Scale,
  PackageSearch,
  Timer,
  Factory,
  Database,
  BrainCircuit,
  Sparkles,
  Search,
  Skull,
  AlertTriangle,
  Boxes,
  Tags,
  Barcode,
  ClipboardList,
  Quote,
  ClipboardCheck as OrderIcon,
  ArrowLeftRight,
  UserCheck
} from "lucide-react"

export interface NavSubmenu {
  title: string
  icon: any
  url: string
  id: string 
}

export interface NavItem {
  title: string
  icon: any
  url: string
  pattern: RegExp
  id: string 
  submenus?: NavSubmenu[]
}

export const navConfig: NavItem[] = [
  { 
    title: "Command Center", 
    icon: LayoutDashboard, 
    url: "/", 
    pattern: /^\/($|dashboard)/,
    id: "dashboard"
  },
  {
    title: "AI Strategist",
    icon: BrainCircuit,
    url: "/ai-insights",
    pattern: /^\/ai-insights/,
    id: "ai_strategist"
  },
  { 
    title: "iClick POS", 
    icon: ShoppingCart, 
    url: "/pos", 
    pattern: /^\/pos/,
    id: "pos"
  },
  {
    title: "Sales Hub",
    icon: TrendingUp,
    url: "/sales",
    pattern: /^\/sales/,
    id: "sales",
    submenus: [
      { title: "Quotations", icon: Quote, url: "/sales/quotations", id: "quotations" },
      { title: "Sales Orders", icon: OrderIcon, url: "/sales/orders", id: "orders" },
      { title: "Invoice Center", icon: FileText, url: "/sales/invoices", id: "invoices" },
      { title: "Credit Notes", icon: CreditCard, url: "/sales/credit-notes", id: "credit_notes" },
      { title: "Sales Returns", icon: ArrowLeftRight, url: "/sales/returns", id: "returns" },
      { title: "Delivery Notes", icon: Truck, url: "/sales/delivery", id: "delivery" },
      { title: "Sales Reports", icon: ClipboardList, url: "/sales/reports", id: "reports" },
      { title: "Commission", icon: UserCheck, url: "/sales/commissions", id: "commissions" },
      { title: "Sales Setup", icon: Settings, url: "/sales/setup", id: "setup" },
    ]
  },
  { 
    title: "Stock Vault", 
    icon: Package, 
    url: "/inventory", 
    pattern: /^\/inventory/,
    id: "inventory",
    submenus: [
      { title: "Stock Items", icon: Box, url: "/inventory/products", id: "products" },
      { title: "Services", icon: Briefcase, url: "/inventory/services", id: "services" },
      { title: "Bundles / Combos", icon: Boxes, url: "/inventory/bundles", id: "bundles" },
      { title: "Variants", icon: Tags, url: "/inventory/variants", id: "variants" },
      { title: "Stock Levels", icon: Search, url: "/inventory/stock-levels", id: "stock_levels" },
      { title: "Warehouses", icon: Database, url: "/inventory/warehouses", id: "warehouses" },
      { title: "Stock Transfers", icon: Truck, url: "/inventory/transfers", id: "transfers" },
      { title: "Stock Adjustments", icon: Layers, url: "/inventory/adjustments", id: "adjustments" },
      { title: "Expiry Control", icon: Timer, url: "/inventory/expiry", id: "expiry" },
      { title: "Batch & Serial", icon: Barcode, url: "/inventory/batches", id: "batches" },
      { title: "Reorder Levels", icon: AlertTriangle, url: "/inventory/reorder", id: "reorder" },
      { title: "Damage & Loss", icon: Skull, url: "/inventory/damages", id: "damages" },
      { title: "Stock Valuation", icon: Scale, url: "/inventory/valuation", id: "valuation" },
      { title: "Inventory Reports", icon: ClipboardList, url: "/inventory/reports", id: "reports" },
      { title: "Inventory Setup", icon: Settings, url: "/inventory/setup", id: "setup" },
    ]
  },
  { 
    title: "Financial Suite", 
    icon: Calculator, 
    url: "/accounting", 
    pattern: /^\/accounting/,
    id: "accounting",
    submenus: [
      { title: "General Ledger", icon: BookOpen, url: "/accounting", id: "ledger" },
      { title: "Chart of Accounts", icon: Layers, url: "/accounting/coa", id: "coa" },
      { title: "Journal Entries", icon: History, url: "/accounting/journal", id: "journal" },
      { title: "Accounts Receivable", icon: Receipt, url: "/accounting/ar", id: "ar" },
      { title: "Accounts Payable", icon: Gavel, url: "/accounting/ap", id: "ap" },
      { title: "Cash & Bank", icon: Landmark, url: "/accounting/banking", id: "bank" },
      { title: "Fixed Assets", icon: Building, url: "/accounting/assets", id: "assets" },
      { title: "Expense Tracking", icon: ArrowRightLeft, url: "/accounting/expenses", id: "expenses" },
      { title: "Budgets", icon: PieChart, url: "/accounting/budgets", id: "budgets" },
      { title: "Tax Returns", icon: FileText, url: "/accounting/tax", id: "tax_returns" },
      { title: "Financial Setup", icon: Settings, url: "/accounting/setup", id: "setup" },
      { title: "Financial Reports", icon: ClipboardCheck, url: "/accounting/reports", id: "reports" },
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
    url: "/admin/settings", 
    pattern: /^\/admin/,
    id: "admin",
    submenus: [
      { title: "System Settings", icon: Sliders, url: "/admin/settings", id: "settings" },
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
