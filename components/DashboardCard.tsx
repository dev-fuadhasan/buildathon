"use client";

import { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<{
  title: string;
  action?: ReactNode;
}>;

export default function DashboardCard({ title, action, children }: Props) {
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-100 shadow-xl p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <h3 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
          {title}
        </h3>
        {action}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

