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
        const { msName, msAbout, msPoster, msLink, msFormat, msIndustry, msCast, msGenre, msRating, msReleaseDate, msAddedAt, msCollection, sStatus, sSeasons } = req.body;

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
            msName, msAbout, msPoster: poster, msLink, msFormat, msIndustry, msCast, msGenre, msReleaseDate, msRating, msAddedAt: new Date(), msCollection: msCollection || null, sStatus, sSeasons
        });
        const add = await newMovieSeries.save();
        res.status(201).json({ data: add, message: `The '${msName}' added successfully.` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    };
});

router.get("/get", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const { search } = req.query;
        const filter = {};

        if (search) {
            const regex = new RegExp(escapeRegex(search), "i");
            filter.$or = [{ msName: regex }, { msCast: regex }]
        };

        const data = await MovieSeries.find(filter).sort({ msReleaseDate: -1 }).select("-msCollection -__v -hashedId");
        res.status(200).json({ data: data, totalData: data.length, message: `The MovieSeries fetched${search ? ` matching '${search}'` : ""}, sorted by latest release date.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.patch("/update/:id", authenticate, authorize("dev", "admin"), async (req, res) => {
    try {
        const id = req.params.id;
        const body = req.body;

        if (!Object.keys(body).length) {
            return res.status(400).json({ message: "No data provided to update." });
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

        if (body.msPoster) {
            try {
                const uploadResult = await cloudinary.uploader.upload(body.msPoster, {
                    folder: "posters",
                    resource_type: "image"
                });
                body.msPoster = uploadResult.secure_url;
            } catch (error) {
                return res.status(400).json({
                    message: "Image upload failed",
                    error: error.message
                });
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

module.exports = router;