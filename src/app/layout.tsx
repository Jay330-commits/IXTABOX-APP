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
    default: "IXTAbox Rent (ixtarent) - Roof Boxes & Extra Car Storage | Sweden",
    template: "%s | IXTAbox",
  },
  description:
    "Rent IXTAbox - Aerodynamic cargo boxes, roof boxes, and extra car storage solutions. Back-mounted design reduces drag, improves fuel efficiency, and provides secure storage for travel, camping, and everyday use. Available across Sweden and the Nordics. Book online, mount in minutes.",
  keywords: [
    "IXTAbox",
    "ixtarent",
    "IXTArent",
    "ixtarent rental",
    "ixtarent Sweden",
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
    siteName: "IXTAbox (ixtarent)",
    title: "IXTAbox Rent (ixtarent) - Roof Boxes & Extra Car Storage Rental",
    description: "Rent IXTAbox (ixtarent) - Aerodynamic roof boxes and extra car storage solutions. Back-mounted design reduces drag, improves fuel efficiency. Available across Sweden and the Nordics.",
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
    title: "IXTAbox Rent (ixtarent) - Roof Boxes & Extra Car Storage Rental",
    description: "Rent IXTAbox (ixtarent) - Aerodynamic roof boxes and extra car storage solutions. Back-mounted design reduces drag and improves fuel efficiency.",
    images: [`${siteUrl}/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg`],
  },
  alternates: {
    canonical: siteUrl,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo/titleicon.webp", sizes: "32x32", type: "image/webp" },
      { url: "/images/logo/titleicon.webp", sizes: "16x16", type: "image/webp" },
    ],
    shortcut: "/favicon.ico",
    apple: "/images/logo/titleicon.webp",
    other: [
      {
        rel: "icon",
        type: "image/webp",
        url: "/images/logo/titleicon.webp",
      },
    ],
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
  // Comprehensive Organization schema for better SEO and Google Knowledge Graph
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "IXTAbox",
    "alternateName": "ixtarent",
    "url": siteUrl,
    "logo": `${siteUrl}/images/logo/titleicon.webp`,
    "description": "Rent IXTAbox - Aerodynamic cargo boxes, roof boxes, and extra car storage solutions. Back-mounted design reduces drag, improves fuel efficiency. Available across Sweden and the Nordics.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+46-10-123-45-67",
      "contactType": "Customer Service",
      "email": "support@ixtabox.com",
      "availableLanguage": ["en", "sv"]
    },
    "sameAs": [
      // Add social media URLs when available
    ],
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "SE",
      "addressRegion": "Stockholm"
    },
    "areaServed": [
      {
        "@type": "Country",
        "name": "Sweden"
      },
      {
        "@type": "Country",
        "name": "Norway"
      },
      {
        "@type": "Country",
        "name": "Denmark"
      },
      {
        "@type": "Country",
        "name": "Finland"
      }
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "IXTAbox Rental Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "IXTAbox Pro 175",
            "description": "175 cm aerodynamic cargo box rental"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "IXTAbox Pro 190",
            "description": "190 cm aerodynamic cargo box rental"
          }
        }
      ]
    }
  };

  return (
    <html lang="en">
      <head>
        {/* Favicon links for Google search results - multiple sizes */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/webp" sizes="32x32" href="/images/logo/titleicon.webp" />
        <link rel="icon" type="image/webp" sizes="16x16" href="/images/logo/titleicon.webp" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/images/logo/titleicon.webp" />
        {/* Web App Manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://maps.gstatic.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
        {/* Preconnect to Stripe CDN for faster payment page loading */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        {/* Organization Schema for Google Knowledge Graph */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
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
