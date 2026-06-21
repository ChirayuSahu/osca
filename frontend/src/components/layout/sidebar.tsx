"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: ROUTES.DASHBOARD },
    { name: "Repositories", href: "/dashboard/repositories" },
    { name: "Profile", href: ROUTES.PROFILE },
    { name: "Settings", href: "#" },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 border-r border-white/[0.05] bg-black flex-col p-8 z-20 select-none">
      {/* Minimal Logo */}
      <div className="text-3xl font-semibold tracking-tight italic text-white font-serif mb-12 mt-4 flex items-center justify-center gap-1.5 w-full">
        osca
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>

      {/* Navigation */}
      <nav className="space-y-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
                isActive
                  ? "text-white font-normal"
                  : "text-neutral-500 hover:text-neutral-300 font-light"
              }`}
            >
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              )}
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
