"use client";

import { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<{
  title: string | ReactNode;
  action?: ReactNode;
  className?: string;
}>;

export default function DashboardCard({ title, action, children, className = "" }: Props) {
  return (
    <div className={`dashboard-card ${className}`}>
      <div className="dashboard-card-header flex items-center justify-between gap-3 sm:gap-4">
        <h3 className="dashboard-card-title text-base sm:text-lg font-semibold flex-1">
          {title}
        </h3>
        {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}
