"use client";

import { usePathname } from "next/navigation";
import LiveChatButton from "./LiveChatButton";

export default function LiveChatButtonWrapper() {
  const pathname = usePathname();
  
  // Show on all pages except admin panel and chat page
  if (pathname.startsWith("/admin") || pathname === "/chat") {
    return null;
  }
  
  return <LiveChatButton />;
}

