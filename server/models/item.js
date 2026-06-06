const mongoose = require('mongoose');

const closetItemSchema = new mongoose.Schema({
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
});

const wishlistItemSchema = new mongoose.Schema({
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
    price: { type: String, default: '' },
    link: { type: String, default: '' },
});

const Closet = mongoose.model('closet_item', closetItemSchema);
const Wishlist = mongoose.model('wishlist_item', wishlistItemSchema);

module.exports = { Closet, Wishlist };