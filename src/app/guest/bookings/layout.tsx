import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export const metadata: Metadata = {
  title: "Book Roof Boxes & Extra Car Storage - Check Availability & Reserve",
  description:
    "Book your roof box, cargo box, or extra car storage rental. Check availability at locations near you, select dates and box model, and complete your reservation online. Perfect for travel, camping, and storage needs.",
  keywords: [
    "book roof box",
    "book IXTAbox",
    "roof box booking",
    "IXTAbox booking",
    "cargo box reservation",
    "rent roof box",
    "rent cargo box",
    "extra car storage booking",
    "car storage reservation",
    "IXTAbox availability",
    "roof box availability",
  ],
  openGraph: {
    title: "Book Roof Boxes & Extra Car Storage - Check Availability",
    description: "Book your roof box, cargo box, or extra car storage rental. Check availability and reserve online.",
    url: `${siteUrl}/guest/bookings`,
  },
  alternates: {
    canonical: `${siteUrl}/guest/bookings`,
  },
};

export default function BookingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
