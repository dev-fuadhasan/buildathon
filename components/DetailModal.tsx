"use client";

import { ReactNode } from "react";
import Icon from "./Icon";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string | ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
};

export default function DetailModal({ isOpen, onClose, title, children, size = "lg" }: Props) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className={`${sizeClasses[size]} w-full max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col`}>
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 bg-gradient-to-r from-pink-50 to-rose-50">
          <h2 className="text-2xl font-bold text-neutral-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/80 transition-colors text-neutral-600 hover:text-neutral-800"
            aria-label="Close"
          >
            <Icon name="close" size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
