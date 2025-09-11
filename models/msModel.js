const mongoose = require("mongoose");
const { encodeId } = require("../utils/idHash");

const movieSchema = new mongoose.Schema({
    hashedId: {
        type: String,
        unique: true,
        index: true
    },
    msName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    msAbout: {
        type: String,
        required: true,
        trim: true
    },
    msPoster: {
        type: String,
        required: true,
        trim: true
    },
    msLink: {
        type: String,
        required: true,
        trim: true
    },
    msGenre: {
        type: [String],
        required: true,
        index: true
    },
    msFormat: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    msIndustry: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    msSeason: {
        type: String,
        required: true
    },
    msReleaseDate: {
        type: String,
        required: true,
        index: true
    },
    msRating: {
        type: Number,
        required: true
    },
    msUploadedBy: {
        type: String,
        required: true,
        trim: true
    },
    msWatched: {
        type: Boolean,
        default: false,
        index: true
    },
    msWatchedAt: {
        type: Date,
        default: null
    },
    msCollection: {
        type: {
            name: {
                type: String,
                required: true
            },
            icon: {
                type: String,
                required: true
            },
        },
        trim: true,
        index: true,
        default: null
    }
});

movieSchema.index({ msName: 1, msReleaseDate: -1 }, { unique: true });

movieSchema.pre("save", function (next) {
    if (this.isNew) this.hashedId = encodeId(this._id.toString());
    next();
});

module.exports = mongoose.model("MovieSeries", movieSchema);