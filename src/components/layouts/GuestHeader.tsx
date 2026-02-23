"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { JSX } from "react";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { 
    label: "Book IXTAbox", 
    href: "#map"
  },
  { 
    label: "Your Bookings", 
    href: "/guest/bookings"
  },
  { 
    label: "About", 
    href: "#footer"
  },
  
  { 
    label: "Support", 
    href: "/support"
  }
];

export default function GuestHeader(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState<string>("");
  const pathname = usePathname();
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = ["#map", "#benefits", "#footer"];
    const elements = targets
      .map((sel) => document.querySelector(sel))
      .filter((el): el is Element => !!el);

    if (observerRef.current) observerRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target) {
          const id = "#" + visible.target.id;
          setActiveHash(id);
        } else {
          setActiveHash("");
        }
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0.1, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  const containerClasses = useMemo(
    () =>
      `sticky top-0 z-[10000] transition-all duration-500 ${
        isScrolled 
          ? "bg-gray-900/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b border-white/5" 
          : "bg-gray-900/80 backdrop-blur-md border-b border-white/5"
      }`,
    [isScrolled]
  );

  const isActive = (href: string) => {
    if (href.startsWith("#") && pathname === "/") return activeHash === href;
    if (href === "/") return pathname === "/" && !activeHash;
    const base = href.split("#")[0];
    return base !== "/" && base.length > 0 && pathname.startsWith(base);
  };

  const logoPath = "/images/logo/new.png";

  return (
    <>
      <header className={containerClasses}>
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="flex h-20 items-center w-full">
            {/* Logo - always at start */}
            <Link 
              href="/" 
              className="flex-shrink-0 group flex items-center transition-transform hover:scale-105 duration-200"
              onClick={(e) => {
                if (pathname === "/") {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setActiveHash("");
                }
              }}
            >
              <div className="relative h-12 w-32 sm:h-14 sm:w-36 md:h-16 md:w-40 flex items-center justify-center">
                <Image
                  src={encodeURI(logoPath)}
                  alt="IXTAbox"
                  width={160}
                  height={90}
                  priority
                  className="object-contain h-full w-full transition-opacity group-hover:opacity-90"
                />
              </div>
            </Link>

            {/* Desktop Navigation - centered in the middle */}
            <nav className="hidden lg:flex flex-1 items-center justify-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      if (item.href.startsWith("#")) {
                        e.preventDefault();
                        // If we're on a different page, navigate to home first
                        if (pathname !== "/") {
                          router.push(`/${item.href}`);
                          return;
                        }
                        // Set active hash immediately for instant feedback
                        setActiveHash(item.href);
                        const el = document.querySelector(item.href);
                        if (el) {
                          (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                          // Also update after scroll completes to ensure it stays active
                          setTimeout(() => {
                            setActiveHash(item.href);
                          }, 500);
                        }
                      }
                      // For non-hash links, let Link handle navigation normally
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`
                      relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg
                      ${active
                        ? "text-cyan-300"
                        : "text-gray-300 hover:text-white"
                      }
                      group
                    `}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {item.label}
                      {active && (
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50" />
                      )}
                    </span>
                    {active && (
                      <>
                        {/* Background glow */}
                        <span className="absolute inset-0 bg-cyan-500/10 rounded-lg border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]" />
                        {/* Animated bottom border */}
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-3/4 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse" />
                      </>
                    )}
                    <span className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>
                );
              })}
            </nav>

            {/* Desktop Actions - always at end */}
            <div className="hidden lg:flex flex-shrink-0 items-center gap-3">
              <Link
                href="/auth/signup?role=distributor"
                className="px-4 py-2 text-sm font-semibold text-cyan-200 hover:text-white transition-all duration-200 rounded-lg border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10"
              >
                Become A Partner
              </Link>
              
              <Link
                href="/auth/login"
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-105"
              >
                Login / Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              aria-label="Toggle menu"
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[10001]">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
            onClick={() => setMobileOpen(false)} 
          />
          
          {/* Menu Panel */}
          <div className="absolute right-0 top-0 h-full w-80 bg-gray-900/98 backdrop-blur-xl border-l border-white/10 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 h-20 border-b border-white/10">
              <span className="text-xl font-bold text-white">Menu</span>
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Navigation */}
            <div className="px-6 py-6">
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={(e) => {
                        if (item.href.startsWith("#")) {
                          e.preventDefault();
                          // If we're on a different page, navigate to home first
                          if (pathname !== "/") {
                            router.push(`/${item.href}`);
                            setMobileOpen(false);
                            return;
                          }
                          // Set active hash immediately for instant feedback
                          setActiveHash(item.href);
                          const el = document.querySelector(item.href);
                          if (el) {
                            (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                            // Also update after scroll completes to ensure it stays active
                            setTimeout(() => {
                              setActiveHash(item.href);
                            }, 500);
                          }
                        }
                        setMobileOpen(false);
                      }}
                      className={`
                        relative flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200
                        ${active
                          ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                        }
                      `}
                    >
                      <span className="font-medium">{item.label}</span>
                      {active && (
                        <>
                          {/* Indicator dot */}
                          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse" />
                          {/* Left border accent */}
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-3/4 w-0.5 bg-gradient-to-b from-cyan-400/60 via-cyan-400 to-cyan-400/60 rounded-r-full shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                        </>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Actions */}
              <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
                <Link
                  href="/auth/signup?role=distributor"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-lg text-cyan-200 hover:text-white transition-colors border border-cyan-500/30 hover:border-cyan-400/50 hover:bg-cyan-500/10"
                >
                  <span className="font-semibold">Become a Partner</span>
                </Link>
                
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center px-4 py-3 rounded-lg text-white bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/25"
                >
                  <span className="font-semibold">Login / Sign Up</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
