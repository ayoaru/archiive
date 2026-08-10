const express = require("express");
const upload = require("../middleware/upload");
const { Closet, Wishlist } = require("../models/item");
const cheerio = require("cheerio");
const axios = require("axios");
const {
  uploadToS3,
  deleteFromS3,
  uploadUrlToS3,
  generatePresignedUrl,
  handleImageUpdate,
} = require("../utils/s3Helpers");

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
    const items = await Closet.find();

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
    const item = await Closet.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const obj = item.toObject();
    obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
    obj.imageBackUrl = await generatePresignedUrl(item.imageBack);

    res.json(obj);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a closet item by id
router.put("/closet/update/:id", uploadFields, async (req, res) => {
  try {
    const existingItem = await Closet.findById(req.params.id);
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

    await Closet.findByIdAndUpdate(req.params.id, {
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

    res.status(200).send("Item updated successfully!");
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a closet item by id
router.delete("/closet/delete/:id", async (req, res) => {
  try {
    const item = await Closet.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    await deleteFromS3(item.imageFront);
    await deleteFromS3(item.imageBack);
    await Closet.findByIdAndDelete(req.params.id);

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
      link: req.body.link,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Wishlist URL scraping route
const tryShopify = async (url) => {
  try {
    const jsonUrl = url.replace(/\?.*$/, "") + ".json";
    const response = await axios.get(jsonUrl);
    const product = response.data.product;

    if (!product) return null;

    const images = product.images.map((img) => ({
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
      name: product.title || "",
      brand: product.vendor || "",
      category: "",
      imageFront: suggestedFront?.src || "",
      imageBack: suggestedBack?.src || "",
      images,
      price: product.variants?.[0]?.price || "",
      link: url,
    };
  } catch {
    return null;
  }
};

const tryScrape = async (url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    const $ = cheerio.load(response.data);

    const name =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim() ||
      "";

    const brand =
      $('meta[property="og:site_name"]').attr("content") ||
      $('[class*="brand"]').first().text().trim() ||
      $('[class*="vendor"]').first().text().trim() ||
      "";

    const images = [];
    $('meta[property="og:image"]').each((_, el) => {
      const src = $(el).attr("content");
      if (src) images.push({ src, alt: "" });
    });

    if (!name) return null;

    return {
      name,
      brand,
      category: "",
      imageFront: images[0]?.src || "",
      imageBack: images[1]?.src || "",
      images,
      price: "",
      link: url,
    };
  } catch {
    return null;
  }
};

router.post("/wishlist/create/url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const shopifyData = await tryShopify(url);
    if (shopifyData) return res.json(shopifyData);

    const scrapedData = await tryScrape(url);
    if (scrapedData) return res.json(scrapedData);

    res.status(422).json({ error: "Could not extract product data from this URL" });
  } catch (error) {
    console.error("Error scraping URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all wishlist items with presigned URLs
router.get("/wishlist/read", async (req, res) => {
  try {
    const items = await Wishlist.find();

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
    const item = await Wishlist.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    const obj = item.toObject();
    obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
    obj.imageBackUrl = await generatePresignedUrl(item.imageBack);

    res.json(obj);
  } catch (error) {
    console.error("Error fetching wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a wishlist item by id
router.put("/wishlist/update/:id", uploadFields, async (req, res) => {
  try {
    const existingItem = await Wishlist.findById(req.params.id);
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

    await Wishlist.findByIdAndUpdate(req.params.id, {
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
    const item = await Wishlist.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    await deleteFromS3(item.imageFront);
    await deleteFromS3(item.imageBack);
    await Wishlist.findByIdAndDelete(req.params.id);

    res.status(200).send("Wishlist item deleted successfully!");
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;