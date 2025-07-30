const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const fetch = require("node-fetch");
const serverless = require("serverless-http");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "https://quize-frontend-tau.vercel.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// Signup
app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email: email.toLowerCase(), passwordHash });
    await newUser.save();
    res.json({ success: true, message: "Signup successful!" });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.name) {
      res.status(400).json({ success: false, message: "User name already in use." });
    } else if (error.code === 11000 && error.keyPattern.email) {
      res.status(400).json({ success: false, message: "Email already in use." });
    } else {
      res.status(500).json({ success: false, message: "An error occurred." });
    }
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials." });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect password." });

    res.json({
      success: true,
      userName: user.name,
      userEmail: user.email,
      redirectUrl: "/LanguagePage"
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Login failed." });
  }
});

// Proxy route
app.get("/api/dashboard/totalusers", async (req, res) => {
  try {
    const response = await fetch("https://sc.ecombullet.com/api/dashboard/totalusers");
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).json({ error: "Failed to fetch data from external API" });
  }
});

// Export as serverless handler
module.exports = serverless(app);
