import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme, ACCENT } from "./theme";

const MODE_KEY = "archiive-color-mode";
const ACCENT_KEY = "archiive-accent";

const ColorModeContext = createContext({
  mode: "dark",
  toggleMode: () => {},
  accent: ACCENT,
  setAccent: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice just won't persist on this device
  }
};

// Dark is the default look; the mode is remembered per device. The accent comes
// from the user's account (see AccentSync) and is cached here so a reload
// doesn't flash the default color first.
export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => (read(MODE_KEY) === "light" ? "light" : "dark"));
  const [accent, setAccent] = useState(() => read(ACCENT_KEY) || ACCENT);

  useEffect(() => write(MODE_KEY, mode), [mode]);
  useEffect(() => write(ACCENT_KEY, accent), [accent]);

  const value = useMemo(
    () => ({
      mode,
      toggleMode: () => setMode((m) => (m === "dark" ? "light" : "dark")),
      accent,
      setAccent,
    }),
    [mode, accent]
  );
  const theme = useMemo(() => createAppTheme(mode, accent), [mode, accent]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
