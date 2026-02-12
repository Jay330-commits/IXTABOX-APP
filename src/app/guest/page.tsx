"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { MapProps } from "../../components/maps/googlemap";
import GuestHeader from "@/components/layouts/GuestHeader";
import Footer from "@/components/layouts/Footer";
import FadeInSection from "@/components/animations/FadeInSection";
import AnimatedCounter from "@/components/animations/AnimatedCounter";
// import BookingFilterForm, { type BookingFilter } from "@/components/bookings/BookingFilterForm";
import { useEffect, useRef, useState } from "react";
import { scrollToMap } from "@/utils/scrollToMap";

const STAT_METRICS = [
  {
    label: "Locations deployed",
    value: 128,
    suffix: "+",
    description: "Active IXTAbox locations across the Nordics.",
  },
  {
    label: "Average install time",
    value: 42,
    suffix: " min",
    description: "From arrival on site to first booking ready.",
  },
  {
    label: "Fleet uptime",
    value: 99.4,
    suffix: "%",
    decimals: 1,
    description: "Remote monitoring keeps every stand online.",
  },
  {
    label: "Customer satisfaction",
    value: 97,
    suffix: "%", 
    description: "Based on post-rental experience surveys.",
  },
] as const;

const JOURNEY_STEPS = [
  {
    icon: "",
    title: "Browse availability",
    highlight: "Step 1",
    description:
      "Open the map, pick the stand closest to you, and check which IXTAbox sizes are free for your dates.",
  },
  {
    icon: "",
    title: "Reserve & schedule",
    highlight: "Step 2",
    description:
      "Choose your time window, add extras like racks or straps, and confirm the booking with secure checkout.",
  },
  {
    icon: "",
    title: "Mount in minutes",
    highlight: "Step 3",
    description:
      "Arrive at the stand, attach IXTAbox to your towbar using the guided checklist, and load at waist height—no ladders required.",
  },
  {
    icon: "🚗",
    title: "Drive & return",
    highlight: "Step 4",
    description:
      "Enjoy the trip with quieter, more efficient storage. Drop it back, run the quick inspection, and you’re done.",
  },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "IXTAbox helped us transform a sleepy parking lot into an always-on brand experience. Footfall doubled, and we now run paid workshops straight from the stand.",
    name: "Anna Lind",
    role: "Head of Retail Innovation",
    company: "Volta Mobility",
    highlight: "Booked out three months in advance",
    stats: ["+25% conversion vs. traditional pop-ups", "Zero downtime since installation"],
    initials: "AL",
  },
  {
    quote:
      "Our customers love the convenience. IXTAbox keeps gear safe, charged, and ready. Integrating with our CRM was surprisingly smooth, giving us clearer demand signals.",
    name: "Jonas Persson",
    role: "Commercial Director",
    company: "NordTrail Adventures",
    highlight: "70% repeat booking rate",
    stats: ["4.8/5 customer satisfaction per trip", "3 new markets launched in 90 days"],
    initials: "JP",
  },
  {
    quote:
      "The rollout playbook made the launch feel effortless. The analytics dashboard shows us precisely when to restock and how to price premium add-ons.",
    name: "Sara Holm",
    role: "Operations Lead",
    company: "UrbanMove Collective",
    highlight: "Premium offering sold out in 48 hours",
    stats: ["+18% basket size with accessories", "Live health checks every 5 minutes"],
    initials: "SH",
  },
] as const;


// Dynamic import with lazy loading - only loads when user scrolls near the map
const Map = dynamic<MapProps>(() => import("../../components/maps/googlemap"), {
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

// Hero background images to rotate through
const HERO_BACKGROUNDS = [
  "/images/background/back.jpg",
  "/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP1.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP2.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP3.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP4.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP5.jpg",
  "/images/background/2025_IXTAbox_Summer202543.jpg",
  "/images/background/BMW_i5_Golf_Leo_DSC2698.jpg",
] as const;

export default function GuestHome() {
  const [mounted, setMounted] = useState(false);
  const [locations, setLocations] = useState<MapProps["locations"]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [testimonialProgress, setTestimonialProgress] = useState(0);
  const [activeMetric, setActiveMetric] = useState(0);
  const [metricProgress, setMetricProgress] = useState(0);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  // const [showFilterForm, setShowFilterForm] = useState(false);
  // const [bookingFilter, setBookingFilter] = useState<BookingFilter>({
  //   startDate: '',
  //   endDate: '',
  //   boxModel: 'all',
  // });
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const autoplayStartRef = useRef<number | null>(null);
  const testimonialCount = Number(TESTIMONIALS.length);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  // Intersection Observer to lazy load map when user scrolls near it
  useEffect(() => {
    setMounted(true);
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadMap) {
            setShouldLoadMap(true);
          }
        });
      },
      { rootMargin: '400px' } // Start loading 400px before it comes into view
    );

    const mapSection = mapSectionRef.current;
    if (mapSection) {
      observer.observe(mapSection);
    }

    return () => {
      if (mapSection) {
        observer.unobserve(mapSection);
      }
    };
  }, [shouldLoadMap]);

  // Only load locations data when map should be loaded
  useEffect(() => {
    if (!shouldLoadMap) return;

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
  }, [shouldLoadMap]);

  useEffect(() => {
    if (testimonialCount === 0) return;

    let animationFrame: number;
    const duration = 7000;

    const tick = (timestamp: number) => {
      if (autoplayStartRef.current === null) {
        autoplayStartRef.current = timestamp;
      }

      const elapsed = timestamp - autoplayStartRef.current;
      const progress = Math.min(1, elapsed / duration);
      setTestimonialProgress(progress * 100);

      if (elapsed >= duration) {
        setActiveTestimonial((prev) => (prev + 1) % testimonialCount);
        autoplayStartRef.current = timestamp;
        setTestimonialProgress(0);
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      autoplayStartRef.current = null;
      cancelAnimationFrame(animationFrame);
    };
  }, [testimonialCount]);

  // Rotate metrics on mobile
  useEffect(() => {
    const metricCount: number = STAT_METRICS.length;

    let animationFrame: number;
    const duration = 3000; // 3 seconds per metric

    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      setMetricProgress(progress * 100);

      if (elapsed >= duration) {
        setActiveMetric((prev) => (prev + 1) % metricCount);
        startTime = timestamp;
        setMetricProgress(0);
      }

      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);

    return () => {
      startTime = null;
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  // Rotate hero background images
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBackgroundIndex((prev) => (prev + 1) % HERO_BACKGROUNDS.length);
    }, 8000); // Change background every 8 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSelectTestimonial = (index: number) => {
    setActiveTestimonial(index);
    setTestimonialProgress(0);
    autoplayStartRef.current = typeof performance !== "undefined" ? performance.now() : null;
  };

  const handleBookBoxClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    scrollToMap(e);
  };

  // const handleFilterChange = (filter: BookingFilter) => {
  //   setBookingFilter(filter);
  // };

  // Filter locations based on booking filter
  // const filteredLocations = useMemo(() => {
  //   if (!bookingFilter.startDate || !bookingFilter.endDate) {
  //     return locations;
  //   }

  //   return locations.filter((location) => {
  //     // Filter by status - only show available locations
  //     if (location.status !== 'available') {
  //       return false;
  //     }

  //     // Filter by model if specified
  //     if (bookingFilter.boxModel && bookingFilter.boxModel !== 'all') {
  //       const model = bookingFilter.boxModel === 'classic' ? 'classic' : 'pro';
  //       if (location.availableBoxes[model] === 0) {
  //         return false;
  //       }
  //     }

  //     // In a real app, you would check bookings API to see if boxes are available
  //     // for the selected date range. For now, we'll just filter by available count.
  //     return location.availableBoxes.total > 0;
  //   });
  // }, [locations, bookingFilter]);

  const activeStory = TESTIMONIALS[activeTestimonial] ?? TESTIMONIALS[0];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

  // Structured data for SEO
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "IXTAbox",
    "url": siteUrl,
    "logo": `${siteUrl}/images/logo/titleicon.webp`,
    "description": "Aerodynamic roof boxes, cargo boxes, and extra car storage rental service across Sweden and the Nordics",
    "sameAs": [
      // Add social media links if available
    ],
  };

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Roof Box Rental, Cargo Box Rental, Car Storage Rental",
    "provider": {
      "@type": "Organization",
      "name": "IXTAbox",
    },
    "areaServed": {
      "@type": "Country",
      "name": ["Sweden", "Norway", "Denmark", "Finland"],
    },
    "description": "Rent roof boxes, cargo boxes, and extra car storage solutions. Aerodynamic back-mounted design reduces drag and improves fuel efficiency. Perfect for travel, camping, and everyday storage needs.",
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "priceCurrency": "SEK",
    },
  };

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "IXTAbox Cargo Box - Roof Box & Extra Car Storage",
    "description": "Aerodynamic back-mounted cargo box and roof box engineered for reduced drag, better range, and quieter rides. Provides extra car storage for travel, camping, and everyday use.",
    "brand": {
      "@type": "Brand",
      "name": "IXTAbox",
    },
    "category": "Vehicle Storage, Roof Box, Car Storage",
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Type",
        "value": "Roof Box, Cargo Box, Car Storage"
      }
    ],
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "priceCurrency": "SEK",
    },
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <GuestHeader />
      <main className="">
        {/* Hero with background image */}
        <section
          className="relative flex items-center justify-center overflow-hidden animate-fadeIn"
          style={{ minHeight: 560 }}
        >
          {/* Background images with fade transition */}
          {HERO_BACKGROUNDS.map((bg, index) => (
            <div
              key={bg}
              className="absolute inset-0 bg-center bg-cover transition-opacity ease-in-out"
              style={{
                backgroundImage: `url(${bg})`,
                opacity: index === currentBackgroundIndex ? 1 : 0,
                zIndex: index === currentBackgroundIndex ? 1 : 0,
                transitionDuration: '2s',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 z-10" />
          <div className="absolute inset-0 z-10">
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
            <div className="absolute -right-32 bottom-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          </div>
          <FadeInSection className="relative z-20 mx-auto max-w-5xl px-6 py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
              Swedish craftmanship
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              Rear Cargo Box,
              <span className="bg-gradient-to-r from-cyan-300 via-white to-cyan-200 bg-clip-text text-transparent">
                {" "}
                redefined for life & adventure
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-200/90">
              IXTAbox is now available for rent. Get extra storage without the hassle of a roof box.
              It mounts to your towbar in minutes, mounted at a comfortable height, and keeps your gear
              within easy reach. Perfect for trips, sports, camping, or everyday activities.
            </p>


            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#videos"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-8 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.55)] transition-all hover:-translate-y-[1px] hover:bg-cyan-400"
              >
                See how it works
              </a>
              <a
                href="#map"
                onClick={handleBookBoxClick}
                className="inline-flex items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-8 py-3 text-base font-semibold text-cyan-200 transition-all hover:-translate-y-[1px] hover:bg-cyan-500/20 hover:text-white"
              >
                Book a box
              </a>
            </div>
          </FadeInSection>
        </section>

        <FadeInSection>
          <section className="mx-auto max-w-6xl px-3 sm:px-6 py-8 sm:py-16">
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-10 shadow-[0_25px_120px_rgba(15,23,42,0.45)] backdrop-blur">
              {/* Mobile: Show one metric at a time with rotation */}
              <div className="block sm:hidden relative min-h-[200px]">
                {STAT_METRICS.map((metric, index) => {
                  const decimals = "decimals" in metric ? metric.decimals ?? 0 : 0;
                  const isActive = index === activeMetric;
                  return (
                    <div
                      key={metric.label}
                      className={`absolute inset-0 flex flex-col gap-3 transition-all duration-700 ease-in-out ${
                        isActive 
                          ? "opacity-100 translate-y-0 pointer-events-auto" 
                          : "opacity-0 translate-y-4 pointer-events-none"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                          {String(index + 1).padStart(2, "0")} • {metric.label}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                          {String(index + 1).padStart(2, "0")} / {String(STAT_METRICS.length).padStart(2, "0")}
                        </span>
                      </div>
                      <AnimatedCounter
                        value={metric.value}
                        suffix={metric.suffix}
                        decimals={decimals}
                        className="text-4xl font-black text-white"
                      />
                      <p className="text-sm text-gray-300/90">{metric.description}</p>
                      <div className="h-1 w-full rounded-full bg-white/10 mt-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-white transition-[width] duration-100 ease-linear"
                          style={{ width: `${metricProgress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop: Show all metrics */}
              <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-10">
                {STAT_METRICS.map((metric, index) => {
                  const decimals = "decimals" in metric ? metric.decimals ?? 0 : 0;
                  return (
                    <div key={metric.label} className="flex flex-col gap-3">
                      <span className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                        {String(index + 1).padStart(2, "0")} • {metric.label}
                      </span>
                      <AnimatedCounter
                        value={metric.value}
                        suffix={metric.suffix}
                        decimals={decimals}
                        className="text-4xl md:text-5xl font-black text-white"
                      />
                      <p className="text-sm text-gray-300/90">{metric.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Map section – relative z-10 so Benefits never overlays the map */}
        <FadeInSection className="relative z-10">
        <section id="map" ref={mapSectionRef} className="px-6 py-12">
          {!isMapFullscreen && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold">Find Our Locations</h2>
            {/* {!showFilterForm && (
              <button
                onClick={() => {
                  setShowFilterForm(true);
                  setTimeout(() => {
                    const mapElement = document.getElementById('map');
                    if (mapElement) {
                      mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/60 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-all hover:-translate-y-[1px] hover:bg-cyan-500/20 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter Locations
              </button>
             )} */}
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
                onFullscreenChange={setIsMapFullscreen}
                // filterForm={
                //   showFilterForm ? (
                //     <BookingFilterForm
                //       onFilterChange={handleFilterChange}
                //       onClose={() => setShowFilterForm(false)}
                //       isMapOverlay={true}
                //     />
                //   ) : undefined
                // }
                // filterValues={{
                //   startDate: bookingFilter.startDate,
                //   endDate: bookingFilter.endDate,
                //   boxModel: bookingFilter.boxModel,
                // }}
              />
            ) : null}
          </div>
        </section>
        </FadeInSection>

        {/* Three pillars */}
        <FadeInSection>
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
        </FadeInSection>

        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-12 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-cyan-200">
                  your journey
                </span>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">
                  From idea to on-site experience IXTAbox keeps the momentum.
                </h2>
                <p className="mt-3 text-gray-300/90">
                  Every deployment follows a tested playbook. Work with our launch team or plug into
                  your own operations and unlock new revenue in days.
                </p>
              </div>
              <div className="space-y-6">
                {JOURNEY_STEPS.map((step, idx) => (
                  <div
                    key={step.title}
                    className="relative flex gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 shadow-[0_16px_60px_rgba(8,47,73,0.25)]"
                  >
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-cyan-500/20 text-xl">
                      {step.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">
                          {step.highlight}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300/90">{step.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-gray-400/70">
                        <span className="h-[1px] w-6 bg-cyan-400/40" />
                        Step {idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Videos Section */}
        <FadeInSection>
<section id="videos" className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
  <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">IXTAbox Tutorials</h2>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Video 1 */}
    <div className="relative overflow-hidden rounded-lg shadow-md border border-white/10 transform transition-transform hover:scale-105 duration-300">
      <div className="aspect-[9/16] sm:aspect-video">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/IbOvWJSCvVQ"
          title="IXTAbox - MOUNTING AND DISMOUNTING - Backbox Tutorials"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>

    {/* Video 2 */}
    <div className="relative overflow-hidden rounded-lg shadow-md border border-white/10 transform transition-transform hover:scale-105 duration-300">
      <div className="aspect-[16/9] sm:aspect-video">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/haZaoAEw23c"
          title="Packa För Äventyr med IXTAbox"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>

    {/* Video 3 */}
    <div className="relative overflow-hidden rounded-lg shadow-md border border-white/10 transform transition-transform hover:scale-105 duration-300">
      <div className="aspect-[9/16] sm:aspect-video">
        <iframe
          className="w-full h-full"
          src="https://www.youtube.com/embed/ELLwTaNqxgg"
          title="IXTAbox - ADJUSTING THE HEIGHT - Backbox Tutorials"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  </div>
</section>
        </FadeInSection>


        <FadeInSection>
          <section className="px-6 py-16">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/60 to-cyan-900/50 p-10 shadow-[0_25px_120px_rgba(8,97,164,0.25)] backdrop-blur">
              <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex flex-col gap-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200">
                    customer stories
                  </span>
                  <blockquote className="text-2xl font-semibold text-white md:text-3xl">
                    “{activeStory.quote}”
                  </blockquote>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300/90">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-base font-semibold text-white">
                        {activeStory.initials}
                      </span>
                      <div>
                        <p className="font-semibold text-white">
                          {activeStory.name} · {activeStory.role}
                        </p>
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-400/90">
                          {activeStory.company}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200">
                      {activeStory.highlight}
                    </span>
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {activeStory.stats.map((stat) => (
                      <li
                        key={stat}
                        className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200"
                      >
                        <span className="h-2 w-2 rounded-full bg-cyan-300" />
                        {stat}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-gray-400/80">hear more</p>
                    <p className="mt-2 text-base text-gray-300/90">
                      Rotate through real deployments to learn how teams grow revenue, improve CX,
                      and operate at scale with IXTAbox.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      {TESTIMONIALS.map((testimonial, idx) => (
                        <button
                          key={testimonial.initials}
                          type="button"
                          onClick={() => handleSelectTestimonial(idx)}
                          className={`h-10 w-10 rounded-full border transition-all focus:outline-none ${
                            idx === activeTestimonial
                              ? "border-cyan-300 bg-cyan-500/30 text-white"
                              : "border-white/10 bg-white/5 text-gray-300 hover:border-cyan-300/60"
                          }`}
                        >
                          {testimonial.initials}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-gray-400/80">
                      {String(activeTestimonial + 1).padStart(2, "0")} /{" "}
                      {String(testimonialCount).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-white transition-[width]"
                      style={{ width: `${testimonialProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Full-bleed background section */}
        <FadeInSection>
        <section className="relative overflow-hidden" style={{ minHeight: 420 }}>
          {/* Lazy loaded optimized background */}
          <Image
            src="/images/background/DSCF3859.jpg"
            alt="IXTAbox Features Background"
            fill
            quality={75}
            sizes="100vw"
            className="object-cover object-center"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA5QAAAAA//2Q=="
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 z-10" />
          <div className="relative z-20 mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-3xl sm:text-4xl font-bold"><center>Adventure Ready</center></h2>
           <center>
             <p className="mt-3 text-gray-200">
              For family trips, sports, or professionals-room for bikes, skis, tools, and more.
            </p>
            </center>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-200">
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">LED lighting in and out (Pro)</li>
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Crash‑tested fixation device (Pro)</li>
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Optional 12V outlet and handles</li>
              <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Durable, weather‑ready design</li>
            </ul>
          </div>
        </section>
        </FadeInSection>

        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-8 shadow-[0_0_24px_rgba(34,211,238,0.25)] text-center">
              <h3 className="text-2xl font-bold">Improved Aerodynamics</h3>
              <p className="mt-2 text-gray-200">
                Reduce drag compared to traditional roof boxes and get better range.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-6">
                <span className="rounded-full bg-white/10 px-6 py-2 text-base">Lower turbulence behind car</span>
                <span className="rounded-full bg-white/10 px-6 py-2 text-base">Up to better efficiency</span>
                <span className="rounded-full bg-white/10 px-6 py-2 text-base">Quieter rides</span>
              </div>
            </div>
          </section>
        </FadeInSection>


        {/* Gallery strip with subtle animation */}
        <FadeInSection>
          <section className="px-6 py-12">
          <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
              <Image 
                src="/images/background/2024_CRDbag_X_IXTAbox_18.jpg" 
                alt="IXTAbox x CRDBAG" 
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover scale-100 hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
              <Image 
                src="/images/background/How_fast_can_you_pack_Thumbnail_500x.jpg" 
                alt="Fast packing" 
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover scale-100 hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
              <Image 
                src="/images/background/DSCF3859.jpg" 
                alt="Adventure ready" 
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover scale-100 hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
          </section>
        </FadeInSection>

        {/* CTA footer */}
        <FadeInSection>
          <section className="px-6 pb-16">
          <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h3 className="text-2xl font-bold">Ready to elevate your storage?</h3>
            <p className="mt-2 text-gray-300">Join the IXTAbox journey and pack it all-smart, safe, and in style.</p>
            <div className="mt-6 flex justify-center">
              <a href="/auth/register" className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white hover:bg-cyan-400 transition-colors shadow-[0_0_24px_rgba(34,211,238,0.45)]">
                Get Started
              </a>
            </div>
          </div>
          </section>
        </FadeInSection>
      </main>
      <Footer />
    </div>
  );
}
