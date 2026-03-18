"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import GuestHeader from "@/components/layouts/GuestHeader";
import { LocationModalProvider } from "@/contexts/LocationModalContext";
import FadeInSection from "@/components/animations/FadeInSection";
import AnimatedCounter from "@/components/animations/AnimatedCounter";
import Link from "next/link";
import { scrollToMap } from "@/utils/scrollToMap";

const Footer = dynamic(() => import("@/components/layouts/Footer"), { ssr: true });

const IxtaownerMap = dynamic(() => import("@/components/maps/IxtaownerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] w-full items-center justify-center text-gray-300 animate-pulse">
      <div className="text-center">
        <div className="relative inline-block mb-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500/20 border-t-cyan-500" />
        </div>
        <p className="text-lg">Loading map...</p>
      </div>
    </div>
  ),
});

const STAT_METRICS = [
  { label: "IXTAowners listed", value: 8, suffix: "+", description: "People who own IXTAboxes and rent them out." },
  { label: "Coverage areas", value: 12, suffix: "+", description: "Vague areas on the map where boxes are available." },
  { label: "Cities covered", value: 6, suffix: "+", description: "Stockholm, Gothenburg, Malmö, Uppsala, and more." },
  { label: "Customer satisfaction", value: 96, suffix: "%", description: "Based on post-rental experience surveys." },
] as const;

const JOURNEY_STEPS_OWNER = [
  { icon: "📍", title: "Choose your location", highlight: "Step 1", description: "Choose your area on the map. A vague coverage zone protects your privacy while letting renters find you." },
  { icon: "📅", title: "Set availability & pricing", highlight: "Step 2", description: "Define when your box is available and how much to charge. You control your rental calendar." },
  { icon: "💰", title: "Get paid when they book", highlight: "Step 3", description: "Customers pay online. After payment, they receive your contact info to arrange pickup and return." },
  { icon: "🤝", title: "Coordinate handover", highlight: "Step 4", description: "Meet the renter, hand over the box, and get it back when they return. Simple and direct." },
] as const;

const JOURNEY_STEPS_CUSTOMER = [
  { icon: "🗺️", title: "Find boxes on the map", highlight: "Step 1", description: "Large coverage areas show where IXTAowners are. Pick an area near you to see available boxes." },
  { icon: "💳", title: "Pay online", highlight: "Step 2", description: "Secure checkout. Once paid, you receive the IXTAowner's contact details." },
  { icon: "📱", title: "Arrange pickup", highlight: "Step 3", description: "Contact the owner to coordinate when and where to pick up and return the box." },
  { icon: "🚗", title: "Mount and go", highlight: "Step 4", description: "Same IXTAbox experience—mount at waist height, load your gear, enjoy the trip." },
] as const;

const TESTIMONIALS = [
  { quote: "I bought an IXTAbox for my family and it sat unused most of the year. Now I rent it out and earn back the cost. The vague location on the map keeps my address private.", name: "Erik S.", role: "IXTAowner", company: "Stockholm", highlight: "Earns ~2,000 SEK/month", stats: ["No extra work", "Contact only after payment"], initials: "ES" },
  { quote: "Rented from a local owner for our ski trip. Super easy—paid online, met at a parking lot, mounted the box in minutes. Way better than buying one we'd use twice a year.", name: "Maria L.", role: "Customer", company: "Gothenburg", highlight: "Smooth handover", stats: ["2-day rental", "Perfect condition"], initials: "ML" },
  { quote: "As an IXTAowner, I love the flexibility. I block dates when I need the box myself and open it when I don't. The platform handles payments so I don't worry about that.", name: "Johan K.", role: "IXTAowner", company: "Uppsala", highlight: "Full control", stats: ["5 rentals so far", "Zero issues"], initials: "JK" },
] as const;

const HERO_BACKGROUNDS = [
  "/images/background/back.jpg",
  "/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP1.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP2.jpg",
  "/images/background/2025_IXTA_LIFESTYLE_SLIDESHOW_CROP3.jpg",
  "/images/background/DSCF3859.jpg",
] as const;

export default function IxtaownerPage() {
  const [mounted, setMounted] = useState(false);
  const [chosenLocation, setChosenLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [testimonialProgress, setTestimonialProgress] = useState(0);
  const [activeMetric, setActiveMetric] = useState(0);
  const [metricProgress, setMetricProgress] = useState(0);
  const [currentBackgroundIndex, setCurrentBackgroundIndex] = useState(0);
  const [heroVisibleLayer, setHeroVisibleLayer] = useState(0);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const autoplayStartRef = useRef<number | null>(null);

  const handleLocationChosen = useCallback((lat: number, lng: number) => {
    setChosenLocation({ lat, lng });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-hide-scrollbar", "true");
    return () => document.documentElement.removeAttribute("data-hide-scrollbar");
  }, []);

  useEffect(() => {
    setMounted(true);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoadMap) setShouldLoadMap(true);
        });
      },
      { rootMargin: "400px" }
    );
    const mapSection = mapSectionRef.current;
    if (mapSection) observer.observe(mapSection);
    return () => { if (mapSection) observer.unobserve(mapSection); };
  }, [shouldLoadMap]);

  useEffect(() => {
    let animationFrame: number;
    const duration = 7000;
    let lastProgressUpdate = 0;
    const tick = (timestamp: number) => {
      if (autoplayStartRef.current === null) autoplayStartRef.current = timestamp;
      const elapsed = timestamp - autoplayStartRef.current;
      const progress = Math.min(1, elapsed / duration);
      if (timestamp - lastProgressUpdate >= 80) {
        lastProgressUpdate = timestamp;
        setTestimonialProgress(progress * 100);
      }
      if (elapsed >= duration) {
        setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
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
  }, []);

  useEffect(() => {
    const metricCount = STAT_METRICS.length;
    let animationFrame: number;
    const duration = 3000;
    let startTime: number | null = null;
    let lastProgressUpdate = 0;
    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      if (timestamp - lastProgressUpdate >= 80) {
        lastProgressUpdate = timestamp;
        setMetricProgress(progress * 100);
      }
      if (elapsed >= duration) {
        setActiveMetric((prev) => (prev + 1) % metricCount);
        startTime = timestamp;
        setMetricProgress(0);
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => { startTime = null; cancelAnimationFrame(animationFrame); };
  }, []);

  const heroCount = HERO_BACKGROUNDS.length;
  const nextBgIndex = (currentBackgroundIndex + 1) % heroCount;
  const nextNextBgIndex = (currentBackgroundIndex + 2) % heroCount;

  useEffect(() => {
    const img1 = new window.Image();
    img1.src = HERO_BACKGROUNDS[nextBgIndex];
    const img2 = new window.Image();
    img2.src = HERO_BACKGROUNDS[nextNextBgIndex];
  }, [nextBgIndex, nextNextBgIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBackgroundIndex((prev) => (prev + 1) % heroCount);
      setHeroVisibleLayer((v) => 1 - v);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroCount]);

  const handleSelectTestimonial = (index: number) => {
    setActiveTestimonial(index);
    setTestimonialProgress(0);
    autoplayStartRef.current = typeof performance !== "undefined" ? performance.now() : null;
  };

  const activeStory = TESTIMONIALS[activeTestimonial] ?? TESTIMONIALS[0];

  return (
    <LocationModalProvider>
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      <main>
        {/* Hero */}
        <section className="relative flex items-center justify-center overflow-hidden animate-fadeIn min-h-screen">
          <div
            className="absolute inset-0 bg-image-fill-screen transition-opacity duration-[2s] ease-in-out"
            style={{
              backgroundImage: `url(${HERO_BACKGROUNDS[heroVisibleLayer === 0 ? currentBackgroundIndex : nextBgIndex]})`,
              opacity: heroVisibleLayer === 0 ? 1 : 0,
              zIndex: heroVisibleLayer === 0 ? 1 : 0,
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-image-fill-screen transition-opacity duration-[2s] ease-in-out"
            style={{
              backgroundImage: `url(${HERO_BACKGROUNDS[heroVisibleLayer === 1 ? currentBackgroundIndex : nextBgIndex]})`,
              opacity: heroVisibleLayer === 1 ? 1 : 0,
              zIndex: heroVisibleLayer === 1 ? 1 : 0,
            }}
            aria-hidden
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 z-10" />
          <div className="absolute inset-0 z-10">
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
            <div className="absolute -right-32 bottom-16 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          </div>
          <FadeInSection className="relative z-20 mx-auto max-w-5xl px-6 py-24 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 border border-amber-400/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">
              Coming soon
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              IXTAowner
              <span className="block mt-2 bg-gradient-to-r from-cyan-300 via-white to-amber-200 bg-clip-text text-transparent">
                Own an IXTAbox? Rent it out.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-200/90">
              IXTAowners are people who own IXTAboxes and rent them to others. Customers find boxes on the map, pay online, and get your contact info after payment to coordinate pickup and return.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#map"
                onClick={(e) => scrollToMap(e)}
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-8 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.55)] transition-all hover:-translate-y-[1px] hover:bg-cyan-400"
              >
                Find IXTAowners
              </a>
              <Link
                href="/ixtaowner/post"
                className="inline-flex items-center justify-center rounded-full border border-amber-500/60 bg-amber-500/10 px-8 py-3 text-base font-semibold text-amber-200 transition-all hover:-translate-y-[1px] hover:bg-amber-500/20 hover:text-white"
              >
                Post your box
              </Link>
              <a
                href="#benefits"
                className="inline-flex items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-8 py-3 text-base font-semibold text-cyan-200 transition-all hover:-translate-y-[1px] hover:bg-cyan-500/20 hover:text-white"
              >
                How it works
              </a>
            </div>
          </FadeInSection>
        </section>

        {/* Stats metrics */}
        <FadeInSection>
          <section className="mx-auto max-w-6xl px-3 sm:px-6 py-8 sm:py-16">
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-4 sm:p-10 shadow-[0_25px_120px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="block sm:hidden relative min-h-[200px]">
                {STAT_METRICS.map((metric, index) => {
                  const isActive = index === activeMetric;
                  return (
                    <div
                      key={metric.label}
                      className={`absolute inset-0 flex flex-col gap-3 transition-all duration-700 ease-in-out ${
                        isActive ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
                      }`}
                    >
                      <span className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">{String(index + 1).padStart(2, "0")} • {metric.label}</span>
                      <AnimatedCounter value={metric.value} suffix={metric.suffix} className="text-4xl font-black text-white" />
                      <p className="text-sm text-gray-300/90">{metric.description}</p>
                      <div className="h-1 w-full rounded-full bg-white/10 mt-2">
                        <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-white transition-[width] duration-100 ease-linear" style={{ width: `${metricProgress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="hidden sm:grid sm:grid-cols-2 xl:grid-cols-4 gap-10">
                {STAT_METRICS.map((metric, index) => (
                  <div key={metric.label} className="flex flex-col gap-3">
                    <span className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">{String(index + 1).padStart(2, "0")} • {metric.label}</span>
                    <AnimatedCounter value={metric.value} suffix={metric.suffix} className="text-4xl md:text-5xl font-black text-white" />
                    <p className="text-sm text-gray-300/90">{metric.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Map section */}
        <FadeInSection className={`relative z-10 m-0 p-0 h-[calc(100vh-80px)] min-h-[calc(100vh-80px)] ${isMapFullscreen ? "!transform-none" : ""}`}>
          <section
            id="map"
            ref={mapSectionRef}
            className="relative w-full h-full min-h-0 m-0 p-0 flex flex-col block"
            style={{ height: "calc(100vh - 80px)", minHeight: "calc(100vh - 80px)", scrollMarginTop: "80px" }}
          >
            {!isMapFullscreen && (
              <div className="absolute top-2 left-2 z-[2] pointer-events-none shrink-0">
                <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">Find IXTAowner Locations</h2>
              </div>
            )}
            <div
              className={`w-full flex-1 min-h-0 relative m-0 p-0 ${!isMapFullscreen ? "overflow-hidden" : ""}`}
              style={{ transform: isMapFullscreen ? "none" : "translateZ(0)", contain: isMapFullscreen ? "none" : "layout paint" }}
              suppressHydrationWarning
            >
              {mounted && shouldLoadMap ? (
                <IxtaownerMap
                  onLocationChosen={handleLocationChosen}
                  chosenLocation={chosenLocation}
                  fillViewport
                  onFullscreenChange={setIsMapFullscreen}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">Loading map…</div>
              )}
            </div>
          </section>
        </FadeInSection>

        {/* Three pillars */}
        <FadeInSection className="relative z-0">
          <section id="benefits" className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <div className="text-amber-300 mb-2">For owners</div>
                <h3 className="text-xl font-semibold">Earn from your box</h3>
                <p className="text-gray-300 mt-2">List your IXTAbox, set your price, and get paid when renters book. Your exact address stays private until after payment.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <div className="text-cyan-300 mb-2">For renters</div>
                <h3 className="text-xl font-semibold">Rent from locals</h3>
                <p className="text-gray-300 mt-2">Find IXTAboxes near you on the map. Pay online, get contact details, and coordinate pickup directly with the owner.</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors">
                <div className="text-cyan-300 mb-2">Privacy first</div>
                <h3 className="text-xl font-semibold">Vague locations</h3>
                <p className="text-gray-300 mt-2">Each box shows a coverage area on the map—never an exact address. Contact info is shared only after payment.</p>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Journey – owners */}
        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-12 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <span className="inline-flex items-center rounded-full border border-amber-400/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-amber-200">For IXTAowners</span>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">List your box and earn.</h2>
                <p className="mt-3 text-gray-300/90">Choose your location on the map, set availability and pricing, and let renters find you. Contact details are shared only after they pay.</p>
              </div>
              <div className="space-y-6">
                {JOURNEY_STEPS_OWNER.map((step, idx) => (
                  <div key={step.title} className="relative flex gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 shadow-[0_16px_60px_rgba(8,47,73,0.25)]">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-amber-500/20 text-xl">{step.icon}</div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">{step.highlight}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300/90">{step.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-gray-400/70">
                        <span className="h-[1px] w-6 bg-amber-400/40" /> Step {idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Journey – customers */}
        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid gap-12 lg:grid-cols-[320px_minmax(0,1fr)]">
              <div>
                <span className="inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.3em] text-cyan-200">For customers</span>
                <h2 className="mt-4 text-3xl font-bold text-white md:text-4xl">Find, pay, pick up.</h2>
                <p className="mt-3 text-gray-300/90">Browse coverage areas on the map, pick an IXTAbox near you, pay securely, and coordinate directly with the owner for pickup and return.</p>
              </div>
              <div className="space-y-6">
                {JOURNEY_STEPS_CUSTOMER.map((step, idx) => (
                  <div key={step.title} className="relative flex gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 shadow-[0_16px_60px_rgba(8,47,73,0.25)]">
                    <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-cyan-500/20 text-xl">{step.icon}</div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/90">{step.highlight}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300/90">{step.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-[11px] uppercase tracking-[0.3em] text-gray-400/70">
                        <span className="h-[1px] w-6 bg-cyan-400/40" /> Step {idx + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Videos */}
        <FadeInSection>
          <section id="videos" className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">IXTAbox Tutorials</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative overflow-hidden rounded-lg shadow-md border border-white/10 transform transition-transform hover:scale-105 duration-300">
                <div className="aspect-[9/16] sm:aspect-video">
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/IbOvWJSCvVQ" title="IXTAbox - MOUNTING AND DISMOUNTING" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                </div>
              </div>
              <div className="relative overflow-hidden rounded-lg shadow-md border border-white/10 transform transition-transform hover:scale-105 duration-300">
                <div className="aspect-[16/9] sm:aspect-video">
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/haZaoAEw23c" title="Packa För Äventyr med IXTAbox" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                </div>
              </div>
              <div className="relative overflow-hidden rounded-lg shadow-md border border-white/10 transform transition-transform hover:scale-105 duration-300">
                <div className="aspect-[9/16] sm:aspect-video">
                  <iframe className="w-full h-full" src="https://www.youtube.com/embed/ELLwTaNqxgg" title="IXTAbox - ADJUSTING THE HEIGHT" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Testimonials */}
        <FadeInSection>
          <section className="px-6 py-16">
            <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/60 to-amber-900/30 p-10 shadow-[0_25px_120px_rgba(8,97,164,0.25)] backdrop-blur">
              <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_280px]">
                <div className="flex flex-col gap-6">
                  <span className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">IXTAowner stories</span>
                  <blockquote className="text-2xl font-semibold text-white md:text-3xl">&quot;{activeStory.quote}&quot;</blockquote>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300/90">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-base font-semibold text-white">{activeStory.initials}</span>
                      <div>
                        <p className="font-semibold text-white">{activeStory.name} · {activeStory.role}</p>
                        <p className="text-xs uppercase tracking-[0.25em] text-gray-400/90">{activeStory.company}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-amber-200">{activeStory.highlight}</span>
                  </div>
                  <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {activeStory.stats.map((stat) => (
                      <li key={stat} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-200">
                        <span className="h-2 w-2 rounded-full bg-amber-300" /> {stat}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col justify-between gap-6">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-gray-400/80">Hear more</p>
                    <p className="mt-2 text-base text-gray-300/90">Stories from IXTAowners and customers who rent from them.</p>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                      {TESTIMONIALS.map((t, idx) => (
                        <button key={t.initials} type="button" onClick={() => handleSelectTestimonial(idx)} className={`h-10 w-10 rounded-full border transition-all focus:outline-none ${idx === activeTestimonial ? "border-amber-300 bg-amber-500/30 text-white" : "border-white/10 bg-white/5 text-gray-300 hover:border-amber-300/60"}`}>{t.initials}</button>
                      ))}
                    </div>
                    <div className="text-xs uppercase tracking-[0.3em] text-gray-400/80">{String(activeTestimonial + 1).padStart(2, "0")} / {String(TESTIMONIALS.length).padStart(2, "0")}</div>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-white transition-[width]" style={{ width: `${testimonialProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Adventure Ready */}
        <FadeInSection>
          <section className="relative overflow-hidden min-h-screen min-h-[100dvh]">
            <Image src="/images/background/DSCF3859.jpg" alt="IXTAbox" fill quality={75} sizes="100vw" className="object-cover object-center" loading="lazy" placeholder="blur" blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA5QAAAAA//2Q==" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/60 z-10" />
            <div className="relative z-20 mx-auto max-w-5xl px-6 py-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-center">Adventure Ready</h2>
              <p className="mt-3 text-center text-gray-200">Same IXTAbox quality—whether you rent from a stand or from a local IXTAowner.</p>
              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-200">
                <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">LED lighting in and out (Pro)</li>
                <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Crash‑tested fixation device (Pro)</li>
                <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Optional 12V outlet and handles</li>
                <li className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">Durable, weather‑ready design</li>
              </ul>
            </div>
          </section>
        </FadeInSection>

        {/* Aerodynamics */}
        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-8 shadow-[0_0_24px_rgba(34,211,238,0.25)] text-center">
              <h3 className="text-2xl font-bold">Improved Aerodynamics</h3>
              <p className="mt-2 text-gray-200">Reduce drag compared to traditional roof boxes and get better range.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-6">
                <span className="rounded-full bg-white/10 px-6 py-2 text-base">Lower turbulence behind car</span>
                <span className="rounded-full bg-white/10 px-6 py-2 text-base">Better efficiency</span>
                <span className="rounded-full bg-white/10 px-6 py-2 text-base">Quieter rides</span>
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* Gallery */}
        <FadeInSection>
          <section className="px-6 py-12">
            <div className="mx-auto max-w-7xl grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
                <Image src="/images/background/2024_CRDbag_X_IXTAbox_18.jpg" alt="IXTAbox x CRDBAG" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover scale-100 hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
                <Image src="/images/background/How_fast_can_you_pack_Thumbnail_500x.jpg" alt="Fast packing" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover scale-100 hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="relative h-52 rounded-xl overflow-hidden border border-white/10">
                <Image src="/images/background/DSCF3859.jpg" alt="Adventure ready" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover scale-100 hover:scale-105 transition-transform duration-500" />
              </div>
            </div>
          </section>
        </FadeInSection>

        {/* CTA */}
        <FadeInSection>
          <section className="px-6 pb-16">
            <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <h3 className="text-2xl font-bold">Ready to list your IXTAbox?</h3>
              <p className="mt-2 text-gray-300">Add your location, set your price, and get paid when renters book. Your address stays private until after payment.</p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/ixtaowner/post" className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-base font-semibold text-white hover:bg-amber-400 transition-colors shadow-[0_0_24px_rgba(245,158,11,0.4)]">Post your box</Link>
                <Link href="/" className="inline-flex items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-6 py-3 text-base font-semibold text-cyan-200 hover:bg-cyan-500/20 hover:text-white transition-colors">Back to Home</Link>
              </div>
            </div>
          </section>
        </FadeInSection>
      </main>
      <Footer />
    </div>
    </LocationModalProvider>
  );
}
