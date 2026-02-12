import type { Metadata } from "next";
import GuestHome from "./guest/page";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export const metadata: Metadata = {
  title: "IXTAbox Rent - Roof Boxes & Extra Car Storage & Back Boxes | Sweden",
  description:
    "Rent roof boxes, cargo boxes, and extra car storage solutions. Aerodynamic design for improved efficiency and smoother driving. Perfect for travel, camping, and everyday storage needs. Available across Sweden and the Nordics. Book online, mount in minutes.",
  keywords: [
    "IXTAbox",
    "ixtarent",
    "IXTArent",
    "ixtarent rental",
    "ixtarent Sweden",
    "roof box rental",
    "rent roof box",
    "roof boxes",
    "cargo box rental",
    "extra car storage",  
    "car storage rental",
    "roof cargo box",
    "car roof box",
    "back box",
    "vehicle storage",
    "car luggage box",
    "towbar cargo box",
    "aerodynamic cargo box",
    "car storage box",
    "roof box hire",
    "Sweden back boxes",
    "Nordics",
    "rent a back box",
    "rent roof box Sweden",
    "Stockholm",
  ],
  openGraph: {
    title: "IXTAbox Rent (ixtarent) - Roof Boxes & Extra Car Storage",
    description: "Rent IXTAbox (ixtarent) - Roof boxes, cargo boxes, and extra car storage solutions. Aerodynamic design for improved efficiency and smoother driving.",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/images/background/IXTAbox_Hero_Shot_Summer_2025.jpg`,
        width: 1200,
        height: 630,
        alt: "IXTAbox cargo box on car",
      },
    ],
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function Page() {
  return <GuestHome />;
}