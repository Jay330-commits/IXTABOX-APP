'use client';

import React from 'react';
import type { User } from '@/types/auth';

interface ProfileSectionProps {
  user: User | null;
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-200/80">Name</label>
            <p className="mt-1 text-white font-medium">{user?.fullName ?? '—'}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-200/80">Email</label>
            <p className="mt-1 text-white font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-200/80">Phone</label>
            <p className="mt-1 text-white font-medium">{user?.phone ?? '—'}</p>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-amber-200/80">Role</label>
            <p className="mt-1">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                {user?.role ?? 'ADMIN'}
              </span>
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm text-gray-500">Profile edit and password change (prototype).</p>
      </div>
    </div>
  );
}
