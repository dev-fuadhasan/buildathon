"use client";

import { usePathname } from "next/navigation";
import LiveChatButton from "./LiveChatButton";

export default function LiveChatButtonWrapper() {
  const pathname = usePathname();
  
  // Show on all pages except admin panel
  if (pathname.startsWith("/admin")) {
    return null;
  }
  
  return <LiveChatButton />;
}

