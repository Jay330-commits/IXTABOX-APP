"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { resendEmailConfirmation } from "@/lib/supabase-auth";

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => void;
  className?: string;
}

export default function LoginForm({ onSubmit, className = "" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const inputClass =
    "w-full px-3 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-400 hover:border-cyan-500 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginForm] Form submitted!', { email, hasPassword: !!password });
    setError("");
    setIsLoading(true);
    
    const formData = { email, password };
    
    if (onSubmit) {
      onSubmit(formData);
      setIsLoading(false);
      return;
    }
    
    try {
      console.log('Starting login for:', email);
      console.log('Login function available:', typeof login);
      
      if (!login) {
        console.error('Login function is not available!');
        setError('Authentication system error. Please refresh the page.');
        setIsLoading(false);
        return;
      }
      
      const result = await login(email, password);
      console.log('Login result:', result);
      console.log('Redirect path from result:', result.redirectPath);
      
      if (result.success) {
        // The API must provide redirectPath based on user role - no fallbacks
        if (!result.redirectPath) {
          console.error('ERROR: No redirectPath received from API');
          setError('Login successful but routing failed. Please contact support.');
          setIsLoading(false);
          return;
        }
        
        console.log('Navigating to exact path from API:', result.redirectPath);
        // Small delay to ensure AuthContext state is updated before navigation
        setTimeout(() => {
          // At this point redirectPath is guaranteed (checked above)
          router.replace(result.redirectPath as string);
        }, 100);
        // Don't set loading to false here - let the navigation happen
      } else {
        setError(result.message || "Login failed");
        setIsLoading(false);
        // Show resend confirmation option if email not confirmed
        if (result.message?.includes("confirmation")) {
          setShowResendConfirmation(true);
        }
      }
    } catch (error) {
      console.error('Login form error:', error);
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const result = await resendEmailConfirmation(email);
      if (result.success) {
        setError("Confirmation email sent! Please check your inbox.");
        setShowResendConfirmation(false);
      } else {
        setError(result.message || "Failed to resend confirmation email");
      }
    } catch {
      setError("Failed to resend confirmation email");
    }
    setIsResending(false);
  };

  return (
    <div className={`w-full max-w-md bg-gray-900/90 rounded-xl p-8 shadow-2xl shadow-black/60 ${className}`}>
      <h1 className="text-2xl font-bold text-white mb-4 text-center">
        Login
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-md text-red-200 text-sm">
          {error}
        </div>
      )}

      {showResendConfirmation && (
        <div className="mb-4 p-3 bg-blue-900/50 border border-blue-500 rounded-md text-blue-200 text-sm">
          <p className="mb-2">Your email needs to be confirmed before you can log in.</p>
          <button
            onClick={handleResendConfirmation}
            disabled={isResending}
            className="text-cyan-400 underline hover:text-cyan-300 disabled:opacity-50"
          >
            {isResending ? "Sending..." : "Resend confirmation email"}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Email*</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </label>

        <label className="flex flex-col gap-1 text-gray-200">
          <span>Password*</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-gray-400 text-sm text-center">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="text-cyan-400 underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
