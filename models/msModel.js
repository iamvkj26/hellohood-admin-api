const mongoose = require("mongoose");
const { encodeId } = require("../utils/idHash");
const getOTT = require("../utils/getOTT");

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
    msWatched: {
        type: Boolean,
        default: false,
        index: true
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
    },
    ott: {
        type: String,
        enum: ["netflix", "prime", "hotstar", "other"],
        index: true,
        default: "other"
    }
});

movieSchema.index({ msName: 1, msReleaseDate: -1 }, { unique: true });

movieSchema.pre("save", function (next) {
    if (this.isNew) this.hashedId = encodeId(this._id.toString());
    if (this.msLink) this.ott = getOTT(this.msLink);
    next();
});

movieSchema.pre("findOneAndUpdate", function (next) {
    const update = this.getUpdate();
    const link = update.msLink || (update.$set && update.$set.msLink);
    if (link) {
        if (update.$set) update.$set.ott = getOTT(link);
        else update.ott = getOTT(link);
    };
    next();
});

module.exports = mongoose.model("MovieSeries", movieSchema);