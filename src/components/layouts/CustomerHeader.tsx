"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  label: string;
  section: string;
  icon: string;
};

const navItems: NavItem[] = [
  { label: "Bookings", section: "book", icon: "📅" },
  { label: "Payments", section: "payments", icon: "💳" },
  { label: "Notifications", section: "notifications", icon: "🔔" },
];

interface CustomerHeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export default function CustomerHeader({ activeSection, onSectionChange }: CustomerHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const logoPath = "/images/logo/test.png";

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-mobile-account-menu]')) {
        setMobileUserMenuOpen(false);
      }
    };
    
    if (mobileUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileUserMenuOpen]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const containerClasses = useMemo(
    () =>
      `sticky top-0 z-[10000] transition-all duration-500 ${
        isScrolled
          ? "bg-gray-900/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border-b border-white/5"
          : "bg-gray-900/80 backdrop-blur-md border-b border-white/5"
      }`,
    [isScrolled]
  );

  const neonFocus = "focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";
  const navButtonClasses = (active: boolean) =>
    `relative inline-flex items-center px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
      active ? "text-cyan-300" : "text-gray-300 hover:text-white"
    } group`;

  return (
    <>
      {/* === Desktop Header === */}
      <header className={`${containerClasses} hidden lg:block h-20`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="relative inline-flex h-20 w-40 items-center justify-center rounded-md overflow-hidden ring-1 ring-white/10 shadow-lg shadow-cyan-500/10">
              <Image
                src={encodeURI(logoPath)}
                alt="InxaBox Portal"
                width={160}
                height={90}
                priority
                className="object-contain mx-auto h-auto max-w-[200px]"
              />
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = activeSection === item.section;
              return (
                <button
                  key={item.label}
                  onClick={() => onSectionChange(item.section)}
                  className={navButtonClasses(active)}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="opacity-80 text-lg">{item.icon}</span>
                  <span className="relative z-10 ml-1">{item.label}</span>
                  {active && (
                    <span className="absolute inset-0 bg-cyan-500/10 rounded-lg border border-cyan-500/20" />
                  )}
                  <span className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </button>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors ${neonFocus}`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <svg
                  className="h-5 w-5 text-cyan-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636" />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-blue-300"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Account menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 text-gray-200 hover:bg-white/10 ${neonFocus}`}
              >
                <span className="h-6 w-6 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" />
                  </svg>
                </span>
                Account
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-white/10 bg-gray-950 shadow-lg shadow-black/60 z-[3000]">
                  <div className="py-1">
                    <button onClick={() => onSectionChange("profile")} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors">Profile</button>
                    <button onClick={() => onSectionChange("settings")} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-500/10 hover:text-blue-200 transition-colors">Settings</button>
                    <button className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-red-500/10 hover:text-red-200 transition-colors">Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* === Mobile Top Bar === */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-[10000] h-16 bg-gray-900/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center px-4">
        <div className="flex items-center gap-3">
          <button
            aria-label="Open menu"
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setMobileOpen(true)}
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center">
            <span className="relative inline-flex h-10 w-20 items-center justify-center rounded-md overflow-hidden ring-1 ring-white/10 shadow-lg shadow-cyan-500/10">
              <Image
                src={encodeURI(logoPath)}
                alt="InxaBox Portal"
                width={80}
                height={45}
                unoptimized
                priority
                className="object-contain mx-auto h-auto max-w-[100px]"
              />
            </span>
          </Link>
        </div>

        {/* Account icon with dropdown */}
        <div className="relative flex items-center" data-mobile-account-menu>
          <button
            onClick={() => setMobileUserMenuOpen((v) => !v)}
            className="h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" />
            </svg>
          </button>
          
          {mobileUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-gray-950 shadow-lg shadow-black/60 z-[3001]">
              <div className="py-1">
                <button
                  onClick={() => {
                    onSectionChange("profile");
                    setMobileUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => {
                    onSectionChange("settings");
                    setMobileUserMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-500/10 hover:text-blue-200 transition-colors"
                >
                  Settings
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-red-500/10 hover:text-red-200 transition-colors">
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spacer for top bar */}
      <div className="lg:hidden h-16"></div>

      {/* === Mobile Sidebar === */}
      <div className={`lg:hidden fixed inset-0 z-[9000] ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      <div
          className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
            mobileOpen ? "opacity-100" : "opacity-0"
        }`}
          onClick={() => setMobileOpen(false)} 
        />
        
        <div
          className={`absolute left-0 top-0 h-full w-72 bg-gray-950/95 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-black/60 transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
            <span className="text-white font-semibold text-lg">IXTAbox Customer</span>
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

          <div className="p-4 space-y-3">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const active = activeSection === item.section;
                return (
                  <button
                    key={item.section}
                    onClick={() => {
                      onSectionChange(item.section);
                      setMobileOpen(false);
                    }}
                    className={`${navButtonClasses(active)} w-full justify-start`}
                  >
                    <span className="opacity-80 text-xl">{item.icon}</span>
                    <span className="relative z-10 ml-2">{item.label}</span>
                    {active && (
                      <span className="absolute inset-0 bg-cyan-500/10 rounded-lg border border-cyan-500/20" />
                    )}
                    <span className="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}
