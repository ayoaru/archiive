// Assigns every document that has no owner yet to one Clerk user.
// Run once after adding userId to the models:
//   node migrate-owner.js <clerk user id> [--dry-run]
require('dotenv').config();
const mongoose = require('mongoose');
const { Closet, Wishlist } = require('./models/item');
const { Outfit } = require('./models/outfit');
const { ModelPhoto } = require('./models/modelPhoto');

const [userId, flag] = process.argv.slice(2);
const dryRun = flag === '--dry-run';

if (!userId || !userId.startsWith('user_')) {
  console.error('Usage: node migrate-owner.js <clerk user id> [--dry-run]');
  process.exit(1);
}

const models = { Closet, Wishlist, Outfit, ModelPhoto };
const unowned = { userId: { $exists: false } };

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log(`MongoDB connected${dryRun ? ' (dry run, nothing will change)' : ''}`);

    for (const [name, Model] of Object.entries(models)) {
      if (dryRun) {
        const count = await Model.countDocuments(unowned);
        console.log(`${name}: ${count} without an owner`);
      } else {
        const result = await Model.updateMany(unowned, { $set: { userId } });
        console.log(`${name}: ${result.modifiedCount} assigned to ${userId}`);
      }
    }

    await mongoose.disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
