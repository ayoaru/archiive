const express = require("express");
const mongoose = require("mongoose");
const upload = require("../middleware/upload");
const { Outfit } = require("../models/outfit");
const { Closet } = require("../models/item");
const {
  uploadToS3,
  deleteFromS3,
  generatePresignedUrl,
  handleImageUpdate,
} = require("../utils/s3Helpers");

const router = express.Router();
const uploadPreviewImage = upload.single("previewImage");

// Attach presigned image URLs to a populated closet item
const presignItem = async (item) => {
  if (!item || !item._id) return item;
  return {
    ...item,
    imageFrontUrl: await generatePresignedUrl(item.imageFront),
    imageBackUrl: await generatePresignedUrl(item.imageBack),
  };
};

// Attach presigned image URLs to a populated outfit's base, items, and preview image
const withPresignedUrls = async (outfit) => {
  const obj = outfit.toObject();

  obj.base = {
    top: await presignItem(obj.base?.top),
    pants: await presignItem(obj.base?.pants),
    shoes: await presignItem(obj.base?.shoes),
  };

  obj.items = await Promise.all((obj.items || []).map(presignItem));

  obj.previewImageUrl = await generatePresignedUrl(obj.previewImage);
  return obj;
};

const populateOutfit = (query) =>
  query.populate("base.top").populate("base.pants").populate("base.shoes").populate("items");

// `base` and `items` arrive as JSON strings over multipart/form-data
const parseOutfitBody = (body) => ({
  name: body.name,
  base: body.base ? JSON.parse(body.base) : undefined,
  items: body.items ? JSON.parse(body.items) : [],
  season: body.season,
  occasion: body.occasion,
});

// True only if every closet item the outfit references belongs to this user
const ownsAllItems = async (userId, { base, items }) => {
  const ids = [...new Set(
    [base?.top, base?.pants, base?.shoes, ...(items || [])].filter(Boolean).map(String)
  )];
  if (!ids.every((id) => mongoose.isValidObjectId(id))) return false;

  const owned = await Closet.countDocuments({ _id: { $in: ids }, userId });
  return owned === ids.length;
};

const NOT_YOUR_ITEMS = { error: "Outfit includes items that aren't in your closet" };

// Create a new outfit
router.post("/outfits/create", uploadPreviewImage, async (req, res) => {
  try {
    const outfitData = parseOutfitBody(req.body);
    if (!(await ownsAllItems(req.userId, outfitData))) return res.status(400).json(NOT_YOUR_ITEMS);

    let previewImageKey = "";
    if (req.file) {
      previewImageKey = await uploadToS3(req.file.buffer, req.file.mimetype, "outfits");
    }

    const newOutfit = await Outfit.create({
      userId: req.userId,
      ...outfitData,
      previewImage: previewImageKey,
    });

    res.status(201).json(newOutfit);
  } catch (error) {
    console.error("Error creating outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all outfits with populated base/items and presigned URLs
router.get("/outfits/read", async (req, res) => {
  try {
    const outfits = await populateOutfit(Outfit.find({ userId: req.userId }));
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
    const outfit = await populateOutfit(Outfit.findOne({ _id: req.params.id, userId: req.userId }));
    if (!outfit) return res.status(404).json({ error: "Outfit not found" });

    res.json(await withPresignedUrls(outfit));
  } catch (error) {
    console.error("Error fetching outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update an outfit by id
router.put("/outfits/update/:id", uploadPreviewImage, async (req, res) => {
  try {
    const existingOutfit = await Outfit.findOne({ _id: req.params.id, userId: req.userId });
    if (!existingOutfit) return res.status(404).json({ error: "Outfit not found" });

    const outfitData = parseOutfitBody(req.body);
    if (!(await ownsAllItems(req.userId, outfitData))) return res.status(400).json(NOT_YOUR_ITEMS);

    const previewImageKey = await handleImageUpdate(
      existingOutfit.previewImage,
      req.file,
      null,
      req.body.previewImage === "",
      "outfits"
    );

    await Outfit.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, {
      ...outfitData,
      previewImage: previewImageKey,
    }, { runValidators: true });

    res.status(200).send("Outfit updated successfully!");
  } catch (error) {
    console.error("Error updating outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an outfit by id
router.delete("/outfits/delete/:id", async (req, res) => {
  try {
    const outfit = await Outfit.findOne({ _id: req.params.id, userId: req.userId });
    if (!outfit) return res.status(404).json({ error: "Outfit not found" });

    await deleteFromS3(outfit.previewImage);
    await Outfit.findOneAndDelete({ _id: req.params.id, userId: req.userId });

    res.status(200).send("Outfit deleted successfully!");
  } catch (error) {
    console.error("Error deleting outfit:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
