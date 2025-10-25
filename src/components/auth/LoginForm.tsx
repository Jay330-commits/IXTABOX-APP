"use client";

import { useState } from "react";
import Link from "next/link";

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => void;
  className?: string;
}

export default function LoginForm({ onSubmit, className = "" }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const inputClass =
    "w-full px-3 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-400 hover:border-cyan-500 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = { email, password };
    
    if (onSubmit) {
      onSubmit(formData);
    } else {
      console.log("Login data:", formData);
      alert("Login submitted! (check console)");
    }
  };

  return (
    <div className={`w-full max-w-md bg-gray-900/90 rounded-xl p-8 shadow-2xl shadow-black/60 ${className}`}>
      <h1 className="text-2xl font-bold text-white mb-4 text-center">
        Login
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-gray-200">
          <span>Email*</span>
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          />
        </label>

        <button
          type="submit"
          className="w-full py-2.5 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30"
        >
          Login
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
