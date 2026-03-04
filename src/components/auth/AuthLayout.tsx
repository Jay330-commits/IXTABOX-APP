"use client";

import GuestHeader from "@/components/layouts/GuestHeader";
interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage?: string;
}

export default function AuthLayout({ 
  children, 
  backgroundImage = "/images/background/back.jpg" 
}: AuthLayoutProps) {
  return (
    <>
      <GuestHeader />
      <main
        className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative bg-image-fill-screen"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/70"></div>
        
        {/* Content */}
        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </main>
    </>
  );
}
