const mongoose = require('mongoose');

const modelPhotoSchema = new mongoose.Schema({
    label: { type: String, default: '' },
    image: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const ModelPhoto = mongoose.model('model_photo', modelPhotoSchema);

module.exports = { ModelPhoto };
