"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
};

export default function ListCard({ title, subtitle, badge, onClick, children, className = "" }: Props) {
  return (
    <div
      className={`rounded-xl border-2 border-neutral-200 bg-white p-5 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer hover:border-pink-300 hover:scale-[1.01] ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-neutral-800 truncate">{title}</h4>
          {subtitle && (
            <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{subtitle}</p>
          )}
        </div>
        {badge && <div className="ml-3 flex-shrink-0">{badge}</div>}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
