"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

type NavItem = {
  label: string;
  section: string;
  category?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", section: "dashboard", category: "Overview" },
  { label: "Customers", section: "users", category: "Admins" },
  { label: "Partners", section: "users-partners", category: "Admins" },
  { label: "Admins", section: "users-admins", category: "Admins" },
  { label: "Bookings", section: "bookings", category: "Operations" },
  { label: "Locations", section: "locations", category: "Operations" },
  { label: "Payments", section: "payments", category: "Finance" },
  { label: "Contracts", section: "contracts", category: "Operations" },
  { label: "Inventory", section: "inventory", category: "Operations" },
  { label: "Marketing", section: "marketing", category: "Growth" },
  { label: "Statistics", section: "statistics", category: "Growth" },
  { label: "Notifications", section: "notifications", category: "Engagement" },
  { label: "Support", section: "support", category: "Engagement" },
  { label: "Export", section: "export", category: "Data" },
  { label: "System", section: "system", category: "Config" },
  { label: "Audit", section: "audit", category: "Compliance" },
];

const categories = Array.from(new Set(navItems.map((i) => i.category))).filter(Boolean) as string[];
const getItemsByCategory = (cat: string) => navItems.filter((i) => i.category === cat);

interface AdminHeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  mobileMenuOpen?: boolean;
  onMobileMenuClose?: () => void;
}

export default function AdminHeader({ activeSection, onSectionChange, mobileMenuOpen = false, onMobileMenuClose }: AdminHeaderProps) {
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const logoPath = "/images/logo/new.png";

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-mobile-account]")) setMobileAccountOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavClick = (section: string) => {
    if (pathname !== "/admin") {
      router.push(`/admin?section=${section}`);
    } else {
      onSectionChange(section);
    }
  };

  const navLinkClasses = (active: boolean) =>
    `w-full text-left px-3 py-2 text-[13px] tracking-tight transition-colors duration-150 rounded-r-md border-l-2 -ml-px ${
      active
        ? "border-amber-500 text-amber-300 bg-amber-500/10"
        : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
    }`;

  return (
    <>
      {/* Desktop: sidebar (narrow, own scroll; separate from page scroll) */}
      <aside
        className="hidden lg:flex lg:w-44 lg:flex-shrink-0 lg:flex-col lg:overflow-hidden lg:bg-gray-800 lg:self-stretch"
        aria-label="Admin navigation"
      >
        <nav
          className="admin-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 overscroll-contain lg:min-h-0 lg:max-h-[calc(100vh-3.5rem)]"
          style={{ minHeight: 0 }}
        >
          {categories.map((cat) => (
            <div key={cat} className="mb-5">
              <p className="px-2.5 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {cat}
              </p>
              <ul className="space-y-0.5">
                {getItemsByCategory(cat).map((item) => {
                  const active = activeSection === item.section;
                  return (
                    <li key={item.section}>
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.section)}
                        className={navLinkClasses(active)}
                        aria-current={active ? "page" : undefined}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <LogoutConfirmationModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} onConfirm={() => { logout(); window.location.href = "/"; }} />

      <div className={`lg:hidden fixed inset-0 z-[9000] ${mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={onMobileMenuClose}
          aria-hidden
        />
        <aside
          className={`absolute left-0 top-0 h-full w-72 bg-gray-950 shadow-2xl transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          aria-label="Admin menu"
        >
          <div className="flex items-center justify-between px-4 h-14">
            <span className="text-[15px] font-medium text-white tracking-tight">Menu</span>
            <button
              aria-label="Close menu"
              onClick={onMobileMenuClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="py-5 px-3 overflow-y-auto max-h-[calc(100vh-3.5rem)]">
            {categories.map((cat) => (
              <div key={cat} className="mb-6">
                <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  {cat}
                </p>
                <ul className="space-y-0.5">
                  {getItemsByCategory(cat).map((item) => {
                    const active = activeSection === item.section;
                    return (
                      <li key={item.section}>
                        <button
                          type="button"
                          onClick={() => {
                            handleNavClick(item.section);
                            onMobileMenuClose?.();
                          }}
                          className={navLinkClasses(active)}
                          aria-current={active ? "page" : undefined}
                        >
                          {item.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </>
  );
}
