import { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-2xl border border-[#444444] bg-[#121212] p-6 shadow-none ${className}`.trim()}>
      {children}
    </div>
  );
}
