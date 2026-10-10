// Shared selected-city state. Every API call takes city=<slug>, so the choice
// lives app-wide. Defaults to orlando (the home city) and persists across launches.
import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

const KEY = "binit_city";
const DEFAULT_CITY = "orlando";

type CityContextValue = {
  city: string;
  setCity: (slug: string) => void;
};

const CityContext = createContext<CityContextValue>({
  city: DEFAULT_CITY,
  setCity: () => {},
});

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState(DEFAULT_CITY);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((saved) => {
      if (saved) setCityState(saved);
    });
  }, []);

  const setCity = (slug: string) => {
    setCityState(slug);
    void SecureStore.setItemAsync(KEY, slug);
  };

  return <CityContext.Provider value={{ city, setCity }}>{children}</CityContext.Provider>;
}

export function useCity() {
  return useContext(CityContext);
}
