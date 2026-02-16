
"use client"

import * as React from "react"
import {
  LogOut,
  Command,
  ChevronRight
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
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { cn } from "@/lib/utils"
import { navConfig, NavItem } from "@/lib/navigation"
import { doc } from "firebase/firestore"
import { useIsMobile } from "@/hooks/use-mobile"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const db = useFirestore()
  const { user } = useUser()
  const { setOpen, state, openMobile } = useSidebar()
  const isMobile = useIsMobile()
  
  const institutionId = pathname.split('/')[2] || "SYSTEM";

  const userRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, 'users', user.uid);
  }, [db, user]);

  const { data: userData } = useDoc(userRef);

  const userRoleId = userData?.rolesByInstitution?.[institutionId];
  const roleRef = useMemoFirebase(() => {
    if (!userRoleId || !institutionId) return null;
    return doc(db, 'institutions', institutionId, 'roles', userRoleId);
  }, [db, institutionId, userRoleId]);

  const { data: roleData } = useDoc(roleRef);
  const permissions = roleData?.permissionIds || [];

  const hasAccess = (moduleId: string, submenuId: string | null = null) => {
    if (!roleData && userData) return true;
    const permKey = `${moduleId}:${submenuId || 'root'}:read`;
    return permissions.includes(permKey);
  }

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
    if (!isMobile) {
      setOpen(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        collapsible={isMobile ? "none" : "icon"} 
        className="z-30 border-r border-border/50 shrink-0"
        onMouseEnter={() => !isMobile && setOpen(true)}
        onMouseLeave={() => !isMobile && setOpen(false)}
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
              const showSubmenuInMobile = isMobile && isActive && item.submenus && item.submenus.length > 0;

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
                        isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary"
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-5 shrink-0" />
                        <span className={cn(
                          "ml-3 text-sm transition-opacity duration-200",
                          !isMobile && state === "collapsed" ? "opacity-0 invisible" : "opacity-100 visible"
                        )}>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {/* Inline submenus for Mobile */}
                  {showSubmenuInMobile && (
                    <div className="ml-6 mt-1 space-y-1 border-l-2 border-primary/20 pl-2">
                      {item.submenus?.map((sub) => (
                        <SidebarMenuItem key={sub.title}>
                          <SidebarMenuButton asChild isActive={pathname === sub.url} className="h-8 text-xs">
                            <Link href={sub.url}>
                              <sub.icon className="size-3.5 mr-2 opacity-70" />
                              {sub.title}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </div>
                  )}
                </React.Fragment>
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
                  !isMobile && state === "collapsed" ? "opacity-0 invisible" : "opacity-100 visible"
                )}>
                  Logout
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {!isMobile && hasSubmenus && (
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
