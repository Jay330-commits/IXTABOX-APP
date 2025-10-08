"use client"; // Required for client-side rendering
import React from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

type MapProps = {
  addresses: { id: number; lat: number; lng: number; title: string }[];
};

const containerStyle = {
  width: "100%",
  height: "500px",
};

const center = {
  lat: 59.3293,
  lng: 18.0686,
};

export default function Map({ addresses }: MapProps) {
  return (
    <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={12}>
        {addresses.map((a) => (
          <Marker key={a.id} position={{ lat: a.lat, lng: a.lng }} title={a.title} />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}
