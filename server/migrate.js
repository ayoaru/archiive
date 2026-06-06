// run this once with: node migrate.js
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('MongoDB connected');

    const db = mongoose.connection.db;

    // Migrate closet items
    const closetResult = await db.collection('closet_items').updateMany(
      { image: { $exists: true } },
      [
        { $set: { imageFront: "$image", imageBack: "" } },
        { $unset: "image" }
      ]
    );
    console.log(`Closet items migrated: ${closetResult.modifiedCount}`);

    // Migrate wishlist items
    const wishlistResult = await db.collection('wishlist_items').updateMany(
      { image: { $exists: true } },
      [
        { $set: { imageFront: "$image", imageBack: "" } },
        { $unset: "image" }
      ]
    );
    console.log(`Wishlist items migrated: ${wishlistResult.modifiedCount}`);

    mongoose.disconnect();
  })
  .catch(err => console.log(err));