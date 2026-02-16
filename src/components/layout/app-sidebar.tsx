
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
  Store
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"

const modules = [
  {
    title: "Command Center",
    icon: LayoutDashboard,
    url: "/",
  },
  {
    title: "iClick POS",
    icon: ShoppingCart,
    url: "/pos",
  },
  {
    title: "Stock Vault",
    icon: Package,
    url: "/inventory",
  },
  {
    title: "Financial Suite",
    icon: Calculator,
    url: "/accounting",
  },
  {
    title: "People Hub",
    icon: Users,
    url: "/hr",
  },
  {
    title: "Client Care",
    icon: HeartHandshake,
    url: "/crm",
  },
  {
    title: "AI Analysis",
    icon: Sparkles,
    url: "/ai-insights",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()

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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  tooltip={item.title}
                >
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
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Switch Branch">
                <Building2 />
                <span>Nairobi HQ</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Admin Settings">
                <Settings />
                <span>Admin Panel</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:hidden">
          <div className="size-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">John Doe</span>
            <span className="text-xs text-muted-foreground">Super Admin</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
