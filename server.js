const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const port = process.env.PORT;
const mongoString = process.env.MONGO_URI;

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

mongoose.connect(mongoString).then(() =>
    console.log("Connected to MongoDB...")
).catch(err =>
    console.error("MongoDB connection error:", err)
);

app.use("/admin", require("./routes/adminRoutes"));
app.use("/auth", require("./routes/authRoutes"));

app.listen(port, () => console.log(`Server is running on http://localhost:${port}`));