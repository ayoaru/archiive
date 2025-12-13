const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const router = express.Router();
const Item = require('./models/item');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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
app.post("/closet/create", async (req, res) => {
  const newItem = new Closet({
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

  await Closet.create(newItem);
  res.send("Item saved successfully!");
});

// Get all closet items
app.get("/closet/read", async (req, res) => {
  const itemList = await Closet.find();
  res.send(JSON.stringify(itemList));
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

app.post("/wishlist/create", async (req, res) => {
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
app.put("wishlist/update/:id", async (req, res) => {
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