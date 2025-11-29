
"use client";

import { useState } from "react";
import Link from "next/link";

interface FormData {
  contractType: 'Leasing' | 'Owning' | '';
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

interface DistributorStep {
  id: number;
  title: string;
  description: string;
}

interface DistributorSignupFormProps {
  onSubmit?: (data: FormData) => void;
  className?: string;
}

export default function DistributorSignupForm({ onSubmit, className = "" }: DistributorSignupFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    contractType: '',
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const distributorSteps: DistributorStep[] = [
    {
      id: 0,
      title: "Choose Business Model",
      description: "Select the business model that fits your needs"
    },
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
      title: "Distributorship Goals",
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

  const hasValue = (value: string) => value?.trim().length > 0;

  const validateStepFields = (step: number) => {
    const missingFields: string[] = [];

    if (step === 0) {
      if (!formData.contractType) {
        missingFields.push("Business model");
      }
    }

    if (step === 1) {
      if (!hasValue(formData.companyName)) missingFields.push("Company name");
      if (!hasValue(formData.regNumber)) missingFields.push("Registration number");
      if (!hasValue(formData.businessAddress)) missingFields.push("Business address");
    }

    if (step === 2) {
      if (!hasValue(formData.fullName)) missingFields.push("Full name");
      if (!hasValue(formData.email)) missingFields.push("Email");
      if (!hasValue(formData.contactPerson)) missingFields.push("Contact person");
      if (!hasValue(formData.businessType)) missingFields.push("Business type");
      if (!hasValue(formData.yearsInBusiness)) missingFields.push("Years in business");
    }

    if (step === 3) {
      if (!hasValue(formData.expectedMonthlyBookings))
        missingFields.push("Expected monthly bookings");
    }

    if (missingFields.length > 0) {
      setError(`Please complete: ${missingFields.join(", ")}`);
      return false;
    }

    return true;
  };

  const validateAllSteps = () => {
    for (let step = 0; step <= 3; step++) {
      if (!validateStepFields(step)) {
        if (currentStep !== step) {
          setCurrentStep(step);
        }
        return false;
      }
    }
    return true;
  };

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
    if (!validateStepFields(currentStep)) {
      return;
    }
    
    if (currentStep < distributorSteps.length - 1) {
      setError("");
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!validateAllSteps()) {
      return;
    }

    // Validation
    if (!termsAccepted) {
      setError("You must accept the terms and conditions.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!formData.contractType) {
      setError("Please select a business model.");
      return;
    }

    // If custom onSubmit is provided, use it
    if (onSubmit) {
      onSubmit(formData);
      return;
    }

    // Otherwise, call the API
    setIsLoading(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        companyName: formData.companyName.trim(),
        regNumber: formData.regNumber.trim(),
        businessAddress: formData.businessAddress.trim(),
        website: formData.website.trim(),
        contactPerson: formData.contactPerson.trim(),
        businessType: formData.businessType.trim(),
        yearsInBusiness: formData.yearsInBusiness.trim(),
        expectedMonthlyBookings: formData.expectedMonthlyBookings.trim(),
        marketingChannels: formData.marketingChannels
          .map(channel => channel.trim())
          .filter(channel => channel.length > 0),
        businessDescription: formData.businessDescription.trim(),
        contractType: formData.contractType.trim(),
      };

      const response = await fetch('/api/auth/register/distributor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Registration failed. Please try again.');
        return;
      }

      setSuccess(true);
      // Optionally redirect after successful registration
      // You might want to redirect to a distributor dashboard or login page
      setTimeout(() => {
        window.location.href = '/auth/login?registered=distributor';
      }, 3000);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Distributor registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const businessModels = [
    {
      id: 'Leasing',
      title: 'Leasing',
      description: 'Pay per rental cycle with minimal upfront costs. Ideal for testing new markets or seasonal operations.',
      features: ['Low initial cost', 'No maintenance fees', 'Flexible contracts', 'Up to 3 stands'],
      price: '$199/month',
      recommended: true,
    },
    {
      id: 'Owning',
      title: 'Owning',
      description: 'Full ownership of your stands. Maximize long-term returns and have complete control over your assets.',
      features: ['Full ownership', 'Maximum ROI', 'Asset appreciation', 'Unlimited stands'],
      price: '$499/month',
      recommended: false,
    },
  ];

  const renderDistributorStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Choose Your Business Model</h2>
              <p className="text-gray-300 text-sm">Select the business model that best fits your needs</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {businessModels.map((model) => {
                const isSelected = formData.contractType === model.id;
                return (
                  <div
                    key={model.id}
                    onClick={() => handleChange("contractType", model.id)}
                    className={`border rounded-lg p-4 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'border-cyan-400/60 bg-cyan-500/10 ring-2 ring-cyan-400/40'
                        : model.recommended
                        ? 'border-cyan-400/40 bg-white/5 hover:border-cyan-400/60 hover:bg-white/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {model.recommended && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          RECOMMENDED
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute -top-3 right-3">
                        <span className="bg-green-500/20 text-green-400 border border-green-400/40 text-xs font-bold px-3 py-1 rounded-full">
                          SELECTED
                        </span>
                      </div>
                    )}

                    <div className="mb-3">
                      <h3 className="text-lg font-semibold mb-1 text-cyan-300">{model.title}</h3>
                      <p className="text-xl font-bold text-white mb-1">{model.price}</p>
                      <p className="text-gray-300 text-sm min-h-[50px]">{model.description}</p>
                    </div>

                    <ul className="space-y-1 mb-4">
                      {model.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-300">
                          <svg
                            className="w-4 h-4 mr-2 text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className={`w-full py-3 px-4 rounded-md font-medium text-center transition-colors ${
                      isSelected
                        ? 'bg-cyan-500 text-white shadow-[0_0_24px_rgba(34,211,238,0.45)]'
                        : model.recommended
                        ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-400/40 hover:bg-cyan-600/30'
                        : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                    }`}>
                      {isSelected ? 'Selected' : 'Select ' + model.title}
                    </div>
                  </div>
                );
              })}
            </div>

            {formData.contractType && (
              <div className="mt-4 bg-cyan-500/10 border border-cyan-400/20 rounded-lg p-3 max-w-2xl mx-auto text-center">
                <p className="text-xs text-gray-200">
                  <span className="font-semibold text-cyan-300">Great choice!</span> You&apos;ve selected the{' '}
                  <span className="font-semibold">{businessModels.find(m => m.id === formData.contractType)?.title}</span> model. 
                  Click &quot;Next Step&quot; to continue.
                </p>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Company Information</h2>
              <p className="text-gray-300 text-sm">Tell us about your business</p>
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
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Business Details</h2>
              <p className="text-gray-300 text-sm">Share your business background</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Full Name*</span>
                <input
                  className={inputClass}
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={isLoading || success}
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
                  disabled={isLoading || success}
                />
              </label>
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
                  disabled={isLoading || success}
                />
              </label>
              <label className="flex flex-col gap-2 text-gray-200">
                <span className="font-medium">Phone Number</span>
                <input
                  className={inputClass}
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+46 70 123 4567"
                  disabled={isLoading || success}
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
                className={`${inputClass} min-h-[80px] resize-none`}
                value={formData.businessDescription}
                onChange={(e) => handleChange("businessDescription", e.target.value)}
                placeholder="Tell us about your business and what you do..."
                rows={3}
              />
            </label>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Distributorship Goals</h2>
              <p className="text-gray-300 text-sm">Help us understand your needs</p>
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
            
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-lg p-4">
              <h3 className="text-base font-semibold text-white mb-2">Distributor Benefits</h3>
              <ul className="space-y-1 text-sm text-gray-300">
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
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white mb-1">Review & Submit</h2>
              <p className="text-gray-300 text-sm">Review your information before submitting</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3">
              <h3 className="text-base font-semibold text-white mb-3">Company Information</h3>
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
                <div>
                  <span className="text-gray-400">Business Model:</span>
                  <p className="text-white">{businessModels.find(m => m.id === formData.contractType)?.title || 'Not selected'}</p>
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
                and agree to the distributor agreement.
              </span>
            </label>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto bg-gray-900/90 rounded-xl p-4 md:p-6 shadow-2xl shadow-black/60 ${className}`}>
      <h1 className="text-2xl font-bold text-white mb-6 text-center">
        Become a Distributor
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg text-green-200 text-sm">
          <p className="font-semibold mb-2">Registration Successful!</p>
          <p>Your distributor application has been submitted successfully. Redirecting to login page...</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Progress Steps */}
        <div className="flex justify-center px-4">
          <div className="flex items-center space-x-2 md:space-x-4 max-w-full overflow-x-auto">
            {distributorSteps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-shrink-0">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all duration-300 ${
                  currentStep >= step.id
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    : "bg-white/10 text-gray-400"
                }`}>
                  {currentStep > step.id ? "✓" : step.id + 1}
                </div>
                {index < distributorSteps.length - 1 && (
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
          <fieldset disabled={isLoading || success}>
            {renderDistributorStep()}
          </fieldset>
          
          {/* Navigation Buttons */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mt-4">
            {/* Mobile: Arrow Navigation */}
            <div className="flex md:hidden justify-between items-center">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 0 || isLoading}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                  currentStep === 0 || isLoading
                    ? "bg-white/5 text-gray-400 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <span className="text-sm text-gray-300">
                Step {currentStep + 1} of {distributorSteps.length}
              </span>
              
              {currentStep < distributorSteps.length - 1 ? (
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
                  disabled={isLoading || success}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center justify-center hover:scale-105 transition-transform duration-200 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
                disabled={currentStep === 0 || isLoading}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  currentStep === 0 || isLoading
                    ? "bg-white/5 text-gray-400 cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Previous
              </button>
              
              {currentStep < distributorSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={isLoading}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Next Step
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isLoading ? 'Submitting...' : success ? 'Submitted!' : 'Submit Application'}
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
