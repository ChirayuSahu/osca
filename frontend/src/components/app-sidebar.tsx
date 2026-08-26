"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderGit2, User, Settings, LogOut, Activity } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { name: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { name: "Your Feed", href: "/dashboard/feed", icon: Activity },
    { name: "Imported Repos", href: "/dashboard/imported-repos", icon: FolderGit2 },
    { name: "GitHub Search", href: "/dashboard/repositories", icon: FolderGit2 },
    { name: "Profile", href: ROUTES.PROFILE, icon: User },
    { name: "Settings", href: "#", icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-white/[0.05] bg-black text-white">
      <SidebarHeader className="p-6 bg-black flex-shrink-0">
        <div className="flex items-center gap-1.5 mt-2 justify-center w-full">
          <span className="text-3xl font-semibold tracking-tight italic text-white font-serif">
            osca
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4 py-2 bg-black">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-white/[0.02] hover:text-white ${
                        isActive
                          ? "bg-white/[0.03] text-white"
                          : "text-neutral-500"
                      }`}
                    >
                      <Link href={item.href}>
                        <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-neutral-500"}`} />
                        <span>{item.name}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 text-neutral-500"
                >
                  <LogOut className="w-4 h-4 text-neutral-500 group-hover:text-red-400" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
