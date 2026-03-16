"use client";

import Image from "next/image";

const LOGO_PATH = "/images/logo/new.png";

export interface OwnerPostHeaderProps {
  /** Centered title (e.g. "List your box"). Shown only on desktop. */
  centerTitle?: React.ReactNode;
  /** Right slot: account button, dropdown, etc. */
  rightSlot: React.ReactNode;
}

/**
 * Desktop header for the IXTAowner post page (/ixtaowner/post).
 * Matches app pattern: Logo at start (flex-shrink-0), center (flex-1 justify-center), right (flex-shrink-0).
 * Only used on md+; mobile uses a separate bar so the mobile header/tab nav is unchanged.
 */
export default function OwnerPostHeader({ centerTitle, rightSlot }: OwnerPostHeaderProps) {
  return (
    <div className="hidden w-full md:flex items-center h-20 gap-4 overflow-visible">
      {/* Logo – display only, not clickable */}
      <div className="flex flex-shrink-0 items-center overflow-visible pointer-events-none" aria-hidden>
        <div className="relative h-12 w-36 sm:h-14 sm:w-40 md:h-16 md:w-48 flex items-center justify-center">
          <Image
            src={LOGO_PATH}
            alt="IXTAowner"
            width={192}
            height={90}
            priority
            className="object-contain h-full w-full"
            sizes="(min-width: 768px) 192px, 160px"
          />
        </div>
      </div>

      {/* Center - takes remaining space, content centered */}
      <div className="flex flex-1 items-center justify-center min-w-0">
        {centerTitle != null ? (
          <span className="text-sm font-medium tracking-wide text-slate-400 truncate leading-none">
            {centerTitle}
          </span>
        ) : null}
      </div>

      {/* Right - always at end, same row height */}
      <div className="relative flex flex-shrink-0 items-center min-h-[44px]" data-owner-account-menu>
        {rightSlot}
      </div>
    </div>
  );
}
