"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? "bg-white/50 backdrop-blur-md border-line/50 shadow-sm"
          : "bg-card border-line"
      }`}
    >
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-teal via-gold to-plum opacity-60" />
        <div className="max-w-full desktop:max-w-[1240px] wide:max-w-[1440px] mx-auto px-4 tablet:px-6 h-14 tablet:h-[68px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/images/LOGO SIMFONI.png" alt="SIMFONI" className="h-12 tablet:h-16 desktop:h-20 w-auto" />
          </Link>
          <img src="/images/LOGO BPS.png" alt="BPS Kabupaten Raja Ampat" className="h-12 tablet:h-16 desktop:h-20 w-auto" />
        </div>
    </header>
  );
}
