  "use client";

  import { useState, useEffect, Suspense } from "react";
  import { useRouter, useSearchParams } from "next/navigation";
  import { useAuth } from "@/contexts/AuthContext";
  import { Role } from "@/types/auth";
  import CustomerHeader from "@/components/layouts/CustomerHeader";
  import Footer from "@/components/layouts/Footer";
  import ReturnBoxModal from "@/components/bookings/ReturnBoxModal";
  import CancelBookingModal from "@/components/bookings/CancelBookingModal";
  import ExtendBookingModal from "@/components/bookings/ExtendBookingModal";
  import DashboardSection from "@/components/customers/DashboardSection";
  import BookSection from "@/components/customers/BookSection";
  import BookingsSection from "@/components/customers/BookingsSection";
  import PaymentsSection from "@/components/customers/PaymentsSection";
  import NotificationsSection from "@/components/customers/NotificationsSection";
  import ProfileSection from "@/components/customers/ProfileSection";
  import SettingsSection from "@/components/customers/SettingsSection";
  import SupportSection from "@/components/customers/SupportSection";
  import type { MapProps } from "@/components/maps/googlemap";

  // Type definitions
  type Booking = {
    id: string;
    bookingDisplayId?: string | null;
    location: string;
    locationAddress?: string | null;
    date: string;
    status: string;
    amount: number; // Total amount (original + extensions)
    originalAmount?: number; // Original booking amount
    extensionAmount?: number; // Total extension amount
    startDate?: string;
    endDate?: string;
    boxId?: string;
    boxDisplayId?: string;
    standId?: string;
    standDisplayId?: string;
    locationId?: string;
    locationDisplayId?: string | null;
    lockPin?: string | null;
    paymentId?: string;
    paymentStatus?: string | null;
    chargeId?: string | null;
    createdAt?: string;
    returnedAt?: string | null;
    model?: string;
    boxFrontView?: string | null;
    boxBackView?: string | null;
    closedStandLock?: string | null;
    extensionCount?: number;
    isExtended?: boolean;
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
    entityType?: string; // e.g., 'booking', 'feedback', etc.
    entityId?: string; // ID of the related entity
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
      if (section && ['dashboard', 'book', 'bookings', 'payments', 'notifications', 'profile', 'settings', 'support'].includes(section)) {
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
  const [statsExpanded, setStatsExpanded] = useState(false);
  
  // Cancel/Return/Extension state
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [returningBookingId, setReturningBookingId] = useState<string | null>(null);
  const [extendingBookingId, setExtendingBookingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [extensionSuccess, setExtensionSuccess] = useState<string | null>(null);
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

    // Periodic booking status sync - runs every 10 seconds to catch status changes quickly
    useEffect(() => {
      if (!user) return;

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

      const syncStatuses = () => {
        setBookings(currentBookings => {
          if (currentBookings.length === 0) return currentBookings;

        const updates: Array<{ bookingId: string; newStatus: string }> = [];
          const updatedBookings = currentBookings.map(booking => {
          if (!booking.startDate || !booking.endDate) {
            return booking;
          }

          const currentStatusLower = booking.status?.toLowerCase() || '';
          
          // Skip only "confirmed" status - keep it on hold, don't recalculate
          if (currentStatusLower === 'confirmed') {
            return booking;
          }

          // Include all other statuses (upcoming, active, completed, cancelled) in periodic updates
          const calculatedStatus = calculateBookingStatus(booking.startDate, booking.endDate);
          
          // For cancelled/completed: keep them as final states (don't change them even if calculated status differs)
          if (currentStatusLower === 'cancelled' || currentStatusLower === 'completed') {
            // Keep cancelled/completed as final states - don't change them
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

          // Sync with DB in background if there are updates
        if (updates.length > 0) {
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
          });
        }

          // Return updated bookings (or original if no changes)
          return updates.length > 0 ? updatedBookings : currentBookings;
        });
      };

      // Run immediately, then every 10 seconds for faster status updates
      syncStatuses();
      const interval = setInterval(syncStatuses, 10000);

      return () => clearInterval(interval);
    }, [user]);

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
            <BookSection
              locations={locations}
              isLoadingLocations={isLoadingLocations}
              locationsError={locationsError}
              isMapFullscreen={isMapFullscreen}
              mounted={mounted}
              onFullscreenChange={setIsMapFullscreen}
            />
          );
        case "payments":
          return (
            <PaymentsSection
              payments={payments}
              isLoadingData={isLoadingData}
              dataError={dataError}
              expandedPaymentId={expandedPaymentId}
              setExpandedPaymentId={setExpandedPaymentId}
            />
          );
        case "bookings":
          return (
            <>
              {extensionSuccess && (
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
                  <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-green-400 font-medium">{extensionSuccess}</p>
                    </div>
                  </div>
                </div>
              )}
              <BookingsSection
                bookings={bookings}
                isLoadingData={isLoadingData}
                dataError={dataError}
                expandedBookingId={expandedBookingId}
                setExpandedBookingId={setExpandedBookingId}
                cancellingBookingId={cancellingBookingId}
                setCancellingBookingId={setCancellingBookingId}
                returningBookingId={returningBookingId}
                setReturningBookingId={setReturningBookingId}
                extendingBookingId={extendingBookingId}
                setExtendingBookingId={setExtendingBookingId}
                cancelError={cancelError}
                setCancelError={setCancelError}
                setShowCancelModal={setShowCancelModal}
                setReturnPhotos={setReturnPhotos}
                setReturnConfirmed={setReturnConfirmed}
              />
            </>
          );
        case "notifications":
          return (
            <NotificationsSection
              notifications={notifications}
              isLoadingData={isLoadingData}
              dataError={dataError}
            />
          );
        case "profile":
          return (
            <ProfileSection
              user={user}
              userStats={userStats}
            />
          );
        case "settings":
          return (
            <SettingsSection
              emailNotifications={emailNotifications}
              setEmailNotifications={setEmailNotifications}
              smsNotifications={smsNotifications}
              setSmsNotifications={setSmsNotifications}
              pushNotifications={pushNotifications}
              setPushNotifications={setPushNotifications}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          );
        case "support":
          return <SupportSection />;
        case "dashboard":
        default:
          return (
            <DashboardSection
              userStats={userStats}
              bookings={bookings}
              notifications={notifications}
              isLoadingData={isLoadingData}
              statsExpanded={statsExpanded}
              setStatsExpanded={setStatsExpanded}
              setActiveSection={setActiveSection}
            />
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

        {/* Modals */}
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
              
              // Refresh bookings data
              const bookingsRes = await fetch('/api/customer/bookings', { headers });
              if (bookingsRes.ok) {
                const bookingsData = await bookingsRes.json();
                  setBookings(bookingsData.bookings || []);
              }
              
              setShowCancelModal(false);
              setCancellingBookingId(null);
            }}
          />
        )}

        {extendingBookingId && (() => {
          const booking = bookings.find(b => b.id === extendingBookingId);
          const currentEndDate = booking?.endDate || booking?.date;
          return currentEndDate ? (
            <ExtendBookingModal
              bookingId={extendingBookingId}
              currentEndDate={currentEndDate}
              isOpen={!!extendingBookingId}
              onClose={() => {
                setExtendingBookingId(null);
              }}
              onConfirm={async (newEndDate: string, newEndTime: string) => {
                // Show success message
                setExtensionSuccess('Your booking has been extended successfully.');
                
                // Refresh bookings data
                const authToken = localStorage.getItem('auth-token');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (authToken) {
                  headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                const bookingsRes = await fetch('/api/customer/bookings', { headers });
                if (bookingsRes.ok) {
                  const bookingsData = await bookingsRes.json();
                  setBookings(bookingsData.bookings || []);
                }
                
                setExtendingBookingId(null);
                
                // Clear success message after 5 seconds
                setTimeout(() => {
                  setExtensionSuccess(null);
                }, 5000);
              }}
            />
          ) : null;
        })()}

        {returningBookingId && (
          <ReturnBoxModal
            bookingId={returningBookingId}
            isOpen={!!returningBookingId}
            onClose={() => {
              setReturningBookingId(null);
              setReturnPhotos({
                boxFrontView: null,
                boxBackView: null,
                closedStandLock: null,
              });
              setReturnConfirmed(false);
            }}
            onSuccess={async () => {
              // Capture bookingId before clearing state
              const completedBookingId = returningBookingId;
              
              // Clear return state
              setReturningBookingId(null);
              setReturnPhotos({
                boxFrontView: null,
                boxBackView: null,
                closedStandLock: null,
              });
              setReturnConfirmed(false);
              
              // Immediately update the booking status locally for instant feedback
              if (completedBookingId) {
                setBookings(currentBookings => 
                  currentBookings.map(booking => 
                    booking.id === completedBookingId 
                      ? { ...booking, status: 'completed' }
                      : booking
                  )
                );
              }
              
              // Wait a moment for database transaction to complete, then refresh bookings data
              await new Promise(resolve => setTimeout(resolve, 300));
              
              try {
                const authToken = localStorage.getItem('auth-token');
                const headers: HeadersInit = { 'Content-Type': 'application/json' };
                if (authToken) {
                  headers['Authorization'] = `Bearer ${authToken}`;
                }
                
                // Add cache-busting parameter to ensure fresh data
                const response = await fetch(`/api/customer/bookings?t=${Date.now()}`, { 
                  headers,
                  cache: 'no-store'
                });
                if (response.ok) {
                  const data = await response.json();
                  const bookingsArray = data.bookings || [];
                  // Force new array reference and update each booking to ensure React detects changes
                  setBookings(bookingsArray.map((b: Booking) => ({ ...b })));
                }
              } catch (err) {
                console.error('Failed to refresh bookings:', err);
                // Local update already done above, so UI will still show correct state
              }
            }}
            returnPhotos={returnPhotos}
            setReturnPhotos={setReturnPhotos}
            returnConfirmed={returnConfirmed}
            setReturnConfirmed={setReturnConfirmed}
          />
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