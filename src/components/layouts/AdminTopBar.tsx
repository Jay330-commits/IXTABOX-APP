"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

const LOGO_PATH = "/images/logo/test.png";

interface AdminTopBarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onMenuClick?: () => void;
}

export default function AdminTopBar({ activeSection, onSectionChange, onMenuClick }: AdminTopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-admin-account-menu]")) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <>
      <header className="flex flex-shrink-0 h-14 items-center justify-between gap-4 px-4 lg:px-5 bg-gray-950 w-full">
        {/* Left: hamburger (mobile) + logo + section title */}
        <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
          {onMenuClick ? (
            <button
              type="button"
              aria-label="Open menu"
              onClick={onMenuClick}
              className="lg:hidden p-2 -ml-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          ) : null}
          <Link href="/" className="flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded">
            <span className="relative inline-flex h-8 w-28 items-center justify-center">
              <Image
                src={encodeURI(LOGO_PATH)}
                alt="IXTAbox"
                width={112}
                height={32}
                priority
                className="object-contain h-auto max-w-full opacity-95"
              />
            </span>
          </Link>
        </div>
        {/* Center: search */}
        <div className="flex-1 flex justify-center px-4 min-w-0 max-w-xl mx-auto hidden sm:flex">
          <label htmlFor="admin-search" className="sr-only">Search</label>
          <input
            id="admin-search"
            type="search"
            placeholder="Search..."
            className="w-full h-9 rounded-lg bg-white/10 px-3 text-[13px] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
        {/* Right: theme + account (original position) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle theme"
          >
            {darkMode ? (
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364-7.364l-1.414 1.414M8.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M8.05 7.05 6.636 5.636" />
              </svg>
            ) : (
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <div className="relative" data-admin-account-menu>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <span className="h-7 w-7 flex items-center justify-center rounded-full bg-white/[0.08] text-gray-300">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" />
                </svg>
              </span>
              <span className="hidden sm:inline text-[13px] font-medium">Account</span>
              <svg className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-lg bg-gray-950 shadow-2xl z-[3000] overflow-hidden py-1">
                <button
                  onClick={() => { onSectionChange("profile"); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/5 text-left transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={() => { onSectionChange("settings"); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/5 text-left transition-colors"
                >
                  Settings
                </button>
                <div className="my-1 h-px bg-white/10" />
                <button
                  onClick={() => { setUserMenuOpen(false); setShowLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-300 hover:bg-white/5 text-left transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <LogoutConfirmationModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} />
    </>
  );
}
