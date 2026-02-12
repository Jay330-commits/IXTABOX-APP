"use client";
import React, { useState, useEffect } from 'react';
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from '@/components/layouts/Footer';

type Booking = {
  id: string;
  location: string;
  locationAddress?: string | null;
  locationId?: string;
  standId: string;
  standDisplayId?: string;
  boxId?: string;
  boxDisplayId?: string;
  address: string;
  startDate: string;
  endDate: string;
  date?: string;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled' | 'confirmed';
  amount: number;
  pricePerDay: number;
  model: string | {
    name: string;
    description?: string;
  };
  deposit?: number;
  lockPin?: string | null;
  paymentId?: string;
  chargeId?: string | null;
  paymentStatus?: string | null;
  createdAt?: string;
  returnedAt?: string | null;
  boxFrontView?: string | null;
  boxBackView?: string | null;
  closedStandLock?: string | null;
};

type UserDetails = {
  name: string;
  email: string;
  phone: string | null;
};

export default function BookingsPageClient() {
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchChargeId, setSearchChargeId] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);

  // Action buttons state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [returningBookingId, setReturningBookingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnSuccess, setReturnSuccess] = useState<string | null>(null);


  // Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const chargeIdParam = params.get('chargeId');
    
    if (emailParam) {
      setSearchEmail(emailParam);
    }
    if (chargeIdParam) {
      setSearchChargeId(chargeIdParam);
    }
  }, []);

  // Fetch user bookings when BOTH email AND chargeId are provided (auto-search on change)
  useEffect(() => {
    const fetchBookings = async () => {
      // SECURITY: Require BOTH email AND charge_id for all searches
      if (!searchEmail || !searchEmail.includes('@') || !searchChargeId) {
        setBookings([]);
        setUserDetails(null);
        return;
      }

      setLoadingBookings(true);
      setSearchError('');
      try {
        const response = await fetch('/api/bookings/guest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: searchEmail,
            chargeId: searchChargeId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setBookings(data.bookings || []);
          // Set user details if provided in response
          if (data.user) {
            setUserDetails(data.user);
          }
          if (data.bookings && data.bookings.length === 0) {
            setSearchError('No bookings found for this payment ID');
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          setBookings([]);
          setSearchError(errorData.error || 'Failed to fetch bookings. Please check your payment ID and try again.');
        }
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        setBookings([]);
        setSearchError('An error occurred while fetching bookings. Please try again.');
      } finally {
        setLoadingBookings(false);
      }
    };

    // Also fetch user details when email is provided
    const fetchUserDetails = async () => {
      if (!searchEmail || !searchEmail.includes('@')) {
        setUserDetails(null);
        return;
      }

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

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchBookings();
      // Fetch user details from the booking data if available
      // (We'll get user details from the booking response)
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchEmail, searchChargeId]);

  // Extract user details from bookings when they're loaded
  useEffect(() => {
    if (bookings.length > 0 && bookings[0]) {
      // User details will be fetched from the payment/user relationship in the API
      // For now, we can extract from the booking if needed
    }
  }, [bookings]);

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
          <p className="text-sm text-gray-400 mb-4">
            Enter both your email address and Payment ID (Charge ID) from your booking confirmation email to view your booking
          </p>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchEmail && searchChargeId) {
                    e.preventDefault();
                    // Trigger search
                  }
                }}
                placeholder="your.email@example.com"
                className="w-full px-4 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-colors"
                required
              />
              {searchEmail && !searchEmail.includes('@') && (
                <p className="mt-1 text-xs text-red-400">Please enter a valid email address</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Payment ID (Charge ID) <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchChargeId}
                  onChange={(e) => setSearchChargeId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchEmail && searchChargeId) {
                      e.preventDefault();
                      // Trigger search
                    }
                  }}
                  placeholder="ch_xxxxx (from your payment receipt)"
                  className="flex-1 px-4 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-colors"
                  required
                />
                {(searchEmail || searchChargeId) && (
                  <button
                    onClick={() => {
                      setSearchEmail('');
                      setSearchChargeId('');
                      setBookings([]);
                      setUserDetails(null);
                      setSearchMode(false);
                      setSearchResults([]);
                      setSearchError('');
                    }}
                    className="px-4 py-2 rounded-md border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                    title="Clear search"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Both fields are required for security. Find these in your booking confirmation email.
              </p>
            </div>
          </div>

          {/* Optional: Advanced search with booking reference */}
          <details className="mb-4">
            <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
              Advanced: Search by booking reference (optional)
            </summary>
            <div className="mt-3">
              <label className="block text-sm text-gray-400 mb-2">Booking Reference</label>
              <div className="flex gap-3">
              <input
                type="text"
                value={searchReference}
                onChange={(e) => setSearchReference(e.target.value)}
                  placeholder="e.g., booking ID or reference number"
                  className="flex-1 px-4 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-500 transition-colors"
              />
            <button
              onClick={handleSearch}
                  disabled={searching || !searchEmail || !searchReference}
                  className="inline-flex items-center justify-center rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      Search
                </>
              )}
            </button>
              </div>
            </div>
          </details>

          {searchError && (
            <div className="mb-4 p-3 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {searchError}
            </div>
          )}

          {searchEmail && searchEmail.includes('@') && loadingBookings && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Loading bookings...
          </div>
          )}
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
                  <span className="text-gray-400">Upcoming Bookings</span>
                  <span className="text-white">{bookings.filter(b => b.status === 'upcoming').length}</span>
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
                {searchMode ? 'Search Results' : (searchEmail && searchChargeId) ? 'Your Booking' : 'Enter your email and Payment ID to view your booking'}
              </h2>
              {(!searchEmail || (!searchChargeId && !searchMode)) ? (
                <div className="text-center py-8">
                  <svg className="h-12 w-12 text-gray-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                  <p className="text-gray-400">Enter both your email address and Payment ID (Charge ID) above to view your booking</p>
                  <p className="text-gray-500 text-sm mt-2">Both fields are required for security. You can find these in your booking confirmation email</p>
                </div>
              ) : (searchMode && searching) || (!searchMode && loadingBookings) ? (
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
                <div className="space-y-4">
                  {displayBookings.map((booking) => {
                    const status = booking.status || '';
                    const statusLower = status.toLowerCase();
                    const statusColor = 
                      statusLower === 'confirmed' || statusLower === 'active' ? 'green' :
                      statusLower === 'upcoming' ? 'yellow' :
                      statusLower === 'cancelled' ? 'red' :
                      'gray';
                    
                    const isExpanded = expandedBookingId === booking.id;
                    const startDate = booking.startDate ? new Date(booking.startDate) : new Date();
                    const endDate = booking.endDate ? new Date(booking.endDate) : new Date();
                    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    
                    // Calculate model info
                    const modelName = typeof booking.model === 'string' 
                      ? (booking.model === 'Pro 190' || booking.model === 'Pro' ? 'IXTAbox Pro 190' : 'IXTAbox Pro 175')
                      : booking.model.name;
                    const modelDescription = typeof booking.model === 'string'
                      ? (booking.model === 'Pro 190' || booking.model === 'Pro' ? 'Premium storage box with enhanced features' : 'Standard storage box')
                      : (booking.model.description || 'Storage box');
                    const basePricePerDay = booking.pricePerDay;
                    const deposit = booking.deposit || 0;
                    const subtotal = days * basePricePerDay;
                    const totalPrice = booking.amount || (subtotal + deposit);

                    return (
                      <div 
                        key={booking.id}
                        className={`rounded-xl border transition-all shadow-lg ${
                          statusColor === 'green' ? 'bg-green-500/5 border-green-400/20' :
                          statusColor === 'yellow' ? 'bg-yellow-500/5 border-yellow-400/20' :
                          statusColor === 'red' ? 'bg-red-500/10 border-red-400/30' :
                          'bg-white/5 border-white/10'
                        }`}
                      >
                        {/* Booking Header */}
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1 min-w-0">
                              <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                                statusColor === 'green' ? 'bg-green-400' :
                                statusColor === 'yellow' ? 'bg-yellow-400' :
                                statusColor === 'red' ? 'bg-red-400' :
                                'bg-gray-400'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg text-white mb-1 truncate">{booking.location || booking.address}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-400">
                                  <span>
                                    {startDate.toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                  <span className="text-gray-500">-</span>
                                  <span>
                                    {endDate.toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      year: 'numeric' 
                                    })}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-start gap-4 ml-4 flex-shrink-0">
                              <div className="text-right">
                                <div className="font-semibold text-lg text-white">SEK {totalPrice.toFixed(2)}</div>
                                <div className={`text-xs font-medium uppercase tracking-wide mt-1 ${
                                  statusColor === 'green' ? 'text-green-400' :
                                  statusColor === 'yellow' ? 'text-yellow-400' :
                                  statusColor === 'red' ? 'text-red-400' :
                                  'text-gray-400'
                                }`}>
                                  {status.charAt(0).toUpperCase() + status.slice(1)}
                                </div>
                              </div>
                              <button
                                onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                                aria-label={isExpanded ? 'Collapse booking details' : 'Expand booking details'}
                              >
                                <svg 
                                  className={`w-5 h-5 text-gray-400 group-hover:text-white transition-all duration-200 ${isExpanded ? 'transform rotate-180' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Booking Details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-white/10 pt-6 space-y-6">
                            {/* Lock PIN */}
                            {booking.lockPin && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-3">Access Information</h3>
                                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg p-4 border border-cyan-400/20">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-400">Lock Access PIN</span>
                                    <span className="text-2xl font-bold text-cyan-400 font-mono">{booking.lockPin}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 mt-2">Use this PIN to access your box during the booking period.</p>
                                </div>
                              </div>
                            )}

                            {/* Booking Details */}
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-3">Booking Details</h3>
                              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-sm text-gray-400">Booking ID</span>
                                  <div className="flex items-center gap-2 max-w-[60%]">
                                    <span className="text-sm font-medium text-gray-200 font-mono break-all">{booking.id}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(booking.id);
                                      }}
                                      className="p-1 hover:bg-white/10 rounded transition-colors"
                                      title="Copy Booking ID"
                                    >
                                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                {booking.standDisplayId && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-400">Stand ID</span>
                                    <span className="text-sm font-medium text-gray-200">#{booking.standDisplayId}</span>
                                  </div>
                                )}
                                {booking.boxDisplayId && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-400">Box ID</span>
                                    <span className="text-sm font-medium text-gray-200">#{booking.boxDisplayId}</span>
                                  </div>
                                )}
                                {booking.locationAddress && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-400">Address</span>
                                    <span className="text-sm font-medium text-gray-200 text-right max-w-xs">{booking.locationAddress}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Status</span>
                                  <span className={`text-sm font-medium ${
                                    statusLower === 'active' || statusLower === 'completed' || statusLower === 'confirmed' ? 'text-green-400' :
                                    statusLower === 'upcoming' ? 'text-yellow-400' :
                                    statusLower === 'cancelled' ? 'text-red-400' :
                                    'text-gray-400'
                                  }`}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Model Info */}
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-3">Model</h3>
                              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Type</span>
                                  <span className="text-sm font-medium text-gray-200">{modelName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Description</span>
                                  <span className="text-sm font-medium text-gray-200 text-right max-w-xs">{modelDescription}</span>
                                </div>
                              </div>
                            </div>

                            {/* Schedule */}
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-3">Schedule</h3>
                              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">From</span>
                                  <span className="text-sm font-medium text-gray-200">
                                    {startDate.toLocaleString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">To</span>
                                  <span className="text-sm font-medium text-gray-200">
                                    {endDate.toLocaleString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Duration</span>
                                  <span className="text-sm font-medium text-gray-200">{days} {days === 1 ? 'day' : 'days'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Payment Info */}
                            <div>
                              <h3 className="text-sm font-medium text-gray-400 mb-3">Payment</h3>
                              <div className="bg-white/5 rounded-lg p-4 space-y-3">
                                {booking.paymentId && (
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="text-sm text-gray-400">Payment ID</span>
                                    <div className="flex items-center gap-2 max-w-[60%]">
                                      <span className="text-sm font-medium text-gray-200 font-mono break-all">{booking.paymentId}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(booking.paymentId!);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Copy Payment ID"
                                      >
                                        <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {booking.chargeId && (
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="text-sm text-gray-400">Charge ID</span>
                                    <div className="flex items-center gap-2 max-w-[60%]">
                                      <span className="text-sm font-medium text-gray-200 font-mono break-all">{booking.chargeId}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(booking.chargeId!);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title="Copy Charge ID"
                                      >
                                        <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {booking.paymentStatus && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-400">Payment Status</span>
                                    <span className={`text-sm font-medium ${
                                      booking.paymentStatus === 'Completed' || booking.paymentStatus === 'Refunded' ? 'text-green-400' :
                                      booking.paymentStatus === 'Pending' ? 'text-yellow-400' :
                                      'text-gray-400'
                                    }`}>
                                      {booking.paymentStatus}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Base Price/Day</span>
                                  <span className="text-sm font-medium text-gray-200">SEK {basePricePerDay.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Days</span>
                                  <span className="text-sm font-medium text-gray-200">{days}</span>
                                </div>
                                <div className="border-t border-white/10 pt-3 flex justify-between">
                                  <span className="text-sm font-medium text-gray-200">Total</span>
                                  <span className="text-sm font-medium text-cyan-400">SEK {totalPrice.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Booking Created Date */}
                            {booking.createdAt && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-3">Booking Information</h3>
                                <div className="bg-white/5 rounded-lg p-4">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-400">Booked On</span>
                                    <span className="text-sm font-medium text-gray-200">
                                      {new Date(booking.createdAt).toLocaleString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Return Photos - Show for completed bookings with return photos */}
                            {(booking.boxFrontView || booking.boxBackView || booking.closedStandLock) && (
                              <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-3">Return Photos</h3>
                                <div className="bg-white/5 rounded-lg p-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {booking.boxFrontView && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-2">Box Front View</p>
                                        <a
                                          href={booking.boxFrontView}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={booking.boxFrontView}
                                            alt="Box Front View"
                                            className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                            onError={(e) => {
                                              console.error('[Guest Bookings] Failed to load boxFrontView image:', booking.boxFrontView);
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                parent.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">Image failed to load<br/>Click to view URL</div>`;
                                              }
                                            }}
                                          />
                                        </a>
                                      </div>
                                    )}
                                    {booking.boxBackView && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-2">Box Back View</p>
                                        <a
                                          href={booking.boxBackView}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={booking.boxBackView}
                                            alt="Box Back View"
                                            className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                            onError={(e) => {
                                              console.error('[Guest Bookings] Failed to load boxBackView image:', booking.boxBackView);
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                parent.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">Image failed to load<br/>Click to view URL</div>`;
                                              }
                                            }}
                                          />
                                        </a>
                                      </div>
                                    )}
                                    {booking.closedStandLock && (
                                      <div>
                                        <p className="text-gray-400 text-xs mb-2">Closed Stand Lock</p>
                                        <a
                                          href={booking.closedStandLock}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={booking.closedStandLock}
                                            alt="Closed Stand Lock"
                                            className="w-full h-32 object-cover rounded-lg border border-white/10 hover:border-cyan-400/40 transition-colors cursor-pointer"
                                            onError={(e) => {
                                              console.error('[Guest Bookings] Failed to load closedStandLock image:', booking.closedStandLock);
                                              const target = e.target as HTMLImageElement;
                                              target.style.display = 'none';
                                              const parent = target.parentElement;
                                              if (parent) {
                                                parent.innerHTML = `<div class="w-full h-32 flex items-center justify-center bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">Image failed to load<br/>Click to view URL</div>`;
                                              }
                                            }}
                                          />
                                        </a>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-3">
                                    Photos taken when the box was successfully returned. Click any image to view full size.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons Bar - Always visible, separated */}
                        <div className="px-6 pb-6">
                          <div className="border-t border-white/10 pt-4">
                            {/* Cancel Button - for upcoming/confirmed bookings only */}
                            {(statusLower === 'upcoming' || statusLower === 'confirmed') && (
                              <button
                                onClick={async () => {
                                  const chargeIdToUse = searchChargeId || booking.chargeId;
                                  if (!chargeIdToUse) {
                                    setCancelError('Payment ID is required to cancel. Please use the main search with email and Payment ID.');
                                    return;
                                  }
                                  setCancellingBookingId(booking.id);
                                  setCancelError(null);
                                  setCancelSuccess(null);
                                  
                                  try {
                                    const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        email: searchEmail,
                                        chargeId: chargeIdToUse,
                                      }),
                                    });

                                    const data = await response.json();

                                    if (response.ok) {
                                      setCancelSuccess('Booking cancelled successfully');
                                      // Refresh bookings - use chargeId from booking when in search mode
                                      const refreshResponse = await fetch('/api/bookings/guest', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ 
                                          email: searchEmail,
                                          chargeId: chargeIdToUse,
                                        }),
                                      });
                                      if (refreshResponse.ok) {
                                        const refreshData = await refreshResponse.json();
                                        if (searchMode) {
                                          setSearchResults(refreshData.bookings || []);
                                        } else {
                                          setBookings(refreshData.bookings || []);
                                        }
                                      }
                                    } else {
                                      setCancelError(data.error || 'Failed to cancel booking');
                                    }
                                  } catch (error) {
                                    console.error('Error cancelling booking:', error);
                                    setCancelError('An error occurred while cancelling the booking');
                                  } finally {
                                    setCancellingBookingId(null);
                                  }
                                }}
                                disabled={cancellingBookingId === booking.id}
                                className="w-full py-3 px-5 text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                {cancellingBookingId === booking.id ? (
                                  <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    <span>Cancelling...</span>
                                  </>
                                ) : (
                                  <span>Cancel Booking</span>
                                )}
                              </button>
                            )}
                            
                            {/* Return Box Button - for active bookings */}
                            {statusLower === 'active' && (
                              <button
                                onClick={async () => {
                                  const chargeIdToUse = searchChargeId || booking.chargeId;
                                  if (!chargeIdToUse) {
                                    setReturnError('Payment ID is required to return. Please use the main search with email and Payment ID.');
                                    return;
                                  }
                                  setReturningBookingId(booking.id);
                                  setReturnError(null);
                                  setReturnSuccess(null);
                                  
                                  try {
                                    const response = await fetch(`/api/bookings/${booking.id}/return`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        email: searchEmail,
                                        chargeId: chargeIdToUse,
                                      }),
                                    });

                                    const data = await response.json();

                                    if (response.ok) {
                                      setReturnSuccess('Box return initiated successfully');
                                      // Refresh bookings - use chargeId from booking when in search mode
                                      const refreshResponse = await fetch('/api/bookings/guest', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ 
                                          email: searchEmail,
                                          chargeId: chargeIdToUse,
                                        }),
                                      });
                                      if (refreshResponse.ok) {
                                        const refreshData = await refreshResponse.json();
                                        if (searchMode) {
                                          setSearchResults(refreshData.bookings || []);
                                        } else {
                                          setBookings(refreshData.bookings || []);
                                        }
                                      }
                                    } else {
                                      setReturnError(data.error || 'Failed to return box');
                                    }
                                  } catch (error) {
                                    console.error('Error returning box:', error);
                                    setReturnError('An error occurred while returning the box');
                                  } finally {
                                    setReturningBookingId(null);
                                  }
                                }}
                                disabled={returningBookingId === booking.id}
                                className="w-full py-3 px-5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                {returningBookingId === booking.id ? (
                                  <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                    </svg>
                                    <span>Returning...</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Return Box</span>
                                  </>
                                )}
                              </button>
                            )}
                            
                            {/* No actions available message */}
                            {(statusLower === 'completed' || statusLower === 'cancelled') && (
                              <div className={`w-full py-3 px-5 text-sm font-medium text-center rounded-lg border ${
                                statusLower === 'cancelled' 
                                  ? 'text-red-300 bg-red-500/10 border-red-400/30' 
                                  : 'text-gray-400 bg-white/5 border-white/10'
                              }`}>
                                {statusLower === 'completed' ? 'Booking Completed' : 'Booking Cancelled'}
                              </div>
                            )}
                          </div>
                          
                          {/* Error Messages */}
                          {cancelError && cancellingBookingId === booking.id && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <div className="text-sm text-red-400 font-medium">{cancelError}</div>
                            </div>
                          )}
                          {cancelSuccess && cancellingBookingId === booking.id && (
                            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <div className="text-sm text-green-400 font-medium">{cancelSuccess}</div>
                            </div>
                          )}
                          {returnError && returningBookingId === booking.id && (
                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <div className="text-sm text-red-400 font-medium">{returnError}</div>
                            </div>
                          )}
                          {returnSuccess && returningBookingId === booking.id && (
                            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                              <div className="text-sm text-green-400 font-medium">{returnSuccess}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}


