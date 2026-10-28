import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useUser } from "@clerk/react";
import { useColorMode } from "./colorMode";

// User preferences live in Clerk's user metadata, so they follow the user
// across devices. Light/dark mode is the exception: it's per device (colorMode.js).

export const DISPLAY_NAME_MAX = 40;

export const ACCENTS = [
  { name: "Electric blue", value: "#4D7BFF" },
  { name: "Signal red", value: "#FF4D2E" },
  { name: "Acid lime", value: "#C6FF3D" },
  { name: "Hot pink", value: "#FF3DA5" },
  { name: "Amber", value: "#FFB020" },
  { name: "Violet", value: "#A98BFF" },
];
export const DEFAULT_ACCENT = ACCENTS[0].value;

export const CURRENCIES = [
  { code: "USD", name: "US dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British pound" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "AUD", name: "Australian dollar" },
  { code: "JPY", name: "Japanese yen" },
  { code: "CNY", name: "Chinese yuan" },
  { code: "INR", name: "Indian rupee" },
  { code: "CHF", name: "Swiss franc" },
  { code: "NGN", name: "Nigerian naira" },
];
export const DEFAULT_CURRENCY = "USD";

const isAccent = (v) => ACCENTS.some((a) => a.value === v);
const isCurrency = (v) => CURRENCIES.some((c) => c.code === v);

// The user's saved preferences, with defaults filled in
export const usePreferences = () => {
  const { user, isLoaded } = useUser();
  const meta = user?.unsafeMetadata || {};
  const custom = typeof meta.displayName === "string" ? meta.displayName.trim() : "";

  return {
    isLoaded,
    displayName: custom || user?.firstName || "",
    accent: isAccent(meta.accent) ? meta.accent : DEFAULT_ACCENT,
    currency: isCurrency(meta.currency) ? meta.currency : DEFAULT_CURRENCY,
  };
};

// What the app calls the user: their chosen display name, else their first name
export const useDisplayName = () => usePreferences().displayName;

// Merges `changes` into the user's metadata without dropping other preferences
export const savePreferences = (user, changes) =>
  user.update({ unsafeMetadata: { ...user.unsafeMetadata, ...changes } });

// Saves (or clears, when blank) the display name
export const saveDisplayName = (user, name) =>
  savePreferences(user, { displayName: name.trim() });

// The currency's symbol, e.g. "$" or "£"
export const currencySymbol = (currency) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "narrowSymbol" })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value || currency;

// Wishlist prices saved before currencies were tracked are in US dollars
// (the old UI labelled them "£", but the stored amounts were USD)
export const LEGACY_PRICE_CURRENCY = "USD";

// Number from a stored price string ("120", "£89.99"), or NaN
const parseAmount = (price) =>
  price === undefined || price === null || price === "" ? NaN : parseFloat(String(price).replace(/[^0-9.]/g, ""));

const formatMoney = (amount, currency, approx = false) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: approx || Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: approx ? 0 : 2,
  }).format(amount);

// Formats a stored price string in the given currency, without converting it
export const formatPrice = (price, currency) => {
  const amount = parseAmount(price);
  if (Number.isNaN(amount)) return price ? String(price) : "";
  return formatMoney(amount, currency);
};

// Exchange rates (USD-based) from the server, fetched once per session and shared
let ratesPromise = null;
const loadRates = () => {
  if (!ratesPromise) {
    ratesPromise = axios
      .get("/rates")
      .then((r) => r.data.rates)
      .catch((e) => {
        console.log(e);
        ratesPromise = null; // try again next time
        return null;
      });
  }
  return ratesPromise;
};

export const useRates = () => {
  const [rates, setRates] = useState(null);
  useEffect(() => {
    let live = true;
    loadRates().then((r) => live && setRates(r));
    return () => {
      live = false;
    };
  }, []);
  return rates;
};

// Converts between currencies via USD-based rates; null if a rate is missing
export const convert = (amount, from, to, rates) => {
  if (from === to) return amount;
  if (!rates?.[from] || !rates?.[to]) return null;
  return (amount / rates[from]) * rates[to];
};

// Price display for a wishlist item in the user's currency. Returns
// { label, original }: `original` is the listed price when it was converted.
// If rates can't load, the listed price is shown as-is rather than mislabelled.
export const usePriceFormatter = () => {
  const { currency } = usePreferences();
  const rates = useRates();

  return (price, from = LEGACY_PRICE_CURRENCY) => {
    const amount = parseAmount(price);
    if (Number.isNaN(amount)) return { label: price ? String(price) : "", original: null };

    const source = from || LEGACY_PRICE_CURRENCY;
    if (source === currency) return { label: formatMoney(amount, currency), original: null };

    const converted = convert(amount, source, currency, rates);
    if (converted === null) return { label: formatMoney(amount, source), original: null };
    return { label: `≈ ${formatMoney(converted, currency, true)}`, original: formatMoney(amount, source) };
  };
};

// Applies the user's saved accent to the theme once per account (on sign-in or
// an account switch). Renders nothing. After that, Settings sets the theme
// directly when the user picks a color; re-applying saved values here raced
// those saves (Clerk's user data still holds the old accent mid-save) and made
// the previous color flash back.
export const AccentSync = () => {
  const { user } = useUser();
  const userId = user?.id;
  const { accent } = usePreferences();
  const { setAccent } = useColorMode();
  const appliedFor = useRef(null);

  useEffect(() => {
    if (!userId || appliedFor.current === userId) return;
    appliedFor.current = userId;
    setAccent(accent);
  }, [userId, accent, setAccent]);

  return null;
};
