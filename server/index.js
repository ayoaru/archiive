const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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

// Routes
const itemsRouter = require("./routes/items.js");
const outfitsRouter = require("./routes/outfits.js");
const modelPhotosRouter = require("./routes/modelPhotos.js");
app.use("/", itemsRouter);
app.use("/", outfitsRouter);
app.use("/", modelPhotosRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});