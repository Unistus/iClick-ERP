
"use client"

import * as React from "react"
import {
  LogOut,
  Command,
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
import { navConfig } from "@/lib/navigation"
import { doc } from "firebase/firestore"
import { useIsMobile } from "@/hooks/use-mobile"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { setOpen, state } = useSidebar()
  const isMobile = useIsMobile()
  
  // Tenancy Logic: Get active institution ID from context or path
  // In a real production app, this would come from a global 'activeInstitution' state
  const institutionId = pathname.split('/')[2] || "SYSTEM";

  // 1. Fetch user profile to get rolesByInstitution map
  const userRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userData } = useDoc(userRef);

  // 2. Fetch the specific role for the currently active institution context
  const userRoleId = userData?.rolesByInstitution?.[institutionId];
  const roleRef = useMemoFirebase(() => {
    if (!userRoleId || !institutionId) return null;
    return doc(db, 'institutions', institutionId, 'roles', userRoleId);
  }, [db, institutionId, userRoleId]);

  const { data: roleData } = useDoc(roleRef);
  const permissions = roleData?.permissionIds || [];

  // Permission check helper
  const hasAccess = (moduleId: string, submenuId: string | null = null) => {
    // DEV OVERRIDE: enquiry@unistus.co.ke is always a DevOps superuser
    if (user?.email === 'enquiry@unistus.co.ke') return true;
    
    // If no role is assigned yet (initial development), allow access to prevent locking out
    // Once roles are established, this default-allow logic should be tightened
    if (!roleData && userData && (!userData.rolesByInstitution || Object.keys(userData.rolesByInstitution).length === 0)) return true;
    
    const permKey = `${moduleId}:${submenuId || 'root'}:read`;
    return permissions.includes(permKey);
  }

  // 3. Filter navigation dynamically based on the user's role permissions
  const filteredNav = navConfig.filter(item => {
    const hasRootAccess = hasAccess(item.id);
    const hasAnySubmenuAccess = item.submenus?.some(sub => hasAccess(item.id, sub.id));
    return hasRootAccess || hasAnySubmenuAccess;
  }).map(item => {
    if (item.submenus) {
      return {
        ...item,
        submenus: item.submenus.filter(sub => hasAccess(item.id, sub.id))
      };
    }
    return item;
  });

  const activeModule = filteredNav.find(item => item.pattern.test(pathname))
  const hasSubmenus = activeModule && activeModule.submenus && activeModule.submenus.length > 0

  const handleLogout = async () => {
    await auth.signOut()
    router.push('/login')
  }

  const handleItemClick = () => {
    // On desktop, clicking an item navigates and collapses the main bar if needed
    if (!isMobile) {
      setOpen(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        collapsible="icon" 
        className="z-30 border-r border-border/50 shrink-0 shadow-2xl"
        onMouseEnter={() => !isMobile && setOpen(true)}
        onMouseLeave={() => !isMobile && setOpen(false)}
      >
        <SidebarHeader className="h-12 flex items-center justify-center p-0 border-b border-border/10 bg-sidebar-background/50">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg">
            <Command className="size-4" />
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2 gap-4 bg-sidebar-background/20">
          <SidebarMenu>
            {filteredNav.map((item) => {
              const isActive = item.pattern.test(pathname)

              return (
                <React.Fragment key={item.title}>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      tooltip={item.title}
                      onClick={handleItemClick}
                      className={cn(
                        "transition-all duration-200 h-10 px-3",
                        isActive ? "bg-primary text-primary-foreground shadow-md font-bold" : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className={cn("size-5 shrink-0", isActive ? "text-white" : "text-primary/70")} />
                        <span className={cn(
                          "ml-3 text-xs font-semibold tracking-wide uppercase transition-opacity duration-200",
                          state === "collapsed" ? "opacity-0 invisible" : "opacity-100 visible"
                        )}>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </React.Fragment>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 border-t border-border/50 bg-sidebar-background/50">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                onClick={handleLogout} 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 px-3"
                tooltip="Logout"
              >
                <LogOut className="size-5 shrink-0" />
                <span className={cn(
                  "ml-3 text-xs font-bold uppercase transition-opacity duration-200",
                  state === "collapsed" ? "opacity-0 invisible" : "opacity-100 visible"
                )}>
                  Logout
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Persistent Secondary Sidebar for Submenus */}
      {hasSubmenus && (
        <div 
          className={cn(
            "z-20 border-r border-border/50 bg-sidebar/40 backdrop-blur-3xl shrink-0 h-screen flex flex-col transition-all duration-300 shadow-xl",
            isMobile ? "w-48" : "w-64"
          )}
        >
          <div className="h-12 flex items-center px-6 border-b border-border/50 bg-background/40">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80 truncate">
              {activeModule.title}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <div className="space-y-4">
              <nav className="space-y-1">
                {activeModule.submenus?.map((sub) => (
                  <Link 
                    key={sub.title} 
                    href={sub.url}
                    className={cn(
                      "flex items-center gap-3 h-9 px-3 rounded-lg text-[11px] transition-all duration-200",
                      pathname === sub.url 
                        ? "bg-primary/15 text-primary font-bold shadow-inner ring-1 ring-primary/20" 
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                    )}
                  >
                    <sub.icon className={cn("size-3.5", pathname === sub.url ? "text-primary" : "text-muted-foreground/60")} />
                    <span className="truncate">{sub.title}</span>
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
