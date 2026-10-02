const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const { clerkMiddleware } = require('@clerk/express');
const { requireUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());

// Every route below requires a signed-in user
app.use(clerkMiddleware());
app.use(requireUser);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Routes
const itemsRouter = require("./routes/items.js");
const outfitsRouter = require("./routes/outfits.js");
const modelPhotosRouter = require("./routes/modelPhotos.js");
const imageProxyRouter = require("./routes/imageProxy.js");
app.use("/", itemsRouter);
app.use("/", outfitsRouter);
app.use("/", modelPhotosRouter);
app.use("/", imageProxyRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});