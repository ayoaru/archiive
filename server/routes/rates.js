const express = require("express");
const axios = require("axios");

const router = express.Router();

// Free, keyless daily rates (covers NGN, unlike the ECB-based feeds).
// Rates are USD-based: 1 USD = rates[code].
const RATES_URL = "https://open.er-api.com/v6/latest/USD";
const CACHE_MS = 12 * 60 * 60 * 1000;

let cache = null; // { base, rates, updatedAt, fetchedAt }

const fetchRates = async () => {
  const { data } = await axios.get(RATES_URL, { timeout: 8000 });
  if (data?.result !== "success" || !data.rates) throw new Error("Bad rates response");
  return {
    base: data.base_code,
    rates: data.rates,
    updatedAt: new Date(data.time_last_update_unix * 1000).toISOString(),
    fetchedAt: Date.now(),
  };
};

// Exchange rates for converting wishlist prices into the user's currency
router.get("/rates", async (req, res) => {
  try {
    if (!cache || Date.now() - cache.fetchedAt > CACHE_MS) {
      cache = await fetchRates();
    }
    res.json({ base: cache.base, rates: cache.rates, updatedAt: cache.updatedAt });
  } catch (error) {
    console.error("Error fetching exchange rates:", error.message);
    // Serve stale rates rather than nothing if the provider is down
    if (cache) return res.json({ base: cache.base, rates: cache.rates, updatedAt: cache.updatedAt, stale: true });
    res.status(503).json({ error: "Exchange rates are unavailable right now" });
  }
});

module.exports = router;
