  "use client";

  import { useState, useEffect, Suspense } from "react";
  import { useRouter, useSearchParams } from "next/navigation";
  import { useAuth } from "@/contexts/AuthContext";
  import { Role } from "@/types/auth";
  import CustomerHeader from "@/components/layouts/CustomerHeader";
  import Footer from "@/components/layouts/Footer";
  import ReturnBoxModal from "@/components/bookings/ReturnBoxModal";
  import CancelBookingModal from "@/components/bookings/CancelBookingModal";
  import dynamic from "next/dynamic";
  import type { MapProps } from "@/components/maps/googlemap";

  // Dynamic import prevents SSR issues
  const Map = dynamic<MapProps>(() => import("@/components/maps/googlemap"), {
    ssr: false,
    loading: () => (
      <div className="flex h-[500px] w-full items-center justify-center text-gray-300 animate-pulse">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500"></div>
          </div>
          <p className="text-lg">Loading map...</p>
        </div>
      </div>
    ),
  });

  // Type definitions
  type Booking = {
    id: string;
    location: string;
    locationAddress?: string | null;
    date: string;
    status: string;
    amount: number;
    startDate?: string;
    endDate?: string;
    boxId?: string;
    boxDisplayId?: string;
    standId?: string;
    standDisplayId?: string;
    locationId?: string;
    lockPin?: string | null;
    paymentId?: string;
    paymentStatus?: string | null;
    chargeId?: string | null;
    createdAt?: string;
    returnedAt?: string | null;
    model?: string;
  };

  type Payment = {
    id: string;
    amount: number;
    date: string;
    method: string;
    status: string;
    currency?: string;
    completedAt?: string;
    chargeId?: string;
  };

  type Notification = {
    id: string;
    title: string;
    message: string;
    date: string;
    read: boolean;
  };

  type UserStats = {
    totalBookings: number;
    upcomingBookings: number;
    loyaltyPoints: number;
    memberSince: string;
    membershipTier: string;
    totalRewards: number;
  };

  function CustomerDashboardContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeSection, setActiveSection] = useState("dashboard");
    
    // Read section from URL query parameter when navigating from other pages
    useEffect(() => {
      const section = searchParams.get('section');
      if (section && ['dashboard', 'book', 'bookings', 'payments', 'notifications', 'profile', 'settings'].includes(section)) {
        setActiveSection(section);
      }
    }, [searchParams]);
    const [locations, setLocations] = useState<MapProps["locations"]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [locationsError, setLocationsError] = useState<string | null>(null);
    const [isMapFullscreen, setIsMapFullscreen] = useState(false);
    const [mounted, setMounted] = useState(false);
    
    // Real data state
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [userStats, setUserStats] = useState<UserStats>({
      totalBookings: 0,
      upcomingBookings: 0,
      loyaltyPoints: 0,
      memberSince: new Date().toISOString().split('T')[0],
      membershipTier: 'Standard',
      totalRewards: 0,
    });
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  
  // Expanded booking state (for expandable bookings list)
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
  
  // Cancel/Return state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [returningBookingId, setReturningBookingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnPhotos, setReturnPhotos] = useState<{
    boxFrontView: File | null;
    boxBackView: File | null;
    closedStandLock: File | null;
  }>({
    boxFrontView: null,
    boxBackView: null,
    closedStandLock: null,
  });
  const [returnConfirmed, setReturnConfirmed] = useState(false);

    // Protect route - check authentication and role
    useEffect(() => {
      console.log('Customer page auth check:', { loading, user: user ? { id: user.id, role: user.role } : null });
      
      // Wait for auth check to complete
      if (loading) {
        console.log('Customer page: Still loading auth...');
        return; // Still loading, don't redirect yet
      }

      // If not authenticated, redirect to login
      if (!user) {
        console.log('Customer page: No user found, redirecting to login');
        router.replace('/auth/login');
        return;
      }

      // If user is not a Customer, redirect to appropriate page
      console.log('Customer page: User role is', user.role, 'Type:', typeof user.role, 'Expected:', Role.CUSTOMER);
      if (user.role !== Role.CUSTOMER) {
        console.log('Customer page: User role mismatch, redirecting to appropriate page');
        if (user.role === Role.DISTRIBUTOR) {
          router.replace('/distributor');
        } else if (user.role === Role.ADMIN) {
          router.replace('/admin');
        } else {
          router.replace('/auth/login');
        }
        return;
      }

      console.log('Customer page: User authenticated and has Customer role - allowing access');
    }, [user, loading, router]);

    // Set mounted state
    useEffect(() => {
      setMounted(true);
    }, []);


    // Load customer data when user is authenticated
    useEffect(() => {
      if (!user || loading) return;

      let cancelled = false;

      async function loadCustomerData() {
        try {
          setIsLoadingData(true);
          setDataError(null);

          // Get auth token from localStorage to send with requests
          const authToken = localStorage.getItem('auth-token');
          const headers: HeadersInit = {};
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }

          // Fetch all data in parallel with Authorization header
          const [statsRes, bookingsRes, paymentsRes, notificationsRes] = await Promise.all([
            fetch('/api/customer/stats', { headers }),
            fetch('/api/customer/bookings', { headers }),
            fetch('/api/customer/payments', { headers }),
            fetch('/api/customer/notifications', { headers }),
          ]);

          if (!cancelled) {
            // Handle stats
            if (statsRes.ok) {
              const statsData = await statsRes.json();
              setUserStats(statsData.stats);
            } else {
              console.error('Failed to load stats:', statsRes.status);
            }

            // Handle bookings
            if (bookingsRes.ok) {
              const bookingsData = await bookingsRes.json();
              console.log('[Customer Page] Bookings response:', {
                hasBookings: !!bookingsData.bookings,
                count: bookingsData.bookings?.length || 0,
                data: bookingsData,
              });
              console.log('[Customer Page] Booking statuses received:', bookingsData.bookings?.map((b: Booking) => ({
                id: b.id.slice(0, 8),
                status: b.status,
                statusType: typeof b.status,
                statusLower: b.status?.toLowerCase()
              })));
              // Force new array reference to ensure React detects changes
              const bookingsArray = bookingsData.bookings || [];
              console.log('[Customer Page] Setting bookings state with', bookingsArray.length, 'bookings');
              setBookings(bookingsArray.map((b: Booking) => ({ ...b })));
            } else {
              const errorData = await bookingsRes.json().catch(() => ({}));
              console.error('Failed to load bookings:', {
                status: bookingsRes.status,
                statusText: bookingsRes.statusText,
                error: errorData,
              });
              setBookings([]);
            }

            // Handle payments
            if (paymentsRes.ok) {
              const paymentsData = await paymentsRes.json();
              setPayments(paymentsData.payments || []);
            } else {
              console.error('Failed to load payments:', paymentsRes.status);
              setPayments([]);
            }

            // Handle notifications
            if (notificationsRes.ok) {
              const notificationsData = await notificationsRes.json();
              setNotifications(notificationsData.notifications || []);
            } else {
              console.error('Failed to load notifications:', notificationsRes.status);
              setNotifications([]);
            }
          }
        } catch (error) {
          console.error('Error loading customer data:', error);
          if (!cancelled) {
            setDataError('Failed to load data. Please try again later.');
          }
        } finally {
          if (!cancelled) {
            setIsLoadingData(false);
          }
        }
      }

      loadCustomerData();

      return () => {
        cancelled = true;
      };
    }, [user, loading]);

    // Periodic booking status sync
    useEffect(() => {
      if (!user || bookings.length === 0) return;

      /**
       * Calculate booking status based on dates (client-side)
       * Matches the logic in BookingStatusService
       */
      const calculateBookingStatus = (startDate: string, endDate: string): string => {
        const now = new Date();
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return 'upcoming';
        }
        
        if (end < now) {
          return 'completed';
        } else if (start <= now && end >= now) {
          return 'active';
        } else {
          return 'upcoming';
        }
      };

      const syncStatuses = async () => {
        const updates: Array<{ bookingId: string; newStatus: string }> = [];
        const updatedBookings = bookings.map(booking => {
          if (!booking.startDate || !booking.endDate) {
            return booking;
          }

          const currentStatusLower = booking.status?.toLowerCase() || '';
          
          // Skip only "confirmed" status - keep it on hold, don't recalculate
          if (currentStatusLower === 'confirmed') {
            console.log(`[Status Sync] Skipping ${booking.id.slice(0, 8)} - status is "confirmed" (manually set, keeping on hold)`);
            return booking;
          }

          // Include all other statuses (upcoming, active, completed, cancelled) in periodic updates
          const calculatedStatus = calculateBookingStatus(booking.startDate, booking.endDate);
          
          // For cancelled/completed: keep them as final states (don't change them even if calculated status differs)
          if (currentStatusLower === 'cancelled' || currentStatusLower === 'completed') {
            // Keep cancelled/completed as final states - don't change them
            console.log(`[Status Sync] ${booking.id.slice(0, 8)}: Keeping ${currentStatusLower} (final state, calculated would be: ${calculatedStatus})`);
            return booking;
          }
          
          // For upcoming/active: update if calculated status changed
          if (calculatedStatus !== currentStatusLower) {
            console.log(`[Status Sync] Status change for ${booking.id.slice(0, 8)}: ${currentStatusLower} -> ${calculatedStatus}`);
            updates.push({
              bookingId: booking.id,
              newStatus: calculatedStatus,
            });
            
            return { ...booking, status: calculatedStatus };
          }
          return booking;
        });

        // Update UI immediately (optimistic update)
        if (updates.length > 0) {
          setBookings(updatedBookings);
          
          // Sync with DB in background (fire and forget)
          const authToken = localStorage.getItem('auth-token');
          const headers: HeadersInit = { 'Content-Type': 'application/json' };
          if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
          }
          
          fetch('/api/bookings/sync-statuses', {
            method: 'POST',
            headers,
            body: JSON.stringify({ updates }),
          }).catch(err => {
            console.error('Failed to sync booking statuses in DB:', err);
            // Optionally revert UI update on error, but for now we keep optimistic update
          });
        }
      };

      // Run immediately, then every 30 seconds
      syncStatuses();
      const interval = setInterval(syncStatuses, 30000);

      return () => clearInterval(interval);
    }, [user, bookings]);

    // Load locations when book section is active
    useEffect(() => {
      if (activeSection !== "book") return;

      let cancelled = false;

      async function loadLocations() {
        try {
          setIsLoadingLocations(true);
          const response = await fetch("/api/locations");
          if (!response.ok) {
            throw new Error(`Unexpected response: ${response.status}`);
          }
          const data = await response.json();
          const fetchedLocations = Array.isArray(data?.locations) ? (data.locations as MapProps["locations"]) : [];
          if (!cancelled) {
            setLocations(fetchedLocations);
            setLocationsError(null);
          }
        } catch (error) {
          console.error("Failed to load locations:", error);
          if (!cancelled) {
            setLocationsError("Unable to load locations right now. Please try again later.");
            setLocations([]);
          }
        } finally {
          if (!cancelled) {
            setIsLoadingLocations(false);
          }
        }
      }

      loadLocations();

      return () => {
        cancelled = true;
      };
    }, [activeSection]);

   
    const renderSection = () => {
      switch (activeSection) {
        case "book":
          return (
            <section id="map" className="px-6 py-12">
              <div className="mx-auto max-w-7xl">
                <h2 className="text-3xl font-bold mb-4">Book a Box</h2>
                <p className="text-gray-300 mb-6">Find and book available IXTAbox boxes in Stockholm</p>
                {!isMapFullscreen && (
                  <div className="flex items-center justify-between mb-4">
                  </div>
                )}
                <div className="w-full relative" style={{ minHeight: 500 }} suppressHydrationWarning>
                  {locationsError ? (
                    <div className="flex h-full items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
                      {locationsError}
                    </div>
                  ) : isLoadingLocations ? (
                    <div className="flex h-full items-center justify-center text-gray-300">Loading locations…</div>
                  ) : locations.length === 0 ? (
                    <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-white/5 p-6 text-center text-gray-200">
                      No locations available right now. Please check back soon.
                    </div>
                  ) : mounted ? (
                    <Map 
                      locations={locations} 
                      onFullscreenChange={setIsMapFullscreen}
                    />
                  ) : null}
                </div>
              </div>
            </section>
          );
        case "payments":
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-6">Payment History</h1>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                </div>
              ) : dataError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-200">
                  {dataError}
                </div>
              ) : payments.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
                  No payment history found.
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => {
                    const isExpanded = expandedPaymentId === payment.id;
                    return (
                      <div key={payment.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-2xl font-bold">{payment.currency || 'SEK'} {payment.amount.toFixed(2)}</div>
                              <div className="text-gray-400">{payment.method}</div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <div className="text-gray-300">{payment.date}</div>
                                <div className={`font-medium ${
                                  payment.status === 'Completed' ? 'text-green-400' :
                                  payment.status === 'Refunded' ? 'text-orange-400 font-semibold' :
                                  payment.status === 'Pending' ? 'text-yellow-400' :
                                  'text-gray-400'
                                }`}>
                                  {payment.status === 'Refunded' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/30">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      {payment.status}
                                    </span>
                                  ) : (
                                    payment.status
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setExpandedPaymentId(isExpanded ? null : payment.id)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                                aria-label={isExpanded ? 'Collapse payment details' : 'Expand payment details'}
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
                        
                        {/* Expanded Payment Details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-white/10 pt-6">
                            <div className="bg-white/5 rounded-lg p-4 space-y-3">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-400">Payment ID</span>
                                <div className="flex items-center gap-2 max-w-[60%]">
                                  <span className="text-sm font-medium text-gray-200 font-mono break-all">{payment.id}</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(payment.id);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded transition-colors"
                                    title="Copy Payment ID"
                                    aria-label="Copy Payment ID"
                                  >
                                    <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              {payment.chargeId && (
                                <div className="flex justify-between items-center gap-2">
                                  <span className="text-sm text-gray-400">Charge ID</span>
                                  <div className="flex items-center gap-2 max-w-[60%]">
                                    <span className="text-sm font-medium text-gray-200 font-mono break-all">{payment.chargeId}</span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(payment.chargeId!);
                                      }}
                                      className="p-1 hover:bg-white/10 rounded transition-colors"
                                      title="Copy Charge ID"
                                      aria-label="Copy Charge ID"
                                    >
                                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-400">Amount</span>
                                <span className="text-sm font-medium text-gray-200">{payment.currency || 'SEK'} {payment.amount.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-400">Status</span>
                                <span className={`text-sm font-medium ${
                                  payment.status === 'Completed' ? 'text-green-400' :
                                  payment.status === 'Refunded' ? 'text-orange-400 font-semibold' :
                                  payment.status === 'Pending' ? 'text-yellow-400' :
                                  'text-gray-400'
                                }`}>
                                  {payment.status === 'Refunded' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/20 border border-orange-400/30">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                      {payment.status}
                                    </span>
                                  ) : (
                                    payment.status
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-400">Method</span>
                                <span className="text-sm font-medium text-gray-200">{payment.method}</span>
                              </div>
                              {payment.completedAt && (
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-400">Completed At</span>
                                  <span className="text-sm font-medium text-gray-200">
                                    {new Date(payment.completedAt).toLocaleString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        case "bookings":
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                </div>
              ) : dataError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-200">
                  {dataError}
                </div>
              ) : bookings.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
                  No bookings found. Book your first box to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    // Use status in key to force re-render when status changes
                    const status = booking.status || '';
                    const statusLower = status.toLowerCase();
                    
                    // Debug: Log status for each booking
                    if (statusLower === 'cancelled') {
                      console.log('[UI Render] Rendering cancelled booking:', {
                        id: booking.id.slice(0, 8),
                        status,
                        statusLower,
                        statusType: typeof status
                      });
                    }
                    const statusColor = 
                      statusLower === 'confirmed' || statusLower === 'active' ? 'green' :
                      statusLower === 'upcoming' ? 'yellow' :
                      statusLower === 'cancelled' ? 'red' :
                      'gray';
                    
                    const isExpanded = expandedBookingId === booking.id;
                    const startDate = booking.startDate ? new Date(booking.startDate) : new Date(booking.date);
                    const endDate = booking.endDate ? new Date(booking.endDate) : new Date(booking.date);
                    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                    
                    // Calculate model info
                    const modelName = booking.model === 'Pro' ? 'IXTAbox Pro' : 'IXTAbox Classic';
                    const modelDescription = booking.model === 'Pro' ? 'Premium storage box with enhanced features' : 'Standard storage box';
                    const modelMultiplier = booking.model === 'Pro' ? 1.5 : 1.0;
                    const pricePerDay = booking.amount / days / modelMultiplier;
                    const totalPrice = days * pricePerDay * modelMultiplier;

                    return (
                      <div 
                        key={`${booking.id}-${status}`}
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
                                <h3 className="font-semibold text-lg text-white mb-1 truncate">{booking.location}</h3>
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
                                <div className="font-semibold text-lg text-white">SEK {booking.amount.toFixed(2)}</div>
                                <div className={`text-xs font-medium uppercase tracking-wide mt-1 ${
                                  statusColor === 'green' ? 'text-green-400' :
                                  statusColor === 'yellow' ? 'text-yellow-400' :
                                  statusColor === 'red' ? 'text-red-400' :
                                  'text-gray-400'
                                }`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
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
                        
                        {/* Action Buttons Bar - Always visible, separated */}
                        <div className="px-6 pb-6">
                          <div className="border-t border-white/10 pt-4">
                            {/* Cancel Button - for upcoming/confirmed bookings only */}
                            {(statusLower === 'upcoming' || statusLower === 'confirmed') && (
                              <button
                                onClick={() => {
                                  setCancellingBookingId(booking.id);
                                  setCancelError(null);
                                  setShowCancelModal(true);
                                }}
                                className="w-full py-3 px-5 text-sm font-semibold text-white bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <span>Cancel Booking</span>
                              </button>
                            )}
                            
                            {/* Return Box Button - for active bookings */}
                            {statusLower === 'active' && (
                              <button
                                onClick={() => {
                                  setReturningBookingId(booking.id);
                                  setReturnError(null);
                                  setReturnPhotos({
                                    boxFrontView: null,
                                    boxBackView: null,
                                    closedStandLock: null,
                                  });
                                  setReturnConfirmed(false);
                                }}
                                className="w-full py-3 px-5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Return Box</span>
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
                        </div>

                        {/* Expanded Booking Details */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-white/10 pt-6 space-y-6">
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
                                        // You could add a toast notification here
                                      }}
                                      className="p-1 hover:bg-white/10 rounded transition-colors"
                                      title="Copy Booking ID"
                                      aria-label="Copy Booking ID"
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
                                        aria-label="Copy Payment ID"
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
                                        aria-label="Copy Charge ID"
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
                                  <span className="text-sm font-medium text-gray-200">SEK {pricePerDay.toFixed(2)}</span>
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

                            {/* Error Messages */}
                            {cancelError && cancellingBookingId === booking.id && (
                              <div className="pt-4 border-t border-white/10">
                                <div className="text-sm text-red-400">{cancelError}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        case "notifications":
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-6">Notifications</h1>
              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
                </div>
              ) : dataError ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-200">
                  {dataError}
                </div>
              ) : notifications.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
                  No notifications found.
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-6 rounded-xl border ${
                      notification.read ? 'bg-white/5 border-white/10' : 'bg-cyan-500/10 border-cyan-400/20'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-lg">{notification.title}</div>
                          <div className="text-gray-400 mt-2">{notification.message}</div>
                        </div>
                        {!notification.read && (
                          <div className="w-3 h-3 bg-cyan-400 rounded-full ml-4 mt-1"></div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-3">{notification.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        case "profile":
          return (
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-8">Profile</h1>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{user?.fullName || 'User'}</h2>
                    <p className="text-gray-400">{user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">Member since {userStats.memberSince}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200">
                      {user?.fullName || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200">
                      {user?.email || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200">
                      {user?.phone || 'Not set'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Account Type</label>
                    <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-200 capitalize">
                      {user?.role || 'Customer'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-4">Account Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-300">{userStats.totalBookings}</div>
                    <div className="text-sm text-gray-400 mt-1">Total Bookings</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-300">{userStats.upcomingBookings}</div>
                    <div className="text-sm text-gray-400 mt-1">Upcoming</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">{userStats.loyaltyPoints}</div>
                    <div className="text-sm text-gray-400 mt-1">Loyalty Points</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-300">{userStats.totalRewards}</div>
                    <div className="text-sm text-gray-400 mt-1">Rewards</div>
                  </div>
                </div>
              </div>
            </div>
          );
        case "settings":
          return (
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-8">Settings</h1>
              
              <div className="space-y-6">
                {/* Notification Preferences */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-200">Email Notifications</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                          emailNotifications ? 'bg-cyan-600' : 'bg-gray-700'
                        } border border-white/20`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                            emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-200">SMS Notifications</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSmsNotifications(!smsNotifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                          smsNotifications ? 'bg-cyan-600' : 'bg-gray-700'
                        } border border-white/20`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                            smsNotifications ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="text-gray-200">Push Notifications</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPushNotifications(!pushNotifications)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                          pushNotifications ? 'bg-cyan-600' : 'bg-gray-700'
                        } border border-white/20`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                            pushNotifications ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Privacy & Security */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Privacy & Security</h3>
                  <div className="space-y-4">
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                        <span className="text-gray-200">Change Password</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-gray-200">Two-Factor Authentication</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        <span className="text-gray-200">Dark Mode</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDarkMode(!darkMode)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                          darkMode ? 'bg-cyan-600' : 'bg-gray-700'
                        } border border-white/20`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                            darkMode ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                        <span className="text-gray-200">Language</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>English</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
      
        default:
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
{/* Stats Grid */}
<div className="mb-8">
  <div className="flex flex-wrap lg:grid lg:grid-cols-4 gap-2 lg:gap-6 px-2 lg:px-0">
    {/* Total Bookings */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6 flex-1 min-w-[calc(50%-4px)] lg:min-w-0 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Total Bookings</p>
          <p className="text-lg lg:text-2xl font-bold text-cyan-300">{userStats.totalBookings}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">📅</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm text-green-400">
        <svg className="w-3 h-3 lg:w-4 lg:h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        +1 this year
      </div>
    </div>

    {/* Upcoming */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6 flex-1 min-w-[calc(50%-4px)] lg:min-w-0 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Upcoming</p>
          <p className="text-lg lg:text-2xl font-bold text-yellow-300">{userStats.upcomingBookings}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">⏰</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 text-xs lg:text-sm text-gray-400">
        {bookings.find(b => {
          const status = b.status.toLowerCase();
          const startDate = b.startDate ? new Date(b.startDate) : null;
          return (status === 'confirmed' || status === 'upcoming') && startDate && startDate >= new Date();
        })?.location || 'No upcoming bookings'}
      </div>
    </div>

    {/* Loyalty Points */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6 flex-1 min-w-[calc(50%-4px)] lg:min-w-0 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Loyalty Points</p>
          <p className="text-lg lg:text-2xl font-bold text-cyan-300">{userStats.loyaltyPoints}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
          <span className="text-lg lg:text-xl font-bold text-cyan-300">$</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 flex items-center text-xs lg:text-sm text-cyan-400">
        <div className="w-full bg-gray-700 rounded-full h-2 mr-1">
          <div className="bg-cyan-500 h-2 rounded-full" style={{width: '65%'}}></div>
        </div>
        65%
      </div>
    </div>

    {/* Membership */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 lg:p-6 flex-1 min-w-[calc(50%-4px)] lg:min-w-0 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Membership</p>
          <p className="text-lg lg:text-xl font-bold text-yellow-300">{userStats.membershipTier}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">👑</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 text-xs lg:text-sm text-gray-400">
        Since {userStats.memberSince}
      </div>
    </div>
  </div>
</div>


              {/* Main Dashboard Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Bookings */}
                <div className="lg:col-span-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold">Recent Bookings</h2>
                      <button
                        onClick={() => setActiveSection("bookings")}
                        className="text-cyan-300 hover:text-cyan-200 text-sm font-medium"
                      >
                        View All →
                      </button>
                    </div>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                      </div>
                    ) : bookings.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No bookings found. Book your first box to get started!
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {bookings.map((booking) => {
                          const statusLower = booking.status.toLowerCase();
                          const statusColor = 
                            statusLower === 'confirmed' || statusLower === 'active' ? 'green' :
                            statusLower === 'upcoming' ? 'yellow' :
                            statusLower === 'cancelled' ? 'red' :
                            'gray';
                          
                          return (
                            <div 
                              key={booking.id} 
                              onClick={() => setActiveSection("bookings")}
                              className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center space-x-4">
                                <div className={`w-3 h-3 rounded-full ${
                                  statusColor === 'green' ? 'bg-green-400' :
                                  statusColor === 'yellow' ? 'bg-yellow-400' :
                                  statusColor === 'red' ? 'bg-red-400' :
                                  'bg-gray-400'
                                }`}></div>
                                <div>
                                  <div className="font-medium">{booking.location}</div>
                                  <div className="text-sm text-gray-400">{booking.date}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">SEK {booking.amount.toFixed(2)}</div>
                                <div className={`text-xs ${
                                  statusColor === 'green' ? 'text-green-400' :
                                  statusColor === 'yellow' ? 'text-yellow-400' :
                                  statusColor === 'red' ? 'text-red-400' :
                                  'text-gray-400'
                                }`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions & Notifications */}
                <div className="space-y-6">
                  
                  {/* Recent Notifications */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Notifications</h2>
                      <button
                        onClick={() => setActiveSection("notifications")}
                        className="text-cyan-300 hover:text-cyan-200 text-sm font-medium"
                      >
                        View All →
                      </button>
                    </div>
                    {isLoadingData ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="text-center py-4 text-gray-400 text-sm">
                        No notifications
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {notifications.slice(0, 3).map((notification) => (
                          <div key={notification.id} className={`p-3 rounded-lg ${
                            notification.read ? 'bg-white/5' : 'bg-cyan-500/10 border border-cyan-400/20'
                          }`}>
                            <div className="flex items-start space-x-3">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2 flex-shrink-0"></div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{notification.title}</div>
                                <div className="text-xs text-gray-400 mt-1 truncate">{notification.message}</div>
                                <div className="text-xs text-gray-500 mt-1">{notification.date}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Section - Rewards Progress */}
              <div className="mt-8">
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Next Reward Unlock</h3>
                      <p className="text-gray-300">Free upgrade to Pro model</p>
                      <div className="mt-3 flex items-center space-x-4">
                        <div className="flex items-center text-sm text-gray-400">
                          <span className="font-semibold text-cyan-300">{userStats.loyaltyPoints}</span>
                          <span className="mx-1">/</span>
                          <span>3000 points</span>
                        </div>
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all" 
                            style={{width: `${Math.min(100, (userStats.loyaltyPoints / 3000) * 100)}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveSection("rewards")}
                      className="px-6 py-3 bg-cyan-600/20 text-cyan-300 rounded-lg border border-cyan-400/40 hover:bg-cyan-600/30 transition-colors"
                    >
                      View Rewards
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
      }
    };

    // Show loading state while checking authentication
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      );
    }

    // Don't render if user is not authenticated or not a customer
    // (redirect will happen via useEffect)
    // Give a small grace period for state to update after login
    if (!user) {
      console.log('Customer page: No user, showing loading...');
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
            <p className="text-gray-400">Verifying authentication...</p>
          </div>
        </div>
      );
    }

    if (user.role !== Role.CUSTOMER) {
      console.log('Customer page: User role is', user.role, 'not CUSTOMER, waiting for redirect...');
      return null;
    }

    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <CustomerHeader 
          activeSection={activeSection} 
          onSectionChange={setActiveSection} 
        />
        
        <main className="">
          {renderSection()}
        </main>

        {/* Floating Action Button for New Booking */}
        <button
          onClick={() => {
            setActiveSection("book");
            // Scroll to map section after a brief delay to ensure it's rendered
            setTimeout(() => {
              const mapSection = document.getElementById('map');
              if (mapSection) {
                mapSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
          }}
          className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 group"
          aria-label="Add new booking"
          title="Book a box"
        >
          <svg 
            className="w-8 h-8 transition-transform group-hover:rotate-90 duration-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          
          {/* Tooltip */}
          <span className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
            Book a Box
            <svg className="absolute top-full right-4 w-2 h-2 text-gray-800" viewBox="0 0 8 8">
              <path fill="currentColor" d="M0 0 L4 4 L8 0 Z" />
            </svg>
          </span>
        </button>

        {/* Return Box Modal - Rendered at page level */}
        {returningBookingId && (
          <ReturnBoxModal
            bookingId={returningBookingId}
            isOpen={true}
            onClose={() => {
              setReturningBookingId(null);
              setReturnError(null);
              setReturnPhotos({
                boxFrontView: null,
                boxBackView: null,
                closedStandLock: null,
              });
              setReturnConfirmed(false);
            }}
            onSuccess={async () => {
              const authToken = localStorage.getItem('auth-token');
              const headersGet: HeadersInit = {};
              if (authToken) {
                headersGet['Authorization'] = `Bearer ${authToken}`;
              }
              
              // Optimistically update UI immediately
              setBookings(prevBookings => 
                prevBookings.map(booking => 
                  booking.id === returningBookingId 
                    ? { ...booking, status: 'completed' }
                    : booking
                )
              );
              
              // Reload all data to ensure consistency
              const [statsRes, bookingsRes, paymentsRes, notificationsRes] = await Promise.all([
                fetch('/api/customer/stats', { headers: headersGet }),
                fetch('/api/customer/bookings', { headers: headersGet }),
                fetch('/api/customer/payments', { headers: headersGet }),
                fetch('/api/customer/notifications', { headers: headersGet }),
              ]);
              
              // Update all data
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                setUserStats(statsData.stats);
              }
              if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                console.log('[Return Box] Reloaded bookings:', bookingsData.bookings?.map((b: Booking) => ({
                  id: b.id.slice(0, 8),
                  status: b.status
                })));
                // Force new array reference to ensure React detects changes
                setBookings((bookingsData.bookings || []).map((b: Booking) => ({ ...b })));
              }
              if (paymentsRes.ok) {
                const paymentsData = await paymentsRes.json();
                setPayments(paymentsData.payments || []);
              }
              if (notificationsRes.ok) {
                const notificationsData = await notificationsRes.json();
                setNotifications(notificationsData.notifications || []);
              }
              
              // Show success message
              setCancelSuccess('Box returned successfully! Your deposit is being released.');
              setTimeout(() => setCancelSuccess(null), 5000);
              
              // Close modal and clear expanded booking if it was the returned one
              if (expandedBookingId === returningBookingId) {
                setExpandedBookingId(null);
              }
            }}
            returnPhotos={returnPhotos}
            setReturnPhotos={setReturnPhotos}
            returnConfirmed={returnConfirmed}
            setReturnConfirmed={setReturnConfirmed}
          />
        )}

        {/* Cancel Booking Modal - Rendered at page level */}
        {showCancelModal && cancellingBookingId && (
          <CancelBookingModal
            bookingId={cancellingBookingId}
            isOpen={showCancelModal}
            onClose={() => {
              setShowCancelModal(false);
              setCancellingBookingId(null);
              setCancelError(null);
            }}
            onConfirm={async () => {
              try {
                const authToken = localStorage.getItem('auth-token');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (authToken) {
                  headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                const response = await fetch(`/api/bookings/${cancellingBookingId}/cancel`, {
                  method: 'POST',
                  headers,
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to cancel booking');
                }
                
                // Reload all data to ensure consistency
                const [statsRes, bookingsRes, paymentsRes, notificationsRes] = await Promise.all([
                  fetch('/api/customer/stats', { headers }),
                  fetch('/api/customer/bookings', { headers }),
                  fetch('/api/customer/payments', { headers }),
                  fetch('/api/customer/notifications', { headers }),
                ]);
                
                // Update all data
                if (statsRes.ok) {
                  const statsData = await statsRes.json();
                  setUserStats(statsData.stats);
                }
                if (bookingsRes.ok) {
                  const bookingsData = await bookingsRes.json();
                  console.log('[Cancel] Reloaded bookings:', bookingsData.bookings?.length, 'bookings');
                  console.log('[Cancel] All booking statuses:', bookingsData.bookings?.map((b: Booking) => ({ 
                    id: b.id.slice(0, 8), 
                    status: b.status,
                    statusType: typeof b.status,
                    statusLower: b.status?.toLowerCase()
                  })));
                  // Find the cancelled booking
                  const cancelledBooking = bookingsData.bookings?.find((b: Booking) => b.id === cancellingBookingId);
                  console.log('[Cancel] Cancelled booking details:', cancelledBooking ? { 
                    id: cancelledBooking.id.slice(0, 8), 
                    status: cancelledBooking.status,
                    statusType: typeof cancelledBooking.status,
                    statusLower: cancelledBooking.status?.toLowerCase(),
                    willShowCancelButton: (cancelledBooking.status?.toLowerCase() === 'upcoming' || cancelledBooking.status?.toLowerCase() === 'confirmed') && 
                                          cancelledBooking.status?.toLowerCase() !== 'cancelled' &&
                                          cancelledBooking.status?.toLowerCase() !== 'completed'
                  } : 'NOT FOUND');
                  // Force state update by creating completely new array with new object references
                  const updatedBookings = (bookingsData.bookings || []).map((b: Booking) => ({ ...b }));
                  console.log('[Cancel] Setting bookings state with', updatedBookings.length, 'bookings');
                  setBookings(updatedBookings);
                  // Also force a re-render by updating a dummy state if needed
                  setExpandedBookingId((prev) => prev === cancellingBookingId ? null : prev);
                }
                if (paymentsRes.ok) {
                  const paymentsData = await paymentsRes.json();
                  setPayments(paymentsData.payments || []);
                }
                if (notificationsRes.ok) {
                  const notificationsData = await notificationsRes.json();
                  setNotifications(notificationsData.notifications || []);
                }
                
                // Show success message
                const refundMsg = data.cancellation?.refundAmount > 0 
                  ? ` Refund of SEK ${data.cancellation.refundAmount.toFixed(2)} will be processed.`
                  : '';
                setCancelSuccess('Booking cancelled successfully.' + refundMsg);
                setTimeout(() => setCancelSuccess(null), 5000);
                
                // Close modal and clear expanded booking if it was the cancelled one
                setShowCancelModal(false);
                if (expandedBookingId === cancellingBookingId) {
                  setExpandedBookingId(null);
                }
                setCancellingBookingId(null);
              } catch (error) {
                setCancelError(error instanceof Error ? error.message : 'Failed to cancel booking');
                throw error; // Re-throw to let modal handle the error display
              }
            }}
          />
        )}

        {/* Return Box Modal - Rendered at page level */}
        {returningBookingId && (
          <ReturnBoxModal
            bookingId={returningBookingId}
            isOpen={true}
            onClose={() => {
              setReturningBookingId(null);
              setReturnError(null);
              setReturnPhotos({
                boxFrontView: null,
                boxBackView: null,
                closedStandLock: null,
              });
              setReturnConfirmed(false);
            }}
            onSuccess={async () => {
              const authToken = localStorage.getItem('auth-token');
              const headersGet: HeadersInit = {};
              if (authToken) {
                headersGet['Authorization'] = `Bearer ${authToken}`;
              }
              
              // Optimistically update UI immediately
              setBookings(prevBookings => 
                prevBookings.map(booking => 
                  booking.id === returningBookingId 
                    ? { ...booking, status: 'completed' }
                    : booking
                )
              );
              
              // Reload all data to ensure consistency
              const [statsRes, bookingsRes, paymentsRes, notificationsRes] = await Promise.all([
                fetch('/api/customer/stats', { headers: headersGet }),
                fetch('/api/customer/bookings', { headers: headersGet }),
                fetch('/api/customer/payments', { headers: headersGet }),
                fetch('/api/customer/notifications', { headers: headersGet }),
              ]);
              
              // Update all data
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                setUserStats(statsData.stats);
              }
              if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                console.log('[Return Box] Reloaded bookings:', bookingsData.bookings?.map((b: Booking) => ({
                  id: b.id.slice(0, 8),
                  status: b.status
                })));
                // Force new array reference to ensure React detects changes
                setBookings((bookingsData.bookings || []).map((b: Booking) => ({ ...b })));
              }
              if (paymentsRes.ok) {
                const paymentsData = await paymentsRes.json();
                setPayments(paymentsData.payments || []);
              }
              if (notificationsRes.ok) {
                const notificationsData = await notificationsRes.json();
                setNotifications(notificationsData.notifications || []);
              }
              
              // Show success message
              setCancelSuccess('Box returned successfully! Your deposit is being released.');
              setTimeout(() => setCancelSuccess(null), 5000);
              
              // Close modal and clear expanded booking if it was the returned one
              if (expandedBookingId === returningBookingId) {
                setExpandedBookingId(null);
              }
            }}
            returnPhotos={returnPhotos}
            setReturnPhotos={setReturnPhotos}
            returnConfirmed={returnConfirmed}
            setReturnConfirmed={setReturnConfirmed}
          />
        )}

        {/* Success/Error Notifications */}
        {cancelSuccess && (
          <div className="fixed top-20 right-4 z-50 bg-green-500/90 border border-green-400/30 rounded-lg p-4 shadow-lg max-w-md">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{cancelSuccess}</div>
              </div>
              <button
                onClick={() => setCancelSuccess(null)}
                className="text-white/80 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <Footer />
      </div>
    );
  }

  export default function CustomerDashboard() {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }>
        <CustomerDashboardContent />
      </Suspense>
    );
  }