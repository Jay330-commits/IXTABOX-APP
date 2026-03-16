"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type LocationModalContextType = {
  isLocationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;
};

const LocationModalContext = createContext<LocationModalContextType | undefined>(undefined);

export function LocationModalProvider({ children }: { children: ReactNode }) {
  const [isLocationModalOpen, setLocationModalOpen] = useState(false);
  const setOpen = useCallback((open: boolean) => setLocationModalOpen(open), []);
  return (
    <LocationModalContext.Provider value={{ isLocationModalOpen, setLocationModalOpen: setOpen }}>
      {children}
    </LocationModalContext.Provider>
  );
}

export function useLocationModal(): LocationModalContextType {
  const ctx = useContext(LocationModalContext);
  if (ctx === undefined) {
    return {
      isLocationModalOpen: false,
      setLocationModalOpen: () => {},
    };
  }
  return ctx;
}
