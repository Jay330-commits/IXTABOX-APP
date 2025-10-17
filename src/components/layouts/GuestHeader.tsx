"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { JSX } from "react";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "#footer" },
  { label: "Bookings", href: "/guest/bookings" }
];

export default function GuestHeader(): JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState<string>("");
  const pathname = usePathname();
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const targets = ["#benefits", "#footer"];
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
      `sticky top-0 z-[10000] transition-colors duration-300 h-20 ${
        isScrolled ? "backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.35)]" : "backdrop-blur-sm"
      } ${mobileOpen ? "bg-gray-950" : "bg-gray-900"} border-b border-white/10 overflow-visible relative`,
    [isScrolled, mobileOpen]
  );

  const neonFocus = "focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";
  const linkBase =
    "px-3 py-2 text-sm font-semibold tracking-wide text-gray-200 hover:text-white transition-colors duration-200 relative rounded-md";
  const linkGlow =
    "before:absolute before:inset-0 before:rounded-md before:bg-cyan-500/0 hover:before:bg-cyan-500/10 before:blur before:transition-all before:duration-300";

  const logoPath = "/images/logo/guest-header-icon.png";

  const isActive = (href: string) => {
    if (href.startsWith("#") && pathname === "/") return activeHash === href;
    if (href === "/") return pathname === "/" && !activeHash;
    const base = href.split("#")[0];
    return base !== "/" && base.length > 0 && pathname.startsWith(base);
  };

  return (
    <header className={containerClasses + " isolate"}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-4">
          {/* Left: Logo / Brand */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="group flex items-center gap-3">
              <span className="relative inline-flex h-14 w-32 sm:h-16 sm:w-36 md:h-20 md:w-40 items-center justify-center rounded-md overflow-hidden ring-1 ring-white/10 shadow-lg shadow-cyan-500/10">
                <Image
                  src={encodeURI(logoPath)}
                  alt="InxaBox Portal"
                  width={160}
                  height={90}
                  unoptimized
                  priority
                  className="object-contain mx-auto h-auto max-w-[200px] sm:max-w-[240px]"
                />
              </span>
            </Link>
          </div>

          {/* Center: Nav (desktop) */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    if (item.href.startsWith("#")) {
                      e.preventDefault();
                      const el = document.querySelector(item.href);
                      if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                      setActiveHash(item.href);
                    }
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`${linkBase} ${linkGlow} border inline-flex items-center gap-2 ${
                    active
                      ? "bg-cyan-600/20 border-cyan-400/40 text-white"
                      : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200"
                  }`}
                >
                  <span className="opacity-80">
                    {item.label === "Home" && (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" />
                      </svg>
                    )}
                    {item.label === "About" && (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                    )}
                      {item.label === "Bookings" && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                      )}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Actions (Partner CTA + Auth) */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="auth\signup"
              className={`inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-white/5 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:text-white hover:bg-white/10 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.35)] ${neonFocus}`}
            >
              <svg className="h-4 w-4 mr-1.5 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 11l4 4 8-8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l5-5 4 4 8-8" />
              </svg>
              Become a Partner
            </Link>
            <Link
              href="/auth/login"
              className={`inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-sm font-semibold text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-colors ${neonFocus}`}
            >
              Login
            </Link>
            <Link
              href="/auth/signup"
              className={`inline-flex items-center justify-center rounded-full bg-cyan-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)] ${neonFocus}`}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile slide-in sidebar from left */}
      <div
        className={`lg:hidden fixed inset-0 z-[9000] transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-black/80" 
          onClick={() => setMobileOpen(false)} 
        />
        
        {/* Sidebar */}
        <div className="relative h-full w-72 bg-gray-950 border-r border-white/10 shadow-2xl shadow-black/60 overflow-y-auto">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-md overflow-hidden ring-1 ring-white/10">
                <Image
                  src={encodeURI(logoPath)}
                  alt="IXTAbox"
                  width={40}
                  height={40}
                  unoptimized
                  className="object-contain"
                />
              </span>
              <span className="text-white font-semibold text-sm">IXTAbox</span>
            </div>
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4">
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
                        const el = document.querySelector(item.href);
                        if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                        setActiveHash(item.href);
                      }
                      setMobileOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={`${linkBase} ${linkGlow} rounded-md border inline-flex items-center gap-3 w-full ${
                      active
                        ? "bg-cyan-600/20 border-cyan-400/40 text-white"
                        : "bg-white/5 hover:bg-white/10 border-white/10 text-gray-200"
                    }`}
                  >
                    <span className="opacity-80">
                      {item.label === "Home" && (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" />
                        </svg>
                      )}
                      {item.label === "About" && (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      )}
                      {item.label === "Bookings" && (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <path d="M16 2v4M8 2v4M3 10h18" />
                        </svg>
                      )}
                    </span>
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-4">
              <Link
                href="auth/signup"
                onClick={() => setMobileOpen(false)}
                className={`inline-flex items-center justify-center rounded-full border border-cyan-400/40 bg-white/5 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:text-white hover:bg-white/10 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.35)] ${neonFocus}`}
              >
                <svg className="h-5 w-5 mr-2 opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11l4 4 8-8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l5-5 4 4 8-8" />
                </svg>
                Become a Partner
              </Link>
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className={`inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-colors ${neonFocus}`}
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileOpen(false)}
                className={`inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)] ${neonFocus}`}
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
