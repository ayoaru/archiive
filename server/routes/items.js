const express = require("express");
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/s3");
const upload = require("../middleware/upload");
const { Closet, Wishlist } = require("../models/item");
const cheerio = require("cheerio");
const axios = require("axios");

const router = express.Router();


// ============= Closet Routes =============

// Create a new closet item with image
router.post("/closet/create", upload.single("image"), async (req, res) => {
  console.log("req.file:", req.file);
  console.log("req.body.imageUrl:", req.body.imageUrl);
  console.log("req.body:", req.body);
  try {
    let imageKey = "";

    if (req.file) {
      // Handle file upload
      imageKey = `items/${uuidv4()}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }));
    } else if (req.body.imageUrl) {
      console.log("Downloading scraped image from:", req.body.imageUrl);
      const imageResponse = await axios.get(req.body.imageUrl, { responseType: "arraybuffer" });
      console.log("Image downloaded, size:", imageResponse.data.byteLength);

      // Download scraped image and upload to S3
      const imageResponse = await axios.get(req.body.imageUrl, { responseType: "arraybuffer" });
      const buffer = Buffer.from(imageResponse.data);
      const contentType = imageResponse.headers["content-type"] || "image/jpeg";

      imageKey = `items/${uuidv4()}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageKey,
        Body: buffer,
        ContentType: contentType,
      }));
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
      image: imageKey,
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
        if (!item.image) return item.toObject();

        const url = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: item.image,
          }),
          { expiresIn: 3600 }
        );
        return { ...item.toObject(), imageUrl: url };
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

    if (item.image) {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: item.image,
        }),
        { expiresIn: 3600 }
      );
      return res.json({ ...item.toObject(), imageUrl: url });
    }

    res.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a closet item by id
router.put("/closet/update/:id", upload.single("image"), async (req, res) => {
  try {
    const existingItem = await Closet.findById(req.params.id);
    if (!existingItem) return res.status(404).json({ error: "Item not found" });

    let imageKey = existingItem.image; // keep existing image key by default

    if (req.file) {
      // Delete old image from S3 if it exists
      if (existingItem.image) {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: existingItem.image,
        }));
      }

      // Upload new image to S3
      imageKey = `items/${uuidv4()}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }));
    }

    // If image was removed (no file and image field cleared)
    if (!req.file && req.body.image === "") {
      if (existingItem.image) {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: existingItem.image,
        }));
      }
      imageKey = "";
    }

    await Closet.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      image: imageKey,
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
    await Closet.findByIdAndDelete(req.params.id);
    res.send("Item deleted successfully!");
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: error.message });
  }
});


// ============= Wishlist Routes =============

// Create a new wishlist item
router.post("/wishlist/create", upload.single("image"), async (req, res) => {
  try {
    const newItem = await Wishlist.create({
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      image: req.body.image,
      price: req.body.price,
      link: req.body.link,
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create wishlist item from URL

// Helper functions, try Shopify product.json first, if that doesn't work
// then fall back to cheerio scraping instead
const tryShopify = async (url) => {
  try {
    const jsonUrl = url.replace(/\?.*$/, "") + ".json";
    const response = await axios.get(jsonUrl);
    const product = response.data.product;

    if (!product) return null;

    return {
      name: product.title || "",
      brand: product.vendor || "",
      category: "",
      image: product.images?.[0]?.src || "",
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

    const image =
      $('meta[property="og:image"]').attr("content") ||
      "";

    if (!name) return null;

    return { name, brand, category: "", image, price: "", link: url };
  } catch {
    return null;
  }
};

// Wishlist item creation from URL route
router.post("/wishlist/create/url", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    const shopifyData = await tryShopify(url);
    console.log("Shopify result:", shopifyData);

    if (shopifyData) return res.json(shopifyData);

    const scrapedData = await tryScrape(url);
    console.log("Scrape result:", scrapedData);

    if (scrapedData) return res.json(scrapedData);

    res.status(422).json({ error: "Could not extract product data from this URL" });
  } catch (error) {
    console.error("Error scraping URL:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all wishlist items
router.get("/wishlist/read", async (req, res) => {
  try {
    const itemList = await Wishlist.find();
    res.json(itemList);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a wishlist item by id
router.put("/wishlist/update/:id", async (req, res) => {
  try {
    await Wishlist.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      brand: req.body.brand,
      category: req.body.category,
      season: req.body.season,
      style: req.body.style,
      primary_color: req.body.primary_color,
      secondary_color: req.body.secondary_color,
      fit: req.body.fit,
      image: req.body.image,
    });

    res.send("Wishlist item updated successfully!");
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a wishlist item by id
router.delete("/wishlist/delete/:id", async (req, res) => {
  try {
    await Wishlist.findByIdAndDelete(req.params.id);
    res.send("Wishlist item deleted successfully!");
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;