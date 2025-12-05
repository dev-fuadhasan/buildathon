"use client";

import { ReactNode } from "react";

type ListCardProps = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
};

export default function ListCard({ title, subtitle, badge, onClick, children }: ListCardProps) {
  return (
    <div
      className={`group rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-pink-300 hover:shadow-lg ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 truncate">{title}</h3>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-slate-600 truncate">{subtitle}</p>
          )}
          {children}
        </div>
        {onClick && (
          <div className="flex-shrink-0 text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

