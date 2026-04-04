const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate, authorize } = require("../middleware/auth.js");

const Auth = require("../models/authModel");
const Log = require("../models/logModel.js");

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error("JWT_SECRET is not defined");

router.post("/signup", async (req, res) => {
    try {
        const { name, email, mobile, password, confirmPassword } = req.body;

        if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });

        const existingUser = await Auth.findOne({ email });
        if (existingUser) return res.status(409).json({ message: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);

        const auth = new Auth({ name, email, mobile, password: hashedPassword });
        await auth.save();

        const userObj = auth.toObject();
        delete userObj.password;

        res.status(201).json({ data: userObj, message: "Signup successful. Awaiting approval." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.patch("/approve", authenticate, authorize("dev"), async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!["admin", "dev"].includes(role)) return res.status(400).json({ message: "Invalid role. Must be admin, or dev." });

        const updatedUser = await Auth.findByIdAndUpdate(userId, { isApproved: true, role }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found." });

        res.status(200).json({ data: updatedUser, message: `User approved and role set to '${role}'.` });
    } catch (error) {
        res.status(500).json({ message: "Server error.", error: error.message });
    };
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Auth.findOne({ email });
        if (!user) {
            await Log.create({ email, status: "failed", ip: req.ip, userAgent: req.headers["user-agent"] });
            return res.status(404).json({ message: "User not found." });
        };
        if (!user.isApproved) {
            await Log.create({ userId: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role, status: "failed", ip: req.ip, userAgent: req.headers["user-agent"] });
            return res.status(403).json({ message: "Not approved." });
        };

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await Log.create({ userId: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role, status: "failed", ip: req.ip, userAgent: req.headers["user-agent"] });
            return res.status(401).json({ message: "Invalid credentials." });
        };

        user.tokenVersion += 1;
        await user.save();

        await Log.create({ userId: user._id, name: user.name, email: user.email, mobile: user.mobile, role: user.role, status: "success", ip: req.ip, userAgent: req.headers["user-agent"] });

        const token = jwt.sign({ id: user._id, role: user.role, tokenVersion: user.tokenVersion }, jwtSecret, { expiresIn: "1d" });

        res.status(200).json({ token: token, role: user.role, message: "Login successful." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.post("/logout", authenticate, async (req, res) => {
    req.user.tokenVersion += 1;
    await req.user.save();

    res.json({ message: "Logged out successfully." });
});

router.get("/users", authenticate, authorize("dev"), async (req, res) => {
    try {

        const { approved } = req.query;
        const filter = {};

        if (approved === "true") filter.isApproved = true;
        else if (approved === "false") filter.isApproved = false;

        const users = await Auth.find(filter).select("-password");

        res.status(200).json({ data: users, message: `Found ${users.length} user(s)${approved ? ` with approved=${approved}` : ""}.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

module.exports = router;