const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middleware/auth");
const cloudinary = require("../utils/cloudinary");

const MovieSeries = require("../models/msModel");

const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split("/");
        const uploadIndex = parts.indexOf("upload");
        const publicPath = parts.slice(uploadIndex + 2).join("/");
        const fileName = publicPath.split(".")[0];
        return fileName;
    } catch (err) {
        return null;
    };
};

router.post("/post", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { msName, msAbout, msPoster, msLink, msFormat, msIndustry, msCast, msGenre, msRating, msReleaseDate, msAddedAt, msCollection, sStatus, sTSeasons } = req.body;

        if (msName && msReleaseDate) {
            const existing = await MovieSeries.findOne({
                msName: { $regex: new RegExp(`^${escapeRegex(msName)}$`, "i") },
                msReleaseDate
            });
            if (existing) {
                return res.status(409).json({
                    message: `The '${msName}' already exists for this release date ${msReleaseDate}.`
                });
            };
        };

        let poster = null;
        if (msPoster) {
            const result = await cloudinary.uploader.upload(msPoster, { folder: "posters" });
            poster = result.secure_url;
        };

        const newMovieSeries = new MovieSeries({
            msName, msAbout, msPoster: poster, msLink, msFormat, msIndustry, msCast, msGenre, msReleaseDate, msRating, msAddedAt: new Date(), msCollection: msCollection || null, sStatus: sStatus || null, sTSeasons
        });
        const add = await newMovieSeries.save();
        res.status(201).json({ data: add, message: `The '${msName}' added successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.get("/get", async (req, res) => {
    try {
        const { search } = req.query;
        const filter = {};

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            filter.$or = [{ msName: regex }, { msCast: regex }]
        };

        const data = await MovieSeries.find(filter).sort({ msReleaseDate: -1 }).select("-__v -msCollection -msAddedAt -msWatchedAt -sStatus -msOTT -sTSeasons");
        res.status(200).json({ data: data, totalData: data.length, message: `The MovieSeries fetched${search ? ` matching '${search}'` : ""}, sorted by latest release date.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.get("/details/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: "Movie/Series ID is required." });

        const hash = { hashedId: id };

        const data = await MovieSeries.findOne(hash).select("-_id -hashedId -__v").lean();
        if (!data) return res.status(404).json({ message: "Movie/Series not found." });

        res.status(200).json({ data, message: `Details fetched for '${data.msName}'.` });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch details", error: error.message });
    };
});

router.patch("/update/:id", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        if (!Object.keys(body).length) {
            return res.status(400).json({ message: "No data provided to update." });
        };

        const existingItem = await MovieSeries.findById(id);
        if (!existingItem) {
            return res.status(404).json({ message: "Movie/Series not found." });
        };

        if (body.msName && body.msReleaseDate) {
            const existing = await MovieSeries.findOne({
                _id: { $ne: id },
                msName: { $regex: new RegExp(`^${escapeRegex(body.msName)}$`, "i") },
                msReleaseDate: body.msReleaseDate
            });
            if (existing) {
                return res.status(409).json({
                    message: `The '${body.msName}' already exists for this release date ${body.msReleaseDate}.`
                });
            };
        };

        if (body.msPoster && body.msPoster !== existingItem.msPoster) {
            try {
                let newPosterUrl = body.msPoster;
                if (body.msPoster) {
                    const uploadResult = await cloudinary.uploader.upload(body.msPoster, {
                        folder: "posters",
                        resource_type: "image"
                    });
                    newPosterUrl = uploadResult.secure_url;
                };
                if (existingItem.msPoster) {
                    const publicId = getPublicIdFromUrl(existingItem.msPoster);
                    if (publicId) await cloudinary.uploader.destroy(publicId);
                };
                body.msPoster = newPosterUrl;
            } catch (error) {
                return res.status(400).json({ message: "Image update failed", error: error.message });
            };
        };

        const update = await MovieSeries.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!update) return res.status(404).json({ message: "Movie/Series not found." });
        res.status(200).json({ data: update, message: `The '${update.msName}' updated successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.delete("/delete/:id", authenticate, authorize("dev"), async (req, res) => {
    try {
        const id = req.params.id;
        const deleteD = await MovieSeries.findByIdAndDelete(id);
        if (!deleteD) return res.status(404).json({ message: "Not found" });
        if (deleteD.msPoster) {
            const publicId = getPublicIdFromUrl(deleteD.msPoster);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error("Cloudinary delete failed:", err.message);
                };
            };
        };
        res.status(200).json({ data: deleteD, message: `The '${deleteD.msName}' deleted successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.patch("/watched/:id", authenticate, authorize("dev"), async (req, res) => {
    try {
        const id = req.params.id;
        const item = await MovieSeries.findById(id);

        if (!item) return res.status(404).json({ message: "Movie/Series not found." });

        const wasWatched = item.msWatched;
        item.msWatched = !wasWatched;

        if (item.msWatched) item.msWatchedAt = new Date();
        else item.msWatchedAt = null;

        const watched = await item.save();

        res.status(200).json({ data: watched, message: `The '${watched.msName}' marked as ${watched.msWatched ? "Watched" : "Unwatched"}` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.patch("/seasons/add-many/:id", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const id = req.params.id;
        const { seasons } = req.body;

        if (!Array.isArray(seasons) || seasons.length === 0) {
            return res.status(400).json({ message: "Seasons array is required." });
        };

        const item = await MovieSeries.findById(id);
        if (!item) return res.status(404).json({ message: "Movie/Series not found." });

        if (item.msFormat !== "series") {
            return res.status(400).json({ message: "Seasons can only be added to series." });
        };

        const existingNumbers = item.sSeasons.map(s => s.sNumber);
        const filteredSeasons = seasons.filter(s => !existingNumbers.includes(s.sNumber));
        if (filteredSeasons.length === 0) {
            return res.status(400).json({ message: "All seasons already exist." });
        };

        const processedSeasons = await Promise.all(
            filteredSeasons.map(async (season) => {
                let posterUrl = null;
                if (season.sPoster) {
                    const uploadResult = await cloudinary.uploader.upload(season.sPoster, { folder: "sposters", resource_type: "image" });
                    posterUrl = uploadResult.secure_url;
                };
                return {
                    sNumber: season.sNumber,
                    sPoster: posterUrl,
                    sReleaseDate: season.sReleaseDate || null,
                    sEpisodeCount: season.sEpisodeCount || null,
                    sAbout: season.sAbout || null,
                    sAddedAt: new Date(),
                    sWatched: false,
                    sWatchedAt: null,
                    sStatus: season.sStatus || "released"
                };
            })
        );

        item.sSeasons.push(...processedSeasons);
        item.sTSeasons = item.sSeasons.length;
        await item.save();

        res.status(200).json({ message: `${processedSeasons.length} season(s) added successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.patch("/seasons/add-one/:id", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const id = req.params.id;
        const { sNumber, sPoster, sReleaseDate, sEpisodeCount, sAbout, sStatus } = req.body;

        if (!sNumber) {
            return res.status(400).json({ message: "sNumber is required." });
        };

        const item = await MovieSeries.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Movie/Series not found." });
        };

        if (item.msFormat !== "series") {
            return res.status(400).json({ message: "Seasons can only be added to series." });
        };

        const exists = item.sSeasons.some(s => s.sNumber === Number(sNumber));
        if (exists) {
            return res.status(400).json({ message: `Season ${sNumber} already exists.` });
        };

        let posterUrl = null;
        if (sPoster) {
            const uploadResult = await cloudinary.uploader.upload(sPoster, { folder: "sposters", resource_type: "image" });
            posterUrl = uploadResult.secure_url;
        };

        const newSeason = {
            sNumber: sNumber,
            sPoster: posterUrl,
            sReleaseDate: sReleaseDate || null,
            sEpisodeCount: sEpisodeCount || null,
            sAbout: sAbout || null,
            sAddedAt: new Date(),
            sWatched: false,
            sWatchedAt: null,
            sStatus: sStatus || "released"
        };
        item.sSeasons.push(newSeason);

        item.sSeasons.sort((a, b) => a.sNumber - b.sNumber);
        item.sTSeasons = item.sSeasons.length;
        await item.save();
        res.status(200).json({ message: `Season ${sNumber} added successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.patch("/seasons/update/:id/:sNumber", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { id, sNumber } = req.params;
        const updateData = req.body;

        const item = await MovieSeries.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Movie/Series not found." });
        };

        if (item.msFormat !== "series") {
            return res.status(400).json({ message: "Not a series." });
        };
        const seasonIndex = item.sSeasons.findIndex(s => s.sNumber === Number(sNumber));
        if (seasonIndex === -1) {
            return res.status(404).json({ message: "Season not found." });
        };
        const season = item.sSeasons[seasonIndex];
        if (updateData.sPoster && updateData.sPoster !== season.sPoster) {
            try {
                const uploadResult = await cloudinary.uploader.upload(updateData.sPoster, { folder: "sposters", resource_type: "image" });
                const newPosterUrl = uploadResult.secure_url;

                if (season.sPoster) {
                    const publicId = getPublicIdFromUrl(season.sPoster);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                    };
                };
                season.sPoster = newPosterUrl;
            } catch (err) {
                return res.status(400).json({ message: "Season poster update failed", error: err.message });
            };
        };

        const allowedFields = ["sReleaseDate", "sEpisodeCount", "sAbout", "sStatus"];

        allowedFields.forEach(field => {
            if (updateData[field] !== undefined) {
                season[field] = updateData[field];
            };
        });

        if (updateData.sWatched !== undefined) {
            season.sWatched = updateData.sWatched;
            season.sWatchedAt = updateData.sWatched ? new Date() : null;
        };

        await item.save();
        res.status(200).json({ data: season, message: `Season ${sNumber} updated successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.delete("/seasons/delete/:id/:sNumber", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { id, sNumber } = req.params;

        const item = await MovieSeries.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Movie/Series not found." });
        };

        if (item.msFormat !== "series") {
            return res.status(400).json({ message: "Not a series." });
        };

        const seasonIndex = item.sSeasons.findIndex(s => s.sNumber === Number(sNumber));
        if (seasonIndex === -1) {
            return res.status(404).json({ message: "Season not found." });
        };
        const season = item.sSeasons[seasonIndex];

        if (season.sPoster) {
            const publicId = getPublicIdFromUrl(season.sPoster);
            if (publicId) {
                try {
                    await cloudinary.uploader.destroy(publicId);
                } catch (err) {
                    console.error("Cloudinary delete failed:", err.message);
                };
            };
        };
        item.sSeasons.splice(seasonIndex, 1);
        item.sTSeasons = item.sSeasons.length;
        await item.save();
        res.status(200).json({ data: item.sSeasons, message: `Season ${sNumber} deleted successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

module.exports = router;