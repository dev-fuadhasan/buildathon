"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "./Icon";
import { useTranslation } from "@/hooks/useTranslation";
import { useEffect, useState } from "react";

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslation();
  const [isMother, setIsMother] = useState(false);
  const [isDoctor, setIsDoctor] = useState(false);

  useEffect(() => {
    setIsMother(!!localStorage.getItem("motherToken"));
    setIsDoctor(!!localStorage.getItem("doctorToken"));
  }, []);

  const tab = searchParams.get("tab");

  const navItems = [
    {
      label: "Home",
      icon: "mom",
      href: "/",
      active: pathname === "/",
    },
    {
      label: "Chat",
      icon: "chat",
      href: "/chat",
      active: pathname === "/chat",
    },
    {
      label: "Dashboard",
      icon: "progress",
      href: isMother ? "/mother/dashboard" : isDoctor ? "/doctor/dashboard" : "/mother/login",
      active: pathname.includes("/dashboard") && tab !== "profile",
    },
    {
      label: "Profile",
      icon: "profile",
      href: isMother ? "/mother/dashboard?tab=profile" : isDoctor ? "/doctor/profile" : "/mother/login",
      active: pathname.includes("/profile") || (pathname.includes("/dashboard") && tab === "profile"),
    },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-neutral-200 px-6 py-2 z-50 flex justify-between items-center pb-safe">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`flex flex-col items-center gap-1 transition-all ${
            item.active ? "text-pink-600 scale-110" : "text-neutral-500 hover:text-pink-400"
          }`}
        >
          <div className={`p-1 rounded-xl ${item.active ? "bg-pink-50" : ""}`}>
            <Icon name={item.icon as any} size={24} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}
