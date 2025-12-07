"use client";

import { useState } from "react";
import Icon from "./Icon";
import LiveChatWidget from "./LiveChatWidget";

export default function LiveChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <>
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]">
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-neutral-900 text-white text-sm rounded-lg shadow-xl whitespace-nowrap animate-fade-in">
            Chat with MomsCare AI
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-neutral-900"></div>
          </div>
        )}
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
          aria-label="Open live chat"
          style={{ zIndex: 9999, position: 'fixed' }}
          onMouseOver={(e) => {
            e.currentTarget.style.animation = 'bounce 0.6s ease-in-out';
          }}
          onAnimationEnd={(e) => {
            e.currentTarget.style.animation = '';
          }}
        >
          <Icon name="chat" size={28} className="brightness-0 invert" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      </div>
      {isOpen && <LiveChatWidget onClose={() => setIsOpen(false)} />}
    </>
  );
}

