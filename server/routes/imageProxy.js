const express = require("express");
const axios = require("axios");
const { fetchRemoteImage } = require("../utils/safeFetch");
const { normalizeLink } = require("../utils/linkInput");

const router = express.Router();

// Streams an S3 object back through our own origin so the browser can `fetch()`
// it without hitting S3 CORS restrictions (used by client-side background removal).
// Only ever proxies URLs pointing at our own bucket — never an arbitrary URL.
router.get("/image-proxy", async (req, res) => {
  try {
    const { url } = req.query;
    const allowedHost = `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`;

    if (!url) return res.status(400).json({ error: "url is required" });

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid url" });
    }

    if (parsed.hostname !== allowedHost) {
      return res.status(403).json({ error: "url must point at this app's S3 bucket" });
    }

    const response = await axios.get(url, { responseType: "arraybuffer" });
    res.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error("Error proxying image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fetches a scraped product photo from another site so the browser can read
// its pixels for background removal (other sites don't allow that directly).
// Locked down in utils/safeFetch.js: https, public addresses, images, 10 MB.
router.get("/image-fetch", async (req, res) => {
  try {
    const { url, error } = normalizeLink(req.query.url);
    if (error) return res.status(400).json({ error });

    const { buffer, contentType } = await fetchRemoteImage(url);
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=3600");
    res.send(buffer);
  } catch (error) {
    console.error("Error fetching remote image:", error.message);
    res.status(400).json({ error: "Couldn't fetch that image" });
  }
});

module.exports = router;
