
"use client"

import * as React from "react"
import {
  LogOut,
  Command
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { cn } from "@/lib/utils"
import { navConfig, NavItem } from "@/lib/navigation"
import { doc } from "firebase/firestore"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { setOpen, state } = useSidebar()
  
  // Current active institution ID (this would ideally be from a context or session)
  // For now, we'll try to find it from the path or a fallback
  const institutionId = pathname.split('/')[2] || "SYSTEM"; // Simplified logic

  const userRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userData } = useDoc(userRef);

  // Fetch the role details to get permission IDs
  const userRoleId = userData?.rolesByInstitution?.[institutionId];
  const roleRef = useMemoFirebase(() => {
    if (!userRoleId || !institutionId) return null;
    return doc(db, 'institutions', institutionId, 'roles', userRoleId);
  }, [db, institutionId, userRoleId]);

  const { data: roleData } = useDoc(roleRef);
  const permissions = roleData?.permissionIds || [];

  const hasAccess = (moduleId: string, submenuId: string | null = null) => {
    // If no roles are set up yet (initial dev), show everything
    if (!roleData && userData) return true;
    
    // Check for "read" permission on this specific module/submenu
    const permKey = `${moduleId}:${submenuId || 'root'}:read`;
    return permissions.includes(permKey);
  }

  // Filter modules based on access
  const filteredNav = navConfig.filter(item => {
    if (item.submenus) {
      // Show module if any submenu is readable
      const accessibleSubs = item.submenus.filter(sub => hasAccess(item.id, sub.id));
      return accessibleSubs.length > 0;
    }
    return hasAccess(item.id);
  }).map(item => {
    // Also filter submenus within modules
    if (item.submenus) {
      return {
        ...item,
        submenus: item.submenus.filter(sub => hasAccess(item.id, sub.id))
      };
    }
    return item;
  });

  const activeModule = navConfig.find(item => item.pattern.test(pathname))
  const hasSubmenus = activeModule && activeModule.submenus && activeModule.submenus.length > 0

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login')
  }

  const handleItemClick = () => {
    setOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden">
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
            {filteredNav.map((item) => {
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
                {activeModule.submenus?.filter(sub => hasAccess(activeModule.id, sub.id)).map((sub) => (
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
