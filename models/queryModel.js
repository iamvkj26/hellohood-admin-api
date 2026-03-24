const mongoose = require("mongoose");

const querySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["pending", "resolved"],
        default: "pending"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Query", querySchema);