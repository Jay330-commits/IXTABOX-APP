import { Suspense } from 'react';
import BookingsPageClient from '@/app/guest/bookings/BookingsPageClient';

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading bookings…</div>}>
      <BookingsPageClient />
    </Suspense>
  );
}