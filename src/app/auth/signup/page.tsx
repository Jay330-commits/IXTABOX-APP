"use client";

import { useState } from "react";
import GuestHeader from '@/components/layouts/GuestHeader';
import Footer from "@/components/layouts/Footer";
import Link from "next/link";

type Role = "customer" | "partner";

interface FormData {
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
}

export default function SignUpPage() {
  const [role, setRole] = useState<Role>("customer");
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    regNumber: "",
    businessAddress: "",
    website: "",
    contactPerson: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert("You must accept the terms and conditions.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    console.log("Sign-Up Data:", { role, ...formData });
    alert("Sign up submitted! (check console)");
  };

  const inputClass =
    "w-full px-3 py-2 rounded-md bg-gray-900 border border-white/10 text-gray-100 placeholder-gray-400 hover:border-cyan-500 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-0";

  const backgroundImage = "/images/background/back.jpg";

  return (
    <>
      <GuestHeader />
      <main
        className="min-h-screen flex items-center justify-center px-4 py-12 relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70"></div>

        {/* Form container */}
        <div className="relative z-10 w-full max-w-md bg-gray-900/90 rounded-xl p-8 shadow-2xl shadow-black/60">
          <h1 className="text-2xl font-bold text-white mb-4 text-center">
            Sign Up
          </h1>

          {/* Role Toggle */}
          <div className="flex gap-4 mb-4">
            {["customer", "partner"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r as Role)}
                className={`px-4 py-2 rounded-md font-semibold uppercase ${
                  role === r
                    ? "bg-cyan-600/30 text-white border border-cyan-400/40"
                    : "bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10"
                } transition-colors duration-200`}
              >
                {r === "customer" ? "Customer" : "Partner"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Customer Fields */}
            {role === "customer" && (
              <>
                <label className="flex flex-col gap-1 text-gray-200">
                  <span>Full Name*</span>
                  <input
                    className={inputClass}
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    placeholder="John Doe"
                    required
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
                  />
                </label>
              </>
            )}

            {/* Partner Fields */}
            {role === "partner" && (
              <>
                <label className="flex flex-col gap-1 text-gray-200">
                  <span>Company Name*</span>
                  <input
                    className={inputClass}
                    value={formData.companyName}
                    onChange={(e) =>
                      handleChange("companyName", e.target.value)
                    }
                    placeholder="My Company AB"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-200">
                  <span>Registration Number*</span>
                  <input
                    className={inputClass}
                    value={formData.regNumber}
                    onChange={(e) =>
                      handleChange("regNumber", e.target.value)
                    }
                    placeholder="123456-7890"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-200">
                  <span>Business Address*</span>
                  <input
                    className={inputClass}
                    value={formData.businessAddress}
                    onChange={(e) =>
                      handleChange("businessAddress", e.target.value)
                    }
                    placeholder="Street, City, ZIP"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-200">
                  <span>Website</span>
                  <input
                    className={inputClass}
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    placeholder="https://example.com"
                  />
                </label>
                <label className="flex flex-col gap-1 text-gray-200">
                  <span>Contact Person Name*</span>
                  <input
                    className={inputClass}
                    value={formData.contactPerson}
                    onChange={(e) =>
                      handleChange("contactPerson", e.target.value)
                    }
                    placeholder="John Doe"
                    required
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
                  />
                </label>
              </>
            )}

            {/* Password */}
            <label className="flex flex-col gap-1 text-gray-200">
              <span>Password*</span>
              <input
                className={inputClass}
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-gray-200">
              <span>Confirm Password*</span>
              <input
                className={inputClass}
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  handleChange("confirmPassword", e.target.value)
                }
                required
              />
            </label>

            {/* Terms */}
            <label className="flex items-center gap-2 text-gray-200">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
                className="accent-cyan-500"
              />
              I accept the{" "}
              <Link href="/terms" className="text-cyan-400 underline">
                terms and conditions
              </Link>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 rounded-md bg-gradient-to-r from-cyan-500 via-blue-500 to-fuchsia-500 text-white font-semibold hover:scale-105 transition-transform duration-200 shadow-lg shadow-cyan-500/30"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-4 text-gray-400 text-sm text-center">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-cyan-400 underline">
              Login
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
