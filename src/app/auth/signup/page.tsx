"use client";

import { useState, useEffect } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";
import PartnerSignupForm from "@/components/auth/PartnerSignupForm";

type Role = "customer" | "partner";

export default function SignUpPage() {
  const [role, setRole] = useState<Role>("customer");
  const [isClient, setIsClient] = useState(false);

  // Check URL parameter to set initial role
  useEffect(() => {
    setIsClient(true);
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role');
    if (roleParam === 'partner') {
      setRole('partner');
    } else if (roleParam === 'customer') {
      setRole('customer');
    }
  }, []);

  const handleCustomerSignup = (data: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    console.log("Customer Sign-Up Data:", data);
    alert("Sign up submitted! (check console)");
  };

  const handlePartnerSignup = (data: {
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
  }) => {
    console.log("Partner Sign-Up Data:", data);
    alert("Partner application submitted successfully! We'll review your application and get back to you within 2 business days.");
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <AuthLayout>
        <div className="w-full max-w-4xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          {role === "customer" ? "Sign Up" : "Become a Partner"}
        </h1>

        {/* Role Toggle */}
        <div className="flex gap-4 mb-8 justify-center">
          {["customer", "partner"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r as Role)}
              className={`px-6 py-3 rounded-lg font-semibold uppercase transition-all duration-200 ${
                role === r
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30"
                  : "bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10"
              }`}
            >
              {r === "customer" ? "Customer" : "Partner"}
            </button>
          ))}
        </div>

        {role === "customer" ? (
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <SignupForm onSubmit={handleCustomerSignup} />
            </div>
          </div>
        ) : (
          <PartnerSignupForm onSubmit={handlePartnerSignup} />
        )}
      </div>
    </AuthLayout>
  );
}
