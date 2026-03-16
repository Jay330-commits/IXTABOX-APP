"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  return <LoginForm redirectTo={redirect || undefined} />;
}

export default function LoginPage() {
  return (
    <AuthLayout>
      <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </AuthLayout>
  );
}
