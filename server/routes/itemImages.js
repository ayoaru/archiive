const express = require("express");
const upload = require("../middleware/upload");
const { Closet, Wishlist } = require("../models/item");
const { uploadToS3, deleteFromS3, generatePresignedUrl } = require("../utils/s3Helpers");

const router = express.Router();
const uploadImage = upload.single("image");

const MODELS = { closet: Closet, wishlist: Wishlist };

const fieldsFor = (side) =>
  side === "back"
    ? { main: "imageBack", original: "imageBackOriginal", skip: "skipCutoutBack" }
    : { main: "imageFront", original: "imageFrontOriginal", skip: "skipCutoutFront" };

// Background-removed cutouts for a closet or wishlist photo.
//   action=clean   (with an `image` file): stores the cutout as the photo and
//                  keeps the untouched photo as the original
//   action=restore: puts the original back and drops the cutout
// `side` is "front" or "back".
const updateImage = (kind) => async (req, res) => {
  try {
    const Model = MODELS[kind];
    const { side, action } = req.body;
    if (!["front", "back"].includes(side)) return res.status(400).json({ error: "side must be front or back" });

    const item = await Model.findOne({ _id: req.params.id, userId: req.userId });
    if (!item) return res.status(404).json({ error: "Item not found" });

    const f = fieldsFor(side);
    if (!item[f.main]) return res.status(400).json({ error: "This item has no photo on that side" });

    if (action === "clean") {
      if (!req.file) return res.status(400).json({ error: "image is required" });
      const cutoutKey = await uploadToS3(req.file.buffer, req.file.mimetype);

      if (item[f.original]) {
        // Re-cleaning: the current photo is an older cutout, so replace it
        await deleteFromS3(item[f.main]);
      } else {
        item[f.original] = item[f.main];
      }
      item[f.main] = cutoutKey;
      item[f.skip] = false;
    } else if (action === "restore") {
      if (!item[f.original]) return res.status(400).json({ error: "There's no original to restore" });
      await deleteFromS3(item[f.main]);
      item[f.main] = item[f.original];
      item[f.original] = "";
      item[f.skip] = true;
    } else {
      return res.status(400).json({ error: "action must be clean or restore" });
    }

    await item.save();

    const obj = item.toObject();
    obj.imageFrontUrl = await generatePresignedUrl(item.imageFront);
    obj.imageBackUrl = await generatePresignedUrl(item.imageBack);
    res.json(obj);
  } catch (error) {
    console.error("Error updating item image:", error);
    res.status(500).json({ error: error.message });
  }
};

// Separate paths rather than a regex param: Express 5 doesn't support those
router.post("/closet/images/:id", uploadImage, updateImage("closet"));
router.post("/wishlist/images/:id", uploadImage, updateImage("wishlist"));

module.exports = router;
