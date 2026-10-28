"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleDot,
  Compass,
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  ChevronsUpDown,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { GithubIcon } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Discover",
    items: [
      { name: "Assistant", href: ROUTES.DASHBOARD, icon: LayoutDashboard },
      { name: "For you", href: "/dashboard/feed", icon: Compass },
      { name: "Next issues", href: "/dashboard/issues", icon: CircleDot },
      { name: "Community", href: "/dashboard/community", icon: Users },
    ],
  },
  {
    label: "Repositories",
    items: [
      { name: "Imported", href: "/dashboard/imported-repos", icon: FolderGit2 },
      { name: "Search GitHub", href: "/dashboard/repositories", icon: Search },
    ],
  },
];

// Light / Dark as a small segmented control. The highlight follows what is on
// screen, so it's right even while the theme still follows the device (default).
function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ] as const;
  return (
    <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={resolvedTheme === value}
          onClick={(e) => {
            e.preventDefault();
            setTheme(value);
          }}
          className={cn(
            "flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground",
            resolvedTheme === value && "bg-background text-foreground shadow-xs"
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

// Nav row: muted by default; the active page gets the deep green fill.
// Hover only lightens the background.
const NAV_ITEM_CLASS =
  "h-10 gap-3 rounded-md px-3 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground " +
  "data-[active=true]:bg-nav-active data-[active=true]:font-medium data-[active=true]:text-nav-active-foreground " +
  "data-[active=true]:hover:bg-nav-active data-[active=true]:hover:text-nav-active-foreground";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();

  // On phones the sidebar is a sheet over the page: following any link in it
  // (nav, logo, account menu) closes it. React events bubble through the menu's portal.
  const closeOnNavigate = (event: React.MouseEvent) => {
    if (isMobile && (event.target as HTMLElement).closest("a")) setOpenMobile(false);
  };

  const isActive = (href: string) =>
    href === ROUTES.DASHBOARD ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <div className="contents" onClick={closeOnNavigate}>
      <SidebarHeader className="px-3 pb-4 pt-6">
        {/* Wordmark centred in the header; the collapse button sits on the right edge */}
        <div className="relative flex h-10 items-center justify-center">
          <Link
            href={ROUTES.DASHBOARD}
            aria-label="osca home"
            className="font-serif text-[28px] font-semibold italic leading-none tracking-tight group-data-[collapsible=icon]:hidden"
          >
            osca
          </Link>
          <SidebarTrigger className="absolute right-0 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:static" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label} className="px-3 py-2">
            <SidebarGroupLabel className="h-7 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.name} className={NAV_ITEM_CLASS}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="h-12 gap-3 rounded-md border border-sidebar-border bg-sidebar px-2.5 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0!"
                >
                  <Avatar className="size-8 rounded-md group-data-[collapsible=icon]:size-8">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback className="rounded-md text-xs font-medium">
                      {(user?.name ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-sm font-medium">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">@{user?.username}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-(--radix-dropdown-menu-trigger-width) rounded-md p-1">
                <div className="flex items-center gap-3 px-2.5 py-2">
                  <Avatar className="size-8 rounded-md">
                    {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                    <AvatarFallback className="rounded-md text-xs font-medium">
                      {(user?.name ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium">{user?.name}</p>
                    {/* GitHub noreply addresses aren't useful to show */}
                    <p className="truncate text-xs text-muted-foreground">
                      {user?.email && !user.email.endsWith("@users.noreply.github.com") ? user.email : `@${user?.username}`}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem asChild className="h-9 gap-3 rounded-md px-2.5">
                  <Link href={ROUTES.PROFILE}>
                    <User className="text-muted-foreground" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="h-9 gap-3 rounded-md px-2.5">
                  <Link href={ROUTES.SETTINGS}>
                    <Settings className="text-muted-foreground" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="h-9 gap-3 rounded-md px-2.5">
                  <a href={`https://github.com/${user?.username ?? ""}`} target="_blank" rel="noopener noreferrer">
                    <GithubIcon className="text-muted-foreground" /> View on GitHub
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1" />
                <div className="flex items-center justify-between gap-2 px-2.5 py-1">
                  <span className="text-sm">Theme</span>
                  <ThemeSwitch />
                </div>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={logout}
                  className="h-9 gap-3 rounded-md px-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive"
                >
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
