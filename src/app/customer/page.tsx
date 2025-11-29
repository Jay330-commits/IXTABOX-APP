  "use client";

  import { useState, useEffect } from "react";
  import { useRouter } from "next/navigation";
  import { useAuth } from "@/contexts/AuthContext";
  import { Role } from "@/types/auth";
  import CustomerHeader from "@/components/layouts/CustomerHeader";
  import Footer from "@/components/layouts/Footer";

  // Mock data for demonstration
  const mockUser = {
    name: "John Doe",
    email: "john.doe@example.com",
    memberSince: "2023-01-15",
    membershipTier: "Gold",
    loyaltyPoints: 2450,
    totalBookings: 5,
    upcomingBookings: 2,
    totalRewards: 450
  };

  const mockBookings = [
    {
      id: "BK001",
      location: "Stockholm Central",
      date: "2024-01-15",
      status: "Active",
      amount: 299.99
    },
    {
      id: "BK002", 
      location: "Kungsträdgården",
      date: "2024-01-20",
      status: "Pending",
      amount: 249.99
    },
    {
      id: "BK003",
      location: "Norrmalm",
      date: "2024-01-25",
      status: "Completed",
      amount: 349.99
    }
  ];

  const mockPayments = [
    {
      id: "PAY001",
      amount: 299.99,
      date: "2024-01-10",
      method: "Credit Card",
      status: "Completed"
    }
  ];

  const mockNotifications = [
    {
      id: "NOT001",
      title: "Booking Active",
      message: "Your booking at Stockholm Central has been confirmed",
      date: "2024-01-12",
      read: false
    },
    {
      id: "NOT002",
      title: "Reward Points Added",
      message: "You earned 50 points for your recent booking",
      date: "2024-01-10",
      read: true
    },
    {
      id: "NOT003",
      title: "Payment Processed",
      message: "Your payment of $299.99 has been processed successfully",
      date: "2024-01-10",
      read: true
    }
  ];

  // Dynamic import prevents SSR issues
  
  export default function CustomerDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeSection, setActiveSection] = useState("dashboard");

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

   
    const renderSection = () => {
      switch (activeSection) {
        case "book":
          return (
            <section id="map" className="px-6 py-12">
              <div className="mx-auto max-w-7xl">
                <h2 className="text-3xl font-bold mb-4">Book a New Stand</h2>
                <p className="text-gray-300 mb-6">Find and book available IXTAbox stands in Stockholm</p>
                <div className="w-full bg-gray-800/50 rounded-lg p-8 text-center" style={{ minHeight: 500 }}>
                  <div className="text-gray-400 text-lg">Booking functionality coming soon</div>
                </div>
              </div>
            </section>
          );
        case "payments":
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-6">Payment History</h1>
              <div className="space-y-4">
                {mockPayments.map((payment) => (
                  <div key={payment.id} className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">${payment.amount}</div>
                        <div className="text-gray-400">{payment.method}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-gray-300">{payment.date}</div>
                        <div className="text-green-400 font-medium">{payment.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        case "notifications":
          return (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
              <h1 className="text-3xl font-bold mb-6">Notifications</h1>
              <div className="space-y-4">
                {mockNotifications.map((notification) => (
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
          <p className="text-xl lg:text-2xl font-bold text-cyan-300">{mockUser.totalBookings}</p>
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
          <p className="text-xl lg:text-2xl font-bold text-yellow-300">{mockUser.upcomingBookings}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">⏰</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 text-xs lg:text-sm text-gray-400">
        Next: Stockholm Central
      </div>
    </div>

    {/* Loyalty Points */}
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 lg:p-6 flex-shrink-0 w-56 lg:w-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs lg:text-sm text-gray-400 mb-1">Loyalty Points</p>
          <p className="text-xl lg:text-2xl font-bold text-cyan-300">{mockUser.loyaltyPoints}</p>
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
          <p className="text-lg lg:text-xl font-bold text-yellow-300">{mockUser.membershipTier}</p>
        </div>
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
          <span className="text-xl lg:text-2xl">👑</span>
        </div>
      </div>
      <div className="mt-2 lg:mt-4 text-xs lg:text-sm text-gray-400">
        Since {mockUser.memberSince}
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
                    <div className="space-y-4">
                      {mockBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${
                              booking.status === 'Active' ? 'bg-green-400' :
                              booking.status === 'Pending' ? 'bg-yellow-400' :
                              'bg-gray-400'
                            }`}></div>
                            <div>
                              <div className="font-medium">{booking.location}</div>
                              <div className="text-sm text-gray-400">{booking.date}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">${booking.amount}</div>
                            <div className={`text-xs ${
                              booking.status === 'Active' ? 'text-green-400' :
                              booking.status === 'Pending' ? 'text-yellow-400' :
                              'text-gray-400'
                            }`}>
                              {booking.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    <div className="space-y-3">
                      {mockNotifications.slice(0, 3).map((notification) => (
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
                          <span className="font-semibold text-cyan-300">{mockUser.loyaltyPoints}</span>
                          <span className="mx-1">/</span>
                          <span>3000 points</span>
                        </div>
                        <div className="w-32 bg-gray-700 rounded-full h-2">
                          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full" style={{width: '82%'}}></div>
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
          onClick={() => setActiveSection("book")}
          className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 group"
          aria-label="Add new booking"
          title="Book a new stand"
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
            Book New Stand
            <svg className="absolute top-full right-4 w-2 h-2 text-gray-800" viewBox="0 0 8 8">
              <path fill="currentColor" d="M0 0 L4 4 L8 0 Z" />
            </svg>
          </span>
        </button>

        <Footer />
      </div>
    );
  }