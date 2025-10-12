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
  { label: "Contact", href: "#footer" },
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
    const targets = ["#benefits", "#footer"]; // observe these sections
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
          setActiveHash(""); // no section in view → show Home only
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

  const logoPath = "/images/logo/guest-header-icon.png"; // Provided logo path

  const isActive = (href: string) => {
    if (href.startsWith("#") && pathname === "/") return activeHash === href; // hash active if section in view or clicked
    if (href === "/") return pathname === "/" && !activeHash; // unhighlight Home when a section is active
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
                  priority
                  className="h-full w-full object-contain"
                />
              </span>
              {/* Brand text removed as requested */}
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
                      if (el) {
                        (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                        setActiveHash(item.href);
                      }
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
                    {item.label === "Contact" && (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10z" />
                      </svg>
                    )}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/auth/login"
              className={`inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/10 px-6 py-2.5 text-base font-semibold text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-colors ${neonFocus}`}
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className={`inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2.5 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)] ${neonFocus}`}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      {mobileOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-full z-[9000]">
          <div className="bg-gray-950 border-t border-white/10 shadow-2xl shadow-black/60">
            <div className="px-4 py-3">
              <nav className="grid grid-cols-2 gap-2">
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
                          if (el) {
                            (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
                            setActiveHash(item.href);
                          }
                        }
                        setMobileOpen(false);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={`${linkBase} ${linkGlow} rounded-md border inline-flex items-center gap-2 w-full ${
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
                      {item.label === "Contact" && (
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10z" />
                        </svg>
                      )}
                    </span>
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-4 flex gap-3">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className={`flex-1 inline-flex items-center justify-center rounded-full border border-cyan-500/50 bg-cyan-500/10 px-6 py-2.5 text-base font-semibold text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-colors ${neonFocus}`}
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileOpen(false)}
                  className={`flex-1 inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2.5 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)] ${neonFocus}`}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


