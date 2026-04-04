const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auth",
        required: true,
        index: true
    },
    name: String,
    email: String,
    mobile: String,
    role: String,
    status: {
        type: String,
        enum: ["success", "failed"],
        default: "success"
    },
    ip: String,
    userAgent: String,
    loginAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

module.exports = mongoose.model("Log", logSchema);