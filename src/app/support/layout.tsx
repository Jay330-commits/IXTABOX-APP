import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export const metadata: Metadata = {
  title: "Support & FAQ - Roof Boxes & Car Storage Rental",
  description:
    "Get help with roof box, cargo box, and extra car storage rentals. Find answers to frequently asked questions about booking, mounting, cancellation, and more.",
  keywords: [
    "roof box support",
    "IXTAbox support",
    "roof box FAQ",
    "IXTAbox FAQ",
    "cargo box help",
    "car storage help",
    "rental support",
    "IXTAbox customer service",
    "roof box questions",
  ],
  openGraph: {
    title: "Support & FAQ - Roof Boxes & Car Storage Rental",
    description: "Get help with roof box, cargo box, and extra car storage rentals. Find answers to frequently asked questions.",
    url: `${siteUrl}/support`,
  },
  alternates: {
    canonical: `${siteUrl}/support`,
  },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
