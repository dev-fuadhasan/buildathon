"use client";

import { useState } from "react";
import Icon from "./Icon";
import LiveChatWidget from "./LiveChatWidget";

export default function LiveChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] w-14 h-14 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center group"
        aria-label="Open live chat"
        style={{ zIndex: 9999, position: 'fixed' }}
      >
        <Icon name="chat" size={28} className="brightness-0 invert" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
      </button>
      {isOpen && <LiveChatWidget onClose={() => setIsOpen(false)} />}
    </>
  );
}

