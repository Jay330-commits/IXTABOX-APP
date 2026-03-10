"use client";

import { useSearchParams } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  return (
    <AuthLayout>
      <LoginForm redirectTo={redirect || undefined} />
    </AuthLayout>
  );
}
