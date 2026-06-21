"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderGit2, User, Settings } from "lucide-react";
import { ROUTES } from "@/constants/routes";
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

  const navItems = [
    { name: "Dashboard", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { name: "Repositories", href: "/dashboard/repositories", icon: FolderGit2 },
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
