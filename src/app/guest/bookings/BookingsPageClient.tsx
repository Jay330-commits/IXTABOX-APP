"use client";
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingList from '@/components/bookings/BookingList';
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal';
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from '@/components/layouts/Footer';

// Example data - in a real app, this would come from an API
const mockStands = [
  {
    id: 1,
    lat: 59.3293,
    lng: 18.0686,
    title: 'Stockholm Central',
    address: 'Centralplan 15, Stockholm',
    status: 'available' as const,
    pricePerDay: 299.99,
  },
  {
    id: 2,
    lat: 59.3308,
    lng: 18.0826,
    title: 'Kungsträdgården',
    address: 'Kungsträdgården 12, Stockholm',
    status: 'available' as const,
    pricePerDay: 349.99,
  },
];

const mockBookings = [
  {
    id: '1',
    standId: '1',
    address: 'Centralplan 15, Stockholm',
    startDate: '2025-10-15T10:00:00',
    endDate: '2025-10-18T10:00:00',
    status: 'confirmed' as const,
    model: {
      name: 'IXTAbox Pro 190',
      description: 'Premium model with advanced features',
      priceMultiplier: 1.5,
    },
    pricePerDay: 299.99,
  },
  {
    id: '2',
    standId: '2',
    address: 'Kungsträdgården 12, Stockholm',
    startDate: '2025-10-20T14:00:00',
    endDate: '2025-10-22T10:00:00',
    status: 'pending' as const,
    model: {
      name: 'IXTAbox Pro 175',
      description: 'Standard model with essential features',
      priceMultiplier: 1.0,
    },
    pricePerDay: 349.99,
  },
];

export default function BookingsPageClient() {
  const searchParams = useSearchParams();
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const handleBookingClick = (bookingId: string) => {
    setSelectedBooking(bookingId);
  };

  const handleCloseModal = () => {
    setSelectedBooking(null);
  };

  const handleCancelBooking = () => {
    // Handle booking cancellation
    console.log('Cancelling booking:', selectedBooking);
    setSelectedBooking(null);
  };

  const handleModifyBooking = () => {
    // Handle booking modification
    console.log('Modifying booking:', selectedBooking);
    setSelectedBooking(null);
  };

  const bookings = useMemo(() => {
    const standId = searchParams.get('standId');
    const modelId = searchParams.get('modelId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    if (!standId || !startDate) return mockBookings;
    const stand = mockStands.find(s => s.id.toString() === standId);
    if (!stand) return mockBookings;
    const model = modelId === 'pro' ? { name: 'IXTAbox Pro 185', description: 'Premium model with advanced features', priceMultiplier: 1.5 }
      : modelId === 'elite' ? { name: 'IXTAbox Elite', description: 'Elite tier with maximum capacity', priceMultiplier: 2.0 }
      : { name: 'IXTAbox Pro 175', description: 'Standard model with essential features', priceMultiplier: 1.0 };
    const generated = {
      id: `new-${Date.now()}`,
      standId: standId,
      address: stand.address,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : new Date(new Date(startDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending' as const,
      model,
      pricePerDay: stand.pricePerDay ?? 299.99,
    };
    return [generated, ...mockBookings];
  }, [searchParams]);

  React.useEffect(() => {
    const first = bookings[0];
    if (first && typeof first.id === 'string' && first.id.startsWith('new-')) {
      setSelectedBooking(first.id);
    }
  }, [bookings]);

  const currentBooking = selectedBooking 
    ? bookings.find(b => b.id === selectedBooking)
    : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-gray-300">Manage your IXTAbox rentals and bookings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Info Section */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Account Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400">Name</label>
                  <p className="text-white">John Doe</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400">Email</label>
                  <p className="text-white">john.doe@example.com</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400">Phone</label>
                  <p className="text-white">+46 70 123 4567</p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Bookings</span>
                  <span className="text-white">{bookings.filter(b => b.status === 'confirmed').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pending Bookings</span>
                  <span className="text-white">{bookings.filter(b => b.status === 'pending').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings List Section */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">All Bookings</h2>
              <BookingList
                bookings={bookings}
                onBookingClick={handleBookingClick}
              />
            </section>
          </div>
        </div>

        {currentBooking && (
          <BookingDetailsModal
            booking={currentBooking}
            onClose={handleCloseModal}
            onCancel={handleCancelBooking}
            onModify={handleModifyBooking}
          />
        )}
        {currentBooking && (
          <section className="mt-8 bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Booking Location</h2>
            <div className="rounded-lg overflow-hidden border border-white/10">
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}


