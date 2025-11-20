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
  const [searchEmail, setSearchEmail] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof mockBookings>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  const handleSearch = async () => {
    if (!searchEmail || !searchReference) {
      setSearchError('Please enter both email and booking reference');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      // In a real app, this would be an API call
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock search - find bookings matching email and reference
      const results = mockBookings.filter(booking => 
        booking.id === searchReference
      );

      if (results.length === 0) {
        setSearchError('No bookings found with the provided details');
        setSearchResults([]);
      } else {
        setSearchResults(results);
        setSearchMode(true);
      }
    } catch {
      setSearchError('An error occurred while searching. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchEmail('');
    setSearchReference('');
    setSearchMode(false);
    setSearchResults([]);
    setSearchError('');
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
    ? (searchMode ? searchResults : bookings).find(b => b.id === selectedBooking)
    : null;

  const displayBookings = searchMode ? searchResults : bookings;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-gray-300">Search and manage your IXTAbox rentals</p>
        </div>

        {/* Search Section */}
        <div className="mb-8 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Search Your Booking
          </h2>
          <p className="text-sm text-gray-400 mb-4">Enter your email and booking reference number to find your reservation</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Email Address</label>
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Booking Reference</label>
              <input
                type="text"
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                placeholder="e.g., 1 or 2"
                className="w-full px-4 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {searchError && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {searchError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={searching}
              className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searching ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Searching...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="m21 21-4.35-4.35"/>
                  </svg>
                  Search Booking
                </>
              )}
            </button>
            {searchMode && (
              <button
                onClick={handleClearSearch}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/10 transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>
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
              <h2 className="text-xl font-semibold mb-4">
                {searchMode ? 'Search Results' : 'All Bookings'}
              </h2>
              {displayBookings.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-gray-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <p className="text-gray-400">No bookings found</p>
                </div>
              ) : (
                <BookingList
                  bookings={displayBookings}
                  onBookingClick={handleBookingClick}
                />
              )}
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


