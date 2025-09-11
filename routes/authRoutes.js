const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticate, authorize } = require("../middleware/auth.js");

const Auth = require("../models/authModel");

const jwtSecret = process.env.JWT_SECRET;

router.post("/signup", async (req, res) => {
    try {
        const { name, email, mobile, password, confirmPassword } = req.body;

        if (password !== confirmPassword) return res.status(400).json({ message: "Passwords do not match." });

        const existingUser = await Auth.findOne({ email });
        if (existingUser) return res.status(409).json({ message: "Email already registered." });

        const hashedPassword = await bcrypt.hash(password, 10);

        const auth = new Auth({ name, email, mobile, password: hashedPassword });
        await auth.save();

        res.status(201).json({ data: auth, message: "Signup successful. Awaiting approval." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
});

router.patch("/approve", authenticate, authorize("dev"), async (req, res) => {
    try {
        const { userId, role } = req.body;

        if (!["user", "admin", "dev"].includes(role)) return res.status(400).json({ message: "Invalid role. Must be user, admin,or dev." });

        const updatedUser = await Auth.findByIdAndUpdate(userId, { isApproved: true, role }, { new: true });

        if (!updatedUser) return res.status(404).json({ message: "User not found." });

        res.status(200).json({ data: updatedUser, message: `User approved and role set to '${role}'.` });
    } catch (err) {
        res.status(500).json({ message: "Server error.", error: err.message });
    };
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Auth.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (!user.isApproved) return res.status(403).json({ message: "This account is not approved yet. Contact a Dev to approve it." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

        const token = jwt.sign({ id: user._id, email: user.email }, jwtSecret, { expiresIn: "1d" });

        res.status(200).json({ token: token, role: user.role, message: "Login successful." });
    } catch (error) {
        res.status(500).json({ message: error.message });
    };
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
        res.status(500).json({ error: error.message });
    };
});

module.exports = router;