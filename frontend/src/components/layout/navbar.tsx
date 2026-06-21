"use client";

import Link from "next/link";
import { ROUTES } from "@/constants/routes";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between h-full px-6">
        <div className="text-xl font-bold text-slate-900">Logo</div>
        <div className="flex gap-6 items-center">
          <Link
            href={ROUTES.HOME}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Home
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}
