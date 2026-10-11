// User theme preference (System / Light / Dark), persisted across launches.
// "system" follows the OS appearance; the other two override it. Screens read the
// resolved "light"|"dark" via useResolvedScheme(); the setter lives on useThemePref().
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

const KEY = "binit_theme_pref";

export type ThemePref = "system" | "light" | "dark";
export type Scheme = "light" | "dark";

type ThemePrefValue = {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  /** The actual scheme to render after applying pref over the OS setting. */
  scheme: Scheme;
};

const ThemePrefContext = createContext<ThemePrefValue>({
  pref: "system",
  setPref: () => {},
  scheme: "light",
});

function isPref(v: string | null): v is ThemePref {
  return v === "system" || v === "light" || v === "dark";
}

export function ThemePrefProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [pref, setPrefState] = useState<ThemePref>("system");

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((saved) => {
      if (isPref(saved)) setPrefState(saved);
    });
  }, []);

  const setPref = (p: ThemePref) => {
    setPrefState(p);
    void SecureStore.setItemAsync(KEY, p);
  };

  const scheme: Scheme = pref === "system" ? (system === "dark" ? "dark" : "light") : pref;

  const value = useMemo(() => ({ pref, setPref, scheme }), [pref, scheme]);
  return <ThemePrefContext.Provider value={value}>{children}</ThemePrefContext.Provider>;
}

export function useThemePref() {
  return useContext(ThemePrefContext);
}

export function useResolvedScheme(): Scheme {
  return useContext(ThemePrefContext).scheme;
}
