const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
//const router = express.Router();
//const Item = require('./models/item');
const multer = require('multer');
const cloudinary = require("cloudinary").v2;
//const { CloudinaryStorage } = require("multer-storage-cloudinary");
//const uploadMiddleware = require('./configs/uploadMiddleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Example route
/* app.get('/', (req, res) => {
  res.send('Hello world!');
}); */

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// ============= Item Routes =============

const { Closet, Wishlist } = require('./models/item');

// Closet Routes

// Create a new closet item
app.post("/closet/create", upload.single("image"), async (req, res) => {
  try {
    const itemData = JSON.parse(req.body.data);

    if(!req.file) {
      console.log("No file uploaded.");
      return res.status(400).send("No file uploaded.");
    }

    // Wrapped in Promise to handle data and display result (once available)
    // after the upload to Cloudinary is complete
    const cloudinaryUpload = (buffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {folder: "archiive/items"},
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        stream.end(buffer);
      });
    };

    const cloudinaryResult = await cloudinaryUpload(req.file.buffer);

    const newItem = new Closet({
      name: req.body.data.name,
      brand: req.body.data.brand,
      category: req.body.data.category,
      season: req.body.data.season,
      style: req.body.data.style,
      primary_color: req.body.data.primary_color,
      secondary_color: req.body.data.secondary_color,
      fit: req.body.data.fit,
      image: cloudinaryResult.secure_url,
    });

    await Closet.create(newItem);
    res.send("Item saved successfully!");

  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).send("Error updating item");
  }
});

// Get all closet items
app.get("/closet/read", async (req, res) => {
  const itemList = await Closet.find();
  res.send(JSON.stringify(itemList));
});

// Get a single closet item by id
app.get("/closet/get/:id", async (req, res) => {
  const item_id = req.params.id;
  const item = await Closet.findById(item_id);
  res.send(item);
});

// Update a closet item based on id
app.put("/closet/update/:id", async (req, res) => {
  const item_id = req.params.id;
  await Closet.findByIdAndUpdate(item_id, {
    name: req.body.data.name,
    brand: req.body.data.brand,
    category: req.body.data.category,
    season: req.body.data.season,
    style: req.body.data.style,
    primary_color: req.body.data.primary_color,
    secondary_color: req.body.data.secondary_color,
    fit: req.body.data.fit,
    image: req.body.data.image,
  });

  res.send("Item updated successfully!");
});

// Delete a closet item based on id
app.delete("/closet/delete/:id", async (req, res) => {
  const item_id = req.params.id;
  await Closet.findByIdAndDelete(item_id);
  res.send("Item deleted successfully!");
});

// Wishlist Routes

// TODO: implement web scraping for autofill
// Create a new wishlist item using a link, e.g., from an online store
// the data will attempt to be scraped for autofill, which the user can
// edit before saving

app.post("/wishlist/create", upload.single("image"), async (req, res) => {
  const newItem = new Wishlist({
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

  await Wishlist.create(newItem);
  res.send("Wishlist item saved successfully!");
});

// Get all wishlist items
app.get("/wishlist/read", async (req, res) => {
  const itemList = await Wishlist.find();
  res.send(JSON.stringify(itemList));
});

// Update a wishlist item based on id
app.put("/wishlist/update/:id", async (req, res) => {
  const item_id = req.params.id;
  await Wishlist.findByIdAndUpdate(item_id, {
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
});

// Delete a wishlist item based on id
app.delete("/wishlist/delete/:id", async (req, res) => {
  const item_id = req.params.id;
  await Wishlist.findByIdAndDelete(item_id);
  res.send("Wishlist item deleted successfully!");
});