"use client";

import { useState, useEffect } from "react";
import Icon from "./Icon";

type Tab = {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
};

export default function MobileDashboardMenu({ tabs, activeTab, onTabChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (isOpen) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.mobile-menu-container')) {
          setIsOpen(false);
        }
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on tab change
  useEffect(() => {
    setIsOpen(false);
  }, [activeTab]);

  return (
    <>
      {/* Mobile Menu Button - Only visible on mobile */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="lg:hidden fixed top-20 right-4 z-40 bg-gradient-to-r from-pink-500 to-rose-500 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all"
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
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Menu */}
      <div
        className={`mobile-menu-container lg:hidden fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-pink-600">Menu</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <Icon name="close" size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg"
                  : "text-neutral-700 hover:bg-pink-50 hover:text-pink-600"
              }`}
            >
              {tab.icon && <Icon name={tab.icon} size={20} />}
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

