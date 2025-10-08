"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// Using a plain <img> ensures LAN devices load the logo without Next/Image constraints
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Bookings", href: "/#bookings" },
  { label: "Contact", href: "/#contact" },
  { label: "Login/Register", href: "/auth" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const pathname = usePathname();
  const logoPath = "/images/logo/2024 IXTAbox Logo - White.png";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const containerClasses = useMemo(
    () =>
      `sticky top-0 z-[3000] transition-all duration-300 ${
        isScrolled ? "backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.35)] h-16" : "backdrop-blur-sm h-20"
      } ${userMenuOpen || mobileOpen ? "bg-gray-900" : "bg-gray-900"} border-b border-white/10 bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-fuchsia-600/10`,
    [isScrolled, userMenuOpen, mobileOpen]
  );

  const neon = "focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";
  const linkBase =
    "px-3 py-2 text-sm font-semibold tracking-wide text-gray-100 hover:text-white transition-colors duration-200 relative uppercase rounded-md border border-white/10";
  const linkGlow =
    "before:absolute before:inset-0 before:rounded-md before:bg-cyan-500/0 hover:before:bg-cyan-500/10 before:blur before:transition-all before:duration-300";

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // handle hash links by checking base path
    const base = href.split("#")[0];
    return pathname.startsWith(base) && base !== "/";
  };

  return (
    <header className={containerClasses}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-4">
          {/* Left: Brand */}
          <div className="flex items-center gap-3">
            <button
              aria-label="Open menu"
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(true)}
            >
              {/* Hamburger icon */}
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="group flex items-center gap-3">
              <span className="relative inline-flex h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 items-center justify-center rounded-md overflow-hidden ring-1 ring-white/10 shadow-lg shadow-cyan-500/10">
                <img
                  src={encodeURI(logoPath)}
                  alt="InxaBox Portal"
                  width={96}
                  height={96}
                  decoding="async"
                  loading="eager"
                  className={`h-full w-full object-contain transition-transform duration-300 ${isScrolled ? "scale-95" : "scale-100"}`}
                />
              </span>
              {/* Brand text removed as requested */}
            </Link>
          </div>

          {/* Center placeholder removed (search deleted) */}
          <div className="hidden lg:flex flex-1 items-center justify-center" />

          {/* Right: Nav (desktop) + actions */}
          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${linkBase} ${linkGlow} py-2.5 px-3.5 inline-flex items-center gap-2 ${
                    active
                      ? "bg-cyan-600/20 text-white border-cyan-400/40"
                      : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {/* Icon */}
                  <span className="opacity-80">
                  {item.label === "Home" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" />
                    </svg>
                  )}
                  {item.label === "Features" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3l3 6 6 .9-4.5 4.2L18 21l-6-3.2L6 21l1.5-6.9L3 9.9 9 9l3-6z" />
                    </svg>
                  )}
                  {item.label === "Bookings" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  )}
                  {item.label === "Contact" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V5a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10z" />
                    </svg>
                  )}
                  {item.label === "Login/Register" && (
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                    </svg>
                  )}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}

            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`ml-2 inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-cyan-200 hover:text-white hover:bg-white/10 transition-colors ${neon}`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                // Sun icon
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636" />
                </svg>
              ) : (
                // Moon icon
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* User menu */}
            <div className="relative ml-2">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-md border border-white/10 bg-gradient-to-br from-white/5 via-cyan-500/5 to-white/5 px-2.5 py-1.5 text-sm text-gray-200 hover:text-white hover:from-white/10 hover:via-cyan-500/10 hover:to-white/10 transition-colors ${neon}`}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" />
                  </svg>
                </span>
                <span>Account</span>
                <svg className="h-4 w-4 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-white/10 bg-gray-950 shadow-2xl shadow-black/70 z-[3000]">
                  <div className="py-1">
                    <Link href="/profile" className={`${linkBase} ${linkGlow} block w-full text-left`}>
                      <span className="relative z-10">Profile</span>
                    </Link>
                    <Link href="/settings" className={`${linkBase} ${linkGlow} block w-full text-left`}>
                      <span className="relative z-10">Settings</span>
                    </Link>
                    <button className={`${linkBase} ${linkGlow} block w-full text-left`} onClick={() => { /* implement */ }}>
                      <span className="relative z-10">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Mobile actions (theme + user) */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-cyan-200 hover:text-white hover:bg-white/10 transition-colors ${neon}`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <div className="relative">
              <button
                aria-label="Open account menu"
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 p-2 text-gray-200 hover:text-white hover:bg-white/10 transition-colors ${neon}`}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" />
                </svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-md border border-white/10 bg-gray-950 shadow-2xl shadow-black/70 z-[4000]">
                  <div className="py-1">
                    <Link href="/profile" className={`${linkBase} ${linkGlow} block w-full text-left`}>
                      <span className="relative z-10">Profile</span>
                    </Link>
                    <Link href="/settings" className={`${linkBase} ${linkGlow} block w-full text-left`}>
                      <span className="relative z-10">Settings</span>
                    </Link>
                    <button className={`${linkBase} ${linkGlow} block w-full text-left`} onClick={() => { /* implement */ }}>
                      <span className="relative z-10">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile slide-in menu */}
      <div
        className={`fixed inset-0 z-40 transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/80 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setMobileOpen(false)}
        />

        {/* Panel */}
        <div className="relative h-full w-72 bg-gray-950 border-r border-white/10 shadow-2xl shadow-black/60 bg-gradient-to-b from-cyan-600/10 via-blue-600/10 to-fuchsia-600/10 z-[2500]">
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
            <span className="text-white font-semibold">InxaBox Portal</span>
            <button
              aria-label="Close menu"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
           <div className="p-4">
            {/* Search removed on mobile */}
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`${linkBase} ${linkGlow} rounded-md`}
                >
                  <span className="relative z-10">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      {/* Mobile account dropdown backdrop */}
      {userMenuOpen && !mobileOpen && (
        <div
          className="fixed inset-0 z-[1500] bg-black/60 lg:hidden"
          onClick={() => setUserMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
}


