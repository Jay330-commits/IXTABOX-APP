  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { useAuth } from "@/contexts/AuthContext";
  import { Role } from "@/types/auth";
  import CustomerHeader from "@/components/layouts/CustomerHeader";
  import Footer from "@/components/layouts/Footer";
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
    date: string;
    status: string;
    amount: number;
    startDate?: string;
    endDate?: string;
    boxId?: string;
    standId?: string;
    locationId?: string;
  };

  type Payment = {
    id: string;
    amount: number;
    date: string;
    method: string;
    status: string;
    currency?: string;
    completedAt?: string;
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

  export default function CustomerDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeSection, setActiveSection] = useState("dashboard");
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

          // Fetch all data in parallel
          const [statsRes, bookingsRes, paymentsRes, notificationsRes] = await Promise.all([
            fetch('/api/customer/stats'),
            fetch('/api/customer/bookings'),
            fetch('/api/customer/payments'),
            fetch('/api/customer/notifications'),
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
              setBookings(bookingsData.bookings || []);
            } else {
              console.error('Failed to load bookings:', bookingsRes.status);
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
                  {payments.map((payment) => (
                    <div key={payment.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">{payment.currency || 'SEK'} {payment.amount.toFixed(2)}</div>
                          <div className="text-gray-400">{payment.method}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-300">{payment.date}</div>
                          <div className={`font-medium ${
                            payment.status === 'Completed' ? 'text-green-400' :
                            payment.status === 'Pending' ? 'text-yellow-400' :
                            'text-gray-400'
                          }`}>
                            {payment.status}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
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
<div className="mb-8 overflow-x-auto lg:overflow-visible">
  <div className="flex lg:grid lg:grid-cols-4 gap-6 px-2 lg:px-0">
    {/* Total Bookings */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 flex-shrink-0 w-56 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Total Bookings</p>
          <p className="text-xl lg:text-2xl font-bold text-cyan-300">{userStats.totalBookings}</p>
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 flex-shrink-0 w-56 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Upcoming</p>
          <p className="text-xl lg:text-2xl font-bold text-yellow-300">{userStats.upcomingBookings}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">⏰</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 text-xs lg:text-sm text-gray-400">
        {bookings.find(b => {
          const status = b.status.toLowerCase();
          const startDate = b.startDate ? new Date(b.startDate) : null;
          return (status === 'confirmed' || status === 'pending') && startDate && startDate >= new Date();
        })?.location || 'No upcoming bookings'}
      </div>
    </div>

    {/* Loyalty Points */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 flex-shrink-0 w-56 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Loyalty Points</p>
          <p className="text-xl lg:text-2xl font-bold text-cyan-300">{userStats.loyaltyPoints}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">🎁</span>
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
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 flex-shrink-0 w-56 lg:w-auto">
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
                        onClick={() => setActiveSection("book")}
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
                        {bookings.slice(0, 5).map((booking) => {
                          const statusLower = booking.status.toLowerCase();
                          const statusColor = 
                            statusLower === 'confirmed' || statusLower === 'active' ? 'green' :
                            statusLower === 'pending' ? 'yellow' :
                            'gray';
                          
                          return (
                            <div key={booking.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className={`w-3 h-3 rounded-full ${
                                  statusColor === 'green' ? 'bg-green-400' :
                                  statusColor === 'yellow' ? 'bg-yellow-400' :
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
                                  'text-gray-400'
                                }`}>
                                  {booking.status}
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

        <Footer />
      </div>
    );
  }