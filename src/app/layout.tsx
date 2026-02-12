import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "IXTAbox Rent - Roof Boxes & Extra Car Storage | Sweden",
    template: "%s | IXTAbox",
  },
  description:
    "Rent IXTAbox - Aerodynamic cargo boxes, roof boxes, and extra car storage solutions. Back-mounted design reduces drag, improves fuel efficiency, and provides secure storage for travel, camping, and everyday use. Available across Sweden and the Nordics. Book online, mount in minutes.",
  keywords: [
    "IXTAbox",
    "cargo box rental",
    "roof box rental",
    "roof boxes",
    "car roof box",
    "roof cargo box",
    "extra car storage",
    "car storage rental",
    "vehicle storage",
    "car luggage box",
    "car storage box",
    "towbar cargo box",
    "aerodynamic cargo box",
    "back-mounted storage",
    "cargo box hire",
    "car roof storage",
    "vehicle luggage box",
    "travel storage",
    "camping storage",
    "car roof box rental",
    "roof box hire",
    "car storage solutions",
    "Sweden",
    "Nordics",
    "Stockholm",
    "Gothenburg",
    "Malmö",
  ],
  authors: [{ name: "IXTAbox" }],
  creator: "IXTAbox",
  publisher: "IXTAbox",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "IXTAbox",
    title: "IXTAbox Rent - Roof Boxes & Extra Car Storage Rental",
    description: "Rent IXTAbox - Aerodynamic roof boxes and extra car storage solutions. Back-mounted design reduces drag, improves fuel efficiency. Available across Sweden and the Nordics.",
    images: [
      {
        url: `${siteUrl}/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg`,
        width: 1200,
        height: 630,
        alt: "IXTAbox cargo box on car",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "IXTAbox Rent - Roof Boxes & Extra Car Storage Rental",
    description: "Rent IXTAbox - Aerodynamic roof boxes and extra car storage solutions. Back-mounted design reduces drag and improves fuel efficiency.",
    images: [`${siteUrl}/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg`],
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: "/images/logo/titleicon.webp",
    shortcut: "/images/logo/titleicon.webp",
    apple: "/images/logo/titleicon.webp",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
        {/* Preconnect to Stripe CDN for faster payment page loading */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
