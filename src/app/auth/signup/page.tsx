"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";
import PartnerSignupForm from "@/components/auth/PartnerSignupForm";

type Role = "customer" | "partner";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>("customer");

  // Check URL parameter to set initial role
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'partner') {
      setRole('partner');
    } else if (roleParam === 'customer') {
      setRole('customer');
    }
  }, [searchParams]);

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

  return (
    <AuthLayout>
      {role === "customer" ? (
        <div className="w-full max-w-md">
          <SignupForm onSubmit={handleCustomerSignup} />
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          
          <PartnerSignupForm onSubmit={handlePartnerSignup} />
        </div>
      )}
    </AuthLayout>
  );
}
