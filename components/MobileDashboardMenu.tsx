"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icon";

type Tab = {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
  action?: "navigate" | "logout" | "default";
  href?: string;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export default function MobileDashboardMenu({ tabs, activeTab, onTabChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.mobile-menu-container') && !target.closest('.mobile-menu-button')) {
          setIsOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on tab change (except for special actions)
  useEffect(() => {
    // Don't auto-close for logout or navigate actions
    const currentTab = tabs.find(t => t.id === activeTab);
    if (currentTab && currentTab.action !== "logout" && currentTab.action !== "navigate") {
      setIsOpen(false);
    }
  }, [activeTab, tabs]);

  const handleTabClick = (tab: Tab) => {
    if (tab.action === "logout") {
      localStorage.removeItem("motherToken");
      setIsOpen(false);
      router.push("/");
    } else if (tab.action === "navigate" && tab.href) {
      setIsOpen(false);
      router.push(tab.href);
    } else {
      onTabChange(tab.id);
    }
  };

  return (
    <>
      {/* Mobile Menu Button - Positioned in navbar location (right side, aligned with header) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="mobile-menu-button lg:!hidden fixed right-4 z-[60] bg-gradient-to-r from-pink-500 to-rose-500 text-white p-2.5 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all"
        style={{ zIndex: 60, top: '2rem' }}
        aria-label="Open menu"
      >
        {isOpen ? (
          <Icon name="close" size={24} className="brightness-0 invert" />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="brightness-0 invert">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        )}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:!hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Menu - Opens from right side */}
      <div
        className={`mobile-menu-container fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out lg:!hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-pink-500 to-rose-500">
          <h2 className="text-lg font-bold text-white">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <Icon name="close" size={20} className="brightness-0 invert" />
          </button>
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-73px)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id && tab.action !== "logout" && tab.action !== "navigate"
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : tab.action === "logout"
                  ? "text-red-600 hover:bg-red-50 hover:text-red-700"
                  : "text-neutral-700 hover:bg-pink-50 hover:text-pink-600"
              }`}
            >
              {tab.icon ? (
                <Icon name={tab.icon} size={20} />
              ) : tab.action === "logout" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              ) : null}
              <span className="flex-1 text-left font-medium">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

