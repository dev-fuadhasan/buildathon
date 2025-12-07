"use client";

import { ReactNode, useEffect } from "react";
import Icon from "./Icon";

type MessageType = "success" | "error" | "warning" | "info";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  type: MessageType;
  title: string;
  message: string | ReactNode;
  autoClose?: number; // Auto close after milliseconds (optional)
};

export default function MessagePopup({ isOpen, onClose, type, title, message, autoClose }: Props) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-50",
      border: "border-green-300",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      titleColor: "text-green-800",
      textColor: "text-green-700",
      icon: "check" as const,
      emoji: "✅",
    },
    error: {
      bg: "bg-gradient-to-br from-red-50 to-rose-50",
      border: "border-red-300",
      iconBg: "bg-red-100",
      iconColor: "text-red-600",
      titleColor: "text-red-800",
      textColor: "text-red-700",
      icon: "close" as const,
      emoji: "❌",
    },
    warning: {
      bg: "bg-gradient-to-br from-yellow-50 to-amber-50",
      border: "border-yellow-300",
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      titleColor: "text-yellow-800",
      textColor: "text-yellow-700",
      icon: "warning" as const,
      emoji: "⚠️",
    },
    info: {
      bg: "bg-gradient-to-br from-blue-50 to-cyan-50",
      border: "border-blue-300",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      titleColor: "text-blue-800",
      textColor: "text-blue-700",
      icon: "info" as const,
      emoji: "ℹ️",
    },
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className={`${styles.bg} ${styles.border} border-2 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn`}>
        <div className="flex items-start gap-4">
          <div className={`${styles.iconBg} ${styles.iconColor} rounded-full p-3 flex-shrink-0 flex items-center justify-center`} style={{ width: '56px', height: '56px' }}>
            <span className="text-2xl">{styles.emoji}</span>
          </div>
          <div className="flex-1">
            <h3 className={`${styles.titleColor} text-xl font-bold mb-2`}>{title}</h3>
            <div className={`${styles.textColor} text-base leading-relaxed`}>
              {typeof message === "string" ? <p>{message}</p> : message}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 transition-colors text-neutral-400 hover:text-neutral-600"
            aria-label="Close"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
              type === "success"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : type === "error"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : type === "warning"
                ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

