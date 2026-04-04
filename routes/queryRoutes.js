const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

const Query = require("../models/queryModel.js");

router.get("/get", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const getQuery = await Query.find().select("-__v");;
        res.status(200).json({ data: getQuery, message: "Query's fetched successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.patch("/update/:id/:status", authenticate, authorize("dev"), async (req, res) => {
    try {
        const { id, status } = req.params;

        if (!["pending", "resolved"].includes(status)) return res.status(400).json({ message: "Invalid status value" });
        const updatedQuery = await Query.findByIdAndUpdate(id, { status }, { new: true });
        if (!updatedQuery) return res.status(404).json({ message: "Query not found" });

        res.status(200).json({ data: updatedQuery, message: "Status updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update status", error: error.message });
    };
});

router.delete("/delete/:id", authenticate, authorize("dev"), async (req, res) => {
    try {
        const { id } = req.params;

        const deletedQuery = await Query.findByIdAndDelete(id);
        if (!deletedQuery) return res.status(404).json({ message: "Query not found" });

        res.status(200).json({ data: deletedQuery, message: "Query deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete query", error: error.message });
    };
});

module.exports = router;