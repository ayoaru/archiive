const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'closet_item' }],
    season: { type: String, default: '' },
    occasion: { type: String, default: '' },
    tryOnImage: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const Outfit = mongoose.model('outfit', outfitSchema);

module.exports = { Outfit };
