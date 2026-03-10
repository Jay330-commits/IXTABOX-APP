"use client";

import Link from "next/link";
import GuestHeader from "@/components/layouts/GuestHeader";

/** IXTAowner post page – placeholder for separate project development.
 *  Will be combined with main app when ready. */
export default function IxtaownerPostPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <Link href="/ixtaowner" className="text-sm text-cyan-400 hover:text-cyan-300">
          ← Back to IXTAowner
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">
          Post your box
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          IXTAowner is a separate project. This page will be developed and combined with the main app later.
        </p>
      </main>
    </div>
  );
}
