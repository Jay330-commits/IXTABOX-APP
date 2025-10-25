"use client";

import { useState } from "react";
import Link from "next/link";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  regNumber: string;
  businessAddress: string;
  website: string;
  contactPerson: string;
  businessType: string;
  yearsInBusiness: string;
  expectedMonthlyBookings: string;
  marketingChannels: string[];
  businessDescription: string;
}

interface PartnerStep {
  id: number;
  title: string;
  description: string;
}

interface PartnerSignupFormProps {
  onSubmit?: (data: FormData) => void;
  className?: string;
}

export default function PartnerSignupForm({ onSubmit, className = "" }: PartnerSignupFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    regNumber: "",
    businessAddress: "",
    website: "",
    contactPerson: "",
    businessType: "",
    yearsInBusiness: "",
    expectedMonthlyBookings: "",
    marketingChannels: [],
    businessDescription: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const partnerSteps: PartnerStep[] = [
    {
      id: 1,
      title: "Company Information",
      description: "Tell us about your business"
    },
    {
      id: 2,
      title: "Business Details",
      description: "Share your business background"
    },
    {
      id: 3,
      title: "Partnership Goals",
      description: "Help us understand your needs"
    },
    {
      id: 4,
      title: "Review & Submit",
      description: "Review your information",
    }
  ];

  const inputClass =
    "w-full px-3 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-400 hover:border-cyan-500 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";

  const handleChange = (field: string, value: string | string[]) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleMarketingChannelToggle = (channel: string) => {
    const currentChannels = formData.marketingChannels;
    const updatedChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel];
    handleChange("marketingChannels", updatedChannels);
  };

  const nextStep = () => {
    if (currentStep < partnerSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert("You must accept the terms and conditions.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    } else {
      console.log("Partner Sign-Up Data:", formData);
      alert("Partner application submitted successfully! We'll review your application and get back to you within 2 business days.");
    }
  };

  const renderPartnerStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Company Information</h2>
              <p className="text-gray-300">Tell us about your business</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Company Name*</span>
                <input
                  className={inputClass}
                  value={formData.companyName}
                  onChange={(e) => handleChange("companyName", e.target.value)}
                  placeholder="My Company AB"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Registration Number*</span>
                <input
                  className={inputClass}
                  value={formData.regNumber}
                  onChange={(e) => handleChange("regNumber", e.target.value)}
                  placeholder="123456-7890"
                  required
                />
              </label>
            </div>
            
            <label className="flex flex-col gap-2 text-gray-200">
              <span className="font-medium">Business Address*</span>
              <input
                className={inputClass}
                value={formData.businessAddress}
                onChange={(e) => handleChange("businessAddress", e.target.value)}
                placeholder="Street, City, ZIP Code"
                required
              />
            </label>
            
            <label className="flex flex-col gap-2 text-gray-200">
              <span className="font-medium">Website</span>
              <input
                className={inputClass}
                value={formData.website}
                onChange={(e) => handleChange("website", e.target.value)}
                placeholder="https://example.com"
              />
            </label>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Business Details</h2>
              <p className="text-gray-300">Share your business background</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Contact Person*</span>
                <input
                  className={inputClass}
                  value={formData.contactPerson}
                  onChange={(e) => handleChange("contactPerson", e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Email*</span>
                <input
                  className={inputClass}
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </label>
            </div>
            
            <label className="flex flex-col gap-2 text-gray-200">
              <span className="font-medium">Business Type*</span>
              <select
                className={inputClass}
                value={formData.businessType}
                onChange={(e) => handleChange("businessType", e.target.value)}
                required
              >
                <option value="">Select business type</option>
                <option value="retail">Retail</option>
                <option value="restaurant">Restaurant</option>
                <option value="events">Events</option>
                <option value="marketing">Marketing Agency</option>
                <option value="other">Other</option>
              </select>
            </label>
            
            <label className="flex flex-col gap-2 text-gray-200">
              <span className="font-medium">Years in Business*</span>
              <select
                className={inputClass}
                value={formData.yearsInBusiness}
                onChange={(e) => handleChange("yearsInBusiness", e.target.value)}
                required
              >
                <option value="">Select years</option>
                <option value="0-1">0-1 years</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </label>
            
            <label className="flex flex-col gap-2 text-gray-200">
              <span className="font-medium">Business Description</span>
              <textarea
                className={`${inputClass} min-h-[100px] resize-none`}
                value={formData.businessDescription}
                onChange={(e) => handleChange("businessDescription", e.target.value)}
                placeholder="Tell us about your business and what you do..."
                rows={4}
              />
            </label>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Partnership Goals</h2>
              <p className="text-gray-300">Help us understand your needs</p>
            </div>
            
            <label className="flex flex-col gap-2 text-gray-200">
              <span className="font-medium">Expected Monthly Bookings*</span>
              <select
                className={inputClass}
                value={formData.expectedMonthlyBookings}
                onChange={(e) => handleChange("expectedMonthlyBookings", e.target.value)}
                required
              >
                <option value="">Select expected bookings</option>
                <option value="1-5">1-5 bookings</option>
                <option value="5-10">5-10 bookings</option>
                <option value="10-20">10-20 bookings</option>
                <option value="20+">20+ bookings</option>
              </select>
            </label>
            
            <div className="space-y-4">
              <span className="font-medium text-gray-200">Marketing Channels (Select all that apply)</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {["Social Media", "Google Ads", "Email Marketing", "Print Media", "Events", "Referrals"].map((channel) => (
                  <label key={channel} className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.marketingChannels.includes(channel)}
                      onChange={() => handleMarketingChannelToggle(channel)}
                      className="accent-cyan-500"
                    />
                    <span className="text-gray-200 text-sm md:text-base">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Partner Benefits</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Priority booking access</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Volume discounts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Dedicated support</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="text-cyan-400">✓</span>
                  <span>Marketing materials</span>
                </li>
              </ul>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Review & Submit</h2>
              <p className="text-gray-300">Review your information before submitting</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">Company Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Company:</span>
                  <p className="text-white">{formData.companyName}</p>
                </div>
                <div>
                  <span className="text-gray-400">Registration:</span>
                  <p className="text-white">{formData.regNumber}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-400">Address:</span>
                  <p className="text-white">{formData.businessAddress}</p>
                </div>
                <div>
                  <span className="text-gray-400">Contact:</span>
                  <p className="text-white">{formData.contactPerson}</p>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <p className="text-white">{formData.email}</p>
                </div>
                <div>
                  <span className="text-gray-400">Business Type:</span>
                  <p className="text-white">{formData.businessType}</p>
                </div>
                <div>
                  <span className="text-gray-400">Years in Business:</span>
                  <p className="text-white">{formData.yearsInBusiness}</p>
                </div>
                <div>
                  <span className="text-gray-400">Expected Bookings:</span>
                  <p className="text-white">{formData.expectedMonthlyBookings}</p>
                </div>
                {formData.marketingChannels.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-gray-400">Marketing Channels:</span>
                    <p className="text-white">{formData.marketingChannels.join(", ")}</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Password*</span>
                <input
                  className={inputClass}
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Confirm Password*</span>
                <input
                  className={inputClass}
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  required
                />
              </label>
            </div>
            
            <label className="flex items-start space-x-3 text-gray-200">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
                className="accent-cyan-500 mt-1"
              />
              <span className="text-sm">
                I accept the{" "}
                <Link href="/terms" className="text-cyan-400 underline">
                  terms and conditions
                </Link>{" "}
                and agree to the partner agreement.
              </span>
            </label>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`w-full max-w-4xl bg-gray-900/90 rounded-xl p-4 md:p-8 shadow-2xl shadow-black/60 ${className}`}>
      <h1 className="text-3xl font-bold text-white mb-8 text-center">
        Become a Partner
      </h1>

      <div className="space-y-8">
        {/* Progress Steps */}
        <div className="flex justify-center px-4">
          <div className="flex items-center space-x-2 md:space-x-4 max-w-full overflow-x-auto">
            {partnerSteps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-300 ${
                  currentStep >= step.id
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    : "bg-white/10 text-gray-400"
                }`}>
                  {currentStep > step.id ? "✓" : step.id}
                </div>
                {index < partnerSteps.length - 1 && (
                  <div className={`w-8 md:w-16 h-1 mx-1 md:mx-2 transition-all duration-300 ${
                    currentStep > step.id ? "bg-gradient-to-r from-cyan-500 to-blue-500" : "bg-white/10"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <form onSubmit={handleSubmit}>
          {renderPartnerStep()}
          
          {/* Navigation Buttons */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mt-8">
            {/* Mobile: Arrow Navigation */}
            <div className="flex md:hidden justify-between items-center">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                  currentStep === 1
                    ? "bg-white/5 text-gray-400 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="text-sm text-gray-300">
                Step {currentStep} of {partnerSteps.length}
              </span>
              
              {currentStep < partnerSteps.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white flex items-center justify-center hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center hover:scale-105 transition-transform duration-200 shadow-lg shadow-green-500/30"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Desktop/Tablet: Text Buttons */}
            <div className="hidden md:flex justify-between w-full">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  currentStep === 1
                    ? "bg-white/5 text-gray-400 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Previous
              </button>
              
              {currentStep < partnerSteps.length ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-green-500/30"
                >
                  Submit Application
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <p className="mt-6 text-gray-400 text-sm text-center">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-cyan-400 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
