"use client";

import { useOwnerNav, TABS, TabIcon } from "@/app/ixtaowner/OwnerNavContext";

/**
 * Desktop-only side panel for owner post navigation.
 * Position fixed so page scroll does not move it; remains anchored to the viewport.
 */
export default function OwnerPostSidebar() {
  const { activeTab, setActiveTab } = useOwnerNav();

  return (
    <aside
      className="hidden md:flex fixed left-0 top-20 z-10 w-56 h-[calc(100vh-5rem)] flex-col border-r border-slate-800/80 bg-slate-900/50"
      aria-label="Navigation"
    >
      <nav className="flex flex-col gap-0 overflow-y-auto scrollbar-hide px-2 py-5" role="tablist">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 rounded-lg border-l-2 border-l-transparent py-2.5 pl-3 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-cyan-500/10 text-cyan-300 border-l-cyan-400"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              }`}
            >
              <TabIcon id={tab.id} className={isActive ? "text-cyan-300" : undefined} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
