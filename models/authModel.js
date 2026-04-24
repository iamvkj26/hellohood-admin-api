const mongoose = require("mongoose");

const authSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    mobile: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    isApproved: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ["dev", "admin", "user"],
        default: "user"
    },
    tokenVersion: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

authSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("Auth", authSchema);