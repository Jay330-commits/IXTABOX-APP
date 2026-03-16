/**
 * Get current position and reverse-geocode to address fields.
 * Uses browser geolocation + Nominatim (OpenStreetMap) – no API key required.
 */

export type AddressFromLocation = {
  line1: string;
  city: string;
  postalCode: string;
  country: string;
};

export function getAddressFromLocation(): Promise<AddressFromLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation) {
      reject(new Error("Geolocation is not supported"));
      return;
    }
    const options: PositionOptions = {
      enableHighAccuracy: true,  // Prefer GPS, not IP/Wi‑Fi cache
      maximumAge: 0,             // No cached position – get real location
      timeout: 15000,
    };
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { "Accept-Language": "en" } }
          );
          if (!res.ok) throw new Error("Address lookup failed");
          const data = await res.json();
          const a = data?.address || {};
          const road = [a.road, a.house_number].filter(Boolean).join(" ") || a.road || a.pedestrian || "";
          const city = a.city || a.town || a.village || a.municipality || "";
          const postalCode = a.postcode || "";
          const country = a.country || "";
          resolve({ line1: road.trim(), city, postalCode, country });
        } catch (e) {
          reject(e);
        }
      },
      (err) => reject(err),
      options
    );
  });
}
