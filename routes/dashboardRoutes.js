const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");

const MovieSeries = require("../models/msModel");

router.get("/dashboard", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { range = "60d", startDate, endDate } = req.query;

        let fromDate, toDate;

        if (startDate && endDate) {
            fromDate = new Date(startDate);
            toDate = new Date(endDate);
            toDate.setHours(23, 59, 59, 999);
        } else {
            let days = 60;
            if (range === "7d") days = 7;
            if (range === "15d") days = 15;
            if (range === "30d") days = 30;

            fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);
            toDate = new Date();
        };
        const today = new Date().toISOString().split("T")[0];

        const addedFilter = { msAddedAt: { $gte: fromDate, $lte: toDate } };
        const watchedFilter = { msWatchedAt: { $gte: fromDate, $lte: toDate } };
        const combinedFilter = { $or: [{ msAddedAt: { $gte: fromDate, $lte: toDate } }, { msWatchedAt: { $gte: fromDate, $lte: toDate } }] };

        const [card, recentlyAddedStats, watchedStats, recentAddedAndWatched, total, industryStats, genreStats, ottStats, upcomingStats, upcomingList, upcomingTotal] = await Promise.all([

            MovieSeries.aggregate([{ $group: { _id: null, movies: { $sum: { $cond: [{ $eq: ["$msFormat", "Movie"] }, 1, 0] } }, series: { $sum: { $cond: [{ $eq: ["$msFormat", "Series"] }, 1, 0] } }, bollywood: { $sum: { $cond: [{ $eq: ["$msIndustry", "Bollywood"] }, 1, 0] } }, hollywood: { $sum: { $cond: [{ $eq: ["$msIndustry", "Hollywood"] }, 1, 0] } }, others: { $sum: { $cond: [{ $eq: ["$msIndustry", "Other"] }, 1, 0] } } } }]),

            MovieSeries.aggregate([{ $match: addedFilter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$msAddedAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),

            MovieSeries.aggregate([{ $match: watchedFilter }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$msWatchedAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $addFields: { activityDate: { $cond: [{ $gt: ["$msWatchedAt", "$msAddedAt"] }, "$msWatchedAt", "$msAddedAt"] }, activityType: { $cond: [{ $gt: ["$msWatchedAt", "$msAddedAt"] }, "watched", "added"] } } }, { $sort: { activityDate: -1 } }, { $project: { msName: 1, msPoster: 1, msLink: 1, msFormat: 1, msIndustry: 1, msSeason: 1, msReleaseDate: 1, msRating: 1, msAddedAt: 1, msWatchedAt: 1, ott: 1, activityDate: 1, activityType: 1 } }]), MovieSeries.countDocuments(combinedFilter),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $group: { _id: "$msIndustry", count: { $sum: 1 } } }]),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $unwind: "$msGenre" }, { $group: { _id: "$msGenre", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),

            MovieSeries.aggregate([{ $match: combinedFilter }, { $group: { _id: "$ott", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),

            MovieSeries.aggregate([{ $match: { msReleaseDate: { $gt: today } } }, { $group: { _id: { $substr: ["$msReleaseDate", 0, 7] }, movies: { $sum: { $cond: [{ $eq: ["$msFormat", "Movie"] }, 1, 0] } }, series: { $sum: { $cond: [{ $eq: ["$msFormat", "Series"] }, 1, 0] } } } }, { $sort: { _id: 1 } }]),

            MovieSeries.find({ msReleaseDate: { $gt: today } }).sort({ msReleaseDate: 1 }).limit(10).select("-msAbout -msGenre -msCollection -hashedId -__v -msAddedAt -msWatched -msWatchedAt").lean(), MovieSeries.countDocuments({ msReleaseDate: { $gt: today } }),
        ]);

        let industry = { bollywood: 0, hollywood: 0, other: 0 };
        industryStats.forEach(item => {
            if (item._id === "Bollywood") industry.bollywood = item.count;
            else if (item._id === "Hollywood") industry.hollywood = item.count;
            else if (item._id === "Other") industry.other = item.count;
        });

        res.status(200).json({
            card: card[0] || {},
            recentlyAddedStats: { data: recentlyAddedStats },
            watchedStats: { data: watchedStats },
            recentAddedAndWatched: { data: recentAddedAndWatched, total },
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