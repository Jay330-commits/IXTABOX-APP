"use client";

/**
 * Body container for owner post content.
 * Separate from the side panel: scrollable content area that fills remaining width.
 */
export default function OwnerPostBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col border-l border-slate-800/80 bg-slate-900/50">
      <div className="min-w-0 max-w-full flex-1 px-4 py-5 pb-[env(safe-area-inset-bottom)] md:py-8 md:pb-8 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
