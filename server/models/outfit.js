const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
    name: { type: String, default: '' },
    base: {
        top: { type: mongoose.Schema.Types.ObjectId, ref: 'closet_item', required: true },
        pants: { type: mongoose.Schema.Types.ObjectId, ref: 'closet_item', required: true },
        shoes: { type: mongoose.Schema.Types.ObjectId, ref: 'closet_item', required: true },
    },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'closet_item' }],
    season: { type: String, default: '' },
    occasion: { type: String, default: '' },
    previewImage: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const Outfit = mongoose.model('outfit', outfitSchema);

module.exports = { Outfit };
