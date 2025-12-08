"use client";
import React, { useState, useEffect } from 'react';
import BookingList from '@/components/bookings/BookingList';
import BookingDetailsModal from '@/components/bookings/BookingDetailsModal';
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from '@/components/layouts/Footer';

type Booking = {
  id: string;
  standId: string;
  address: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
    model: {
    name: string;
    description: string;
    priceMultiplier: number;
  };
  pricePerDay: number;
  locationName?: string;
  boxDisplayId?: string;
  standDisplayId?: string;
};

type UserDetails = {
  name: string;
  email: string;
  phone: string | null;
};

export default function BookingsPageClient() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

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

  // Fetch user bookings when email is provided
  useEffect(() => {
    const fetchBookingsByEmail = async () => {
      if (!searchEmail) return;

      setLoadingBookings(true);
      try {
        const response = await fetch('/api/bookings/guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: searchEmail }),
        });

        if (response.ok) {
          const data = await response.json();
          setBookings(data.bookings || []);
        } else {
          setBookings([]);
        }
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        setBookings([]);
      } finally {
        setLoadingBookings(false);
      }
    };

    // Also fetch user details when email is provided
    const fetchUserDetails = async () => {
      if (!searchEmail) return;

      setLoadingUserDetails(true);
      try {
        const response = await fetch('/api/guest/user-details', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: searchEmail }),
        });

        if (response.ok) {
          const data = await response.json();
          setUserDetails(data.user);
        } else {
          setUserDetails(null);
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error);
        setUserDetails(null);
      } finally {
        setLoadingUserDetails(false);
      }
    };

    if (searchEmail) {
      fetchBookingsByEmail();
      fetchUserDetails();
    }
  }, [searchEmail]);

  const handleSearch = async () => {
    if (!searchEmail || !searchReference) {
      setSearchError('Please enter both email and booking reference');
      return;
    }

    setSearching(true);
    setSearchError('');

    try {
      const response = await fetch('/api/bookings/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: searchEmail,
          bookingReference: searchReference,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.bookings || data.bookings.length === 0) {
        setSearchError(data.error || 'No bookings found with the provided details');
        setSearchResults([]);
      } else {
        setSearchResults(data.bookings);
        setSearchMode(true);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('An error occurred while searching. Please try again.');
      setSearchResults([]);
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

  // Display bookings - use search results if in search mode, otherwise show all bookings for the email
  const displayBookings = searchMode ? searchResults : bookings;

  const currentBooking = selectedBooking 
    ? displayBookings.find(b => b.id === selectedBooking)
    : null;

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
          {searchEmail && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Account Details</h2>
                {loadingUserDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                  </div>
                ) : userDetails ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400">Name</label>
                      <p className="text-white">{userDetails.name}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400">Email</label>
                      <p className="text-white">{userDetails.email}</p>
                </div>
                    {userDetails.phone && (
                <div>
                  <label className="block text-sm text-gray-400">Phone</label>
                        <p className="text-white">{userDetails.phone}</p>
                      </div>
                    )}
                </div>
                ) : (
                  <div className="text-sm text-gray-400">Enter email to view account details</div>
                )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
                {loadingBookings ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                  </div>
                ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Bookings</span>
                  <span className="text-white">{bookings.filter(b => b.status === 'active').length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pending Bookings</span>
                  <span className="text-white">{bookings.filter(b => b.status === 'pending').length}</span>
                </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Bookings</span>
                      <span className="text-white">{bookings.length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bookings List Section */}
          <div className={searchEmail ? "lg:col-span-2 space-y-6" : "lg:col-span-3 space-y-6"}>
            <section className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                {searchMode ? 'Search Results' : searchEmail ? 'All Bookings' : 'Enter your email to view bookings'}
              </h2>
              {!searchEmail ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-gray-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <p className="text-gray-400">Enter your email address above to view your bookings</p>
                </div>
              ) : loadingBookings ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : displayBookings.length === 0 ? (
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


