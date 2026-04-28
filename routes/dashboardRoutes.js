const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

const MovieSeries = require("../models/msModel");

router.get("/dashboard", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { range = "30d", startDate, endDate, page = 1, limit = 10 } = req.query;

        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;

        let fromDate, toDate;

        if (range === "all") {
            fromDate = new Date("2025-06-28");
            toDate = new Date();
        } else if (startDate && endDate) {
            fromDate = new Date(startDate);
            toDate = new Date(endDate);
            toDate.setHours(23, 59, 59, 999);
        } else {
            let days = 30;
            if (range === "7d") days = 7;
            if (range === "15d") days = 15;
            if (range === "45d") days = 45;
            if (range === "60d") days = 60;
            if (range === "90d") days = 90;
            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);
            toDate = new Date();
        };
        const today = new Date().toISOString().split("T")[0];

        const addedFilter = { msAddedAt: { $gte: fromDate, $lte: toDate } };
        const watchedFilter = { msWatchedAt: { $gte: fromDate, $lte: toDate } };
        const combinedFilter = { $or: [{ msAddedAt: { $gte: fromDate, $lte: toDate } }, { msWatchedAt: { $ne: null, $gte: fromDate, $lte: toDate } }] };

        const [card, recentlyAddedStats, watchedStats, recentAddedAndWatched, total, industryStats, genreStats, ottStats, upcomingStats, upcomingList, upcomingTotal] = await Promise.all([

            MovieSeries.aggregate([{ $match: combinedFilter }, { $group: { _id: null, movies: { $sum: { $cond: [{ $eq: ["$msFormat", "movie"] }, 1, 0] } }, series: { $sum: { $cond: [{ $eq: ["$msFormat", "series"] }, 1, 0] } }, bollywood: { $sum: { $cond: [{ $eq: ["$msIndustry", "bollywood"] }, 1, 0] } }, hollywood: { $sum: { $cond: [{ $eq: ["$msIndustry", "hollywood"] }, 1, 0] } }, others: { $sum: { $cond: [{ $eq: ["$msIndustry", "other"] }, 1, 0] } } } }]),

            MovieSeries.aggregate([{ $match: addedFilter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$msAddedAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),

            MovieSeries.aggregate([{ $match: watchedFilter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$msWatchedAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $addFields: { activityDate: { $cond: [{ $gt: ["$msWatchedAt", "$msAddedAt"] }, "$msWatchedAt", "$msAddedAt"] }, activityType: { $cond: [{ $gt: ["$msWatchedAt", "$msAddedAt"] }, "watched", "added"] } } }, { $sort: { activityDate: -1 } }, { $skip: skip }, { $limit: pageSize }, { $project: { msName: 1, msPoster: 1, msLink: 1, msFormat: 1, msIndustry: 1, msReleaseDate: 1, msRating: 1, msAddedAt: 1, msWatchedAt: 1, msOTT: 1, activityDate: 1, activityType: 1 } }]), MovieSeries.countDocuments(combinedFilter),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $group: { _id: "$msIndustry", count: { $sum: 1 } } }]),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $unwind: "$msGenre" }, { $group: { _id: "$msGenre", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $group: { _id: "$msOTT", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),

            MovieSeries.aggregate([{ $match: { msReleaseDate: { $gt: today } } }, { $group: { _id: { $substr: ["$msReleaseDate", 0, 7] }, movies: { $sum: { $cond: [{ $eq: ["$msFormat", "movie"] }, 1, 0] } }, series: { $sum: { $cond: [{ $eq: ["$msFormat", "series"] }, 1, 0] } } } }, { $sort: { _id: 1 } }]),

            MovieSeries.find({ msReleaseDate: { $gt: today } }).sort({ msReleaseDate: 1 }).limit(10).select("-msAbout -msGenre -msCollection -hashedId -__v -msAddedAt -msWatched -msWatchedAt").lean(), MovieSeries.countDocuments({ msReleaseDate: { $gt: today } }),
        ]);

        let industry = { bollywood: 0, hollywood: 0, other: 0 };
        industryStats.forEach(item => {
            if (item._id === "bollywood") industry.bollywood = item.count;
            else if (item._id === "Hollywood") industry.hollywood = item.count;
            else if (item._id === "other") industry.other = item.count;
        });

        res.status(200).json({
            card: card[0] || {},
            recentlyAddedStats: { data: recentlyAddedStats },
            watchedStats: { data: watchedStats },
            recentAddedAndWatched: { data: recentAddedAndWatched, total, page: pageNumber, limit: pageSize, totalPages: Math.ceil(total / pageSize) },
            industryStats: { data: industryStats },
            genreStats: { data: genreStats },
            ottStats: { data: ottStats },
            upcoming: { graph: upcomingStats, data: upcomingList, total: upcomingTotal },
            filters: { startDate: fromDate, endDate: toDate, range }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

module.exports = router;