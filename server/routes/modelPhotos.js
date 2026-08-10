const express = require("express");
const upload = require("../middleware/upload");
const { ModelPhoto } = require("../models/modelPhoto");
const {
  uploadToS3,
  deleteFromS3,
  generatePresignedUrl,
  handleImageUpdate,
} = require("../utils/s3Helpers");

const router = express.Router();
const uploadImage = upload.single("image");

// Create a new model photo
router.post("/model-photos/create", uploadImage, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Image is required" });

    const imageKey = await uploadToS3(req.file.buffer, req.file.mimetype, "model-photos");

    const newModelPhoto = await ModelPhoto.create({
      label: req.body.label,
      image: imageKey,
    });

    res.status(201).json(newModelPhoto);
  } catch (error) {
    console.error("Error creating model photo:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all model photos with presigned URLs
router.get("/model-photos/read", async (req, res) => {
  try {
    const modelPhotos = await ModelPhoto.find();

    const modelPhotosWithUrls = await Promise.all(
      modelPhotos.map(async (photo) => {
        const obj = photo.toObject();
        obj.imageUrl = await generatePresignedUrl(photo.image);
        return obj;
      })
    );

    res.json(modelPhotosWithUrls);
  } catch (error) {
    console.error("Error fetching model photos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a model photo's label and/or image by id
router.put("/model-photos/update/:id", uploadImage, async (req, res) => {
  try {
    const existingPhoto = await ModelPhoto.findById(req.params.id);
    if (!existingPhoto) return res.status(404).json({ error: "Model photo not found" });

    const imageKey = await handleImageUpdate(
      existingPhoto.image,
      req.file,
      null,
      false,
      "model-photos"
    );

    await ModelPhoto.findByIdAndUpdate(req.params.id, {
      label: req.body.label,
      image: imageKey,
    });

    res.status(200).send("Model photo updated successfully!");
  } catch (error) {
    console.error("Error updating model photo:", error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a model photo by id
router.delete("/model-photos/delete/:id", async (req, res) => {
  try {
    const photo = await ModelPhoto.findById(req.params.id);
    if (!photo) return res.status(404).json({ error: "Model photo not found" });

    await deleteFromS3(photo.image);
    await ModelPhoto.findByIdAndDelete(req.params.id);

    res.status(200).send("Model photo deleted successfully!");
  } catch (error) {
    console.error("Error deleting model photo:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
