const jwt = require("jsonwebtoken");
const Auth = require("../models/authModel");

const jwtSecret = process.env.JWT_SECRET;

exports.authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: "No token provided." });

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, jwtSecret);

        const user = await Auth.findById(decoded.id);
        if (!user) return res.status(404).json({ message: "User not found." });
        if (!user.isApproved) return res.status(403).json({ message: "User not approved." });

        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token." });
    };
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) return res.status(403).json({ message: `Access denied for role '${req.user.role}'. Allowed roles: [${roles.join(", ")}].` });
        next();
    };
};