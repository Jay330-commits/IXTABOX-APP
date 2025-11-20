"use client";

import React, { useState } from 'react';

export type BookingFilter = {
  startDate: string;
  endDate: string;
  boxModel: string;
};

interface BookingFilterFormProps {
  onFilterChange: (filter: BookingFilter) => void;
  onClose?: () => void;
  isMapOverlay?: boolean;
}

const BOX_MODELS = [
  { id: 'all', name: 'All Models' },
  { id: 'classic', name: 'IXTAbox pro 175' },
  { id: 'pro', name: 'IXTAbox Pro 190' },
];

export default function BookingFilterForm({ onFilterChange, onClose, isMapOverlay = false }: BookingFilterFormProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [boxModel, setBoxModel] = useState('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-filter when both dates are selected
  React.useEffect(() => {
    if (startDate && endDate && new Date(endDate) >= new Date(startDate)) {
      onFilterChange({ startDate, endDate, boxModel });
    } else if (!startDate && !endDate) {
      // Clear filter when both dates are cleared
      onFilterChange({ startDate: '', endDate: '', boxModel: 'all' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, boxModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate) {
      onFilterChange({ startDate, endDate, boxModel });
    }
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    setBoxModel('all');
    onFilterChange({ startDate: '', endDate: '', boxModel: 'all' });
  };

  const today = new Date().toISOString().split('T')[0];
  const isFormValid = startDate && endDate && new Date(endDate) >= new Date(startDate);

  if (isMapOverlay) {
    return (
      <div className="absolute top-4 left-4 z-[1003] w-full max-w-sm pointer-events-auto">
        <div className="bg-gray-900/75 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-500/15 to-cyan-600/15 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Stands
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-400 hover:text-white transition-colors p-1"
                aria-label={isCollapsed ? "Expand filter" : "Collapse filter"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  aria-label="Close filter form"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Form Content */}
          {!isCollapsed && (
            <div className="p-4 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="startDate" className="block text-xs font-medium text-gray-300 mb-1.5">
                      From
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={today}
                      className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-xs font-medium text-gray-300 mb-1.5">
                      To
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || today}
                      className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                {/* Box Model */}
                <div>
                  <label htmlFor="boxModel" className="block text-xs font-medium text-gray-300 mb-1.5">
                    Box Model
                  </label>
                  <select
                    id="boxModel"
                    value={boxModel}
                    onChange={(e) => setBoxModel(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    {BOX_MODELS.map((model) => (
                      <option key={model.id} value={model.id} className="bg-gray-900">
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className="flex-1 px-4 py-2 text-sm bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
                  >
                    Search
                  </button>
                  {(startDate || endDate || boxModel !== 'all') && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-medium rounded-lg transition-colors border border-white/20"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>

              {startDate && endDate && new Date(endDate) < new Date(startDate) && (
                <p className="text-xs text-red-400 mt-2">End date must be after start date</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original full-width form for non-map contexts
  return (
    <div className="bg-gray-900/95 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Filter Available Stands</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close filter form"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Start Date */}
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          {/* End Date */}
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              required
            />
          </div>

          {/* Box Model */}
          <div>
            <label htmlFor="boxModel" className="block text-sm font-medium text-gray-300 mb-2">
              Box Model
            </label>
            <select
              id="boxModel"
              value={boxModel}
              onChange={(e) => setBoxModel(e.target.value)}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              {BOX_MODELS.map((model) => (
                <option key={model.id} value={model.id} className="bg-gray-900">
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={!isFormValid}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
            >
              Search
            </button>
            {(startDate || endDate || boxModel !== 'all') && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white font-medium rounded-lg transition-colors border border-white/20"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {startDate && endDate && new Date(endDate) < new Date(startDate) && (
          <p className="mt-2 text-sm text-red-400">End date must be after start date</p>
        )}
      </div>
    </div>
  );
}

