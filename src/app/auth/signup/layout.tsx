import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ixtabox.com';

export const metadata: Metadata = {
  title: "Sign Up - IXTAbox",
  description: "Create your IXTAbox account to start renting cargo boxes.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
