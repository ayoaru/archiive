import { createTheme, darken } from "@mui/material/styles";

// The one accent color. Keep it here (not in components) so a user-chosen
// accent can replace it later.
export const ACCENT = "#4D7BFF";

export const SERIF = "'Fraunces', Georgia, serif";
export const SANS = "'Space Grotesk', system-ui, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, monospace";

// Small uppercase catalogue label, e.g. "001 / TOPS"
export const monoLabel = {
    fontFamily: MONO,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
};

// Raw colors for each mode. The light mode accent is a shade darker so small
// accent text stays readable on white.
export const TOKENS = {
    dark: {
        accent: ACCENT,
        ink: "#0E0E0E",
        paper: "#141414",
        text: "#EDEDED",
        muted: "#8A8A8A",
        disabled: "#555555",
        rule: "#2E2E2E",
        ruleStrong: "#3A3A3A",
        overlay: "rgba(14,14,14,0.7)",
        grey: {
            50: "#161616", 100: "#1C1C1C", 200: "#222222", 300: "#2A2A2A",
            400: "#555555", 500: "#777777", 600: "#999999", 700: "#BBBBBB",
            800: "#DDDDDD", 900: "#EDEDED",
        },
    },
    light: {
        accent: darken(ACCENT, 0.15),
        ink: "#FAFAF8",
        paper: "#FFFFFF",
        text: "#111111",
        muted: "#6B6B6B",
        disabled: "#A3A3A3",
        rule: "#E2E2DE",
        ruleStrong: "#111111",
        overlay: "rgba(250,250,248,0.8)",
        grey: {
            50: "#F7F7F5", 100: "#EFEFEC", 200: "#E8E8E4", 300: "#DCDCD8",
            400: "#AAAAA6", 500: "#888884", 600: "#666662", 700: "#444442",
            800: "#222221", 900: "#111111",
        },
    },
};

export const createAppTheme = (mode) => {
    const t = TOKENS[mode];

    return createTheme({
        palette: {
            mode,
            primary: { main: t.accent, contrastText: mode === "dark" ? t.ink : "#FFFFFF" },
            secondary: { main: t.text, contrastText: t.ink },
            error: { main: mode === "dark" ? "#FF5A4E" : "#D93025" },
            success: { main: mode === "dark" ? "#3FB97A" : "#1E8E55" },
            background: { default: t.ink, paper: t.paper },
            divider: t.rule,
            text: { primary: t.text, secondary: t.muted, disabled: t.disabled },
            grey: t.grey,
            overlay: t.overlay,
        },
        shape: { borderRadius: 0 },
        typography: {
            fontFamily: SANS,
            h1: { fontFamily: SERIF, fontWeight: 400 },
            h2: { fontFamily: SERIF, fontWeight: 400 },
            h3: { fontFamily: SERIF, fontWeight: 400 },
            h4: { fontFamily: SERIF, fontWeight: 400, fontStyle: "italic", lineHeight: 1 },
            h5: { fontFamily: SERIF, fontWeight: 400 },
            h6: { fontFamily: SERIF, fontWeight: 400 },
            button: { fontFamily: MONO, fontSize: 12, letterSpacing: "0.08em" },
            overline: monoLabel,
            caption: { fontFamily: MONO, fontSize: 11 },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    ":root": { "--accent": t.accent },
                    body: { backgroundColor: t.ink },
                    "::selection": { background: t.accent, color: mode === "dark" ? t.ink : "#FFFFFF" },
                    // Thin square scrollbar: hairline track, grey thumb, accent on hover.
                    // Chrome ignores the ::-webkit rules if scrollbar-color is set, so
                    // the standard properties only apply where webkit ones don't (Firefox).
                    "@supports not selector(::-webkit-scrollbar)": {
                        "*": { scrollbarWidth: "thin", scrollbarColor: `${t.grey[400]} transparent` },
                    },
                    "*::-webkit-scrollbar": { width: 8, height: 8 },
                    "*::-webkit-scrollbar-track": { background: t.ink, borderLeft: `1px solid ${t.rule}` },
                    "*::-webkit-scrollbar-thumb": { background: t.grey[400], borderRadius: 0 },
                    "*::-webkit-scrollbar-thumb:hover": { background: t.accent },
                    "*::-webkit-scrollbar-corner": { background: t.ink },
                },
            },
            MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
            MuiAppBar: {
                defaultProps: { elevation: 0, color: "transparent" },
            },
            MuiCard: {
                defaultProps: { variant: "outlined" },
                styleOverrides: { root: { backgroundColor: "transparent", borderColor: t.rule } },
            },
            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: {
                    root: { borderRadius: 0 },
                    outlined: { borderColor: t.ruleStrong },
                },
            },
            MuiTab: { styleOverrides: { root: { fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em" } } },
            MuiChip: { styleOverrides: { root: { borderRadius: 0, fontFamily: MONO, fontSize: 11 } } },
            MuiDialog: {
                styleOverrides: { paper: { border: `1px solid ${t.ruleStrong}`, backgroundColor: t.ink } },
            },
            MuiDialogTitle: { styleOverrides: { root: { fontFamily: SERIF, fontStyle: "italic" } } },
            MuiOutlinedInput: {
                styleOverrides: { notchedOutline: { borderColor: mode === "dark" ? t.ruleStrong : t.grey[300] } },
            },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: { borderRadius: 0, fontFamily: MONO, fontSize: 11, backgroundColor: t.text, color: t.ink },
                },
            },
        },
    });
};

// Clerk's sign-in and account widgets, matched to the current mode
export const clerkAppearance = (mode) => {
    const t = TOKENS[mode];
    return {
        variables: {
            colorPrimary: t.accent,
            colorPrimaryForeground: mode === "dark" ? t.ink : "#FFFFFF",
            colorBackground: t.paper,
            colorForeground: t.text,
            colorMutedForeground: t.muted,
            colorInput: t.ink,
            colorInputForeground: t.text,
            colorNeutral: t.text,
            colorBorder: mode === "dark" ? t.ruleStrong : t.grey[300],
            borderRadius: "0",
            fontFamily: SANS,
        },
    };
};
