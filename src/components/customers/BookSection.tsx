'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { MapProps } from '@/components/maps/googlemap';

const Map = dynamic<MapProps>(() => import('@/components/maps/googlemap'), {
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

interface BookSectionProps {
  locations: MapProps['locations'];
  isLoadingLocations: boolean;
  locationsError: string | null;
  isMapFullscreen: boolean;
  mounted: boolean;
  onFullscreenChange: (fullscreen: boolean) => void;
}

export default function BookSection({
  locations,
  isLoadingLocations,
  locationsError,
  isMapFullscreen,
  mounted,
  onFullscreenChange,
}: BookSectionProps) {
  return (
    <section id="map" className="relative z-10 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold mb-4">Book a Box</h2>
        <p className="text-gray-300 mb-6">Find and book available IXTAbox boxes in Stockholm</p>
        {!isMapFullscreen && (
          <div className="flex items-center justify-between mb-4">
          </div>
        )}
        <div className={`w-full relative rounded-lg ${!isMapFullscreen ? "overflow-hidden" : ""}`} style={{ height: 500 }} suppressHydrationWarning>
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
              onFullscreenChange={onFullscreenChange}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

