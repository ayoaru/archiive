const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    category: { type: String, required: true },
    season: { type: String, default: '' },
    style: { type: String, default: '' },
    primary_color: { type: String, default: '', required : true},
    secondary_color: { type: String, default: '' },
    fit : { type: String, default: '' },
    image: { type: String, default: '' },
});

const Closet = mongoose.model('closet_item', itemSchema);
const Wishlist = mongoose.model('wishlist_item', itemSchema);
module.exports = { Closet, Wishlist };