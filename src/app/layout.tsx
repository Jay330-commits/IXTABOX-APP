import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
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
  // Ensure Google uses the favicon, not random page images
  other: {
    'google-site-verification': process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || '',
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

// Enables iOS safe-area insets (env(safe-area-inset-*)) so bottom buttons
// aren't hidden behind the home indicator; helps with mobile + cache issues
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
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
    "logo": {
      "@type": "ImageObject",
      "url": `${siteUrl}/images/logo/titleicon.webp`,
      "width": 192,
      "height": 192
    },
    "description": "Rent IXTAbox - Aerodynamic cargo boxes, roof boxes, and extra car storage solutions. Back-mounted design reduces drag, improves fuel efficiency. Available across Sweden and the Nordics.",
    "foundingDate": "2024",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+46-70-2223250",
      "contactType": "Customer Service",
      "email": "developerixtarent@gmail.com",
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
        {/* Favicon links for Google search results - multiple sizes - MUST BE FIRST */}
        {/* Primary favicon - Google will use this */}
        <link rel="icon" href={`${siteUrl}/favicon.ico`} sizes="any" />
        <link rel="icon" type="image/webp" sizes="192x192" href={`${siteUrl}/images/logo/titleicon.webp`} />
        <link rel="icon" type="image/webp" sizes="32x32" href={`${siteUrl}/images/logo/titleicon.webp`} />
        <link rel="icon" type="image/webp" sizes="16x16" href={`${siteUrl}/images/logo/titleicon.webp`} />
        <link rel="shortcut icon" href={`${siteUrl}/favicon.ico`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`${siteUrl}/images/logo/titleicon.webp`} />
        {/* Explicit site icon for Google and other search engines */}
        <meta name="msapplication-TileImage" content={`${siteUrl}/images/logo/titleicon.webp`} />
        <meta name="msapplication-TileColor" content="#06b6d4" />
        {/* Tell Google to use this as the site icon */}
        <link rel="icon" type="image/webp" href={`${siteUrl}/images/logo/titleicon.webp`} />
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
        {/* Explicit site icon meta tag for Google - tells Google which image to use */}
        <meta name="google-site-verification" content={process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || ""} />
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
