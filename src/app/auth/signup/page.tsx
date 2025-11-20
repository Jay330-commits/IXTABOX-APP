"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";

import SignupForm from "@/components/auth/SignupForm";
import DistributorSignupForm from "@/components/auth/DistributorSignupForm";

type Role = "customer" | "distributor";

function SignUpContent() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>("customer");

  // Check URL parameter to set initial    role
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'distributor') {
      setRole('distributor');
    } else if (roleParam === 'customer') {
      setRole('customer');
    }
  }, [searchParams]);

  // Remove the mock handlers - let the forms use their built-in authentication
  const handleCustomerSignup = undefined;
  const handleDistributorSignup = undefined;

  return (
    <AuthLayout>
      {role === "customer" ? (
        <div className="w-full max-w-md">
          <SignupForm onSubmit={handleCustomerSignup} />   
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          
          <DistributorSignupForm onSubmit={handleDistributorSignup} />
        </div>
      )}
    </AuthLayout>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignUpContent />
    </Suspense>
  );
}
