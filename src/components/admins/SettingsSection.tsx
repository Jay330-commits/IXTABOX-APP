'use client';

import React from 'react';

interface SettingsSectionProps {
  emailNotifications: boolean;
  setEmailNotifications: (v: boolean) => void;
  smsNotifications: boolean;
  setSmsNotifications: (v: boolean) => void;
  pushNotifications: boolean;
  setPushNotifications: (v: boolean) => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export default function SettingsSection({
  emailNotifications,
  setEmailNotifications,
  smsNotifications,
  setSmsNotifications,
  pushNotifications,
  setPushNotifications,
  darkMode,
  setDarkMode,
}: SettingsSectionProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 pb-24 lg:pb-8">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Email notifications</p>
            <p className="text-xs text-gray-400">Alerts and reports to your email</p>
          </div>
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={`relative w-11 h-6 rounded-full transition-colors ${emailNotifications ? 'bg-amber-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">SMS notifications</p>
            <p className="text-xs text-gray-400">Critical alerts via SMS</p>
          </div>
          <button
            onClick={() => setSmsNotifications(!smsNotifications)}
            className={`relative w-11 h-6 rounded-full transition-colors ${smsNotifications ? 'bg-amber-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${smsNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Push notifications</p>
            <p className="text-xs text-gray-400">Browser or app push</p>
          </div>
          <button
            onClick={() => setPushNotifications(!pushNotifications)}
            className={`relative w-11 h-6 rounded-full transition-colors ${pushNotifications ? 'bg-amber-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${pushNotifications ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Dark mode</p>
            <p className="text-xs text-gray-400">Use dark theme</p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-amber-500' : 'bg-gray-600'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
