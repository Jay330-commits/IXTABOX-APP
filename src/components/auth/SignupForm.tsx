"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Role } from "../../types/auth";

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface SignupFormProps {
  onSubmit?: (data: FormData) => void;
  className?: string;
}

export default function SignupForm({ onSubmit, className = "" }: SignupFormProps) {
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();
  const router = useRouter();

  const inputClass =
    "w-full px-3 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-400 hover:border-cyan-500 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!termsAccepted) {
      setError("You must accept the terms and conditions.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (onSubmit) {
      onSubmit(formData);
    } else {
      setIsLoading(true);
      try {
        const result = await register({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          role: Role.CUSTOMER
        });
        
        if (result.success) {
          router.push('/customer');
        } else {
          setError(result.message || "Registration failed");
        }
      } catch {
        setError("An unexpected error occurred");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-md bg-gray-900/90 rounded-xl p-8 shadow-2xl shadow-black/60 ${className}`}>
      <h1 className="text-2xl font-bold text-white mb-4 text-center">
        Sign Up
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Full Name*</span>
          <input
            className={inputClass}
            value={formData.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
            placeholder="John Doe"
            required
            disabled={isLoading}
          />
        </label>
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Email*</span>
          <input
            className={inputClass}
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="email@example.com"
            required
            disabled={isLoading}
          />
        </label>
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Phone Number*</span>
          <input
            className={inputClass}
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="+46 70 123 4567"
            required
            disabled={isLoading}
          />
        </label>
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Password*</span>
          <input
            className={inputClass}
            type="password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            required
            disabled={isLoading}
          />
        </label>
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Confirm Password*</span>
          <input
            className={inputClass}
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
            required
            disabled={isLoading}
          />
        </label>
        <label className="flex items-center gap-2 text-gray-200">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={() => setTermsAccepted(!termsAccepted)}
            className="accent-cyan-500"
            disabled={isLoading}
          />
          I accept the{" "}
          <Link href="/terms" className="text-cyan-400 underline">
            terms and conditions
          </Link>
        </label>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-4 text-gray-400 text-sm text-center">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-cyan-400 underline">
          Login
        </Link>
      </p>
    </div>
  );
}
