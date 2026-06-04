const express = require("express");
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const s3 = require("../config/s3");
const upload = require("../middleware/upload");
const { Closet, Wishlist } = require("../models/item");

const router = express.Router();


// ============= Closet Routes =============

// Create a new closet item with image
router.post("/closet/create", upload.single("image"), async (req, res) => {
  try {
    let imageKey = "";

    if (req.file) {
      imageKey = `items/${uuidv4()}`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: imageKey,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
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
router.put("/closet/update/:id", async (req, res) => {
  try {
    await Closet.findByIdAndUpdate(req.params.id, {
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

    res.send("Item updated successfully!");
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
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating wishlist item:", error);
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