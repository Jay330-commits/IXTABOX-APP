"use client";

import GuestHeader from "@/components/layouts/GuestHeader";
import Footer from "@/components/layouts/Footer";
import FadeInSection from "@/components/animations/FadeInSection";
import Link from "next/link";
import { useState, useRef } from "react";
import LiveChat, { LiveChatHandle } from "@/components/customers/LiveChat";

const FAQ_ITEMS = [
  {
    question: "How do I book an IXTAbox?",
    answer: "Simply click 'Book IXTAbox' in the header, select your location on the map, choose your dates and box model, then complete the secure checkout process. You'll receive a confirmation email with all the details.",
  },
  {
    question: "What sizes are available?",
    answer: "We offer two models: IXTAbox Pro 175 (175 cm) and IXTAbox Pro 190 (190 cm). Both models provide ample storage space for your gear, sports equipment, or luggage.",
  },
  {
    question: "How do I mount the IXTAbox?",
    answer: "The IXTAbox mounts to your vehicle's towbar in minutes. We provide a step-by-step guide and video tutorials. The box mounts at a comfortable height, making loading and unloading easy without ladders.",
  },
  {
    question: "What if I need to cancel my booking?",
    answer: "You can cancel your booking through the 'Your Bookings' section. Cancellation policies vary based on how close to your booking date you cancel. Check your booking confirmation email for specific terms.",
  },
  {
    question: "Is the IXTAbox weatherproof?",
    answer: "Yes, the IXTAbox is designed to withstand harsh weather conditions. It features a durable, weather-ready design that keeps your belongings safe and dry.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit and debit cards through our secure payment system. Payment is processed securely and you'll receive a receipt via email.",
  },
  {
    question: "Can I extend my rental period?",
    answer: "Yes, if the box is available for extended dates, you can extend your rental through the 'Your Bookings' section. Additional charges will apply for the extended period.",
  },
  {
    question: "What should I do if I encounter an issue?",
    answer: "If you experience any problems with your booking or the IXTAbox, please contact our support team immediately. You can reach us through this support page or via the contact information in your booking confirmation.",
  },
] as const;

const CONTACT_METHODS = [
  {
    icon: "📧",
    title: "Email Support",
    description: "Get help via email",
    contact: "support@ixtabox.com",
    action: "mailto:support@ixtabox.com",
  },
  {
    icon: "💬",
    title: "Live Chat",
    description: "Chat with our team",
    contact: "Available 9 AM - 6 PM CET",
    action: "#",
  },
  {
    icon: "📞",
    title: "Phone Support",
    description: "Speak directly with us",
    contact: "+46 10 123 45 67",
    action: "tel:+46101234567",
  },
] as const;

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const liveChatRef = useRef<LiveChatHandle>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <GuestHeader />
      <main>
        {/* Hero Section */}
        <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: 400 }}>
          {/* Background image */}
          <div
            className="absolute inset-0 bg-center bg-cover"
            style={{
              backgroundImage: "url(/images/background/back.jpg)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80 z-10" />
          <div className="absolute inset-0 z-10">
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl animate-pulse" />
            <div className="absolute -right-32 bottom-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          </div>
          <FadeInSection className="relative z-20 mx-auto max-w-5xl px-6 py-24 text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-cyan-300 via-white to-cyan-200 bg-clip-text text-transparent">
                Support Center
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-200/90">
              We&apos;re here to help. Find answers to common questions or get in touch with our support team.
            </p>
          </FadeInSection>
        </section>

        {/* Contact Methods */}
        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <h2 className="text-3xl font-bold text-center mb-12">Get in Touch</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CONTACT_METHODS.map((method, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors text-center cursor-pointer"
                  onClick={() => {
                    if (method.title === 'Live Chat') {
                      // Open the live chat directly
                      liveChatRef.current?.openChat();
                    } else {
                      window.location.href = method.action;
                    }
                  }}
                >
                  <div className="text-4xl mb-4">{method.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{method.title}</h3>
                  <p className="text-gray-300/80 text-sm mb-3">{method.description}</p>
                  <p className="text-cyan-300 font-medium">{method.contact}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>

        {/* FAQ Section */}
        <FadeInSection>
          <section className="mx-auto max-w-4xl px-6 py-16">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <span className="font-semibold text-lg pr-4">{item.question}</span>
                    <svg
                      className={`w-5 h-5 flex-shrink-0 text-cyan-300 transition-transform ${
                        openFaq === index ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === index && (
                    <div className="px-6 pb-4 pt-2 text-gray-300/90 border-t border-white/10">
                      <p>{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </FadeInSection>

        {/* Help Section */}
        <FadeInSection>
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-8 shadow-[0_0_24px_rgba(34,211,238,0.25)] text-center">
              <h3 className="text-2xl font-bold mb-4">Still Need Help?</h3>
              <p className="text-gray-200 mb-6">
                Can&apos;t find what you&apos;re looking for? Our support team is ready to assist you.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="mailto:support@ixtabox.com"
                  className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-6 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.55)] transition-all hover:-translate-y-[1px] hover:bg-cyan-400"
                >
                  Contact Support
                </a>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-cyan-500/60 bg-cyan-500/10 px-6 py-3 text-base font-semibold text-cyan-200 transition-all hover:-translate-y-[1px] hover:bg-cyan-500/20 hover:text-white"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </section>
        </FadeInSection>
      </main>
      <Footer />
      <LiveChat ref={liveChatRef} />
    </div>
  );
}

