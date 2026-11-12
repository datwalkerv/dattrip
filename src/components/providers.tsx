"use client";

import { AppRoot, type ColorSchemePreference, ConfigProvider } from "datui";
import { createContext, useContext, useEffect, useState } from "react";

const KEY = "dattrip:theme";
const ThemeContext = createContext<{ theme: ColorSchemePreference; setTheme: (t: ColorSchemePreference) => void }>({ theme: "system", setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorSchemePreference>("system");
  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    // Read after mount: the server can't know the saved theme, and the inline script in layout.tsx already painted it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "light" || saved === "dark") setThemeState(saved);
  }, []);
  const setTheme = (t: ColorSchemePreference) => {
    setThemeState(t);
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  };
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <ConfigProvider colorScheme={theme}>
        <AppRoot>{children}</AppRoot>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
