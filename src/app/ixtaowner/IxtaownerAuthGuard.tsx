"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function IxtaownerAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const redirect = encodeURIComponent(pathname || "/ixtaowner");
      router.replace(`/auth/login?redirect=${redirect}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
