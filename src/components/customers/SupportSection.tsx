'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import FadeInSection from '@/components/animations/FadeInSection';

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

const SUPPORT_EMAIL = "developerixtarent@gmail.com";
const SUPPORT_PHONE = "+46-70-2223250";

const CONTACT_METHODS = [
  {
    icon: "📧",
    title: "Email Support",
    description: "Get help via email – write your subject and message",
    contact: SUPPORT_EMAIL,
    action: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    icon: "💬",
    title: "Live Chat",
    description: "Email us – opens your email app to write subject and message",
    contact: SUPPORT_EMAIL,
    action: `mailto:${SUPPORT_EMAIL}`,
  },
  {
    icon: "📞",
    title: "Phone Support",
    description: "Speak directly with us",
    contact: SUPPORT_PHONE,
    action: "tel:+46702223250",
  },
] as const;

export default function SupportSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:pb-12">
      <h1 className="text-3xl font-bold mb-6">Support Center</h1>
      
      {/* Contact Methods */}
      <FadeInSection>
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CONTACT_METHODS.map((method, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/10 bg-white/5 p-6 hover:bg-white/10 transition-colors text-center cursor-pointer"
                onClick={() => {
                  window.location.href = method.action;
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
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
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
        <section>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-8 shadow-[0_0_24px_rgba(34,211,238,0.25)] text-center">
            <h3 className="text-2xl font-bold mb-4">Still Need Help?</h3>
            <p className="text-gray-200 mb-6">
              Can&apos;t find what you&apos;re looking for? Our support team is ready to assist you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:developerixtarent@gmail.com"
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
    </div>
  );
}
