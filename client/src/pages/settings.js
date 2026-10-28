import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import InputBase from "@mui/material/InputBase";
import { useUser } from "@clerk/react";
import { PageHeader } from "../components/Gallery";
import { useColorMode } from "../colorMode";
import ModelPhotos from "../components/ModelPhotos";
import PhotoCleanup from "../components/PhotoCleanup";
import {
  DISPLAY_NAME_MAX,
  ACCENTS,
  CURRENCIES,
  saveDisplayName,
  savePreferences,
  usePreferences,
  formatPrice,
  currencySymbol,
} from "../profile";
import { SERIF, monoLabel } from "../theme";

const Section = ({ no, title, children }) => (
  <Box
    component="section"
    sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", md: "240px 1fr" },
      gap: { xs: 2, md: 4 },
      py: 4,
      borderTop: 1,
      borderColor: "divider",
    }}
  >
    <Stack direction="row" alignItems="baseline" gap={2}>
      <Typography sx={{ ...monoLabel, color: "primary.main" }}>{no}</Typography>
      <Typography component="h2" sx={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1 }}>{title}</Typography>
    </Stack>
    <Box sx={{ maxWidth: 560 }}>{children}</Box>
  </Box>
);

const Label = ({ children, htmlFor }) => (
  <Typography component="label" htmlFor={htmlFor} sx={{ ...monoLabel, color: "text.secondary", display: "block", mb: 1 }}>
    {children}
  </Typography>
);

const Settings = () => {
  const { user, isLoaded } = useUser();
  // `accent` is the color on screen, which updates before the save finishes
  const { mode, toggleMode, accent, setAccent } = useColorMode();
  const prefs = usePreferences();
  const [prefError, setPrefError] = useState("");

  // Applies right away, then saves to the account; reverts the accent if saving fails
  const updatePreference = async (changes) => {
    setPrefError("");
    if (changes.accent) setAccent(changes.accent);
    try {
      await savePreferences(user, changes);
    } catch (err) {
      console.log(err);
      if (changes.accent) setAccent(prefs.accent);
      setPrefError("Couldn't save that change. Try again.");
    }
  };

  const saved = user?.unsafeMetadata?.displayName || "";
  const [name, setName] = useState(saved);
  const [status, setStatus] = useState(null); // null | "saving" | "saved" | error message

  // Fill the field once Clerk has loaded the user
  useEffect(() => {
    if (isLoaded) setName(saved);
  }, [isLoaded, saved]);

  const trimmed = name.trim();
  const changed = trimmed !== saved.trim();
  const preview = trimmed || user?.firstName || "";

  const handleSave = async (e) => {
    e.preventDefault();
    if (trimmed.length > DISPLAY_NAME_MAX) {
      setStatus(`Keep it to ${DISPLAY_NAME_MAX} characters or fewer.`);
      return;
    }
    setStatus("saving");
    try {
      await saveDisplayName(user, trimmed);
      setName(trimmed);
      setStatus("saved");
    } catch (err) {
      console.log(err);
      setStatus("Couldn't save your name. Try again.");
    }
  };

  const isError = status && !["saving", "saved"].includes(status);

  return (
    <React.Fragment>
      <PageHeader title="Settings" />
      <Box sx={{ px: { xs: 2, sm: 4 }, pb: 8 }}>

        <Section no="01" title="Profile">
          <Box component="form" onSubmit={handleSave} noValidate>
            <Label htmlFor="display-name">What should we call you?</Label>
            <Stack
              direction="row"
              alignItems="center"
              gap={2}
              sx={{
                borderBottom: 1,
                borderColor: isError ? "error.main" : "text.primary",
                pb: 0.5,
                "&:focus-within": { borderColor: isError ? "error.main" : "primary.main" },
              }}
            >
              <InputBase
                id="display-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setStatus(null);
                }}
                placeholder={user?.firstName || "Your name"}
                inputProps={{ maxLength: DISPLAY_NAME_MAX + 10, autoComplete: "nickname" }}
                sx={{
                  flex: 1,
                  fontFamily: SERIF,
                  fontStyle: "italic",
                  fontSize: 32,
                  "& input::placeholder": { color: "text.disabled", opacity: 1 },
                }}
              />
              <Typography sx={{ ...monoLabel, color: trimmed.length > DISPLAY_NAME_MAX ? "error.main" : "text.disabled" }}>
                {trimmed.length}/{DISPLAY_NAME_MAX}
              </Typography>
            </Stack>

            <Typography variant="body2" color={isError ? "error.main" : "text.secondary"} sx={{ mt: 1.5 }}>
              {isError
                ? status
                : `Used in greetings around the app. Leave it blank to use ${user?.firstName ? `your first name, ${user.firstName}` : "your account name"}.`}
            </Typography>

            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ mt: 3 }}>
              <Typography sx={{ ...monoLabel, color: "text.disabled" }}>
                Preview:{" "}
                <Box component="span" sx={{ color: "text.secondary" }}>
                  Welcome back{preview ? `, ${preview}` : ""}.
                </Box>
              </Typography>
              <Stack direction="row" alignItems="center" gap={2}>
                {status === "saved" && !changed && (
                  <Typography sx={{ ...monoLabel, color: "primary.main" }}>Saved</Typography>
                )}
                <Button type="submit" variant="contained" disabled={!isLoaded || status === "saving"}>
                  {status === "saving" ? "Saving…" : "Save"}
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Section>

        <Section no="02" title="Appearance">
          <Label>Mode</Label>
          <Stack direction="row" gap={1}>
            {["dark", "light"].map((m) => (
              <Box
                key={m}
                component="button"
                onClick={() => m !== mode && toggleMode()}
                aria-pressed={mode === m}
                sx={{
                  ...monoLabel,
                  padding: "6px 14px",
                  cursor: "pointer",
                  background: "none",
                  border: 1,
                  borderColor: mode === m ? "primary.main" : "divider",
                  color: mode === m ? "primary.main" : "text.secondary",
                  "&:hover": { color: mode === m ? "primary.main" : "text.primary" },
                }}
              >
                {m}
              </Box>
            ))}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Saved on this device. You can also switch with the sun and moon icon in the menu bar.
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Label>Accent color</Label>
            <Stack direction="row" gap={1.5} flexWrap="wrap" role="radiogroup" aria-label="Accent color">
              {ACCENTS.map(({ name, value }) => {
                const active = accent === value;
                return (
                  <Box
                    key={value}
                    component="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={name}
                    title={name}
                    onClick={() => !active && updatePreference({ accent: value })}
                    sx={{
                      width: 36,
                      height: 36,
                      p: 0,
                      cursor: "pointer",
                      bgcolor: value,
                      border: 1,
                      borderColor: "divider",
                      outline: "2px solid",
                      outlineColor: active ? "text.primary" : "transparent",
                      outlineOffset: 3,
                      transition: "outline-color 120ms",
                      "&:hover": { outlineColor: active ? "text.primary" : "grey.400" },
                    }}
                  />
                );
              })}
            </Stack>
            <Typography sx={{ ...monoLabel, color: "text.secondary", mt: 1.5 }}>
              {ACCENTS.find((a) => a.value === accent)?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Used for buttons, links and highlights. Saved to your account, so it follows you to other devices.
            </Typography>
          </Box>
          {prefError && (
            <Typography variant="body2" color="error.main" sx={{ mt: 2 }}>{prefError}</Typography>
          )}
        </Section>

        <Section no="03" title="Currency">
          <Label>Show prices in</Label>
          <Box
            role="radiogroup"
            aria-label="Currency"
            sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 1 }}
          >
            {CURRENCIES.map(({ code, name }) => {
              const active = prefs.currency === code;
              return (
                <Box
                  key={code}
                  component="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => !active && updatePreference({ currency: code })}
                  sx={{
                    textAlign: "left",
                    p: 1.5,
                    cursor: "pointer",
                    background: "none",
                    border: 1,
                    borderColor: active ? "primary.main" : "divider",
                    color: "text.primary",
                    "&:hover": { borderColor: active ? "primary.main" : "text.secondary" },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography sx={{ ...monoLabel, color: active ? "primary.main" : "text.primary" }}>{code}</Typography>
                    <Typography sx={{ fontFamily: SERIF, fontSize: 18, color: active ? "primary.main" : "text.secondary" }}>
                      {currencySymbol(code)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{name}</Typography>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ ...monoLabel, color: "text.disabled", mt: 2 }}>
            Preview:{" "}
            <Box component="span" sx={{ color: "text.secondary" }}>{formatPrice("120", prefs.currency)}</Box>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Wishlist prices are converted into this currency using daily exchange rates, marked with ≈. Hover a price to see what the store lists it at.
          </Typography>
        </Section>

        <Section no="04" title="Try-on photos">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Photos of you for virtual try-on, coming soon. For the best results use a full-length photo, facing the
            camera, in good light against a plain background. JPG, PNG or WebP, up to 5 MB.
          </Typography>
          <ModelPhotos />
        </Section>

        <Section no="05" title="Photo cleanup">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            New photos have their backgrounds removed and are centered automatically. This does the same for
            photos you added before that. Originals are kept, so you can restore any photo from its edit page.
          </Typography>
          <PhotoCleanup />
        </Section>

      </Box>
    </React.Fragment>
  );
};

export default Settings;
