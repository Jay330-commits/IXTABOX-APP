"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LogoutConfirmationModal from "@/components/layouts/LogoutConfirmationModal";
import OwnerPostHeader from "@/components/layouts/OwnerPostHeader";

export type TabId = "listings" | "address" | "calendar" | "bookings" | "warnings" | "messages";

export const TABS: { id: TabId; label: string }[] = [
  { id: "listings", label: "Boxes" },
  { id: "address", label: "Address" },
  { id: "calendar", label: "Calendar" },
  { id: "bookings", label: "Bookings" },
  { id: "warnings", label: "Warnings" },
  { id: "messages", label: "Messages" },
];

export function TabIcon({ id, className }: { id: TabId; className?: string }) {
  const c = className ?? "h-4 w-4 shrink-0";
  switch (id) {
    case "listings":
      return (<svg className={c} fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9.818l9-5.25V7.93zM3 7.93l9 5.25v9.818l-9-5.25V7.93z" clipRule="evenodd" /></svg>);
    case "address":
      return (<svg className={c} fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>);
    case "calendar":
      return (<svg className={c} fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" /></svg>);
    case "warnings":
      return (<svg className={c} fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" /></svg>);
    case "messages":
      return (<svg className={c} fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" /></svg>);
    case "bookings":
      return (<svg className={c} fill="currentColor" viewBox="0 0 24 24" aria-hidden><path fillRule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clipRule="evenodd" /><path d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375z" /></svg>);
    default:
      return null;
  }
}

type OwnerNavContextValue = {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
};

const OwnerNavContext = createContext<OwnerNavContextValue | null>(null);

export function useOwnerNav() {
  const ctx = useContext(OwnerNavContext);
  if (!ctx) throw new Error("useOwnerNav must be used within OwnerNavProvider");
  return ctx;
}

export function OwnerNavProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>("listings");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-owner-account-menu]")) setUserMenuOpen(false);
    };
    if (userMenuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    setShowLogoutModal(false);
    logout();
    router.push("/");
  };

  const accountSlot = (
    <>
      <button
        type="button"
        onClick={() => setUserMenuOpen((v) => !v)}
        className="group flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 text-slate-300 transition-colors touch-manipulation sm:min-w-0 sm:gap-2 sm:rounded-lg sm:border sm:border-slate-600/80 sm:bg-slate-800/60 sm:pl-3 sm:pr-3 sm:py-2 sm:hover:bg-slate-700 sm:hover:text-white"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white transition-all group-hover:from-cyan-400 group-hover:to-blue-500">
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z" /></svg>
        </span>
        <span className="hidden sm:inline leading-none">Account</span>
      </button>
      {userMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-slate-600 bg-slate-900 shadow-xl overflow-hidden">
          <div className="py-1.5">
            <Link
              href="/customer?section=profile"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
            >
              <svg className="h-5 w-5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Profile
            </Link>
            <Link
              href="/ixtaowner"
              onClick={() => setUserMenuOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition-colors"
            >
              <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Settings
            </Link>
            <div className="my-1 border-t border-slate-700" />
            <button
              type="button"
              onClick={() => { setUserMenuOpen(false); setShowLogoutModal(true); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <svg className="h-5 w-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <OwnerNavContext.Provider value={{ activeTab, setActiveTab }}>
      <LogoutConfirmationModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} />
      <header className="sticky top-0 left-0 right-0 z-50 w-full min-w-0 max-w-[100vw] border-b border-slate-800 bg-slate-900/98 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="w-full min-w-0 max-w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          {/* Desktop (md+): Logo at very start, center title, right account */}
          <OwnerPostHeader centerTitle="List your box" rightSlot={accountSlot} />
          {/* Mobile: logo at start (display only, not clickable). */}
          <div className="flex md:hidden items-center justify-between gap-3 h-12 overflow-visible">
            <div className="flex h-12 w-24 flex-shrink-0 items-center justify-center overflow-visible pointer-events-none sm:w-28" aria-hidden>
              <Image
                src="/images/logo/new.png"
                alt="IXTAowner"
                width={112}
                height={96}
                className="h-16 w-24 flex-shrink-0 object-contain -m-2 sm:h-20 sm:w-28 sm:-m-3"
                sizes="(min-width: 640px) 112px, 96px"
                priority
              />
            </div>
            <div className="relative flex h-9 flex-shrink-0 items-center" data-owner-account-menu>
              {accountSlot}
            </div>
          </div>
          {/* Mobile: tab nav – edge to edge, minimal side padding */}
          <nav
            className="flex md:hidden items-center justify-between gap-0 border-t border-slate-800 bg-slate-900/95 -mx-4 px-0 py-2 sm:-mx-6"
            role="tablist"
            aria-label="Sections"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab.label}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 min-h-[44px] min-w-0 shrink-0 touch-manipulation items-center justify-center rounded-lg transition-colors ${
                    isActive ? "bg-cyan-500/20 text-cyan-300" : "text-slate-300 hover:bg-slate-800/80 active:bg-slate-800"
                  }`}
                >
                  <TabIcon id={tab.id} className="h-6 w-6 shrink-0" />
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      {children}
    </OwnerNavContext.Provider>
  );
}
