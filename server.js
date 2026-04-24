const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const port = process.env.PORT || 8000;

if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not defined");
const mongoString = process.env.MONGO_URI;

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not defined");

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(mongoString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() =>
    console.log("Connected to MongoDB...")
).catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
});

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.use("/auth", require("./routes/authRoutes"));
app.use("/dashboard", require("./routes/dashboardRoutes"));
app.use("/log", require("./routes/logRoutes"));
app.use("/admin", require("./routes/msRoutes"));
app.use("/query", require("./routes/queryRoutes"));
// app.use("/tmdb", require("./routes/tmdbRoutes"));

app.use((error, req, res, next) => {
    console.error(error.stack);
    res.status(500).json({ message: "Something went wrong", error: error.message });
});

app.listen(port, () => console.log(`Server is running on http://localhost:${port}`));