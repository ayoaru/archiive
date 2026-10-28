import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { createAppTheme } from "./theme";

const STORAGE_KEY = "archiive-color-mode";

const ColorModeContext = createContext({ mode: "dark", toggleMode: () => {} });

export const useColorMode = () => useContext(ColorModeContext);

// Dark is the default look; the user's choice is remembered on this device.
const readSavedMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(readSavedMode);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Storage blocked: the choice just won't persist
    }
  }, [mode]);

  const value = useMemo(
    () => ({ mode, toggleMode: () => setMode((m) => (m === "dark" ? "light" : "dark")) }),
    [mode]
  );
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
