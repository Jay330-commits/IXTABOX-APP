'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- used when guard is re-enabled
import { Role } from '@/types/auth';
import AdminHeader from '@/components/layouts/AdminHeader';
import AdminTopBar from '@/components/layouts/AdminTopBar';
import DashboardSection from '@/components/admins/DashboardSection';
import UsersSection from '@/components/admins/UsersSection';
import BookingsSection from '@/components/admins/BookingsSection';
import LocationsSection from '@/components/admins/LocationsSection';
import PaymentsSection from '@/components/admins/PaymentsSection';
import SystemSection from '@/components/admins/SystemSection';
import AuditSection from '@/components/admins/AuditSection';
import ProfileSection from '@/components/admins/ProfileSection';
import SettingsSection from '@/components/admins/SettingsSection';
import ContractsSection from '@/components/admins/ContractsSection';
import InventorySection from '@/components/admins/InventorySection';
import MarketingSection from '@/components/admins/MarketingSection';
import StatisticsSection from '@/components/admins/StatisticsSection';
import NotificationsSection from '@/components/admins/NotificationsSection';
import SupportSection from '@/components/admins/SupportSection';
import ExportSection from '@/components/admins/ExportSection';

const ADMIN_SECTIONS = [
  'dashboard',
  'users',
  'users-partners',
  'users-admins',
  'bookings',
  'locations',
  'contracts',
  'inventory',
  'marketing',
  'statistics',
  'payments',
  'notifications',
  'support',
  'export',
  'system',
  'audit',
  'profile',
  'settings',
] as const;

function AdminDashboardContent() {
  const { user, loading } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- used when guard is re-enabled
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState('dashboard');

  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ADMIN_SECTIONS.includes(section as (typeof ADMIN_SECTIONS)[number])) {
      setActiveSection(section);
    }
  }, [searchParams]);

  // TEMPORARY: Admin guard disabled for dev — re-enable before production
  // useEffect(() => {
  //   if (loading) return;
  //   if (!user) {
  //     router.replace('/auth/login');
  //     return;
  //   }
  //   if (user.role !== Role.ADMIN) {
  //     if (user.role === Role.CUSTOMER) router.replace('/customer');
  //     else if (user.role === Role.DISTRIBUTOR) router.replace('/distributor');
  //     else router.replace('/auth/login');
  //     return;
  //   }
  // }, [user, loading, router]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const renderSection = () => {
    switch (activeSection) {
      case 'users':
        return <UsersSection initialTab="customers" />;
      case 'users-partners':
        return <UsersSection initialTab="partners" />;
      case 'users-admins':
        return <UsersSection initialTab="admins" />;
      case 'bookings':
        return <BookingsSection />;
      case 'locations':
        return <LocationsSection />;
      case 'contracts':
        return <ContractsSection />;
      case 'inventory':
        return <InventorySection />;
      case 'marketing':
        return <MarketingSection />;
      case 'statistics':
        return <StatisticsSection />;
      case 'payments':
        return <PaymentsSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'support':
        return <SupportSection />;
      case 'export':
        return <ExportSection />;
      case 'system':
        return <SystemSection />;
      case 'audit':
        return <AuditSection />;
      case 'profile':
        return <ProfileSection user={user} />;
      case 'settings':
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
      case 'dashboard':
      default:
        return <DashboardSection setActiveSection={setActiveSection} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-3" />
          <p className="text-[13px] text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // TEMPORARY: Skip role guard for dev — re-enable before production
  // if (!user || user.role !== Role.ADMIN) {
  //   return (
  //     <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mb-4" />
  //         <p className="text-gray-400">Verifying access...</p>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-900 text-white">
      {/* Header: full width, fixed at top */}
      <div className="flex-shrink-0">
        <AdminTopBar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
      </div>
      {/* Below header: side panel (left, own scroll) + main content (right, own scroll) */}
      <div className="flex flex-1 min-h-0 flex-row overflow-hidden">
        <AdminHeader
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
        />
        <main className="admin-scrollbar flex-1 min-h-0 overflow-auto min-w-0">{renderSection()}</main>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-white/20 border-t-white mb-3" />
            <p className="text-[13px] text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
