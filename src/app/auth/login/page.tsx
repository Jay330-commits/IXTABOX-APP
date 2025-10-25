"use client";

import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  const handleLogin = (data: { email: string; password: string }) => {
    console.log("Login data:", data);
    alert("Login submitted! (check console)");
  };

  return (
    <AuthLayout>
      <LoginForm onSubmit={handleLogin} />
    </AuthLayout>
  );
}
