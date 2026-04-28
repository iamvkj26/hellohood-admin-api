const mongoose = require("mongoose");
const { encodeId } = require("../utils/idHash");
const getOTT = require("../utils/getOTT");

const MIN_ADDED_DATE = new Date("2025-06-28T00:00:00.000Z");

const movieSchema = new mongoose.Schema({
    hashedId: {
        type: String,
        unique: true
    },
    msName: {
        type: String,
        required: true,
        trim: true
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
    msFormat: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    msIndustry: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    msCast: {
        type: [String],
        required: true,
        default: []
    },
    msGenre: {
        type: [String],
        required: true
    },
    msRating: {
        type: Number,
        required: true
    },
    msReleaseDate: {
        type: String,
        required: true
    },
    msAddedAt: {
        type: Date,
        default: Date.now,
        validate: {
            validator: (value) => value >= MIN_ADDED_DATE && value <= new Date(), message: "Movie/Series Added Date cannot be before 28 June 2025."
        }
    },
    msWatched: {
        type: Boolean,
        default: false
    },
    msWatchedAt: {
        type: Date,
        default: null
    },
    msCollection: {
        type: {
            name: { type: String, required: true },
            icon: { type: String, required: true },
        },
        trim: true,
        default: null
    },
    msOTT: {
        type: String,
        enum: ["netflix", "prime", "hotstar", "zee5", "sonyliv", "lionsgateplay", "other", "none"],
        default: "none"
    },
    sStatus: {
        type: String,
        enum: ["ongoing", "completed"],
        required: function () {
            return this.msFormat === "series";
        },
        default: null
    },
    sSeasons: {
        type: Number,
        required: function () {
            return this.msFormat === "series";
        },
        default: null
    }
});

movieSchema.index({ msName: 1, msReleaseDate: 1 }, { unique: true });

[{ msReleaseDate: -1 }, { msReleaseDate: 1 }, { msAddedAt: -1 }, { msWatchedAt: -1 }, { msAddedAt: -1, msWatchedAt: -1 }, { msName: 1 }, { msCast: 1 }].forEach(index => movieSchema.index(index));

movieSchema.pre("save", function (next) {
    if (this.isNew) this.hashedId = encodeId(this._id.toString());
    if (this.msLink) this.msOTT = getOTT(this.msLink);
    next();
});

movieSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();
    const link = update.msLink || (update.$set && update.$set.msLink);
    if (link) {
        if (update.$set) update.$set.msOTT = getOTT(link);
        else update.msOTT = getOTT(link);
    };
    next();
});

module.exports = mongoose.model("MovieSeries", movieSchema);