"use client";

import { useState, useEffect } from 'react';
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from '@/components/layouts/Footer';

interface PinResponse {
  pin?: string;
  pinCode?: string;
  code?: string;
  unlockCode?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: unknown;
}

export default function GeneratePinPage() {
  // Get current date and time for defaults
  const getCurrentDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('17:00');
  const [accessName, setAccessName] = useState('Customer');
  const [pinResult, setPinResult] = useState<PinResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default start date/time to now on mount
  useEffect(() => {
    setStartDate(getCurrentDate());
    setStartTime(getCurrentTime());
  }, []);

  const handleGeneratePin = async () => {
    if (!endDate) {
      setError('Please provide an end date');
      return;
    }

    setLoading(true);
    setError(null);
    setPinResult(null);

    try {
      // Use current date/time if start date/time is not set
      const actualStartDate = startDate || getCurrentDate();
      const actualStartTime = startTime || getCurrentTime();
      
      // Combine date and time to create full datetime strings
      const startDateTime = `${actualStartDate}T${actualStartTime}:00`;
      const endDateTime = `${endDate}T${endTime}:00`;
      
      // Check if start date/time is in the past - if so, use current date/time
      const startDateObj = new Date(startDateTime);
      const now = new Date();
      
      let finalStartDateTime = startDateTime;
      if (startDateObj < now) {
        // Start time is in the past, use current date/time
        const currentDate = getCurrentDate();
        const currentTime = getCurrentTime();
        finalStartDateTime = `${currentDate}T${currentTime}:00`;
      }

      const response = await fetch('/api/igloo/generate-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: finalStartDateTime,
          endDate: endDateTime,
          accessName: accessName || 'Customer'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PIN');
      }

      const data = await response.json();
      setPinResult(data);
    } catch (err) {
      console.error('Error generating PIN:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      
      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Generate Lock PIN
          </h1>
          <p className="text-gray-300">
            Generate a PIN for lock access during your booking period
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Access Name (Optional)
              </label>
              <input
                type="text"
                value={accessName}
                onChange={(e) => setAccessName(e.target.value)}
                placeholder="Customer"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <button
              onClick={handleGeneratePin}
              disabled={loading}
              className="w-full py-3 px-6 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)]"
            >
              {loading ? 'Generating PIN...' : 'Generate PIN'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {pinResult && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Generated PIN</h2>
            
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-6 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-2">Your Lock PIN</p>
                  <p className="text-4xl font-bold text-cyan-400 font-mono tracking-wider">
                    {(pinResult.pin || pinResult.pinCode || pinResult.code || pinResult.unlockCode || 'N/A') as string}
                  </p>
                </div>
                <div className="text-right">
                  <svg
                    className="h-16 w-16 text-cyan-400/50"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm mb-4">
              {pinResult.startDate && (
                <p className="text-gray-400">
                  <strong className="text-white">Valid from:</strong>{' '}
                  {new Date(pinResult.startDate).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
              {pinResult.endDate && (
                <p className="text-gray-400">
                  <strong className="text-white">Valid until:</strong>{' '}
                  {new Date(pinResult.endDate).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-200 text-xs">
                <strong>Important:</strong> Save this PIN securely. You&apos;ll need it to access the lock during the specified period.
              </p>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

