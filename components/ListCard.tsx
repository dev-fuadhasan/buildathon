"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
};

export default function ListCard({ title, subtitle, badge, onClick, children }: Props) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg border-2 border-slate-200 bg-white p-4 transition-all hover:shadow-md ${
        onClick ? "cursor-pointer hover:border-blue-300" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-lg text-slate-800">{title}</p>
            {badge}
          </div>
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          {children}
        </div>
        {onClick && (
          <button className="btn-secondary text-sm ml-4">View Details</button>
        )}
      </div>
    </div>
  );
}
