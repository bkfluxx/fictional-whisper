"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/layout/SidebarNav";
import SearchBar from "@/components/search/SearchBar";

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-background border-b border-border flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <Image
          src="/logo.jpg"
          alt="Aura"
          width={28}
          height={28}
          className="rounded-lg"
          priority
          unoptimized
        />
        <span className="text-sm font-semibold text-foreground">Aura</span>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Slide-over drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 bg-background border-r border-border flex flex-col py-5 px-3 transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.jpg"
              alt="Aura"
              width={32}
              height={32}
              className="rounded-lg"
              unoptimized
            />
            <span className="text-sm font-semibold text-foreground">Aura</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <SidebarNav />

        <div className="mt-auto pt-4 border-t border-border">
          <SearchBar />
        </div>
      </div>
    </>
  );
}
