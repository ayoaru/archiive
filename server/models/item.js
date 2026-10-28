const mongoose = require('mongoose');

const closetItemSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    category: { type: String, required: true },
    season: { type: String, default: '' },
    style: { type: String, default: '' },
    primary_color: { type: String, default: '', required: true },
    secondary_color: { type: String, default: '' },
    fit: { type: String, default: '' },
    imageFront: { type: String, default: '' },
    imageBack: { type: String, default: '' },
    // Untouched photos kept when imageFront/imageBack hold a background-removed cutout
    imageFrontOriginal: { type: String, default: '' },
    imageBackOriginal: { type: String, default: '' },
    // Set when the user restored the original, so bulk cleanup leaves it alone
    skipCutoutFront: { type: Boolean, default: false },
    skipCutoutBack: { type: Boolean, default: false },
});

const wishlistItemSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    category: { type: String, required: true },
    season: { type: String, default: '' },
    style: { type: String, default: '' },
    primary_color: { type: String, default: '', required: true },
    secondary_color: { type: String, default: '' },
    fit: { type: String, default: '' },
    imageFront: { type: String, default: '' },
    imageBack: { type: String, default: '' },
    // Untouched photos kept when imageFront/imageBack hold a background-removed cutout
    imageFrontOriginal: { type: String, default: '' },
    imageBackOriginal: { type: String, default: '' },
    // Set when the user restored the original, so bulk cleanup leaves it alone
    skipCutoutFront: { type: Boolean, default: false },
    skipCutoutBack: { type: Boolean, default: false },
    price: { type: String, default: '' },
    // ISO 4217 code the price is listed in; blank on items saved before this was tracked
    currency: { type: String, default: '' },
    link: { type: String, default: '' },
});

const Closet = mongoose.model('closet_item', closetItemSchema);
const Wishlist = mongoose.model('wishlist_item', wishlistItemSchema);

module.exports = { Closet, Wishlist };