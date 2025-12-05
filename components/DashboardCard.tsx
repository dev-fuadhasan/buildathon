"use client";

import { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<{
  title: string;
  action?: ReactNode;
}>;

export default function DashboardCard({ title, action, children }: Props) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

