"use client";

import dynamic from "next/dynamic";
import GuestHeader from "@/components/layouts/GuestHeader";
import Footer from "@/components/layouts/Footer";
import { useEffect, useState } from "react";

// Dynamic import prevents SSR issues if you ever move Map to a separate file
const Map = dynamic(() => import("../../components/maps/leaflet_map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[500px] w-full items-center justify-center text-gray-300">Loading map…</div>
  ),
});

export default function GuestHome() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const stands = [
    { id: 1, lat: 59.3293, lng: 18.0686, title: "Stockholm Central" }, // Stockholm
    { id: 2, lat: 59.3326, lng: 18.0649, title: "Kungsträdgården" },
    { id: 3, lat: 59.3360, lng: 18.0700, title: "Norrmalm" },
    { id: 4, lat: 59.3255, lng: 18.0711, title: "Gamla Stan" },
    { id: 5, lat: 59.3420, lng: 18.0735, title: "Östermalm" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      <main className="">
        {/* Hero with animated overlay and parallax background */}
        <section
          className="relative flex items-center justify-center overflow-hidden"
          style={{ minHeight: 560 }}
        >
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{
              backgroundImage: "url(/images/background/back.jpg)",
              backgroundAttachment: "fixed",
            }}
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              The Smart Storage Solution
            </h1>
            <p className="mt-4 text-lg text-gray-200">
              IXTAbox is now equipped with rental solution for those who do not wish to buy one.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#benefits"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)]"
              >
                Explore Benefits
              </a>
              <a
                href="#map"
                className="inline-flex items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-6 py-3 text-base font-semibold text-cyan-200 hover:text-white hover:bg-cyan-500/20 transition-colors"
              >
                Book Now!
              </a>
            </div>
          </div>
        </section>

        {/* Map section (moved just below hero) */}
        <section id="map" className="px-6 py-12">
          <h2 className="text-3xl font-bold mb-4">Find Our Stands</h2>
          <div className="w-full" style={{ minHeight: 500 }}>
            {mounted ? <Map stands={stands} /> : null}
          </div>
        </section>

        {/* Three pillars */}
        <section id="benefits" className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="text-cyan-300 mb-2">Safety & Ergonomics</div>
              <h3 className="text-xl font-semibold">Easy, Safe Access</h3>
              <p className="text-gray-300 mt-2">
                Load and unload at car height. Better ergonomics, safer handling.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="text-cyan-300 mb-2">Swedish Quality</div>
              <h3 className="text-xl font-semibold">Built to Last</h3>
              <p className="text-gray-300 mt-2">
                Premium materials and robust engineering for harsh conditions.
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
              <div className="text-cyan-300 mb-2">Aerodynamics</div>
              <h3 className="text-xl font-semibold">Improved Efficiency</h3>
              <p className="text-gray-300 mt-2">
                Engineered to reduce drag and improve range compared to roof boxes.
              </p>
            </div>
          </div>
        </section>

        {/* Full-bleed background section */}
        <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{ backgroundImage: "url(/images/background/DSCF3859.jpg)", backgroundAttachment: "fixed" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60" />
          <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-3xl sm:text-4xl font-bold">Adventure Ready</h2>
            <p className="mt-3 text-gray-200">
              For family trips, sports, or professionals—room for bikes, skis, tools, and more.
            </p>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-200">
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">LED lighting in and out (Pro)</li>
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Crash‑tested fixation device (Pro)</li>
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Optional 12V outlet and handles</li>
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Durable, weather‑ready design</li>
            </ul>
          </div>
        </section>

        {/* Range/Aero callout */}
        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-8 shadow-[0_0_24px_rgba(34,211,238,0.25)]">
            <h3 className="text-2xl font-bold">Improved Aerodynamics</h3>
            <p className="mt-2 text-gray-200">
              Reduce drag compared to traditional roof boxes and get better range.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-1 text-sm">Lower turbulence behind car</span>
              <span className="rounded-full bg-white/10 px-4 py-1 text-sm">Up to better efficiency</span>
              <span className="rounded-full bg-white/10 px-4 py-1 text-sm">Quieter rides</span>
            </div>
          </div>
        </section>

        {/* Gallery strip with subtle animation */}
        <section className="px-6 py-12">
          <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
              <img src="/images/background/2024_CRDbag_X_IXTAbox_18.jpg" alt="IXTAbox x CRDBAG" className="h-full w-full object-cover scale-100 hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
              <img src="/images/background/How_fast_can_you_pack_Thumbnail_500x.jpg" alt="Fast packing" className="h-full w-full object-cover scale-100 hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
              <img src="/images/background/DSCF3859.jpg" alt="Adventure ready" className="h-full w-full object-cover scale-100 hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        </section>

        {/* CTA footer */}
        <section className="px-6 pb-16">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="text-2xl font-bold">Ready to elevate your storage?</h3>
            <p className="mt-2 text-gray-300">Join the IXTAbox journey and pack it all—smart, safe, and in style.</p>
            <div className="mt-6 flex justify-center">
              <a href="/auth/register" className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)]">
                Get Started
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
