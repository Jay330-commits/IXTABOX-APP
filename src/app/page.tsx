import type { Metadata } from "next";
import GuestHome from "./guest/page";

export const metadata: Metadata = {
  title: "Back-Mounted Cargo Box Rentals",
  description:
    "Rent an aerodynamic rear cargo box designed for improved efficiency and smoother driving.",
};

export default function Page() {
  return <GuestHome />;
}