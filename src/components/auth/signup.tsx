"use client";

import { Dispatch, SetStateAction, useState } from "react";

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

export default function SignUpModal({ open, setOpen }: Props) {
  const [role, setRole] = useState<"customer" | "partner">("customer");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-xl bg-gray-900 p-6 shadow-lg">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
          onClick={() => setOpen(false)}
        >
          ✕
        </button>
        <h2 className="text-2xl font-bold mb-4 text-white">Sign Up</h2>
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={`flex-1 py-2 rounded font-semibold ${
              role === "customer"
                ? "bg-cyan-500 text-white"
                : "bg-gray-800 text-gray-300"
            }`}
            onClick={() => setRole("customer")}
          >
            Customer
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded font-semibold ${
              role === "partner"
                ? "bg-cyan-500 text-white"
                : "bg-gray-800 text-gray-300"
            }`}
            onClick={() => setRole("partner")}
          >
            Partner
          </button>
        </div>
        <form className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            className="px-4 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="email"
            placeholder="Email"
            className="px-4 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <input
            type="password"
            placeholder="Password"
            className="px-4 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <button
            type="submit"
            className="bg-cyan-500 text-white rounded py-2 font-semibold hover:bg-cyan-400 transition-colors"
          >
            Sign Up as {role.charAt(0).toUpperCase() + role.slice(1)}
          </button>
        </form>
      </div>
    </div>
  );
}
