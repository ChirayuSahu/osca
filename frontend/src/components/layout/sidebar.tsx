"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-16 bottom-16 w-64 border-r border-slate-200 bg-slate-50 flex-col p-6">
      <nav className="space-y-2">
        <Link
          href={ROUTES.DASHBOARD}
          className="block px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          Dashboard
        </Link>
        <Link
          href={ROUTES.PROFILE}
          className="block px-4 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          Profile
        </Link>
      </nav>
    </aside>
  );
}
