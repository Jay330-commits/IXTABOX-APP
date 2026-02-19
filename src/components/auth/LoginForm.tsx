"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
// Removed direct import of server-only function - using API route instead

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
    
    // Prevent multiple simultaneous submissions
    if (isLoading) return;
    
    setError("");
    setIsLoading(true);
    
    const formData = { email, password };
    
    if (onSubmit) {
      onSubmit(formData);
      setIsLoading(false);
      return;
    }
    
    try {
      if (!login) {
        setError('Authentication system error. Please refresh the page.');
        setIsLoading(false);
        return;
      }
      
      const result = await login(email, password);
      
      if (result.success) {
        // The API must provide redirectPath based on user role - no fallbacks
        if (!result.redirectPath) {
          setError('Login successful but routing failed. Please contact support.');
          setIsLoading(false);
          return;
        }
        
        // Navigate immediately - no delay needed as state is already updated
        router.replace(result.redirectPath as string);
        // Don't set loading to false here - let the navigation happen
      } else {
        setError(result.message || "Login failed");
        setIsLoading(false);
        // Show resend confirmation option if email not confirmed
        if (result.message?.includes("confirmation")) {
          setShowResendConfirmation(true);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const result = await response.json();
      
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
          className="w-full py-2.5 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 relative"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </span>
          ) : (
            "Login"
          )}
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
