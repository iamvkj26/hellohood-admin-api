const mongoose = require("mongoose");

const authSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    mobile: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    isApproved: {
        type: Boolean,
        default: false
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

module.exports = mongoose.model("Auth", authSchema);