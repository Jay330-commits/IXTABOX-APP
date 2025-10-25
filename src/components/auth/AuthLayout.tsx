import GuestHeader from "@/components/layouts/GuestHeader";
import Footer from "@/components/layouts/Footer";

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
        
        {/* Content */}
        <div className="relative z-10 w-full flex justify-center">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
