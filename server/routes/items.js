const express = require("express");
const upload = require("../middleware/upload");
const { Closet, Wishlist } = require("../models/item");
const cheerio = require("cheerio");
const {
  uploadToS3,
  deleteFromS3,
  uploadUrlToS3,
  generatePresignedUrl,
  handleImageUpdate,
} = require("../utils/s3Helpers");
const { safeGet } = require("../utils/safeFetch");
const { normalizeLink } = require("../utils/linkInput");

const router = express.Router();

// ============= Closet Routes =============

// Create a new closet item
const uploadFields = upload.fields([
  { name: "imageFront", maxCount: 1 },
  { name: "imageBack", maxCount: 1 },
]);

router.post("/closet/create", uploadFields, async (req, res) => {
  try {
    let imageFrontKey = "";
    let imageBackKey = "";

    // Handle imageFront
    if (req.files?.imageFront?.[0]) {
      const file = req.files.imageFront[0];
      imageFrontKey = await uploadToS3(file.buffer, file.mimetype);
    } else if (req.body.imageFrontUrl) {
      imageFrontKey = await uploadUrlToS3(req.body.imageFrontUrl);
    }

    // Handle imageBack
    if (req.files?.imageBack?.[0]) {
      const file = req.files.imageBack[0];
      imageBackKey = await uploadToS3(file.buffer, file.mimetype);
    } else if (req.body.imageBackUrl) {
      imageBackKey = await uploadUrlToS3(req.body.imageBackUrl);
    }

    const newItem = await Closet.create({
      userId: req.userId,
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      imageFront: imageFrontKey,
      imageBack: imageBackKey,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all closet items with presigned URLs
router.get("/closet/read", async (req, res) => {
  try {
    const items = await Closet.find({ userId: req.userId });

    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const obj = item.toObject();
        obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
        obj.imageBackUrl = await generatePresignedUrl(item.imageBack);
        return obj;
      })
    );

    res.json(itemsWithUrls);
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single closet item by id
router.get("/closet/get/:id", async (req, res) => {
  try {
    const item = await Closet.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const obj = item.toObject();
    obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
    obj.imageBackUrl = await generatePresignedUrl(item.imageBack);
    // The edit form shows these when the user turns a cutout back off
    obj.imageFrontOriginalUrl = await generatePresignedUrl(item.imageFrontOriginal);
    obj.imageBackOriginalUrl = await generatePresignedUrl(item.imageBackOriginal);

    res.json(obj);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a closet item by id
router.put("/closet/update/:id", uploadFields, async (req, res) => {
  try {
    const existingItem = await Closet.findOne({ _id: req.params.id, userId: req.userId });
    if (!existingItem) return res.status(404).json({ error: "Item not found" });

    const imageFrontKey = await handleImageUpdate(
      existingItem.imageFront,
      req.files?.imageFront?.[0],
      req.body.imageFrontUrl,
      req.body.imageFront === ""
    );

    const imageBackKey = await handleImageUpdate(
      existingItem.imageBack,
      req.files?.imageBack?.[0],
      req.body.imageBackUrl,
      req.body.imageBack === ""
    );

    // A new or cleared photo makes any kept original (and a skip flag) stale
    const frontChanged = Boolean(req.files?.imageFront?.[0] || req.body.imageFrontUrl || req.body.imageFront === "");
    const backChanged = Boolean(req.files?.imageBack?.[0] || req.body.imageBackUrl || req.body.imageBack === "");
    if (frontChanged) await deleteFromS3(existingItem.imageFrontOriginal);
    if (backChanged) await deleteFromS3(existingItem.imageBackOriginal);

    await Closet.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, {
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      imageFront: imageFrontKey,
      imageBack: imageBackKey,
      imageFrontOriginal: frontChanged ? "" : existingItem.imageFrontOriginal,
      imageBackOriginal: backChanged ? "" : existingItem.imageBackOriginal,
      skipCutoutFront: frontChanged ? false : existingItem.skipCutoutFront,
      skipCutoutBack: backChanged ? false : existingItem.skipCutoutBack,
    });

    res.status(200).send("Item updated successfully!");
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a closet item by id
router.delete("/closet/delete/:id", async (req, res) => {
  try {
    const item = await Closet.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: "Item not found" });

    await deleteFromS3(item.imageFront);
    await deleteFromS3(item.imageBack);
    await deleteFromS3(item.imageFrontOriginal);
    await deleteFromS3(item.imageBackOriginal);
    await Closet.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    res.status(200).send("Item deleted successfully!");
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: error.message });
  }
});


// ============= Wishlist Routes =============

router.post("/wishlist/create", uploadFields, async (req, res) => {
  try {
    let imageFrontKey = "";
    let imageBackKey = "";

    if (req.files?.imageFront?.[0]) {
      const file = req.files.imageFront[0];
      imageFrontKey = await uploadToS3(file.buffer, file.mimetype);
    } else if (req.body.imageFrontUrl) {
      imageFrontKey = await uploadUrlToS3(req.body.imageFrontUrl);
    }

    if (req.files?.imageBack?.[0]) {
      const file = req.files.imageBack[0];
      imageBackKey = await uploadToS3(file.buffer, file.mimetype);
    } else if (req.body.imageBackUrl) {
      imageBackKey = await uploadUrlToS3(req.body.imageBackUrl);
    }

    const newItem = await Wishlist.create({
      userId: req.userId,
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      imageFront: imageFrontKey,
      imageBack: imageBackKey,
      price: req.body.price,
      currency: req.body.currency,
      link: req.body.link,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Wishlist URL scraping route
//
// Store pages are fetched with safeGet (https, public addresses only, size and
// redirect limits) since the URL comes from the user. Details are read from
// structured data first, and every text field is cleaned and length-capped so
// a loose selector can never return a whole page.

const MAX_NAME = 150;
const MAX_BRAND = 60;

// Collapses whitespace; "" if it isn't text or is too long to be real
const cleanText = (value, max) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > max ? "" : text;
};

// Valid ISO 4217 code, uppercased, or ""
const cleanCurrency = (code) => (/^[A-Za-z]{3}$/.test(code || "") ? code.toUpperCase() : "");

// Shopify stores report their checkout currency in /cart.js
const shopifyCurrency = async (url) => {
  try {
    const { data } = await safeGet(new URL(url).origin + "/cart.js", {
      accept: "application/json",
      responseType: "json",
    });
    return cleanCurrency(data?.currency);
  } catch {
    return "";
  }
};

// Every JSON-LD node on the page, with @graph entries flattened out
const jsonLdNodes = ($) => {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      for (const entry of [].concat(json)) nodes.push(...[].concat(entry?.["@graph"] || entry));
    } catch {
      // Malformed JSON-LD: skip it
    }
  });
  return nodes.filter((node) => node && typeof node === "object");
};

const hasType = (node, pattern) => [].concat(node["@type"] || []).some((t) => pattern.test(t));

// A schema.org name given as a string, an object with a name, or an @id
// reference to another node on the page
const nameOf = (value, byId) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.name) return value.name;
  return byId.get(value["@id"])?.name || "";
};

const imageUrls = (value) =>
  [].concat(value || [])
    .map((img) => (typeof img === "string" ? img : img?.url || img?.contentUrl || ""))
    .filter((src) => /^https:\/\//.test(src));

// Name, brand, images and price from the page's schema.org Product data
const productFromJsonLd = ($) => {
  const nodes = jsonLdNodes($);
  const byId = new Map(nodes.filter((n) => n["@id"]).map((n) => [n["@id"], n]));
  const product =
    nodes.find((n) => hasType(n, /^Product$/i)) || nodes.find((n) => hasType(n, /^ProductGroup$/i));
  if (!product) return {};

  const variant = [].concat(product.hasVariant || [])[0];
  const offer = [].concat(product.offers || variant?.offers || [])[0] || {};
  const organization = nodes.find((n) => hasType(n, /^(Brand|Organization)$/i));

  return {
    name: product.name,
    brand: nameOf(product.brand, byId) || nameOf(organization, byId),
    images: [...imageUrls(product.image), ...imageUrls(variant?.image)],
    price: offer.price ?? offer.lowPrice ?? "",
    currency: offer.priceCurrency || "",
  };
};

// First matching element with short text, skipping page-level wrappers
// (some sites put classes like "brand-base" on <body>)
const WRAPPER_TAGS = new Set(["html", "body", "main", "header", "footer", "nav", "section"]);
const shortTextOf = ($, selector, max) => {
  let found = "";
  $(selector).each((_, el) => {
    if (WRAPPER_TAGS.has((el.tagName || "").toLowerCase())) return undefined;
    found = cleanText($(el).text(), max);
    return found ? false : undefined;
  });
  return found;
};

const tryShopify = async (url) => {
  try {
    const jsonUrl = url.replace(/\?.*$/, "") + ".json";
    const response = await safeGet(jsonUrl, { accept: "application/json", responseType: "json" });
    const product = response.data?.product;

    if (!product) return null;

    const images = (product.images || []).map((img) => ({
      src: img.src,
      alt: img.alt || "",
    }));

    const frontKeywords = ["front", "front view", "front side"];
    const backKeywords = ["back", "back view", "back side", "rear"];

    const suggestedFront = images.find((img) =>
      frontKeywords.some((kw) => img.alt.toLowerCase().includes(kw))
    ) || images[0] || null;

    const suggestedBack = images.find((img) =>
      backKeywords.some((kw) => img.alt.toLowerCase().includes(kw))
    ) || images[1] || null;

    return {
      name: cleanText(product.title, MAX_NAME),
      brand: cleanText(product.vendor, MAX_BRAND),
      category: "",
      imageFront: suggestedFront?.src || "",
      imageBack: suggestedBack?.src || "",
      images,
      price: product.variants?.[0]?.price || "",
      currency: await shopifyCurrency(url),
      link: url,
    };
  } catch {
    return null;
  }
};

const tryScrape = async (url) => {
  try {
    const response = await safeGet(url, { accept: "text/html,application/xhtml+xml" });
    const $ = cheerio.load(response.data);
    const meta = (property) => $(`meta[property="${property}"]`).attr("content");
    const ld = productFromJsonLd($);

    const name =
      cleanText(ld.name, MAX_NAME) ||
      cleanText(meta("og:title"), MAX_NAME) ||
      cleanText($("h1").first().text(), MAX_NAME);

    const brand =
      cleanText(ld.brand, MAX_BRAND) ||
      cleanText(meta("product:brand"), MAX_BRAND) ||
      cleanText(meta("og:site_name"), MAX_BRAND) ||
      shortTextOf($, '[itemprop="brand"], [class*="brand"], [class*="vendor"]', MAX_BRAND);

    const imageSrcs = [...(ld.images || [])];
    $('meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr("content");
      if (src) imageSrcs.push(src);
    });
    const images = [...new Set(imageSrcs)].map((src) => ({ src, alt: "" }));

    if (!name) return null;

    return {
      name,
      brand,
      category: "",
      imageFront: images[0]?.src || "",
      imageBack: images[1]?.src || "",
      images,
      price: String(meta("product:price:amount") || meta("og:price:amount") || ld.price || ""),
      currency: cleanCurrency(meta("product:price:currency") || meta("og:price:currency") || ld.currency),
      link: url,
    };
  } catch {
    return null;
  }
};

router.post("/wishlist/create/url", async (req, res) => {
  try {
    const { url, error } = normalizeLink(req.body?.url);
    if (error) return res.status(400).json({ error });

    const shopifyData = await tryShopify(url);
    if (shopifyData) return res.json(shopifyData);

    const scrapedData = await tryScrape(url);
    if (scrapedData) return res.json(scrapedData);

    res.status(422).json({
      error: "Couldn't find product details on that page. You can skip this and fill them in yourself.",
    });
  } catch (error) {
    console.error("Error scraping URL:", error);
    res.status(500).json({ error: "Something went wrong reading that page. Try again." });
  }
});

// Get all wishlist items with presigned URLs
router.get("/wishlist/read", async (req, res) => {
  try {
    const items = await Wishlist.find({ userId: req.userId });

    const itemsWithUrls = await Promise.all(
      items.map(async (item) => {
        const obj = item.toObject();
        obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
        obj.imageBackUrl = await generatePresignedUrl(item.imageBack);
        return obj;
      })
    );

    res.json(itemsWithUrls);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single wishlist item by id
router.get("/wishlist/get/:id", async (req, res) => {
  try {
    const item = await Wishlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const obj = item.toObject();
    obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
    obj.imageBackUrl = await generatePresignedUrl(item.imageBack);
    // The edit form shows these when the user turns a cutout back off
    obj.imageFrontOriginalUrl = await generatePresignedUrl(item.imageFrontOriginal);
    obj.imageBackOriginalUrl = await generatePresignedUrl(item.imageBackOriginal);

    res.json(obj);
  } catch (error) {
    console.error("Error fetching wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a wishlist item by id
router.put("/wishlist/update/:id", uploadFields, async (req, res) => {
  try {
    const existingItem = await Wishlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!existingItem) return res.status(404).json({ error: "Item not found" });

    const imageFrontKey = await handleImageUpdate(
      existingItem.imageFront,
      req.files?.imageFront?.[0],
      req.body.imageFrontUrl,
      req.body.imageFront === ""
    );

    const imageBackKey = await handleImageUpdate(
      existingItem.imageBack,
      req.files?.imageBack?.[0],
      req.body.imageBackUrl,
      req.body.imageBack === ""
    );

    // A new or cleared photo makes any kept original (and a skip flag) stale
    const frontChanged = Boolean(req.files?.imageFront?.[0] || req.body.imageFrontUrl || req.body.imageFront === "");
    const backChanged = Boolean(req.files?.imageBack?.[0] || req.body.imageBackUrl || req.body.imageBack === "");
    if (frontChanged) await deleteFromS3(existingItem.imageFrontOriginal);
    if (backChanged) await deleteFromS3(existingItem.imageBackOriginal);

    await Wishlist.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, {
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      imageFront: imageFrontKey,
      imageBack: imageBackKey,
      imageFrontOriginal: frontChanged ? "" : existingItem.imageFrontOriginal,
      imageBackOriginal: backChanged ? "" : existingItem.imageBackOriginal,
      skipCutoutFront: frontChanged ? false : existingItem.skipCutoutFront,
      skipCutoutBack: backChanged ? false : existingItem.skipCutoutBack,
      price: req.body.price,
      currency: req.body.currency,
      link: req.body.link,
    });

    res.status(200).send("Wishlist item updated successfully!");
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a wishlist item by id
router.delete("/wishlist/delete/:id", async (req, res) => {
  try {
    const item = await Wishlist.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: "Item not found" });

    await deleteFromS3(item.imageFront);
    await deleteFromS3(item.imageBack);
    await deleteFromS3(item.imageFrontOriginal);
    await deleteFromS3(item.imageBackOriginal);
    await Wishlist.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    res.status(200).send("Wishlist item deleted successfully!");
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;