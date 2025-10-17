"use client";

import { Dispatch, SetStateAction } from "react";

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

export default function LoginModal({ open, setOpen }: Props) {
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
        <h2 className="text-2xl font-bold mb-4 text-white">Login</h2>
        <form className="flex flex-col gap-4">
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
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
