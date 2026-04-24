const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth"
    },
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    mobile: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ["dev", "admin", "user"]
    },
    status: {
        type: String,
        enum: ["success", "failed"],
        default: "success"
    },
    ip: String,
    userAgent: String,
    loginAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

[{ userId: 1, loginAt: -1 }, { loginAt: -1 }, { userId: 1 }].forEach(index => logSchema.index(index));

module.exports = mongoose.model("Log", logSchema);