import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export const metadata: Metadata = {
  title: "Rent Roof Boxes & Extra Car Storage - IXTAbox | Browse Locations",
  description:
    "Browse and rent roof boxes, cargo boxes, and extra car storage solutions across Sweden and the Nordics. Find locations near you, check availability, and book online. Perfect for travel, camping, and everyday storage needs.",
  keywords: [
    "roof box rental",
    "roof boxes",
    "IXTAbox rental",
    "cargo box rental Sweden",
    "extra car storage",
    "car storage rental",
    "roof cargo box rental",
    "car roof box rental",
    "towbar cargo box rental",
    "IXTAbox locations",
    "rent cargo box",
    "rent roof box",
    "car storage solutions",
    "aerodynamic storage rental",
    "Stockholm roof box",
    "Gothenburg car storage",
  ],
  openGraph: {
    title: "Rent Roof Boxes & Extra Car Storage - IXTAbox",
    description: "Browse and rent roof boxes, cargo boxes, and extra car storage solutions across Sweden and the Nordics. Find locations near you, check availability, and book online.",
    url: `${siteUrl}/guest`,
    images: [
      {
        url: `${siteUrl}/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg`,
        width: 1200,
        height: 630,
        alt: "IXTAbox cargo box rental locations",
      },
    ],
  },
  alternates: {
    canonical: `${siteUrl}/guest`,
  },
};

export default function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
