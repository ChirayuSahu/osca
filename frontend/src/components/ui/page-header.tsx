import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode; // Optional extra content like search bar or filters below
}

export function PageHeader({ title, description, icon, actions, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 mb-8 pt-4 z-10 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-3xl font-medium tracking-tight text-neutral-100 flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                {icon}
              </div>
            )}
            {title}
          </h1>
          {description && (
            <p className="text-neutral-400 text-base font-light">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
      {children && (
        <div className="w-full">
          {children}
        </div>
      )}
    </div>
  );
}
