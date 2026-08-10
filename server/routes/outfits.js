const express = require("express");
const { Outfit } = require("../models/outfit");
const { deleteFromS3, generatePresignedUrl } = require("../utils/s3Helpers");

const router = express.Router();

// Attach presigned image URLs to a populated outfit's items and try-on image
const withPresignedUrls = async (outfit) => {
  const obj = outfit.toObject();

  obj.items = await Promise.all(
    (obj.items || []).map(async (item) => {
      if (!item || !item._id) return item;
      return {
        ...item,
        imageFrontUrl: await generatePresignedUrl(item.imageFront),
        imageBackUrl: await generatePresignedUrl(item.imageBack),
      };
    })
  );

  obj.tryOnImageUrl = await generatePresignedUrl(obj.tryOnImage);
  return obj;
};

// Create a new outfit
router.post("/outfits/create", async (req, res) => {
  try {
    const newOutfit = await Outfit.create({
      name: req.body.name,
      items: req.body.items || [],
      season: req.body.season,
      occasion: req.body.occasion,
    });

    res.status(201).json(newOutfit);
  } catch (error) {
    console.error("Error creating outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all outfits with populated items and presigned URLs
router.get("/outfits/read", async (req, res) => {
  try {
    const outfits = await Outfit.find().populate("items");
    const outfitsWithUrls = await Promise.all(outfits.map(withPresignedUrls));

    res.json(outfitsWithUrls);
  } catch (error) {
    console.error("Error fetching outfits:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single outfit by id
router.get("/outfits/get/:id", async (req, res) => {
  try {
    const outfit = await Outfit.findById(req.params.id).populate("items");
    if (!outfit) return res.status(404).json({ error: "Outfit not found" });

    res.json(await withPresignedUrls(outfit));
  } catch (error) {
    console.error("Error fetching outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update an outfit by id
router.put("/outfits/update/:id", async (req, res) => {
  try {
    const existingOutfit = await Outfit.findById(req.params.id);
    if (!existingOutfit) return res.status(404).json({ error: "Outfit not found" });

    await Outfit.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      items: req.body.items || [],
      season: req.body.season,
      occasion: req.body.occasion,
    });

    res.status(200).send("Outfit updated successfully!");
  } catch (error) {
    console.error("Error updating outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an outfit by id
router.delete("/outfits/delete/:id", async (req, res) => {
  try {
    const outfit = await Outfit.findById(req.params.id);
    if (!outfit) return res.status(404).json({ error: "Outfit not found" });

    await deleteFromS3(outfit.tryOnImage);
    await Outfit.findByIdAndDelete(req.params.id);

    res.status(200).send("Outfit deleted successfully!");
  } catch (error) {
    console.error("Error deleting outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
