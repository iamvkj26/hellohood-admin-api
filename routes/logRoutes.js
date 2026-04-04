const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

const Log = require("../models/logModel");

router.get("/user", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { search, page = 1, limit = 25 } = req.query;

        const filter = {};
        if (search) filter.name = { $regex: search, $options: "i" };

        const logs = await Log.find(filter).sort({ loginAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));

        const total = await Log.countDocuments(filter);
        res.status(200).json({ data: logs, total, page: Number(page), totalPages: Math.ceil(total / limit) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.get("/user/:userId", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { userId } = req.params;

        const logs = await Log.find({ userId }).sort({ loginAt: -1 });

        const totalLogins = logs.length;
        const successCount = logs.filter(l => l.status === "success").length;
        const failedCount = logs.filter(l => l.status === "failed").length;

        res.status(200).json({ data: logs, stats: { totalLogins, successCount, failedCount } });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.get("/summary", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { search } = req.query;

        const matchStage = search ? { name: { $regex: search, $options: "i" } } : {};

        const data = await Log.aggregate([{ $match: matchStage }, {
            $group: { _id: "$userId", name: { $first: "$name" }, email: { $first: "$email" }, mobile: { $first: "$mobile" }, totalLogins: { $sum: 1 }, successCount: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } }, failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }, lastLogin: { $max: "$loginAt" } }
        }, { $sort: { lastLogin: -1 } }]);
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

module.exports = router;